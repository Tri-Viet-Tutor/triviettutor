# ==============================================================================
# VietTriTutor - Smart Startup Script (.ps1)
# 1. Kiem tra file .env so voi .env.example (canh bao / yeu cau cap nhat)
# 2. Kiem tra moi truong PC (DB, Java/Maven cho Backend, Node/npm cho Frontend/Mobile)
# 3. Chay truc tiep tren PC neu du moi truong, chi fallback Docker cho dich vu thieu
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'Continue'
$projectRoot = $PSScriptRoot

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "            VietTriTutor - Startup Script          " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# ------------------------------------------------------------------------------
# 1. Kiem tra file .env va so sanh voi .env.example
# ------------------------------------------------------------------------------
Write-Host "[1/5] Checking environment configuration (.env) ..." -ForegroundColor Yellow
$envPath = Join-Path $projectRoot ".env"
$envExamplePath = Join-Path $projectRoot ".env.example"

if (-not (Test-Path -LiteralPath $envPath)) {
    if (Test-Path -LiteralPath $envExamplePath) {
        Copy-Item -LiteralPath $envExamplePath -Destination $envPath
        Write-Host "[CANH BAO] File .env chua ton tai! Da tu dong tao .env tu .env.example." -ForegroundColor Red
        Write-Host "-> Vui long kiem tra va dien day du cac thong so (JWT_SECRET, DB, v.v.) trong file .env roi chay lai script!" -ForegroundColor Red
        Read-Host "Nhan Enter sau khi ban da chinh sua xong .env de tiep tuc hoac Ctrl+C de thoat"
    } else {
        Write-Host "[LOI] Khong tim thay ca file .env lan .env.example!" -ForegroundColor Red
        exit 1
    }
}

# So sanh cac key giua .env va .env.example
if (Test-Path -LiteralPath $envExamplePath) {
    function Get-EnvKeys($filePath) {
        $keys = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
        foreach ($line in (Get-Content -LiteralPath $filePath)) {
            $trimmed = $line.Trim()
            if ($trimmed -and -not $trimmed.StartsWith('#')) {
                if ($trimmed -match '^([A-Za-z_][A-Za-z0-9_]*)\s*=') {
                    [void]$keys.Add($Matches[1])
                }
            }
        }
        return $keys
    }

    $exampleKeys = Get-EnvKeys $envExamplePath
    $currentKeys = Get-EnvKeys $envPath
    $missingKeys = @()

    foreach ($k in $exampleKeys) {
        if (-not $currentKeys.Contains($k)) {
            $missingKeys += $k
        }
    }

    if ($missingKeys.Count -gt 0) {
        Write-Host "[CANH BAO] File .env cua ban dang thieu cac bien sau so voi .env.example:" -ForegroundColor Red
        foreach ($mk in $missingKeys) {
            Write-Host "  - $mk" -ForegroundColor Magenta
        }
        Write-Host "Vui long bo sung cac bien tren vao file .env de he thong hoat dong chinh xac!" -ForegroundColor Red
        Write-Host ""
    } else {
        Write-Host ".env hop le va day du key theo mau .env.example." -ForegroundColor Green
    }
}

# ------------------------------------------------------------------------------
# 2. Don dep cac port dang bi chiem dung (8080, 5173, 8081)
# ------------------------------------------------------------------------------
Write-Host "`n[2/5] Cleaning up ports: 8080, 5173, 8081 ..." -ForegroundColor Yellow
$ports = @(8080, 5173, 8081)
foreach ($p in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($conn in $conns) {
            try {
                $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
                Write-Host "Killing process $($proc.ProcessName) (PID $($conn.OwningProcess)) on port $p ..." -ForegroundColor DarkYellow
                Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
            } catch {
                Write-Host "Could not stop PID $($conn.OwningProcess): $_" -ForegroundColor DarkGray
            }
        }
    }
}

# ------------------------------------------------------------------------------
# 3. Kiem tra Docker Daemon (de dung lam phuong an backup)
# ------------------------------------------------------------------------------
$dockerAvailable = $false
try {
    $null = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerAvailable = $true
    }
} catch {
    $dockerAvailable = $false
}

# ------------------------------------------------------------------------------
# 4. Kiem tra Database (PostgreSQL tren PC vs Docker fallback)
# ------------------------------------------------------------------------------
Write-Host "`n[3/5] Checking Database environment ..." -ForegroundColor Yellow
$localDbReady = $false

