function Read-VnpayEnvironment {
    param([Parameter(Mandatory)][string]$Path)
    $values = [System.Collections.Generic.Dictionary[string, string]]::new([System.StringComparer]::Ordinal)
    foreach ($line in [System.IO.File]::ReadAllLines($Path)) {
        if ($line -match '^\s*(#|$)') { continue }
        if ($line -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$') { throw 'Invalid environment entry. Use KEY=value.' }
        $key = $Matches[1]
        $value = $Matches[2].Trim()
        if ($values.ContainsKey($key)) { throw "Duplicate environment key: $key" }
        if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or
                ($value.StartsWith("'") -and $value.EndsWith("'")))) { $value = $value.Substring(1, $value.Length - 2) }
        $values[$key] = $value
    }
    return ,$values
}

function Resolve-VnpayEnvironmentValue {
    param([string]$Name, $Values, [int]$Depth = 0)
    if ($Depth -gt 8) { throw 'Environment interpolation is recursive.' }
    $processValue = [Environment]::GetEnvironmentVariable($Name, 'Process')
    $value = if ($null -ne $processValue) { $processValue } elseif ($Values.ContainsKey($Name)) { $Values[$Name] } else { '' }
    return [regex]::Replace($value, '\$\{([A-Za-z_][A-Za-z0-9_]*)\}', {
        param($match)
        Resolve-VnpayEnvironmentValue -Name $match.Groups[1].Value -Values $Values -Depth ($Depth + 1)
    })
}

function Test-VnpayEndpoint {
    param([string]$Value, [switch]$OriginOnly, [switch]$AllowHttp)
    $parsed = $null
    if (-not [uri]::TryCreate($Value, [UriKind]::Absolute, [ref]$parsed)) { return $false }
    $schemes = if ($AllowHttp) { @('https', 'http') } else { @('https') }
    return $parsed.Scheme -in $schemes -and $parsed.Host -and -not $parsed.UserInfo -and
        -not $parsed.Query -and -not $parsed.Fragment -and $Value -notmatch '\*' -and
        (-not $OriginOnly -or $parsed.AbsolutePath -eq '/')
}
