@echo off
chcp 65001 >nul
title 罗辑个人主页 · 一键启动
cd /d "%~dp0"

echo ================================================
echo   罗辑个人主页 · 一键启动
echo ================================================
echo.

REM ============ [1/5] 启动 MySQL + Redis ============
echo [1/5] 启动 MySQL + Redis ...
docker compose -f backend\docker-compose.yml up -d mysql redis
if errorlevel 1 (
    echo.
    echo [错误] 容器启动失败，请确认 Docker Desktop 已启动。
    echo.
    pause
    exit /b 1
)

REM ============ [2/5] 端口映射自愈 ============
echo [2/5] 检查 MySQL 端口映射 ...
:check_port
docker port luoji-mysql 3306 2>nul | findstr /i "3307" >nul
if not errorlevel 1 goto port_ok
echo       端口映射缺失，重建容器 ...
docker rm -f luoji-mysql luoji-redis >nul 2>&1
docker compose -f backend\docker-compose.yml up -d mysql redis >nul 2>&1
timeout /t 5 >nul
goto check_port
:port_ok

REM ============ [3/5] 等待 MySQL 健康 ============
echo [3/5] 等待 MySQL 就绪 ...
set /a WAIT=0
:wait_mysql
docker inspect --format "{{.State.Health.Status}}" luoji-mysql 2>nul | findstr /i "healthy" >nul
if not errorlevel 1 goto mysql_ready
timeout /t 2 >nul
set /a WAIT+=2
if %WAIT% geq 60 goto mysql_ready
goto wait_mysql
:mysql_ready
echo MySQL 就绪。
echo.

REM ============ 探测 Maven ============
set "MVN="
where mvn >nul 2>nul && set "MVN=mvn"
if not defined MVN (
    for /f "delims=" %%f in ('dir /s /b "%USERPROFILE%\.m2\wrapper\dists\*mvn.cmd" 2^>nul ^| findstr /i "3.9.16"') do (
        if not defined MVN set "MVN=%%f"
    )
)
if not defined MVN if exist "backend\mvnw.cmd" set "MVN=backend\mvnw.cmd"
if not defined MVN (
    echo.
    echo [错误] 找不到 Maven，请先安装 Maven 或运行过一次后端构建。
    pause
    exit /b 1
)

REM ============ [4/5] 启动后端（已运行则跳过）============
echo [4/5] 启动后端 ...
netstat -ano | findstr ":8080 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo       后端已在运行，跳过。
) else (
    start "luoji-backend" /D "%~dp0backend" cmd /k "set DB_PORT=3307&& set DB_USER=luoji&& set DB_PASSWORD=luoji123456&& set DB_NAME=luoji_blog&& %MVN% spring-boot:run"
)

REM ============ [5/5] 启动前端（已运行则跳过）============
if not exist "node_modules" (
    echo 首次运行，安装前端依赖 ...
    call npm install
)
echo [5/5] 启动前端 ...
netstat -ano | findstr ":5174 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo       前端已在运行，跳过。
) else (
    start "luoji-frontend" /D "%~dp0" cmd /k "npm run dev"
)

echo.
echo 稍后自动打开浏览器 ...
timeout /t 6 >nul
start http://localhost:5174/login

echo.
echo ================================================
echo   完成！
echo.
echo   前端站点:  http://localhost:5174
echo   后台登录:  http://localhost:5174/login
echo   接口文档:  http://localhost:8080/swagger-ui.html
echo.
echo   登录账号:  admin / admin123
echo              editor / editor123
echo.
echo   停止服务:  关闭「luoji-backend」「luoji-frontend」两个窗口
echo ================================================
echo.
pause
