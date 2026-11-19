@echo off
setlocal EnableDelayedExpansion
title Campamentos de Descanso 2.5D - Godot Engine 4
cd /d "%~dp0"
set "TARGET=%~dp0prototypes\godot-campamentos"

if not "%~1"=="" (
    call "%~dp0JUGAR-GODOT.cmd" campamentos %*
    exit /b %ERRORLEVEL%
)

cls
echo =========================================================================
echo       CAMPAMENTOS DE DESCANSO 2.5D - GODOT ENGINE 4 FORWARD+
echo =========================================================================
echo.
echo   [1] 02 · Bosque camino a Pleamar    - Modo JUGADOR  [RECOMENDADO]
echo   [2] 01 · Habitaciones A1            - Modo JUGADOR
echo   [3] 03 · Playa del pecio            - Modo JUGADOR
echo   [4] 04 · Acantilados del Observat.  - Modo JUGADOR
echo   [5] 05 · Refugio costero de Pleamar - Modo JUGADOR
echo   [6] Iniciar como DM (Selector de los 5 campamentos en vivo)
echo   [7] Iniciar como PROYECTOR
echo.
echo   [0] Salir
echo =========================================================================
set "OPT=1"
set /p "OPT=Selecciona una opcion [1-7, 0] (ENTER para opcion 1): "

if "%OPT%"=="1" call "%~dp0JUGAR-GODOT.cmd" campamentos -- --camp=camp-forest-pleamar --role=player
if "%OPT%"=="2" call "%~dp0JUGAR-GODOT.cmd" campamentos -- --camp=camp-a1-rooms --role=player
if "%OPT%"=="3" call "%~dp0JUGAR-GODOT.cmd" campamentos -- --camp=camp-wreck-beach --role=player
if "%OPT%"=="4" call "%~dp0JUGAR-GODOT.cmd" campamentos -- --camp=camp-cliffs-observatory --role=player
if "%OPT%"=="5" call "%~dp0JUGAR-GODOT.cmd" campamentos -- --camp=camp-coastal-refuge --role=player
if "%OPT%"=="6" call "%~dp0JUGAR-GODOT.cmd" campamentos -- --camp=camp-forest-pleamar --role=dm
if "%OPT%"=="7" call "%~dp0JUGAR-GODOT.cmd" campamentos -- --camp=camp-forest-pleamar --role=projector
exit /b %ERRORLEVEL%
