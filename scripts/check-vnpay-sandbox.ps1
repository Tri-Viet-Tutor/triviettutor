param(
    [string]$EnvironmentFile = (Join-Path (Split-Path -Parent $PSScriptRoot) '.env'),
    [switch]$CheckIpn
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'vnpay-environment.ps1')
$values = Read-VnpayEnvironment -Path ([System.IO.Path]::GetFullPath($EnvironmentFile))
$problems = [System.Collections.Generic.List[string]]::new()
function Setting([string]$Name) { Resolve-VnpayEnvironmentValue -Name $Name -Values $values }
if ((Setting 'VNPAY_ENABLED') -ne 'true') { $problems.Add('Set VNPAY_ENABLED=true after configuring credentials.') }
if ((Setting 'VNPAY_TMN_CODE') -notmatch '^[a-zA-Z0-9]{8}$') { $problems.Add('VNPAY_TMN_CODE must be the merchant code issued by VNPay (8 letters/digits).') }
$secret = Setting 'VNPAY_HASH_SECRET'
if ([string]::IsNullOrWhiteSpace($secret) -or $secret -match '(?i)your_|replace_|placeholder|[<>]' -or $secret -ne $secret.Trim()) {
    $problems.Add('VNPAY_HASH_SECRET is missing or contains a placeholder/outer whitespace.')
}
foreach ($key in @('VNPAY_PAYMENT_URL', 'VNPAY_API_URL')) {
    if (-not (Test-VnpayEndpoint (Setting $key))) { $problems.Add("$key must be an HTTPS endpoint without query, fragment or credentials.") }
}
$returnPath = Setting 'VNPAY_RETURN_PATH'
if ($returnPath -notmatch '^/[a-zA-Z0-9/_-]+$' -or $returnPath.StartsWith('//')) { $problems.Add('VNPAY_RETURN_PATH must be a local checkout path.') }
$timeoutValue = 0
if (-not [int]::TryParse((Setting 'VNPAY_TIMEOUT_SECONDS'), [ref]$timeoutValue) -or $timeoutValue -lt 1 -or $timeoutValue -gt 120) {
    $problems.Add('VNPAY_TIMEOUT_SECONDS must be between 1 and 120.')
}
$ttlValue = 0
if (-not [int]::TryParse((Setting 'PAYMENT_INTENT_TTL_MINUTES'), [ref]$ttlValue) -or $ttlValue -lt 1) {
    $problems.Add('PAYMENT_INTENT_TTL_MINUTES must be a positive integer.')
}
$frontendOrigin = Setting 'FRONTEND_URL'
$allowedOrigins = (Setting 'CORS_ALLOWED_ORIGINS') -split ',' | ForEach-Object { $_.Trim().TrimEnd('/') }
if (-not (Test-VnpayEndpoint $frontendOrigin -OriginOnly -AllowHttp) -or $frontendOrigin.TrimEnd('/') -notin $allowedOrigins) {
    $problems.Add('FRONTEND_URL must be an exact HTTP(S) origin included in CORS_ALLOWED_ORIGINS.')
}
foreach ($allowed in $allowedOrigins) {
    if (-not (Test-VnpayEndpoint $allowed -OriginOnly -AllowHttp)) { $problems.Add('CORS_ALLOWED_ORIGINS contains an invalid origin. Wildcards are not allowed.'); break }
}
if ($problems.Count -gt 0) { throw ("VNPay checkout configuration is not ready:`n- " + [string]::Join("`n- ", $problems)) }
Write-Host 'Checkout configuration is valid. Credentials are redacted; verify them with a live VNPay Sandbox checkout.'
$serverAddress = $null
if (-not [System.Net.IPAddress]::TryParse((Setting 'VNPAY_SERVER_IP'), [ref]$serverAddress)) {
    Write-Warning 'Query/refund is not ready: configure VNPAY_SERVER_IP with the provider-approved server address.'
}
$publicBackend = Setting 'VNPAY_PUBLIC_BACKEND_URL'
if (-not (Test-VnpayEndpoint $publicBackend -OriginOnly)) {
    if ($CheckIpn) { throw 'Configure VNPAY_PUBLIC_BACKEND_URL with the public HTTPS backend origin before checking IPN.' }
    Write-Warning 'IPN is not ready: configure VNPAY_PUBLIC_BACKEND_URL and register its /api/v1/payments/vnpay/ipn with VNPay.'
    return
}
$ipnUrl = $publicBackend.TrimEnd('/') + '/api/v1/payments/vnpay/ipn'
Write-Host "Register this IPN URL with VNPay: $ipnUrl"
Write-Host 'The IPN backend must use the same database and merchant credentials as checkout.'
if ($CheckIpn) {
    try { $response = Invoke-RestMethod -Method Get -Uri $ipnUrl -TimeoutSec 10 } catch { throw 'Cannot reach public IPN. Check HTTPS, routing and deployment protection.' }
    if ($response.RspCode -notin @('97', '99') -or -not $response.Message) { throw 'IPN did not return the expected VNPay acknowledgement for an unsigned request.' }
    Write-Host 'IPN is reachable and rejects unsigned requests. No payment was created. Confirm registration with VNPay separately.'
}
