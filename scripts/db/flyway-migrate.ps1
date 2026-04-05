param(
  [string]$FlywayImage = "flyway/flyway:10.17.1",
  [string]$Locations = "filesystem:/flyway/sql"
)

$ErrorActionPreference = "Stop"

if (-not $env:ORACLE_USER -or -not $env:ORACLE_PASSWORD -or -not $env:ORACLE_CONNECT_STRING) {
  throw "Defina ORACLE_USER, ORACLE_PASSWORD e ORACLE_CONNECT_STRING antes de rodar o Flyway."
}

$projectRoot = Resolve-Path "$PSScriptRoot\..\.."
$sqlDir = Resolve-Path "$projectRoot\database\flyway\sql"
$jdbcUrl = "jdbc:oracle:thin:@$($env:ORACLE_CONNECT_STRING)"

Write-Host "Executando Flyway migrate..."
Write-Host "JDBC URL: $jdbcUrl"
Write-Host "SQL Dir: $sqlDir"

docker run --rm `
  -v "${sqlDir}:/flyway/sql" `
  "$FlywayImage" `
  -url="$jdbcUrl" `
  -user="$($env:ORACLE_USER)" `
  -password="$($env:ORACLE_PASSWORD)" `
  -locations="$Locations" `
  migrate
