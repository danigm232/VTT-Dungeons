@echo off
setlocal
cd /d "%~dp0"
title Mantenimiento de Dungeons
echo.
echo   MANTENIMIENTO DE DUNGEONS
echo   Conserva al menos los ultimos siete dias, las fuentes y los guardados.
echo.
choice /C VLS /N /M "[V] Ver limpieza propuesta  [L] Limpiar residuos antiguos  [S] Salir: "
if errorlevel 3 exit /b 0
if errorlevel 2 goto limpiar
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\maintain-workspace.ps1" -WorkspaceRoot "%~dp0."
goto fin
:limpiar
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\maintain-workspace.ps1" -WorkspaceRoot "%~dp0." -Apply
:fin
echo.
pause
