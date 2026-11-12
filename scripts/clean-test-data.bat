@echo off
setlocal
echo ============================================================
echo   VietTriTutor: Clean Course, Class and Schedule Data
echo ============================================================

set CONTAINER_NAME=triviettutor-postgres-1
set DB_USER=viettri
set DB_NAME=viettritutor

where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker command not found. Please ensure Docker Desktop is running.
    pause
    exit /b 1
)

docker ps --format "{{.Names}}" | findstr /R /C:"^%CONTAINER_NAME%$" >nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Container %CONTAINER_NAME% is not running.
    echo Please start postgres container first: docker compose up -d postgres
    pause
    exit /b 1
)

echo Executing clean-test-data.sql on %CONTAINER_NAME%...
docker exec -i %CONTAINER_NAME% psql -U %DB_USER% -d %DB_NAME% < "%~dp0clean-test-data.sql"

if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] Cleaned course, class, and schedule data successfully.
) else (
    echo [FAILED] Failed to clean data. Error code: %ERRORLEVEL%
)

pause

