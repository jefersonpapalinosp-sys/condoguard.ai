param(
  [string]$ApiBaseUrl = "http://localhost:4000",
  [string]$AdminTokenTenant1 = "",
  [string]$AdminTokenTenant2 = "",
  [string]$MoradorToken = "",
  [string]$OutputPath = "docs/sprint11_security_tenancy_smoke_report.md"
)

$ErrorActionPreference = "Stop"

function Get-BodyField {
  param(
    $Body,
    [string]$Path
  )

  if (-not $Body -or -not $Path) {
    return $null
  }

  $current = $Body
  foreach ($segment in ($Path -split "\.")) {
    if ($null -eq $current) {
      return $null
    }

    if ($current -is [System.Collections.IDictionary]) {
      $current = $current[$segment]
      continue
    }

    $property = $current.PSObject.Properties[$segment]
    if (-not $property) {
      return $null
    }
    $current = $property.Value
  }

  return $current
}

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Url,
    [hashtable]$Headers = $null,
    [string]$Body = $null
  )

  try {
    if ($Body) {
      $response = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -ContentType "application/json" -Body $Body -UseBasicParsing
    } else {
      $response = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -UseBasicParsing
    }

    $parsedBody = $null
    if ($response.Content) {
      try {
        $parsedBody = $response.Content | ConvertFrom-Json -Depth 20
      } catch {
        $parsedBody = $null
      }
    }

    return @{
      Status = [int]$response.StatusCode
      Body = $parsedBody
      RawBody = $response.Content
      ErrorCode = $null
      TraceHeader = $response.Headers["x-trace-id"]
      ErrorTraceId = Get-BodyField -Body $parsedBody -Path "error.traceId"
    }
  } catch {
    $status = 0
    $rawBody = $null
    $parsedBody = $null
    $errorCode = $null
    $traceHeader = $null
    $errorTraceId = $null

    if ($_.Exception.Response) {
      $response = $_.Exception.Response
      try {
        $status = [int]$response.StatusCode
      } catch {
        try {
          $status = [int]$response.StatusCode.value__
        } catch {}
      }

      try {
        $traceHeader = $response.Headers["x-trace-id"]
      } catch {}

      try {
        $stream = $response.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $rawBody = $reader.ReadToEnd()
          $reader.Close()
        }
      } catch {}

      if ($rawBody) {
        try {
          $parsedBody = $rawBody | ConvertFrom-Json -Depth 20
          $errorCode = Get-BodyField -Body $parsedBody -Path "error.code"
          $errorTraceId = Get-BodyField -Body $parsedBody -Path "error.traceId"
        } catch {}
      }
    }

    return @{
      Status = $status
      Body = $parsedBody
      RawBody = $rawBody
      ErrorCode = $errorCode
      TraceHeader = $traceHeader
      ErrorTraceId = $errorTraceId
    }
  }
}

function New-CheckResult {
  param(
    [string]$Name,
    [bool]$Pass,
    [string]$Evidence = ""
  )

  return [PSCustomObject]@{
    Check = $Name
    Result = if ($Pass) { "PASS" } else { "FAIL" }
    Evidence = if ($Evidence) { $Evidence } else { "-" }
  }
}

if (-not $AdminTokenTenant1 -or -not $AdminTokenTenant2 -or -not $MoradorToken) {
  throw "Informe -AdminTokenTenant1, -AdminTokenTenant2 e -MoradorToken para executar o smoke completo da Sprint 11."
}

$checks = @()
$headersTenant1 = @{ Authorization = "Bearer $AdminTokenTenant1" }
$headersTenant2 = @{ Authorization = "Bearer $AdminTokenTenant2" }
$headersMorador = @{ Authorization = "Bearer $MoradorToken" }

$health = Invoke-Api -Method "GET" -Url "$ApiBaseUrl/api/health" -Headers @{ "X-Trace-Id" = "sprint11-smoke-trace" }
if ($health.Status -ne 200) {
  throw "Falha ao consultar health. Status=$($health.Status)"
}