# Test ket noi port 5432 tren PC
$dbTest = Test-NetConnection -ComputerName "127.0.0.1" -Port 5432 -WarningAction SilentlyContinue -InformationLevel Quiet
if ($dbTest) {
    Write-Host "Phat hien PostgreSQL dang chay tren may host (port 5432). Su dung Database noi bo PC." -ForegroundColor Green
    $localDbReady = $true
} else {
    Write-Host "Khong co PostgreSQL chay tren cong 5432 cua PC." -ForegroundColor Yellow
    if ($dockerAvailable) {
        Write-Host "Fallback Docker: Dang khoi dong PostgreSQL container qua Docker Compose..." -ForegroundColor Cyan
        docker compose up -d postgres
        Write-Host "PostgreSQL Docker container san sang!" -ForegroundColor Green
        $localDbReady = $true
    } else {
        Write-Host "[CANH BAO] PC khong co PostgreSQL san sang tren port 5432 va Docker cung khong hoat dong!" -ForegroundColor Red
        Write-Host "Luu y: Neu ban dung Supabase Cloud Database thi Backend van co the ket noi duoc." -ForegroundColor DarkYellow
    }
}

# ------------------------------------------------------------------------------
# 5. Kiem tra Backend (Java 21 & Maven/mvnw vs Docker fallback)
# ------------------------------------------------------------------------------
Write-Host "`n[4/5] Checking Backend environment ..." -ForegroundColor Yellow
$hasJava = $false
try {
    $javaVer = java -version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $hasJava = $true
    }
} catch {
    $hasJava = $false
}

$backendDir = Join-Path $projectRoot "backend"
$hasMvnw = Test-Path (Join-Path $backendDir "mvnw.cmd")
$hasMaven = $false
try {
    $mvnVer = mvn -v 2>&1
    if ($LASTEXITCODE -eq 0) {
        $hasMaven = $true
    }
} catch {
    $hasMaven = $false
}

if ($hasJava -and ($hasMvnw -or $hasMaven)) {
    Write-Host "PC co du Java & Maven. Khoi chay Backend truc tiep tren may host..." -ForegroundColor Green
    if ($hasMvnw) {
        Start-Process cmd -ArgumentList "/k", "cd /d `"$backendDir`" && mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=dev -Dspring.profiles.active=dev"
    } else {
        Start-Process cmd -ArgumentList "/k", "cd /d `"$backendDir`" && mvn spring-boot:run -Dspring-boot.run.profiles=dev -Dspring.profiles.active=dev"
    }
} else {
    Write-Host "PC thieu Java hoac Maven. Kiem tra phuong an backup Docker..." -ForegroundColor Yellow
    if ($dockerAvailable) {
        Write-Host "Fallback Docker: Dang chay Backend bang Docker container..." -ForegroundColor Cyan
        docker compose up -d backend
    } else {
        Write-Host "[LOI] PC thieu Java/Maven de chay Backend va Docker Desktop cung khong chay!" -ForegroundColor Red
    }
}

# ------------------------------------------------------------------------------
# 6. Kiem tra Frontend & Mobile (Node.js & npm vs Docker fallback)
# ------------------------------------------------------------------------------
Write-Host "`n[5/5] Checking Frontend & Mobile environment ..." -ForegroundColor Yellow
$hasNode = $false
try {
    $nodeVer = node -v 2>&1
    if ($LASTEXITCODE -eq 0) {
        $hasNode = $true
    }
} catch {
    $hasNode = $false
}

$frontendDir = Join-Path $projectRoot "frontend"
$mobileDir = Join-Path $projectRoot "mobile"

if ($hasNode) {
    Write-Host "PC da cai dat Node.js. Khoi chay Frontend & Mobile truc tiep..." -ForegroundColor Green
    
    # Khoi dong Frontend Web
    Write-Host "Starting Frontend Web on port 5173..." -ForegroundColor Cyan
    Start-Process cmd -ArgumentList "/k", "cd /d `"$frontendDir`" && npm run dev"
    
    # Khoi dong Mobile App neu thu muc ton tai
    if (Test-Path $mobileDir) {
        Write-Host "Starting Mobile Dev Server on port 8081..." -ForegroundColor Cyan
        Start-Process cmd -ArgumentList "/k", "cd /d `"$mobileDir`" && npm start"
    }
} else {
    Write-Host "PC chua co Node.js. Kiem tra phuong an backup Docker..." -ForegroundColor Yellow
    if ($dockerAvailable) {
        Write-Host "Fallback Docker: Dang chay Frontend bang Docker container..." -ForegroundColor Cyan
        docker compose up -d frontend
        Write-Host "Luu y: Mobile App (Expo) khong duoc dong goi trong Docker. Vui long cai Node.js tren PC de chay Mobile App." -ForegroundColor DarkYellow
    } else {
        Write-Host "[LOI] PC thieu Node.js va Docker Desktop khong chay. Khong the bat Frontend!" -ForegroundColor Red
    }
}

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "Cac dich vu da duoc khoi dong:" -ForegroundColor Cyan
Write-Host " - Backend API:    http://localhost:8080"
Write-Host " - Swagger UI:     http://localhost:8080/swagger-ui.html"
Write-Host " - Frontend Web:   http://localhost:5173"
Write-Host " - Mobile Metro:   http://localhost:8081 (neu chay tren PC)"
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Nhan Enter de hoan tat"
