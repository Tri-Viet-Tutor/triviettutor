[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "VietTriTutor - Startup Script"

$rootDir = $PSScriptRoot
if (-not $rootDir) { $rootDir = (Get-Location).Path }

# Ham dong tat ca cac cua so va giai phong port
function Stop-AllServices {
    param($backend, $frontend, $mobile)

    Write-Host "`nDang dong toan bo cac cua so ung dung..." -ForegroundColor Yellow

    @($backend, $frontend, $mobile) | ForEach-Object {
        if ($_ -and !$_.HasExited) {
            Write-Host " - Dong cua so va tien trinh (PID: $($_.Id))..." -ForegroundColor DarkGray
            taskkill /F /T /PID $_.Id 2>$null | Out-Null
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        }
    }

    # Quet sach lai cac port de dam bao giai phong hoan toan
    8080, 5173, 8081 | ForEach-Object {
        $port = $_
        Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | ForEach-Object {
            $pId = $_.OwningProcess
            if ($pId -and $pId -gt 0) {
                taskkill /F /T /PID $pId 2>$null | Out-Null
            }
        }
    }
}

# Ham nap dataset mau tu thu muc data
function Import-SampleData {
    param($dataFile)

    if (-not (Test-Path -LiteralPath $dataFile)) {
        Write-Host " - Khong tim thay file du lieu: $dataFile" -ForegroundColor DarkGray
        return
    }

    Write-Host " - Dang nap dataset mau: $(Split-Path $dataFile -Leaf) ..." -ForegroundColor Cyan

    # Doc thong tin database tu .env
    $dbName = "viettritutor"
    $dbUser = "viettri"
    $dbPass = "viettripassword"
    $envFile = Join-Path $rootDir ".env"

    if (Test-Path $envFile) {
        foreach ($line in (Get-Content -LiteralPath $envFile)) {
            if ($line -match '^\s*LOCAL_DB_NAME\s*=\s*(.+)$') { $dbName = $Matches[1].Trim() }
            if ($line -match '^\s*LOCAL_DB_USERNAME\s*=\s*(.+)$') { $dbUser = $Matches[1].Trim() }
            if ($line -match '^\s*LOCAL_DB_PASSWORD\s*=\s*(.+)$') { $dbPass = $Matches[1].Trim() }
        }
    }

    # Uu tien chay qua Docker PostgreSQL neu container dang chay hoac chay truc tiep psql
    $dockerRunning = $false
    try {
        $null = docker info 2>&1
        if ($LASTEXITCODE -eq 0) { $dockerRunning = $true }
    } catch { $dockerRunning = $false }

    if ($dockerRunning) {
        # Copy sql file vao container va thuc thi
        $targetInContainer = "/tmp/" + (Split-Path $dataFile -Leaf)
        docker compose cp "$dataFile" "postgres:$targetInContainer" 2>$null | Out-Null
        docker compose exec -T postgres sh -c "PGPASSWORD='$dbPass' psql -U '$dbUser' -d '$dbName' -f '$targetInContainer'" 2>$null | Out-Null
        Write-Host " - Da nap du lieu vao PostgreSQL container thanh cong!" -ForegroundColor Green
    } else {
        # Thu psql truc tiep tren may host
        if (Get-Command psql -ErrorAction SilentlyContinue) {
            $env:PGPASSWORD = $dbPass
            psql -h localhost -U $dbUser -d $dbName -f "$dataFile" 2>$null | Out-Null
            Write-Host " - Da nap du lieu vao PostgreSQL host thanh cong!" -ForegroundColor Green
        }
    }
}

do {
    Clear-Host
    Write-Host "===================================================" -ForegroundColor Cyan
    Write-Host "            VietTriTutor - Startup Script          " -ForegroundColor Cyan
    Write-Host "===================================================" -ForegroundColor Cyan
    Write-Host ""

    # 1. Kiem tra file .env va so sanh voi .env.example
    Write-Host "[1/6] Checking environment configuration (.env) ..." -ForegroundColor Yellow
    $envPath = Join-Path $rootDir ".env"
    $envExamplePath = Join-Path $rootDir ".env.example"

    if (-not (Test-Path -LiteralPath $envPath)) {
        if (Test-Path -LiteralPath $envExamplePath) {
            Copy-Item -LiteralPath $envExamplePath -Destination $envPath
            Write-Host "[CANH BAO] File .env chua ton tai! Da tu dong tao .env tu .env.example." -ForegroundColor Red
            Write-Host "-> Vui long kiem tra va dien thong tin trong .env roi chay lai!" -ForegroundColor Red
            Read-Host "Nhan Enter de tiep tuc hoac Ctrl+C de thoat"
        }
    }

    # 2. Don dep cac port cu (8080, 5173, 8081)
    Write-Host "`n[2/6] Dang kiem tra va giai phong cac cong 8080, 5173, 8081..." -ForegroundColor Yellow
    8080, 5173, 8081 | ForEach-Object {
        $port = $_
        Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | ForEach-Object {
            $pId = $_.OwningProcess
            if ($pId -and $pId -gt 0) {
                Write-Host " - Giai phong cong $port (PID: $pId)" -ForegroundColor DarkGray
                taskkill /F /T /PID $pId 2>$null | Out-Null
            }
        }
    }

    # 3. Kiem tra Database (PC vs Docker)
    Write-Host "`n[3/6] Dang kiem tra Database PostgreSQL..." -ForegroundColor Yellow
    $dbTest = Test-NetConnection -ComputerName "127.0.0.1" -Port 5432 -WarningAction SilentlyContinue -InformationLevel Quiet
    if ($dbTest) {
        Write-Host " - PostgreSQL dang chay tren port 5432 cua PC." -ForegroundColor Green
        $dockerAvailable = $false
        try {
            $null = docker info 2>&1
            if ($LASTEXITCODE -eq 0) { $dockerAvailable = $true }
        } catch { $dockerAvailable = $false }
    } else {
        # Kiem tra xem Docker daemon co dang hoat dong khong
        $dockerRunning = $false
        try {
            $null = docker info 2>&1
            if ($LASTEXITCODE -eq 0) { $dockerRunning = $true }
        } catch { $dockerRunning = $false }

        if (-not $dockerRunning) {
            Write-Host "`n=======================================================" -ForegroundColor Red
            Write-Host "[LOI] Khong tim thay PostgreSQL tren PC va Docker chua duoc mo!" -ForegroundColor Red
            Write-Host "-> Vui long khoi dong Docker Desktop truoc khi chay script nay." -ForegroundColor Yellow
            Write-Host "=======================================================" -ForegroundColor Red
            Read-Host "`nNhan Enter de thoat"
            exit 1
        }

        $dockerAvailable = $true
        Write-Host " - Khoi dong PostgreSQL qua Docker Compose..." -ForegroundColor Cyan
        docker compose up -d postgres
        Start-Sleep -Seconds 3
        Write-Host " - PostgreSQL container san sang!" -ForegroundColor Green
    }

    # 4. Khoi dong Backend (Spring Boot :8080)
    Write-Host "`n[4/6] Dang khoi dong Backend (Spring Boot :8080)..." -ForegroundColor Yellow
    $hasJava = $false
    try {
        $null = java -version 2>&1
        if ($LASTEXITCODE -eq 0) { $hasJava = $true }
    } catch { $hasJava = $false }

    $backendProcess = $null
    if ($hasJava) {
        $backendCmd = if (Test-Path "$rootDir\backend\mvnw.cmd") {
            "mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=dev -Dspring.profiles.active=dev"
        } else {
            "mvn spring-boot:run -Dspring-boot.run.profiles=dev -Dspring.profiles.active=dev"
        }
        $backendProcess = Start-Process cmd.exe -WorkingDirectory "$rootDir\backend" -ArgumentList "/k title VietTriTutor - Backend (8080) && $backendCmd" -PassThru
        Write-Host " - Backend da khoi dong tren may host (PID: $($backendProcess.Id))" -ForegroundColor Green
    } else {
        if ($dockerAvailable) {
            Write-Host " - PC thieu Java. Chay Backend bang Docker..." -ForegroundColor Cyan
            docker compose up -d backend
        } else {
            Write-Host " - [LOI] Khong the chay Backend vi thieu Java va Docker!" -ForegroundColor Red
        }
    }

    # Nap dataset mau sau khi DB/Backend san sang
    $dataCandidates = @(
        (Join-Path $rootDir "data\sample_data.sql"),
        (Join-Path $rootDir "backend\src\main\resources\data\sample_data.sql")
    )
    $foundDataFile = $dataCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($foundDataFile) {
        Write-Host "`n[*] Dang kiem tra va cap nhat du lieu mau vao Database..." -ForegroundColor Yellow
        Import-SampleData -dataFile $foundDataFile
    }

    # 5. Khoi dong Frontend (React + Vite :5173)
    Write-Host "`n[5/6] Dang khoi dong Frontend (React + Vite :5173)..." -ForegroundColor Yellow
    $hasNode = $false
    try {
        $null = node -v 2>&1
        if ($LASTEXITCODE -eq 0) { $hasNode = $true }
    } catch { $hasNode = $false }

    $frontendProcess = $null
    if ($hasNode) {
        $frontendProcess = Start-Process cmd.exe -WorkingDirectory "$rootDir\frontend" -ArgumentList "/k title VietTriTutor - Frontend (5173) && npm run dev" -PassThru
        Write-Host " - Frontend da khoi dong tren may host (PID: $($frontendProcess.Id))" -ForegroundColor Green
    } else {
        if ($dockerAvailable) {
            Write-Host " - PC thieu Node.js. Chay Frontend bang Docker..." -ForegroundColor Cyan
            docker compose up -d frontend
        } else {
            Write-Host " - [LOI] Khong the chay Frontend vi thieu Node.js va Docker!" -ForegroundColor Red
        }
    }

    # 6. Khoi dong Mobile (Expo :8081)
    Write-Host "`n[6/6] Dang khoi dong Mobile (Expo :8081)..." -ForegroundColor Yellow
    $mobileProcess = $null
    if ($hasNode -and (Test-Path "$rootDir\mobile")) {
        $mobileProcess = Start-Process cmd.exe -WorkingDirectory "$rootDir\mobile" -ArgumentList "/k title VietTriTutor - Mobile (8081) && npm start" -PassThru
        Write-Host " - Mobile da khoi dong tren may host (PID: $($mobileProcess.Id))" -ForegroundColor Green
    } else {
        Write-Host " - Bo qua khoi dong Mobile tren host." -ForegroundColor DarkGray
    }

    Write-Host "`n===================================================" -ForegroundColor Cyan
    Write-Host "Tat ca dich vu dang chay tren cac cua so rieng biet:" -ForegroundColor White
    Write-Host " - Backend API:    http://localhost:8080" -ForegroundColor Cyan
    Write-Host " - Swagger UI:     http://localhost:8080/swagger-ui.html" -ForegroundColor Cyan
    Write-Host " - Frontend Web:   http://localhost:5173" -ForegroundColor Cyan
    Write-Host " - Mobile Metro:   http://localhost:8081 (scan QR via Expo Go)" -ForegroundColor Cyan
    Write-Host "===================================================" -ForegroundColor Cyan

    Write-Host "`n=========================================================================" -ForegroundColor Magenta
    Write-Host " [r] + Enter : KHOI DONG LAI TOAN BO (Restart services)" -ForegroundColor Yellow
    Write-Host " [Enter]     : DONG CAC CUA SO VA THOAT (Stop & Exit)" -ForegroundColor Red
    Write-Host "=========================================================================" -ForegroundColor Magenta

    $inputChoice = Read-Host "`nNhap lua chon cua ban"

    # Dong toan bo cac cua so truoc
    Stop-AllServices -backend $backendProcess -frontend $frontendProcess -mobile $mobileProcess

    if ($inputChoice.Trim() -ieq "r") {
        Write-Host "`n[RESTART] Dang khoi dong lai tat ca cac dich vu sau 2 giay..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
        $shouldRestart = $true
    } else {
        $shouldRestart = $false
    }

} while ($shouldRestart)

Write-Host "[OK] Da dong thanh cong cac cua so va tat toan bo tien trinh!" -ForegroundColor Green
Start-Sleep -Seconds 1
