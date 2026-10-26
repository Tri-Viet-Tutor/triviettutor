param(
    [ValidateSet('dev', 'supabase')][string]$Profile = 'dev',
    [ValidateRange(1, 65535)][int]$Port = 8080
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'import-project-env.ps1')
Import-ProjectEnvironment -ProjectRoot $projectRoot

if ($Profile -eq 'supabase') {
    Assert-SupabaseEnvironment
    if ([string]::IsNullOrWhiteSpace($env:JWT_SECRET) -or
            $env:JWT_SECRET.Length -lt 32 -or $env:JWT_SECRET -match '^replace_with_') {
        throw 'Set JWT_SECRET to a random secret of at least 32 characters.'
    }
}

$env:APP_PROFILE = $Profile
$env:SPRING_PROFILES_ACTIVE = $Profile
$env:SERVER_PORT = [string]$Port
Push-Location -LiteralPath $projectRoot
try {
    & mvn -f backend/pom.xml spring-boot:run
    if ($LASTEXITCODE -ne 0) { throw "Backend exited with code $LASTEXITCODE." }
} finally {
    Pop-Location
}