$checks += New-CheckResult -Name "Health responde com trace header reaproveitado" -Pass ($health.TraceHeader -eq "sprint11-smoke-trace") -Evidence "traceHeader=$($health.TraceHeader)"

$alerts = Invoke-Api -Method "GET" -Url "$ApiBaseUrl/api/alerts" -Headers $headersTenant1
$checks += New-CheckResult -Name "Admin tenant 1 acessa /api/alerts" -Pass ($alerts.Status -eq 200) -Evidence "status=$($alerts.Status)"

$moradorForbidden = Invoke-Api -Method "GET" -Url "$ApiBaseUrl/api/integrations/enel/runs" -Headers $headersMorador
$checks += New-CheckResult -Name "Morador recebe FORBIDDEN em integracao ENEL" -Pass ($moradorForbidden.Status -eq 403 -and $moradorForbidden.ErrorCode -eq "FORBIDDEN") -Evidence "status=$($moradorForbidden.Status); code=$($moradorForbidden.ErrorCode)"

$invalidToken = Invoke-Api -Method "GET" -Url "$ApiBaseUrl/api/alerts" -Headers @{ Authorization = "Bearer $($AdminTokenTenant1).invalid" }
$checks += New-CheckResult -Name "Token invalido retorna 401 com traceId" -Pass ($invalidToken.Status -eq 401 -and $invalidToken.ErrorCode -eq "INVALID_TOKEN" -and $invalidToken.TraceHeader -and $invalidToken.ErrorTraceId -and $invalidToken.TraceHeader -eq $invalidToken.ErrorTraceId) -Evidence "status=$($invalidToken.Status); code=$($invalidToken.ErrorCode); traceHeader=$($invalidToken.TraceHeader); errorTraceId=$($invalidToken.ErrorTraceId)"

$enelCreate = Invoke-Api -Method "POST" -Url "$ApiBaseUrl/api/integrations/enel/runs" -Headers $headersTenant1 -Body (@{
  source = "manual_assisted"
  notes = "Smoke Sprint 11 ENEL"
  items = @(
    @{
      externalReference = "SMOKE-ENEL-T1-001"
      unit = "A-101"
      reference = "04/2026"
      dueDate = "2026-04-10"
      amount = 145.90
      status = "pending"
      documentHash = "smoke-enel-tenant-1"
    }
  )
} | ConvertTo-Json -Depth 10)

$enelRunId = Get-BodyField -Body $enelCreate.Body -Path "run.runId"
$checks += New-CheckResult -Name "Admin tenant 1 cria execucao ENEL" -Pass ($enelCreate.Status -eq 201 -and $enelRunId) -Evidence "status=$($enelCreate.Status); runId=$enelRunId"

$enelCrossTenant = Invoke-Api -Method "GET" -Url "$ApiBaseUrl/api/integrations/enel/runs/$enelRunId" -Headers $headersTenant2
$checks += New-CheckResult -Name "Tenant 2 nao acessa run ENEL do tenant 1" -Pass ($enelCrossTenant.Status -eq 404 -and $enelCrossTenant.ErrorCode -eq "NOT_FOUND") -Evidence "status=$($enelCrossTenant.Status); code=$($enelCrossTenant.ErrorCode)"

$enelAudit = Invoke-Api -Method "GET" -Url "$ApiBaseUrl/api/security/audit?event=integration_cross_tenant_run_access_denied" -Headers $headersTenant2
$enelAuditItems = @(Get-BodyField -Body $enelAudit.Body -Path "items")
$enelAuditMatch = $false
foreach ($item in $enelAuditItems) {
  if ((Get-BodyField -Body $item -Path "provider") -eq "enel" -and (Get-BodyField -Body $item -Path "targetRunId") -eq $enelRunId) {
    $enelAuditMatch = $true
    break
  }
}
$checks += New-CheckResult -Name "Auditoria registra sonda cross-tenant ENEL" -Pass ($enelAudit.Status -eq 200 -and $enelAuditMatch) -Evidence "status=$($enelAudit.Status); returned=$($enelAuditItems.Count)"

