param(
    [Parameter(Mandatory)][string]$FrontendOrigin,
    [ValidateRange(0,65535)][int]$Port = 0,
    [string]$BindAddress = '127.0.0.1',
    [string]$FixtureGatewayUrl = 'https://gateway.test.invalid/pay'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$uri = [Uri]$FrontendOrigin
if (-not [Net.IPAddress]::Parse($BindAddress).Equals([Net.IPAddress]::Loopback) -or
        $uri.Scheme -ne 'http' -or $uri.Host -notin @('localhost','127.0.0.1') -or $uri.AbsolutePath -ne '/') {
    throw 'Use loopback only and an exact frontend origin.'
}
if (([Uri]$FixtureGatewayUrl).Host -notlike '*.test.invalid') {
    throw 'This isolated preview only supports an inert .test.invalid gateway, never live VNPay.'
}
# Do not load .env: preview credentials and data are generated and discarded.
$env:WALLET_PREVIEW_ORIGIN = $FrontendOrigin.TrimEnd('/')
$env:WALLET_PREVIEW_BIND = $BindAddress
$env:WALLET_PREVIEW_PORT = [string]$Port
$env:WALLET_PREVIEW_GATEWAY_URL = $FixtureGatewayUrl
$env:WALLET_PREVIEW_SESSION_FILE = Join-Path $projectRoot 'outputs/wallet-preview/session.json'
Push-Location -LiteralPath $projectRoot
try {
    & mvn -f backend/pom.xml test-compile dependency:build-classpath '-DincludeScope=test' '-Dmdep.outputFile=target/wallet-classpath.txt' '-DskipTests'
    if ($LASTEXITCODE -ne 0) { throw 'Could not compile wallet preview.' }
    $dependencies = [IO.File]::ReadAllText((Join-Path $projectRoot 'backend/target/wallet-classpath.txt')).Trim()
    $classpath = [string]::Join([IO.Path]::PathSeparator, @(
        (Join-Path $projectRoot 'backend/target/test-classes'),
        (Join-Path $projectRoot 'backend/target/classes'), $dependencies))
    $javaBinary = 'java'
    if ($env:JAVA_HOME) {
        $candidate = Join-Path $env:JAVA_HOME 'bin/java.exe'
        if (Test-Path -LiteralPath $candidate) { $javaBinary = $candidate }
    }
    & $javaBinary -cp $classpath com.viettritutor.WalletPreviewServer
    if ($LASTEXITCODE -ne 0) { throw "Wallet preview exited with code $LASTEXITCODE." }
} finally { Pop-Location }
