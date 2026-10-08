param([ValidateSet('Info', 'Validate', 'Migrate')][string]$Action = 'Validate')

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'import-project-env.ps1')
Import-ProjectEnvironment -ProjectRoot $projectRoot

$env:FLYWAY_URL = if ($env:DB_MIGRATION_URL) { $env:DB_MIGRATION_URL } else { $env:DB_URL }
$env:FLYWAY_USER = if ($env:DB_MIGRATION_USERNAME) { $env:DB_MIGRATION_USERNAME } else { $env:DB_USERNAME }
$env:FLYWAY_PASSWORD = if ($env:DB_MIGRATION_PASSWORD) { $env:DB_MIGRATION_PASSWORD } else { $env:DB_PASSWORD }
foreach ($key in @('FLYWAY_URL', 'FLYWAY_USER', 'FLYWAY_PASSWORD')) {
    $value = [Environment]::GetEnvironmentVariable($key, 'Process')
    if ([string]::IsNullOrWhiteSpace($value) -or $value -match 'YOUR_|replace_with_') {
        throw "Configure $key through DB_MIGRATION_* or DB_* in the root .env."
    }
}
if ($env:FLYWAY_URL -notmatch '^jdbc:postgresql://' -or $env:FLYWAY_URL -match ':6543/') {
    throw 'Flyway requires a PostgreSQL JDBC direct/session connection on port 5432.'
}
if ($env:FLYWAY_URL -notmatch '[?&]sslmode=(require|verify-ca|verify-full)(&|$)') {
    if ($env:FLYWAY_URL -match '[?&]sslmode=') {
        throw 'Use sslmode=require, verify-ca or verify-full for Supabase migrations.'
    }
    $separator = if ($env:FLYWAY_URL.Contains('?')) { '&' } else { '?' }
    $env:FLYWAY_URL += $separator + 'sslmode=require'
}

Push-Location -LiteralPath $projectRoot
try {
    & mvn -f backend/pom.xml ("flyway:" + $Action.ToLowerInvariant())
    if ($LASTEXITCODE -ne 0) { throw "Flyway exited with code $LASTEXITCODE." }
} finally {
    Pop-Location
    Remove-Item Env:FLYWAY_PASSWORD -ErrorAction SilentlyContinue
}
