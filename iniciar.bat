@echo off
title GECG - Iniciar
color 0A

echo =========================================================
echo   🌊 GECG - Gestión de Control Guaicaipuro
echo   Eje Altos Mirandinos
echo =========================================================
echo.

echo [1/3] Iniciando servidor...
cd /d "C:\Users\ubaa\OneDrive\Desktop\gecg-app\backend"
start "GECG-Server" cmd /c "node server.js"
echo ✅ Servidor iniciado en http://localhost:3000
echo.

echo [2/3] Abriendo VS Code...
start code "C:\Users\ubaa\OneDrive\Desktop\gecg-app\frontend"
echo ✅ VS Code abierto
echo.

echo [3/3] Instrucciones:
echo =========================================================
echo   1. En VS Code, busca el archivo index.html
echo   2. Haz clic derecho → "Open with Live Server"
echo   3. La app se abrirá en http://127.0.0.1:5500
echo =========================================================
echo.
pause