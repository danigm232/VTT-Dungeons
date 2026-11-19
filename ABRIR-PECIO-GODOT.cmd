@echo off
setlocal
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
"%GODOT_EXE%" --path "%~dp0prototypes\godot-pecio" %*
exit /b %ERRORLEVEL%