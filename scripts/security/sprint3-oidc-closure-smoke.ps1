param(
  [string]$ApiBaseUrl = "http://localhost:4000",
  [string]$AccessToken = "",
  [string]$OutputPath = "docs/sprint3_oidc_smoke_report.md"
)

$ErrorActionPreference = "Stop"

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Url,
    [hashtable]$Headers = $null,
    [string]$Body = $null
  )

  try {
    if ($Body) {
      $response = Invoke-RestMethod -Method $Method -Uri $Url -Headers $Headers -ContentType "application/json" -Body $Body
    } else {
      $response = Invoke-RestMethod -Method $Method -Uri $Url -Headers $Headers
    }
    return @{
      Status = 200
      Body = $response
      ErrorCode = $null
    }
  } catch {
    $status = 0
    $errorCode = $null
    $rawBody = $null
    $errorDetailsBody = $null
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
      try {
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $rawBody = $reader.ReadToEnd()
          $reader.Close()
        }
      } catch {}
      if ($rawBody) {
        try {
          $parsed = $rawBody | ConvertFrom-Json
          $errorCode = $parsed.error.code
        } catch {}
      }
    }
    if (-not $errorCode -and $_.ErrorDetails -and $_.ErrorDetails.Message) {
      $errorDetailsBody = $_.ErrorDetails.Message
      try {
        $parsed = $errorDetailsBody | ConvertFrom-Json
        $errorCode = $parsed.error.code
      } catch {}
    }

    return @{
      Status = $status
      Body = $null
      ErrorCode = $errorCode
    }
  }
}

if (-not $AccessToken) {
  throw "Informe -AccessToken com token real emitido pelo provedor corporativo."
}

$health = Invoke-Api -Method "GET" -Url "$ApiBaseUrl/api/health"
if ($health.Status -ne 200) {
  throw "Falha ao consultar health. Status=$($health.Status)"
}

$healthBody = $health.Body
$checks = @()
$oidcReadiness = $healthBody.oidcReadiness
$oidcIssues = @()
$oidcMissing = @()
if ($oidcReadiness) {
  if ($oidcReadiness.issues) { $oidcIssues = @($oidcReadiness.issues) }
  if ($oidcReadiness.missingConfig) { $oidcMissing = @($oidcReadiness.missingConfig) }
}

function New-CheckResult {
  param(
    [string]$Name,
    [int]$ExpectedStatus,
    [int]$ActualStatus,
    [string]$ExpectedCode = "",
    [string]$ActualCode = ""
  )

  $pass = $ActualStatus -eq $ExpectedStatus
  if ($ExpectedCode) {
    $pass = $pass -and ($ActualCode -eq $ExpectedCode)
  }

  return [PSCustomObject]@{
    Check = $Name
    ExpectedStatus = $ExpectedStatus
    ActualStatus = $ActualStatus
    ExpectedCode = if ($ExpectedCode) { $ExpectedCode } else { "-" }
    ActualCode = if ($ActualCode) { $ActualCode } else { "-" }
    Result = if ($pass) { "PASS" } else { "FAIL" }
  }
}

$headersValid = @{ Authorization = "Bearer $AccessToken" }
$invalidToken = "$AccessToken.invalid"
$headersInvalid = @{ Authorization = "Bearer $invalidToken" }

$alertsValid = Invoke-Api -Method "GET" -Url "$ApiBaseUrl/api/alerts" -Headers $headersValid
$chatValid = Invoke-Api -Method "GET" -Url "$ApiBaseUrl/api/chat/bootstrap" -Headers $headersValid
$alertsInvalid = Invoke-Api -Method "GET" -Url "$ApiBaseUrl/api/alerts" -Headers $headersInvalid
$loginPwd = Invoke-Api -Method "POST" -Url "$ApiBaseUrl/api/auth/login" -Body '{"email":"admin@condoguard.ai","password":"password123"}'

$checks += New-CheckResult -Name "OIDC token valido acessa /api/alerts" -ExpectedStatus 200 -ActualStatus $alertsValid.Status
$checks += New-CheckResult -Name "OIDC token valido acessa /api/chat/bootstrap" -ExpectedStatus 200 -ActualStatus $chatValid.Status
$checks += New-CheckResult -Name "Token invalido retorna 401" -ExpectedStatus 401 -ActualStatus $alertsInvalid.Status -ExpectedCode "INVALID_TOKEN" -ActualCode $alertsInvalid.ErrorCode
$checks += New-CheckResult -Name "Login por senha desabilitado em OIDC" -ExpectedStatus 501 -ActualStatus $loginPwd.Status -ExpectedCode "AUTH_EXTERNAL_PROVIDER_REQUIRED" -ActualCode $loginPwd.ErrorCode

$failed = @($checks | Where-Object { $_.Result -eq "FAIL" }).Count
$generatedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

$outputAbs = Join-Path (Get-Location) $OutputPath
$outputDir = Split-Path -Parent $outputAbs
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

$lines = @()
$lines += "# Sprint 3 OIDC Smoke Report"
$lines += ""
$lines += "Generated at: $generatedAt"
$lines += "API: $ApiBaseUrl"
$lines += "Health: dialect=$($healthBody.dialect), dbStatus=$($healthBody.dbStatus), authProvider=$($healthBody.authProvider), authPasswordLoginEnabled=$($healthBody.authPasswordLoginEnabled), oidcConfigured=$($healthBody.oidcConfigured)"
$lines += "OIDC readiness: ready=$($oidcReadiness.ready), missing=$([string]::Join(', ', $oidcMissing)), issues=$([string]::Join(' | ', $oidcIssues))"
$lines += ""
$lines += "| Check | ExpectedStatus | ActualStatus | ExpectedCode | ActualCode | Result |"
$lines += "|---|---:|---:|---|---|---|"
foreach ($c in $checks) {
  $lines += "| $($c.Check) | $($c.ExpectedStatus) | $($c.ActualStatus) | $($c.ExpectedCode) | $($c.ActualCode) | $($c.Result) |"
}
$lines += ""
$lines += "Summary: total=$($checks.Count), failed=$failed"
$lines += ""
$lines += "Acceptance guard:"
$lines += '- authProvider must be `oidc_jwks`'
$lines += '- oidcConfigured must be `true`'
$lines += '- authPasswordLoginEnabled must be `false`'
$lines += '- all checks must PASS'

Set-Content -Path $outputAbs -Value ($lines -join "`r`n")

Write-Host "Report generated at $outputAbs"
Write-Host "Summary: total=$($checks.Count), failed=$failed"

if ($healthBody.authProvider -ne "oidc_jwks" -or -not $healthBody.oidcConfigured -or $healthBody.authPasswordLoginEnabled) {
  $details = if ($oidcIssues.Count -gt 0) { [string]::Join(' | ', $oidcIssues) } else { "authProvider/oidcConfigured/authPasswordLoginEnabled" }
  throw "Pre-condicao de fechamento S3-01 nao atendida no health. Pendencias: $details"
}

if ($failed -gt 0) {
  throw "OIDC smoke finished with failures. Check report: $outputAbs"
}

Write-Host "PASS: S3-01 OIDC closure checks validated."
