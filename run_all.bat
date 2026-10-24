@echo off
TITLE VietTriTutor - Startup Script
SETLOCAL EnableDelayedExpansion

echo ===================================================
echo             VietTriTutor - Startup Script
echo ===================================================
echo.

:: 1. Don dep cac port dang bi chiem dung
echo [1/4] Killing processes on ports: 8080, 5173, 8081 ...
FOR %%p IN (8080,5173,8081) DO (
    FOR /F "tokens=5" %%a IN ('netstat -aon ^| findstr :%%p ^| findstr LISTENING') DO (
        if not "%%a" == "" (
            echo Killing PID %%a on port %%p ...
            taskkill /F /PID %%a 2>nul
        )
    )
)

echo.
echo [2/4] Starting Backend (Spring Boot) ...
echo Starting Backend on port 8080 ...
if exist "backend\mvnw.cmd" (
    start "VietTriTutor - Backend (8080)" /D "backend" cmd /k "mvnw.cmd spring-boot:run || (echo. && echo [ERROR] Backend gap su co! Xem nguyen nhan o tren. && pause)"
) else (
    start "VietTriTutor - Backend (8080)" /D "backend" cmd /k "mvn spring-boot:run || (echo. && echo [ERROR] Backend gap su co! Xem nguyen nhan o tren. && pause)"
)

echo.
echo [3/4] Starting Frontend Web (React + Vite) ...
echo Starting Frontend on port 5173 ...
start "VietTriTutor - Frontend (5173)" /D "frontend" cmd /k "npm run dev"

echo.
echo [4/4] Starting Mobile App (Expo / React Native) ...
echo Starting Mobile Dev Server on port 8081 ...
start "VietTriTutor - Mobile (8081)" /D "mobile" cmd /k "npm start"

echo.
echo ===================================================
echo All services are starting in separate windows:
echo  - Backend API:    http://localhost:8080
echo  - Swagger UI:     http://localhost:8080/swagger-ui.html
echo  - Frontend Web:   http://localhost:5173
echo  - Mobile Metro:   http://localhost:8081 (scan QR via Expo Go)
echo ===================================================
echo.
pause
