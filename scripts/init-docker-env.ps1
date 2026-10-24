param(
    [string]$EnvironmentFile = (Join-Path (Split-Path -Parent $PSScriptRoot) '.env.docker')
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$templatePath = Join-Path $projectRoot '.env.docker.example'
$environmentPath = [System.IO.Path]::GetFullPath($EnvironmentFile)
$lines = New-Object 'System.Collections.Generic.List[string]'
$entries = [System.Collections.Generic.Dictionary[string, int]]::new([System.StringComparer]::Ordinal)
$values = [System.Collections.Generic.Dictionary[string, string]]::new([System.StringComparer]::Ordinal)

function Read-EnvironmentValue {
    param([string]$Value)

    $result = $Value.Trim()
    if ($result.Length -ge 2 -and (
            ($result.StartsWith('"') -and $result.EndsWith('"')) -or
            ($result.StartsWith("'") -and $result.EndsWith("'")))) {
        $result = $result.Substring(1, $result.Length - 2)
    }
    return $result
}

function New-LocalSecret {
    $bytes = New-Object byte[] 32
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $generator.GetBytes($bytes)
        return [System.BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
    } finally {
        $generator.Dispose()
    }
}

if (Test-Path -LiteralPath $environmentPath -PathType Leaf) {
    $lines.AddRange([System.IO.File]::ReadAllLines($environmentPath))
} else {
    $lines.AddRange([System.IO.File]::ReadAllLines($templatePath))
}

for ($index = 0; $index -lt $lines.Count; $index++) {
    $line = $lines[$index]
    if ($line -match '^\s*(#|$)') { continue }
    if ($line -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$') {
        throw "Invalid environment entry at line $($index + 1). Use KEY=value."
    }
    $key = $Matches[1]
    $value = $Matches[2]
    if ($entries.ContainsKey($key)) {
        throw "Duplicate environment key: $key."
    }
    $entries[$key] = $index
    $values[$key] = Read-EnvironmentValue $value
}

foreach ($line in [System.IO.File]::ReadAllLines($templatePath)) {
    if ($line -match '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
        $key = $Matches[1]
        $value = $Matches[2]
        if (-not $entries.ContainsKey($key)) {
            $entries[$key] = $lines.Count
            $values[$key] = Read-EnvironmentValue $value
            $lines.Add($line)
        }
    }
}

foreach ($key in @('LOCAL_DB_PASSWORD', 'JWT_SECRET', 'PGADMIN_PASSWORD')) {
    if ([string]::IsNullOrWhiteSpace($values[$key])) {
        $values[$key] = New-LocalSecret
        $lines[$entries[$key]] = "$key=$($values[$key])"
    }
}

$composePath = Join-Path $projectRoot 'docker-compose.yml'
foreach ($reference in [regex]::Matches([System.IO.File]::ReadAllText($composePath), '\$\{([A-Z][A-Z0-9_]*):\?')) {
    $key = $reference.Groups[1].Value
    if (-not $values.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($values[$key])) {
        throw "Set $key in the Docker environment file before continuing."
    }
}

if ([System.Text.Encoding]::UTF8.GetByteCount($values['JWT_SECRET']) -lt 32) {
    throw 'JWT_SECRET must contain at least 32 UTF-8 bytes. Existing secrets were not changed.'
}

$encoding = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines($environmentPath, $lines, $encoding)
Write-Host "Docker environment ready: $environmentPath"
