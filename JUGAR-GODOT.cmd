@echo off
setlocal EnableDelayedExpansion
title Dungeons and Dragons VTT - Godot Engine 4
color 0B
cd /d "%~dp0"
set "USE_CONSOLE=0"
for %%A in (%*) do (
    if /i "%%~A"=="--headless" set "USE_CONSOLE=1"
    if /i "%%~A"=="--script" set "USE_CONSOLE=1"
    if /i "%%~A"=="-s" set "USE_CONSOLE=1"
)

set "GODOT_GUI="
set "GODOT_CON="

set "WINGET_PKGS=%LOCALAPPDATA%\Microsoft\WinGet\Packages"
if exist "%WINGET_PKGS%" (
    for /f "delims=" %%F in ('dir /b /s "%WINGET_PKGS%\Godot_v*_win64_console.exe" 2^>nul') do if not defined GODOT_CON set "GODOT_CON=%%F"
    for /f "delims=" %%F in ('dir /b /s "%WINGET_PKGS%\Godot_v*_win64.exe" 2^>nul') do if not defined GODOT_GUI set "GODOT_GUI=%%F"
)
for %%D in ("C:\Program Files\Godot" "%LOCALAPPDATA%\Programs\Godot") do (
    if exist "%%~D" (
        for /f "delims=" %%F in ('dir /b /s "%%~D\*console.exe" 2^>nul') do if not defined GODOT_CON set "GODOT_CON=%%F"
        for /f "delims=" %%F in ('dir /b /s "%%~D\Godot*.exe" 2^>nul') do (
            echo "%%~nxF" | findstr /i "console" >nul
            if errorlevel 1 if not defined GODOT_GUI set "GODOT_GUI=%%F"
        )
    )
)
for /f "delims=" %%I in ('where godot 2^>nul') do (
    echo "%%~nxI" | findstr /i "console" >nul
    if errorlevel 1 (
        if not defined GODOT_GUI set "GODOT_GUI=%%I"
    ) else (
        if not defined GODOT_CON set "GODOT_CON=%%I"
    )
)

set "GODOT_EXE="
if "%USE_CONSOLE%"=="1" (
    if defined GODOT_CON (
        set "GODOT_EXE=%GODOT_CON%"
    ) else (
        set "GODOT_EXE=%GODOT_GUI%"
    )
) else (
    if defined GODOT_GUI (
        set "GODOT_EXE=%GODOT_GUI%"
    ) else (
        set "GODOT_EXE=%GODOT_CON%"
    )
)
if not defined GODOT_EXE (
    echo [ERROR] No se encontro Godot Engine 4 en el equipo.
    pause
    exit /b 1
)

if /i "%~1"=="pecio" goto handle_cmdline_pecio
if /i "%~1"=="retiro" goto handle_cmdline_retiro
if /i "%~1"=="campamentos" goto handle_cmdline_campamentos
if not "%~1"=="" goto handle_cmdline_default

:menu
cls
echo =========================================================================
echo             DUNGEONS ^& DRAGONS VTT - MOTOR GODOT 4 FORWARD+
echo =========================================================================
echo.
echo   MAPAS DISPONIBLES:
echo.
echo     [1] El Rosa de los Vientos (Pecio) - Modo JUGADOR    [POR DEFECTO]
echo     [2] El Rosa de los Vientos (Pecio) - Modo DM
echo     [3] El Rosa de los Vientos (Pecio) - Modo PROYECTOR
echo.
echo     [4] El Retiro del Dragon           - Modo JUGADOR
echo     [5] El Retiro del Dragon           - Modo DM
echo     [6] El Retiro del Dragon           - Modo PROYECTOR
echo.
echo     [7] Campamentos de Descanso (1-5)  - Modo JUGADOR
echo     [8] Campamentos de Descanso (1-5)  - Modo DM
echo     [9] Campamentos de Descanso (1-5)  - Modo PROYECTOR
echo.
echo   -----------------------------------------------------------------------
echo   ATAJOS EN VIVO DENTRO DEL JUEGO:
echo     F1: Jugador  ^|  F2: DM  ^|  F3: Proyector  ^|  F11: Pantalla completa
echo   -----------------------------------------------------------------------
echo     [0] Salir
echo =========================================================================
echo.
set "OPCION=1"
set /p "OPCION=Selecciona una opcion [1-9, 0] (ENTER para opcion 1): "

if "%OPCION%"=="1" goto opt_1
if "%OPCION%"=="2" goto opt_2
if "%OPCION%"=="3" goto opt_3
if "%OPCION%"=="4" goto opt_4
if "%OPCION%"=="5" goto opt_5
if "%OPCION%"=="6" goto opt_6
if "%OPCION%"=="7" goto opt_7
if "%OPCION%"=="8" goto opt_8
if "%OPCION%"=="9" goto opt_9
if "%OPCION%"=="0" exit /b 0

echo [!] Opcion no reconocida. Iniciando opcion 1...
timeout /t 2 >nul
goto opt_1

:opt_1
set "TARGET_PATH=%~dp0prototypes\godot-pecio"
set "EXTRA_FLAGS=-- --role=player"
goto launch

:opt_2
set "TARGET_PATH=%~dp0prototypes\godot-pecio"
set "EXTRA_FLAGS=-- --role=dm"
goto launch

:opt_3
set "TARGET_PATH=%~dp0prototypes\godot-pecio"
set "EXTRA_FLAGS=-- --role=projector"
goto launch

:opt_4
set "TARGET_PATH=%~dp0prototypes\godot-retiro"
set "EXTRA_FLAGS=-- --role=player"
goto launch

:opt_5
set "TARGET_PATH=%~dp0prototypes\godot-retiro"
set "EXTRA_FLAGS=-- --role=dm"
goto launch

:opt_6
set "TARGET_PATH=%~dp0prototypes\godot-retiro"
set "EXTRA_FLAGS=-- --role=projector"
goto launch

:opt_7
set "TARGET_PATH=%~dp0prototypes\godot-campamentos"
set "EXTRA_FLAGS=-- --role=player"
goto launch

:opt_8
set "TARGET_PATH=%~dp0prototypes\godot-campamentos"
set "EXTRA_FLAGS=-- --role=dm"
goto launch

:opt_9
set "TARGET_PATH=%~dp0prototypes\godot-campamentos"
set "EXTRA_FLAGS=-- --role=projector"
goto launch

:handle_cmdline_pecio
set "TARGET_PATH=%~dp0prototypes\godot-pecio"
set "EXTRA_FLAGS="
for /f "tokens=1*" %%A in ("%*") do set "EXTRA_FLAGS=%%B"
goto launch

:handle_cmdline_retiro
set "TARGET_PATH=%~dp0prototypes\godot-retiro"
set "EXTRA_FLAGS="
for /f "tokens=1*" %%A in ("%*") do set "EXTRA_FLAGS=%%B"
goto launch

:handle_cmdline_campamentos
set "TARGET_PATH=%~dp0prototypes\godot-campamentos"
set "EXTRA_FLAGS="
for /f "tokens=1*" %%A in ("%*") do set "EXTRA_FLAGS=%%B"
goto launch

:handle_cmdline_default
set "TARGET_PATH=%~dp0prototypes\godot-pecio"
set "EXTRA_FLAGS=%*"
goto launch

:launch
echo.
echo [OK] Iniciando "%TARGET_PATH%" en Godot 4...
"%GODOT_EXE%" --path "%TARGET_PATH%" %EXTRA_FLAGS%
exit /b %ERRORLEVEL%