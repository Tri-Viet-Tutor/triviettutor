function Import-ProjectEnvironment {
    param([Parameter(Mandatory)][string]$ProjectRoot)

    $envPath = Join-Path $ProjectRoot '.env'
    if (-not (Test-Path -LiteralPath $envPath)) {
        $envPath = Join-Path $ProjectRoot 'backend/.env'
    }
    if (-not (Test-Path -LiteralPath $envPath)) { return }

    foreach ($line in Get-Content -LiteralPath $envPath -Encoding UTF8) {
        if ($line -match '^\s*(#|$)') { continue }
        if ($line -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$') {
            throw 'Invalid .env entry. Use KEY=value without shell expressions.'
        }
        $key = $Matches[1]
        $value = $Matches[2].Trim()
        if ($key -notmatch '^(DB_[A-Z0-9_]+|LOCAL_DB_[A-Z0-9_]+|JWT_SECRET|APP_PROFILE|SERVER_PORT|SERVER_FORWARD_HEADERS_STRATEGY|CORS_ALLOWED_ORIGINS|FRONTEND_URL|MAIL_USERNAME|APP_GG_PASSWORD|SPRING_MAIL_[A-Z0-9_]+|VNPAY_[A-Z0-9_]+|PAYMENT_[A-Z0-9_]+)$') {
            continue
        }
        if ($value.Length -ge 2 -and (
                ($value.StartsWith('"') -and $value.EndsWith('"')) -or
                ($value.StartsWith("'") -and $value.EndsWith("'")))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        if ([string]::IsNullOrEmpty([Environment]::GetEnvironmentVariable($key, 'Process'))) {
            [Environment]::SetEnvironmentVariable($key, $value, 'Process')
        }
    }
}

function Assert-SupabaseEnvironment {
    foreach ($key in @('DB_URL', 'DB_USERNAME', 'DB_PASSWORD')) {
        $value = [Environment]::GetEnvironmentVariable($key, 'Process')
        if ([string]::IsNullOrWhiteSpace($value) -or $value -match 'YOUR_|replace_with_') {
            throw "Set $key in the root .env or process environment before connecting."
        }
    }
    if ($env:DB_URL -notmatch '^jdbc:postgresql://') {
        throw 'DB_URL must be a PostgreSQL JDBC URL from Supabase Connect.'
    }
    if ($env:DB_URL -match ':6543/') {
        throw 'Use a direct connection or session pooler on port 5432 for this backend and Flyway.'
    }
}
