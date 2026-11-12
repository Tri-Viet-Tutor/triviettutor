param(
    [string]$ContainerName = 'triviettutor-postgres-1',
    [string]$DbUser = 'viettri',
    [string]$DbName = 'viettritutor'
)

$ErrorActionPreference = 'Stop'
$sqlPath = Join-Path $PSScriptRoot 'clean-test-data.sql'

if (-not (Test-Path -LiteralPath $sqlPath)) {
    throw "File clean-test-data.sql not found at $sqlPath"
}

$runningContainers = docker ps --format "{{.Names}}"
if ($runningContainers -notcontains $ContainerName) {
    throw "Container '$ContainerName' is not running. Please start Postgres with: docker compose up -d postgres"
}

Write-Host "Cleaning course, class, and schedule data in container '$ContainerName'..." -ForegroundColor Cyan
Get-Content -LiteralPath $sqlPath -Raw | docker exec -i $ContainerName psql -U $DbUser -d $DbName

if ($LASTEXITCODE -eq 0) {
    Write-Host "Cleaned course, class, and schedule data successfully." -ForegroundColor Green
} else {
    Write-Error "Execution failed with exit code $LASTEXITCODE"
}

