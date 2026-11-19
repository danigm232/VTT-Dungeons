@echo off
cd /d "%~dp0"
if not exist "output\godot-pecio-layers-20261114\index.html" (
    echo No se encuentra el informe. Ejecuta los generadores de capas y acabado:
    echo node scripts/build-godot-pecio-layer-report.mjs
    echo node scripts/build-godot-pecio-finish-report.mjs
    pause
    exit /b 1
)
start "" "%~dp0output\godot-pecio-layers-20261114\index.html"
