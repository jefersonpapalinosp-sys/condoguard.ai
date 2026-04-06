param(
  [string]$ApiBaseUrl = "http://localhost:4000",
  [string]$Tenant1Email = "admin@condoguard.ai",
  [string]$Tenant1Password = "password123",
  [string]$Tenant2Email = "admin.cond2@condoguard.ai",
  [string]$Tenant2Password = "password123"
)

$ErrorActionPreference = "Stop"

function Invoke-ApiLogin {
  param(
    [string]$BaseUrl,
    [string]$Email,
    [string]$Password
  )

  $body = @{
    email = $Email
    password = $Password
  } | ConvertTo-Json -Compress

  return Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/auth/login" -ContentType "application/json" -Body $body
}

function Invoke-ApiGet {
  param(
    [string]$BaseUrl,
    [string]$Path,
    [string]$Token
  )
  $headers = @{ Authorization = "Bearer $Token" }
  return Invoke-RestMethod -Method Get -Uri "$BaseUrl$Path" -Headers $headers
}

function Assert-TenantScope {
  param(
    [object[]]$Items,
    [int]$ExpectedTenantId,
    [string]$Context
  )

  if ($null -eq $Items) {
    throw "Falha em ${Context}: payload ausente."
  }

  foreach ($item in $Items) {
    $tenantId = 0
    if ($item.PSObject.Properties.Name -contains "condominiumId") {
      $tenantId = [int]$item.condominiumId
    }
    elseif ($item.PSObject.Properties.Name -contains "condominium_id") {
      $tenantId = [int]$item.condominium_id
    }

    if ($tenantId -ne 0 -and $tenantId -ne $ExpectedTenantId) {
      throw "Falha em ${Context}: encontrado item com tenant $tenantId, esperado $ExpectedTenantId."
    }
  }
}

Write-Host "== Sprint 3 Cross-Tenant Smoke =="
Write-Host "API: $ApiBaseUrl"

$health = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/api/health"
if ($health.dialect -ne "oracle") {
  throw "Health invalido: dialect esperado 'oracle', recebido '$($health.dialect)'."
}
if ($health.dbStatus -ne "oracle_pool_ok") {
  throw "Health invalido: dbStatus esperado 'oracle_pool_ok', recebido '$($health.dbStatus)'."
}

Write-Host "Health OK (oracle_pool_ok)."

$loginC1 = Invoke-ApiLogin -BaseUrl $ApiBaseUrl -Email $Tenant1Email -Password $Tenant1Password
$loginC2 = Invoke-ApiLogin -BaseUrl $ApiBaseUrl -Email $Tenant2Email -Password $Tenant2Password

if (-not $loginC1.token -or -not $loginC2.token) {
  throw "Login sem token para um dos condominios."
}

Write-Host "Login OK para tenants 1 e 2."

$invC1 = Invoke-ApiGet -BaseUrl $ApiBaseUrl -Path "/api/invoices" -Token $loginC1.token
$invC2 = Invoke-ApiGet -BaseUrl $ApiBaseUrl -Path "/api/invoices" -Token $loginC2.token
$mgmtC1 = Invoke-ApiGet -BaseUrl $ApiBaseUrl -Path "/api/management/units" -Token $loginC1.token
$mgmtC2 = Invoke-ApiGet -BaseUrl $ApiBaseUrl -Path "/api/management/units" -Token $loginC2.token
$alertsC1 = Invoke-ApiGet -BaseUrl $ApiBaseUrl -Path "/api/alerts" -Token $loginC1.token
$alertsC2 = Invoke-ApiGet -BaseUrl $ApiBaseUrl -Path "/api/alerts" -Token $loginC2.token

Assert-TenantScope -Items $invC1.items -ExpectedTenantId 1 -Context "invoices C1"
Assert-TenantScope -Items $invC2.items -ExpectedTenantId 2 -Context "invoices C2"
Assert-TenantScope -Items $mgmtC1.units -ExpectedTenantId 1 -Context "management C1"
Assert-TenantScope -Items $mgmtC2.units -ExpectedTenantId 2 -Context "management C2"
Assert-TenantScope -Items $alertsC1.items -ExpectedTenantId 1 -Context "alerts C1"
Assert-TenantScope -Items $alertsC2.items -ExpectedTenantId 2 -Context "alerts C2"

if (@($invC1.items).Count -eq 0 -or @($invC2.items).Count -eq 0) {
  Write-Warning "Uma das listas de invoices veio vazia. Valide seed/migracoes de homolog."
}

Write-Host ""
Write-Host "Resumo:"
Write-Host "  Tenant 1 -> invoices=$(@($invC1.items).Count), management=$(@($mgmtC1.units).Count), alerts=$(@($alertsC1.items).Count)"
Write-Host "  Tenant 2 -> invoices=$(@($invC2.items).Count), management=$(@($mgmtC2.units).Count), alerts=$(@($alertsC2.items).Count)"
Write-Host ""
Write-Host "PASS: isolamento cross-tenant validado sem vazamento por condominiumId."
