param([ValidateRange(1,65535)][int]$Port = 8080)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'import-project-env.ps1')
Import-ProjectEnvironment -ProjectRoot $projectRoot
& (Join-Path $PSScriptRoot 'check-vnpay-sandbox.ps1') -EnvironmentFile (Join-Path $projectRoot '.env')
if (-not $env:VNPAY_PREVIEW_FRONTEND_ORIGIN) { $env:VNPAY_PREVIEW_FRONTEND_ORIGIN = $env:FRONTEND_URL }
$env:VNPAY_PREVIEW_SESSION_FILE = Join-Path $projectRoot 'outputs/vnpay-preview/session.json'
Push-Location -LiteralPath $projectRoot
try {
    & mvn -f backend/pom.xml test-compile dependency:build-classpath '-DincludeScope=test' '-Dmdep.outputFile=target/vnpay-classpath.txt' '-DskipTests'
    if ($LASTEXITCODE -ne 0) { throw 'Could not compile the preview server.' }
    $dependencies = [IO.File]::ReadAllText((Join-Path $projectRoot 'backend/target/vnpay-classpath.txt')).Trim()
    $classpath = [string]::Join([IO.Path]::PathSeparator, @((Join-Path $projectRoot 'backend/target/test-classes'), (Join-Path $projectRoot 'backend/target/classes'), $dependencies))
    $javaBinary = 'java'
    if ($env:JAVA_HOME) {
        $binaryName = if ([IO.Path]::DirectorySeparatorChar -eq '\') { 'bin/java.exe' } else { 'bin/java' }
        $candidate = Join-Path $env:JAVA_HOME $binaryName
        if (Test-Path -LiteralPath $candidate) { $javaBinary = $candidate }
    }
    & $javaBinary '-XX:MaxRAMPercentage=70' -cp $classpath com.viettritutor.VnpaySandboxPreview "--server.port=$Port"
    if ($LASTEXITCODE -ne 0) { throw "Preview server exited with code $LASTEXITCODE." }
} finally { Pop-Location }
