param(
  [string]$PrimaryApiBaseUrl = "http://localhost:4000",
  [string]$RollbackApiBaseUrl = "http://localhost:4000",
  [string]$AccessToken = "",
  [string]$AdminEmail = "admin@condoguard.ai",
  [string]$AdminPassword = "password123",
  [string]$OutputPath = "docs/sprint7_rollback_drill_report.md",
  [int]$RecoveryTimeoutSec = 300,
  [int]$PollingIntervalSec = 5,
  [switch]$NonInteractive,
  [int]$SimulatedIncidentDelaySec = 2,
  [int]$SimulatedRollbackDelaySec = 2
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

function New-Validation {
  param(
    [string]$Check,
    [int]$ExpectedStatus,
    [int]$ActualStatus,
    [string]$ActualCode = ""
  )

  return [PSCustomObject]@{
    Check = $Check
    ExpectedStatus = $ExpectedStatus
    ActualStatus = $ActualStatus
    ActualCode = if ($ActualCode) { $ActualCode } else { "-" }
    Result = if ($ExpectedStatus -eq $ActualStatus) { "PASS" } else { "FAIL" }
  }
}

function Resolve-Token {
  param(
    [string]$ApiBaseUrl,
    [string]$ProvidedToken,
    [string]$Email,
    [string]$Password
  )

  if ($ProvidedToken) {
    return $ProvidedToken
  }

  $body = (@{ email = $Email; password = $Password } | ConvertTo-Json -Compress)
  $login = Invoke-Api -Method "POST" -Url "$ApiBaseUrl/api/auth/login" -Body $body
  if ($login.Status -ne 200 -or -not $login.Body.token) {
    throw "Falha ao obter token de login no endpoint primario."
  }
  return $login.Body.token
}

function Validate-CriticalFlows {
  param(
    [string]$ApiBaseUrl,
    [string]$Token
  )

  $headers = @{ Authorization = "Bearer $Token" }
  $checks = @()

  $health = Invoke-Api -Method "GET" -Url "$ApiBaseUrl/api/health"
  $checks += New-Validation -Check "health" -ExpectedStatus 200 -ActualStatus $health.Status -ActualCode $health.ErrorCode
  if ($health.Status -eq 200 -and $health.Body) {
    if ($health.Body.dialect -ne "oracle") {
      throw "Rollback target invalido: esperado dialect=oracle, recebido $($health.Body.dialect)."
    }
  }

  $invoices = Invoke-Api -Method "GET" -Url "$ApiBaseUrl/api/invoices?page=1&pageSize=3" -Headers $headers
  $alerts = Invoke-Api -Method "GET" -Url "$ApiBaseUrl/api/alerts?page=1&pageSize=3" -Headers $headers
  $chat = Invoke-Api -Method "POST" -Url "$ApiBaseUrl/api/chat/message" -Headers $headers -Body '{"message":"status rapido do condominio"}'
  $obs = Invoke-Api -Method "GET" -Url "$ApiBaseUrl/api/observability/metrics?routeLimit=3&codeLimit=3" -Headers $headers

  $checks += New-Validation -Check "invoices" -ExpectedStatus 200 -ActualStatus $invoices.Status -ActualCode $invoices.ErrorCode
  $checks += New-Validation -Check "alerts" -ExpectedStatus 200 -ActualStatus $alerts.Status -ActualCode $alerts.ErrorCode
  $checks += New-Validation -Check "chat_message" -ExpectedStatus 200 -ActualStatus $chat.Status -ActualCode $chat.ErrorCode
  $checks += New-Validation -Check "observability_metrics" -ExpectedStatus 200 -ActualStatus $obs.Status -ActualCode $obs.ErrorCode

  return $checks
}

$token = Resolve-Token -ApiBaseUrl $PrimaryApiBaseUrl -ProvidedToken $AccessToken -Email $AdminEmail -Password $AdminPassword

Write-Host "== Sprint 7 Rollback Drill =="
Write-Host "Primary:  $PrimaryApiBaseUrl"
Write-Host "Rollback: $RollbackApiBaseUrl"

Write-Host ""
Write-Host "[1/4] Validando baseline no endpoint primario..."
$baselineChecks = Validate-CriticalFlows -ApiBaseUrl $PrimaryApiBaseUrl -Token $token
$baselineFailed = @($baselineChecks | Where-Object { $_.Result -eq "FAIL" }).Count
if ($baselineFailed -gt 0) {
  throw "Baseline com falhas no endpoint primario. Corrija antes do drill."
}

if ($NonInteractive) {
  Write-Host "[2/4] Modo nao interativo: registrando inicio de incidente automaticamente..."
  Start-Sleep -Seconds ([Math]::Max(0, $SimulatedIncidentDelaySec))
  $incidentStartedAt = Get-Date
  Write-Host "[3/4] Modo nao interativo: registrando inicio de rollback automaticamente..."
  Start-Sleep -Seconds ([Math]::Max(0, $SimulatedRollbackDelaySec))
  $rollbackStartedAt = Get-Date
} else {
  Read-Host "[2/4] Quando o incidente for iniciado, pressione ENTER para registrar o timestamp" | Out-Null
  $incidentStartedAt = Get-Date
  Read-Host "[3/4] Execute o rollback tecnico/de dados. Quando iniciar o comando de rollback, pressione ENTER" | Out-Null
  $rollbackStartedAt = Get-Date
}

Write-Host "[4/4] Aguardando recuperacao no endpoint de rollback..."
$recoveryDeadline = (Get-Date).AddSeconds($RecoveryTimeoutSec)
$recoveredAt = $null
while ((Get-Date) -lt $recoveryDeadline) {
  $health = Invoke-Api -Method "GET" -Url "$RollbackApiBaseUrl/api/health"
  if ($health.Status -eq 200) {
    $recoveredAt = Get-Date
    break
  }
  Start-Sleep -Seconds $PollingIntervalSec
}

if (-not $recoveredAt) {
  throw "Timeout aguardando recuperacao do endpoint de rollback ($RollbackApiBaseUrl)."
}

$recoveryChecks = Validate-CriticalFlows -ApiBaseUrl $RollbackApiBaseUrl -Token $token
$recoveryFailed = @($recoveryChecks | Where-Object { $_.Result -eq "FAIL" }).Count

$rtoSec = [int]($recoveredAt - $incidentStartedAt).TotalSeconds
$rollbackExecSec = [int]($recoveredAt - $rollbackStartedAt).TotalSeconds
$generatedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

$outputAbs = Join-Path (Get-Location) $OutputPath
$outputDir = Split-Path -Parent $outputAbs
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

$lines = @()
$lines += "# Sprint 7 Rollback Drill Report"
$lines += ""
$lines += "Generated at: $generatedAt"
$lines += "Primary API: $PrimaryApiBaseUrl"
$lines += "Rollback API: $RollbackApiBaseUrl"
$lines += ""
$lines += "## Timeline"
$lines += "- Incident started at: $($incidentStartedAt.ToString("yyyy-MM-dd HH:mm:ss"))"
$lines += "- Rollback command started at: $($rollbackStartedAt.ToString("yyyy-MM-dd HH:mm:ss"))"
$lines += "- Service recovered at: $($recoveredAt.ToString("yyyy-MM-dd HH:mm:ss"))"
$lines += "- RTO observado (incidente -> recuperacao): ${rtoSec}s"
$lines += "- Tempo de execucao de rollback (comando -> recuperacao): ${rollbackExecSec}s"
$lines += "- RPO observado: _preencher manualmente_"
$lines += ""
$lines += "## Baseline checks (primary)"
$lines += "| Check | ExpectedStatus | ActualStatus | ActualCode | Result |"
$lines += "|---|---:|---:|---|---|"
foreach ($c in $baselineChecks) {
  $lines += "| $($c.Check) | $($c.ExpectedStatus) | $($c.ActualStatus) | $($c.ActualCode) | $($c.Result) |"
}
$lines += ""
$lines += "## Recovery checks (rollback target)"
$lines += "| Check | ExpectedStatus | ActualStatus | ActualCode | Result |"
$lines += "|---|---:|---:|---|---|"
foreach ($c in $recoveryChecks) {
  $lines += "| $($c.Check) | $($c.ExpectedStatus) | $($c.ActualStatus) | $($c.ActualCode) | $($c.Result) |"
}
$lines += ""
$lines += "Summary: baseline_failed=$baselineFailed, recovery_failed=$recoveryFailed"

Set-Content -Path $outputAbs -Value ($lines -join "`r`n")

Write-Host "Report generated at $outputAbs"
Write-Host "Summary: baseline_failed=$baselineFailed, recovery_failed=$recoveryFailed, rto=${rtoSec}s"

if ($recoveryFailed -gt 0) {
  throw "Drill finalizado com falhas no target de rollback. Consulte: $outputAbs"
}

Write-Host "PASS: drill de rollback finalizado com validacao dos fluxos criticos."
