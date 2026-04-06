param(
  [string]$ApiBaseUrl = "http://localhost:4000",
  [string]$ExpectedEnv = "hml",
  [switch]$RequireOidc,
  [string]$AccessToken = "",
  [string]$AdminEmail = "admin@condoguard.ai",
  [string]$AdminPassword = "password123",
  [string]$OutputPath = "docs/sprint7_hml_smoke_report.md"
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
    }
    if ($rawBody) {
      try {
        $parsed = $rawBody | ConvertFrom-Json
        $errorCode = $parsed.error.code
      } catch {}
    }
    if (-not $errorCode -and $_.ErrorDetails -and $_.ErrorDetails.Message) {
      try {
        $parsed = $_.ErrorDetails.Message | ConvertFrom-Json
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
    $pass = $pass -and ($ExpectedCode -eq $ActualCode)
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

$checks = @()
$health = Invoke-Api -Method "GET" -Url "$ApiBaseUrl/api/health"
if ($health.Status -ne 200) {
  throw "Falha ao consultar /api/health. Status=$($health.Status)."
}

$healthBody = $health.Body
if ($healthBody.dialect -ne "oracle") {
  throw "Gate S7-01 falhou: dialect esperado 'oracle', recebido '$($healthBody.dialect)'."
}
if ($healthBody.dbStatus -ne "oracle_pool_ok") {
  throw "Gate S7-01 falhou: dbStatus esperado 'oracle_pool_ok', recebido '$($healthBody.dbStatus)'."
}
if ($ExpectedEnv -and ($healthBody.env -ne $ExpectedEnv)) {
  throw "Gate S7-01 falhou: env esperado '$ExpectedEnv', recebido '$($healthBody.env)'."
}

$token = $AccessToken

if ($RequireOidc) {
  if ($healthBody.authProvider -ne "oidc_jwks") {
    throw "Gate S7-01 falhou: authProvider deve ser 'oidc_jwks' quando -RequireOidc."
  }
  if (-not $healthBody.oidcConfigured) {
    throw "Gate S7-01 falhou: oidcConfigured deve ser true quando -RequireOidc."
  }
  if ($healthBody.authPasswordLoginEnabled) {
    throw "Gate S7-01 falhou: authPasswordLoginEnabled deve ser false quando -RequireOidc."
  }
  if (-not $token) {
    throw "Informe -AccessToken para validar fluxos protegidos no modo OIDC."
  }
} else {
  if (-not $token) {
    $loginBody = (@{ email = $AdminEmail; password = $AdminPassword } | ConvertTo-Json -Compress)
    $login = Invoke-Api -Method "POST" -Url "$ApiBaseUrl/api/auth/login" -Body $loginBody
    $checks += New-CheckResult -Name "Login admin para smoke local" -ExpectedStatus 200 -ActualStatus $login.Status -ExpectedCode "" -ActualCode $login.ErrorCode
    if ($login.Status -ne 200 -or -not $login.Body.token) {
      throw "Falha ao obter token de login local para smoke."
    }
    $token = $login.Body.token
  }
}

$headers = @{ Authorization = "Bearer $token" }

$invoices = Invoke-Api -Method "GET" -Url "$ApiBaseUrl/api/invoices?page=1&pageSize=5&sortBy=dueDate&sortOrder=asc" -Headers $headers
$management = Invoke-Api -Method "GET" -Url "$ApiBaseUrl/api/management/units?page=1&pageSize=5&sortBy=unit&sortOrder=asc" -Headers $headers
$alerts = Invoke-Api -Method "GET" -Url "$ApiBaseUrl/api/alerts?page=1&pageSize=5&sortBy=severity&sortOrder=asc" -Headers $headers
$chat = Invoke-Api -Method "POST" -Url "$ApiBaseUrl/api/chat/message" -Headers $headers -Body '{"message":"resumo executivo do condominio"}'
$observability = Invoke-Api -Method "GET" -Url "$ApiBaseUrl/api/observability/metrics?routeLimit=5&codeLimit=5" -Headers $headers

$checks += New-CheckResult -Name "Financeiro (/api/invoices)" -ExpectedStatus 200 -ActualStatus $invoices.Status -ActualCode $invoices.ErrorCode
$checks += New-CheckResult -Name "Gestao (/api/management/units)" -ExpectedStatus 200 -ActualStatus $management.Status -ActualCode $management.ErrorCode
$checks += New-CheckResult -Name "Alertas (/api/alerts)" -ExpectedStatus 200 -ActualStatus $alerts.Status -ActualCode $alerts.ErrorCode
$checks += New-CheckResult -Name "Chat (/api/chat/message)" -ExpectedStatus 200 -ActualStatus $chat.Status -ActualCode $chat.ErrorCode
$checks += New-CheckResult -Name "Observabilidade (/api/observability/metrics)" -ExpectedStatus 200 -ActualStatus $observability.Status -ActualCode $observability.ErrorCode

$failed = @($checks | Where-Object { $_.Result -eq "FAIL" }).Count
$generatedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$outputAbs = Join-Path (Get-Location) $OutputPath
$outputDir = Split-Path -Parent $outputAbs
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

$lines = @()
$lines += "# Sprint 7 HML Go-live Smoke Report"
$lines += ""
$lines += "Generated at: $generatedAt"
$lines += "API: $ApiBaseUrl"
$lines += "Gate mode: $(if ($RequireOidc) { "oidc_required" } else { "local_or_oidc" })"
$lines += "Health: env=$($healthBody.env), dialect=$($healthBody.dialect), dbStatus=$($healthBody.dbStatus), authProvider=$($healthBody.authProvider), authPasswordLoginEnabled=$($healthBody.authPasswordLoginEnabled), oidcConfigured=$($healthBody.oidcConfigured)"
$lines += ""
$lines += "| Check | ExpectedStatus | ActualStatus | ExpectedCode | ActualCode | Result |"
$lines += "|---|---:|---:|---|---|---|"
foreach ($c in $checks) {
  $lines += "| $($c.Check) | $($c.ExpectedStatus) | $($c.ActualStatus) | $($c.ExpectedCode) | $($c.ActualCode) | $($c.Result) |"
}
$lines += ""
$lines += "Summary: total=$($checks.Count), failed=$failed"
$lines += ""
$lines += "Go-live guard (S7-01):"
$lines += "- health em Oracle (`dialect=oracle`, `dbStatus=oracle_pool_ok`)"
$lines += "- endpoints criticos financeiros/alertas/chat/observabilidade respondendo 200"
if ($RequireOidc) {
  $lines += "- identidade real ativa (`authProvider=oidc_jwks`, `oidcConfigured=true`, `authPasswordLoginEnabled=false`)"
}

Set-Content -Path $outputAbs -Value ($lines -join "`r`n")

Write-Host "Report generated at $outputAbs"
Write-Host "Summary: total=$($checks.Count), failed=$failed"

if ($failed -gt 0) {
  throw "S7-01 smoke finalizado com falhas. Consulte: $outputAbs"
}

Write-Host "PASS: S7-01 smoke dos fluxos criticos validado."
