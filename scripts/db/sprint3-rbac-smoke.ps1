param(
  [string]$ApiBaseUrl = "http://localhost:4000",
  [string]$AdminEmail = "admin@atlasgrid.ai",
  [string]$AdminPassword = "password123",
  [string]$SindicoEmail = "sindico@atlasgrid.ai",
  [string]$SindicoPassword = "password123",
  [string]$MoradorEmail = "morador@atlasgrid.ai",
  [string]$MoradorPassword = "password123",
  [string]$OutputPath = "docs/sprint3_rbac_smoke_report.md"
)

$ErrorActionPreference = "Stop"

function Invoke-Login {
  param(
    [string]$BaseUrl,
    [string]$Email,
    [string]$Password
  )

  $body = @{
    email = $Email
    password = $Password
  } | ConvertTo-Json -Compress

  $res = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/auth/login" -ContentType "application/json" -Body $body
  if (-not $res.token) {
    throw "Login sem token para $Email."
  }
  return $res.token
}

function Invoke-Status {
  param(
    [string]$BaseUrl,
    [string]$Path,
    [string]$Token
  )

  try {
    if ($Token) {
      $headers = @{ Authorization = "Bearer $Token" }
      Invoke-RestMethod -Method Get -Uri "$BaseUrl$Path" -Headers $headers | Out-Null
    }
    else {
      Invoke-RestMethod -Method Get -Uri "$BaseUrl$Path" | Out-Null
    }
    return 200
  } catch {
    $response = $_.Exception.Response
    if ($response -and $response.StatusCode) {
      return [int]$response.StatusCode
    }
    return 0
  }
}

$health = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/api/health"
if ($health.dialect -ne "oracle") {
  throw "Esperado dialect=oracle para evidencias de homolog. Recebido: $($health.dialect)"
}

$adminToken = Invoke-Login -BaseUrl $ApiBaseUrl -Email $AdminEmail -Password $AdminPassword
$sindicoToken = Invoke-Login -BaseUrl $ApiBaseUrl -Email $SindicoEmail -Password $SindicoPassword
$moradorToken = Invoke-Login -BaseUrl $ApiBaseUrl -Email $MoradorEmail -Password $MoradorPassword

$matrix = @(
  @{ Endpoint = "/api/invoices"; Role = "admin"; Expected = 200; Token = $adminToken },
  @{ Endpoint = "/api/invoices"; Role = "sindico"; Expected = 200; Token = $sindicoToken },
  @{ Endpoint = "/api/invoices"; Role = "morador"; Expected = 403; Token = $moradorToken },

  @{ Endpoint = "/api/management/units"; Role = "admin"; Expected = 200; Token = $adminToken },
  @{ Endpoint = "/api/management/units"; Role = "sindico"; Expected = 200; Token = $sindicoToken },
  @{ Endpoint = "/api/management/units"; Role = "morador"; Expected = 403; Token = $moradorToken },

  @{ Endpoint = "/api/alerts"; Role = "admin"; Expected = 200; Token = $adminToken },
  @{ Endpoint = "/api/alerts"; Role = "sindico"; Expected = 200; Token = $sindicoToken },
  @{ Endpoint = "/api/alerts"; Role = "morador"; Expected = 200; Token = $moradorToken },

  @{ Endpoint = "/api/chat/bootstrap"; Role = "admin"; Expected = 200; Token = $adminToken },
  @{ Endpoint = "/api/chat/bootstrap"; Role = "sindico"; Expected = 200; Token = $sindicoToken },
  @{ Endpoint = "/api/chat/bootstrap"; Role = "morador"; Expected = 200; Token = $moradorToken },

  @{ Endpoint = "/api/security/audit"; Role = "admin"; Expected = 200; Token = $adminToken },
  @{ Endpoint = "/api/security/audit"; Role = "sindico"; Expected = 403; Token = $sindicoToken },
  @{ Endpoint = "/api/security/audit"; Role = "morador"; Expected = 403; Token = $moradorToken },

  @{ Endpoint = "/api/invoices"; Role = "no_token"; Expected = 401; Token = $null }
)

$results = @()
$failCount = 0

foreach ($row in $matrix) {
  $actual = Invoke-Status -BaseUrl $ApiBaseUrl -Path $row.Endpoint -Token $row.Token
  $pass = $actual -eq $row.Expected
  if (-not $pass) {
    $failCount++
  }
  $results += [PSCustomObject]@{
    Endpoint = $row.Endpoint
    Role = $row.Role
    Expected = $row.Expected
    Actual = $actual
    Result = if ($pass) { "PASS" } else { "FAIL" }
  }
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$outputAbs = Join-Path (Get-Location) $OutputPath
$outputDir = Split-Path -Parent $outputAbs
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

$lines = @()
$lines += "# Sprint 3 RBAC Smoke Report"
$lines += ""
$lines += "Generated at: $timestamp"
$lines += "API: $ApiBaseUrl"
$lines += "Health: dialect=$($health.dialect), dbStatus=$($health.dbStatus), authProvider=$($health.authProvider)"
$lines += ""
$lines += "| Endpoint | Role | Expected | Actual | Result |"
$lines += "|---|---|---:|---:|---|"

foreach ($r in $results) {
  $lines += "| $($r.Endpoint) | $($r.Role) | $($r.Expected) | $($r.Actual) | $($r.Result) |"
}

$lines += ""
$lines += "Summary: total=$($results.Count), failed=$failCount"
$lines += ""
$lines += "Criteria: PASS only if failed=0."

Set-Content -Path $outputAbs -Value ($lines -join "`r`n")

Write-Host "Report generated at $outputAbs"
Write-Host "Summary: total=$($results.Count), failed=$failCount"

if ($failCount -gt 0) {
  throw "RBAC smoke finished with failures. Check report: $outputAbs"
}

Write-Host "PASS: RBAC matrix validated."
