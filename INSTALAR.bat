@echo off
title INSTALADOR GECG
color 0A

echo =========================================================
echo   🌊 GECG - Instalador Automatico
echo   Gestion de Control Guaicaipuro
echo =========================================================
echo.

echo [1/4] Verificando Node.js...
node --version > nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js NO esta instalado
    echo.
    echo Por favor instala Node.js desde:
    echo https://nodejs.org/
    echo.
    echo DESPUES DE INSTALAR, ejecuta este archivo nuevamente
    echo.
    pause
    exit
)
echo ✅ Node.js encontrado
echo.

echo [2/4] Instalando dependencias...
cd /d "%~dp0backend"
call npm install
echo ✅ Dependencias instaladas
echo.

echo [3/4] Creando carpetas necesarias...
if not exist "backend\backups" mkdir "backend\backups"
echo ✅ Carpeta de respaldos creada
echo.

echo [4/4] Creando acceso directo en el escritorio...
echo.
echo Creando acceso directo para iniciar la aplicacion...
set "RUTA_ACTUAL=%~dp0"
set "RUTA_ACTUAL=%RUTA_ACTUAL:\=\\%"
echo @echo off > "%USERPROFILE%\Desktop\GECG Iniciar.bat"
echo cd /d "%~dp0backend" >> "%USERPROFILE%\Desktop\GECG Iniciar.bat"
echo start node server.js >> "%USERPROFILE%\Desktop\GECG Iniciar.bat"
echo echo. >> "%USERPROFILE%\Desktop\GECG Iniciar.bat"
echo echo 🌊 GECG - Servidor corriendo >> "%USERPROFILE%\Desktop\GECG Iniciar.bat"
echo echo 📌 Abre VS Code y ejecuta Live Server >> "%USERPROFILE%\Desktop\GECG Iniciar.bat"
echo echo. >> "%USERPROFILE%\Desktop\GECG Iniciar.bat"
echo pause >> "%USERPROFILE%\Desktop\GECG Iniciar.bat"
echo ✅ Acceso directo creado en el escritorio
echo.

echo =========================================================
echo   ✅ INSTALACION COMPLETADA!
echo =========================================================
echo.
echo   📁 Ubicacion: %~dp0
echo   📱 Acceso directo: GECG Iniciar.bat (en el escritorio)
echo   💾 Respaldos: backend\backups\
echo.
echo   ⚠️  RECUERDA:
echo   1. Abre VS Code en la carpeta frontend
echo   2. Haz clic derecho en index.html
echo   3. Open with Live Server
echo.
echo =========================================================
pause