$sabespCreate = Invoke-Api -Method "POST" -Url "$ApiBaseUrl/api/integrations/sabesp/runs" -Headers $headersTenant1 -Body (@{
  source = "manual_assisted"
  notes = "Smoke Sprint 11 SABESP"
  items = @(
    @{
      externalReference = "SMOKE-SABESP-T1-001"
      unit = "A-101"
      reference = "04/2026"
      readingDate = "2026-04-08"
      dueDate = "2026-04-20"
      consumptionM3 = 31.7
      amount = 189.40
      status = "pending"
      documentHash = "smoke-sabesp-tenant-1"
    }
  )
} | ConvertTo-Json -Depth 10)

$sabespRunId = Get-BodyField -Body $sabespCreate.Body -Path "run.runId"
$checks += New-CheckResult -Name "Admin tenant 1 cria execucao SABESP" -Pass ($sabespCreate.Status -eq 201 -and $sabespRunId) -Evidence "status=$($sabespCreate.Status); runId=$sabespRunId"

$sabespCrossTenant = Invoke-Api -Method "GET" -Url "$ApiBaseUrl/api/integrations/sabesp/runs/$sabespRunId" -Headers $headersTenant2
$checks += New-CheckResult -Name "Tenant 2 nao acessa run SABESP do tenant 1" -Pass ($sabespCrossTenant.Status -eq 404 -and $sabespCrossTenant.ErrorCode -eq "NOT_FOUND") -Evidence "status=$($sabespCrossTenant.Status); code=$($sabespCrossTenant.ErrorCode)"

$sabespAudit = Invoke-Api -Method "GET" -Url "$ApiBaseUrl/api/security/audit?event=integration_cross_tenant_run_access_denied" -Headers $headersTenant2
$sabespAuditItems = @(Get-BodyField -Body $sabespAudit.Body -Path "items")
$sabespAuditMatch = $false
foreach ($item in $sabespAuditItems) {
  if ((Get-BodyField -Body $item -Path "provider") -eq "sabesp" -and (Get-BodyField -Body $item -Path "targetRunId") -eq $sabespRunId) {
    $sabespAuditMatch = $true
    break
  }
}
$checks += New-CheckResult -Name "Auditoria registra sonda cross-tenant SABESP" -Pass ($sabespAudit.Status -eq 200 -and $sabespAuditMatch) -Evidence "status=$($sabespAudit.Status); returned=$($sabespAuditItems.Count)"

$failed = @($checks | Where-Object { $_.Result -eq "FAIL" }).Count
$generatedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

$outputAbs = Join-Path (Get-Location) $OutputPath
$outputDir = Split-Path -Parent $outputAbs
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

$lines = @()
$lines += "# Sprint 11 Security and Tenancy Smoke Report"
$lines += ""
$lines += "Generated at: $generatedAt"
$lines += "API: $ApiBaseUrl"
$lines += "Health: authProvider=$($health.Body.authProvider), oidcConfigured=$($health.Body.oidcConfigured), dbStatus=$($health.Body.dbStatus)"
$lines += ""
$lines += "| Check | Result | Evidence |"
$lines += "|---|---|---|"
foreach ($c in $checks) {
  $lines += "| $($c.Check) | $($c.Result) | $($c.Evidence) |"
}
$lines += ""
$lines += "Summary: total=$($checks.Count), failed=$failed"
$lines += ""
$lines += "Acceptance guard:"
$lines += "- all checks must PASS"
$lines += "- cross-tenant detail must stay NOT_FOUND for the caller"
$lines += "- audit trail must register integration_cross_tenant_run_access_denied"
$lines += "- invalid token must return a correlatable traceId"

Set-Content -Path $outputAbs -Value ($lines -join "`r`n")

Write-Host "Report generated at $outputAbs"
Write-Host "Summary: total=$($checks.Count), failed=$failed"

if ($failed -gt 0) {
  throw "Sprint 11 smoke finished with failures. Check report: $outputAbs"
}

Write-Host "PASS: Sprint 11 security and tenancy smoke validated."
