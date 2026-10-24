param([string]$EnvironmentFile = (Join-Path (Split-Path -Parent $PSScriptRoot) '.env'))

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'vnpay-environment.ps1')
$projectRoot = Split-Path -Parent $PSScriptRoot
$targetPath = [System.IO.Path]::GetFullPath($EnvironmentFile)
if (-not (Test-Path -LiteralPath $targetPath -PathType Leaf)) { throw 'Initialize .env or .env.docker first; see the setup guide.' }
$existing = Read-VnpayEnvironment -Path $targetPath
$missing = [System.Collections.Generic.List[string]]::new()
foreach ($line in [System.IO.File]::ReadAllLines((Join-Path $projectRoot '.env.vnpay.example'))) {
    if ($line -match '^([A-Z][A-Z0-9_]*)=(.*)$' -and -not $existing.ContainsKey($Matches[1])) { $missing.Add($line) }
}
if ($missing.Count -gt 0) {
    $content = [System.IO.File]::ReadAllText($targetPath).TrimEnd("`r", "`n") + "`n`n# VNPay Sandbox`n" +
        [string]::Join("`n", $missing) + "`n"
    [System.IO.File]::WriteAllText($targetPath, $content, [System.Text.UTF8Encoding]::new($false))
}
Write-Host "Added $($missing.Count) missing settings to $targetPath. Existing values were preserved."
Write-Host 'Fill merchant credentials privately, then set VNPAY_ENABLED=true and restart the backend.'
Write-Host 'Run check-vnpay-sandbox.ps1 to check configuration and public IPN requirements.'
