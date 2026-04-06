param(
  [string]$ApiBaseUrl = "http://localhost:4000",
  [string]$AccessToken = "",
  [string]$OutputPath = "docs/sprint3_s7_oidc_final_gate_report.md"
)

$ErrorActionPreference = "Stop"

if (-not $AccessToken) {
  $AccessToken = [string]$env:OIDC_ACCESS_TOKEN
}

if (-not $AccessToken) {
  throw "Informe -AccessToken (ou variavel de ambiente OIDC_ACCESS_TOKEN) para executar o gate final OIDC."
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..\..")
$s3Script = Join-Path $repoRoot "scripts\security\sprint3-oidc-closure-smoke.ps1"
$s7Script = Join-Path $repoRoot "scripts\release\sprint7-hml-go-live-smoke.ps1"
$s3Report = "docs/sprint3_oidc_smoke_report.md"
$s7Report = "docs/sprint7_hml_smoke_report.md"

$script:results = @()

function Add-Result {
  param(
    [string]$Check,
    [string]$Status,
    [string]$Details
  )

  $script:results += [PSCustomObject]@{
    Check = $Check
    Status = $Status
    Details = $Details
  }
}

Write-Host "== Gate Final OIDC (S3-01 + S7-01) =="
Write-Host "API: $ApiBaseUrl"

try {
  & $s3Script -ApiBaseUrl $ApiBaseUrl -AccessToken $AccessToken -OutputPath $s3Report
  Add-Result -Check "S3-01 OIDC closure smoke" -Status "PASS" -Details "Relatorio: $s3Report"
} catch {
  Add-Result -Check "S3-01 OIDC closure smoke" -Status "FAIL" -Details "$($_.Exception.Message)"
}

try {
  & $s7Script -ApiBaseUrl $ApiBaseUrl -RequireOidc -AccessToken $AccessToken -OutputPath $s7Report
  Add-Result -Check "S7-01 OIDC go-live smoke" -Status "PASS" -Details "Relatorio: $s7Report"
} catch {
  Add-Result -Check "S7-01 OIDC go-live smoke" -Status "FAIL" -Details "$($_.Exception.Message)"
}

$generatedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$failed = @($script:results | Where-Object { $_.Status -ne "PASS" }).Count
$outputAbs = Join-Path $repoRoot $OutputPath
$outputDir = Split-Path -Parent $outputAbs
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

$lines = @()
$lines += "# Sprint 3 + Sprint 7 OIDC Final Gate Report"
$lines += ""
$lines += "Generated at: $generatedAt"
$lines += "API: $ApiBaseUrl"
$lines += ""
$lines += "| Check | Status | Details |"
$lines += "|---|---|---|"
foreach ($r in $script:results) {
  $detailsEscaped = ($r.Details -replace "\|", "\|")
  $lines += "| $($r.Check) | $($r.Status) | $detailsEscaped |"
}
$lines += ""
$lines += "Summary: total=$($script:results.Count), failed=$failed"
$lines += ""
$lines += "Gate criteria:"
$lines += "- S3-01 OIDC closure smoke = PASS"
$lines += "- S7-01 OIDC go-live smoke = PASS"

Set-Content -Path $outputAbs -Value ($lines -join "`r`n")

Write-Host "Report generated at $outputAbs"
Write-Host "Summary: total=$($script:results.Count), failed=$failed"

if ($failed -gt 0) {
  throw "Gate final OIDC finalizado com falhas. Consulte: $outputAbs"
}

Write-Host "PASS: Gate final OIDC (S3-01 + S7-01) validado."
