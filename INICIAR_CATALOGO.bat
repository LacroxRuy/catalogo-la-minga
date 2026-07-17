@echo off
title Catalogo La Minga - Clasico ID y Novedades
cd /d "%~dp0"

where python >nul 2>&1
if errorlevel 1 (
  echo.
  echo No se encontro Python.
  echo Instala Python o ejecuta manualmente:
  echo py -m http.server 8000
  echo.
  pause
  exit /b 1
)

start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8000"
echo.
echo Catalogo La Minga
echo Direccion local: http://localhost:8000
echo.
echo No cierres esta ventana mientras estes probando.
echo Para detener el servidor presiona Ctrl+C.
echo.
python -m http.server 8000
pause
