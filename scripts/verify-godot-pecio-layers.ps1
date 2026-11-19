param(
    [ValidateSet('Verify', 'Capture')][string]$Phase = 'Verify',
    [switch]$SkipConstruction,
    [string]$ProjectPath = '',
    [string]$GodotExe = 'C:\Users\User\AppData\Local\Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe\Godot_v4.7.2-stable_win64_console.exe'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$project = Join-Path $repoRoot 'prototypes/godot-pecio'
if ($ProjectPath) { $project = (Resolve-Path -LiteralPath $ProjectPath).Path }
$evidence = Join-Path $repoRoot 'output/godot-pecio-layers-20261114'
if (-not (Test-Path -LiteralPath $GodotExe)) { throw "Godot executable missing: $GodotExe" }
# Keep Godot's transient shader cache in the writable review workspace.
$taskAppData = Join-Path $repoRoot 'runtime/godot-pecio-review-appdata'
New-Item -ItemType Directory -Force -Path $taskAppData | Out-Null

function Invoke-GodotReview([string]$ProjectPath, [string]$Script, [string]$LogName, [string[]]$UserArgs, [bool]$Headless) {
    $logPath = Join-Path $evidence $LogName
    $arguments = @('--path', ('"' + $ProjectPath + '"'), '--log-file', ('"' + $logPath + '"'), '--script', $Script)
    if ($Headless) { $arguments += '--headless' }
    else { $arguments += @('--windowed', '--resolution', '1280x720', '--fixed-fps', '60', '--audio-driver', 'Dummy') }
    if ($UserArgs.Count -gt 0) { $arguments += '--'; $arguments += $UserArgs }
    $previousAppData = $env:APPDATA
    try {
        $env:APPDATA = $taskAppData
        $process = Start-Process -FilePath $GodotExe -ArgumentList $arguments -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru
    } finally {
        $env:APPDATA = $previousAppData
    }
    $deadline = (Get-Date).AddMinutes(4)
    while (-not $process.WaitForExit(1000)) {
        if ((Get-Date) -gt $deadline) {
            $process.Kill()
            throw "Godot timed out: $Script $UserArgs"
        }
    }
    $process.Refresh()
    if (-not (Test-Path -LiteralPath $logPath)) { throw "Godot did not write its log: $logPath" }
    $logText = Get-Content -Raw -Encoding utf8 -LiteralPath $logPath
    $errorCount = [regex]::Matches($logText, '(?im)^(?:SCRIPT ERROR|ERROR):').Count
    Write-Host "$LogName : exit $($process.ExitCode), errors $errorCount"
    if ($process.ExitCode -ne 0 -or $errorCount -gt 0) { throw "Godot review failed; see $logPath" }
    return @{exit_code = $process.ExitCode; errors = $errorCount}
}

if ($Phase -eq 'Verify') {
    $results = @()
    foreach ($suite in @('test_ship_environment', 'test_ship_construction', 'test_pecio_integrity', 'test_doors_alignment', 'test_babylon_camera_parity', 'test_character_animations')) {
        $result = Invoke-GodotReview $project "scripts/$suite.gd" "$suite.log" @() $true
        $result.suite = $suite
        $results += $result
    }
    ConvertTo-Json -Depth 10 -InputObject $results | Set-Content -Encoding utf8 (Join-Path $evidence 'regressions-final.json')
    exit 0
}

# Rebuild the construction checkpoint in an isolated project, never by swapping
# sources in the playable project. Reuse existing assets and import cache.
$checkpoint = Join-Path $repoRoot 'runtime/godot-pecio-construction-review-20261114'
if (-not $SkipConstruction) {
New-Item -ItemType Directory -Force -Path $checkpoint | Out-Null
Copy-Item -Path (Join-Path $evidence 'construction-source/*') -Destination $checkpoint -Recurse -Force
foreach ($folder in @('assets', '.godot')) {
    $targetFolder = Join-Path $checkpoint $folder
    New-Item -ItemType Directory -Force -Path $targetFolder | Out-Null
    Copy-Item -Path (Join-Path $project "$folder/*") -Destination $targetFolder -Recurse -Force
}
Copy-Item -LiteralPath (Join-Path $project 'scripts/capture_ship_layers.gd') -Destination (Join-Path $checkpoint 'scripts/capture_ship_layers.gd') -Force
$constructionDir = Join-Path $evidence 'construction'
$null = Invoke-GodotReview $checkpoint 'scripts/capture_ship_layers.gd' 'capture-construction.log' @('--audit-dir="' + $constructionDir + '"') $false
}

$results = @()
foreach ($preset in @('day-clear', 'dusk-clear', 'night-clear', 'day-rain', 'day-storm', 'day-fog', 'night-storm')) {
    $hour, $weather = $preset.Split('-')
    $destination = Join-Path $evidence "finish/$preset"
    $result = Invoke-GodotReview $project 'scripts/capture_ship_layers.gd' "capture-$preset.log" @("--audit-time=$hour", "--audit-weather=$weather", ('--audit-dir="' + $destination + '"')) $false
    $result.profile = $preset
    $results += $result
}
ConvertTo-Json -Depth 10 -InputObject $results | Set-Content -Encoding utf8 (Join-Path $evidence 'capture-results.json')
$sourceHashes = @()
foreach ($folder in @('scripts', 'scenes', 'shaders')) {
    foreach ($file in Get-ChildItem -LiteralPath (Join-Path $project $folder) -Recurse -File | Where-Object Extension -in @('.gd', '.tscn', '.gdshader')) {
        $sourceHashes += @{file = $file.FullName.Substring($project.Length + 1).Replace('\', '/'); sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}
    }
}
ConvertTo-Json -Depth 10 -InputObject $sourceHashes | Set-Content -Encoding utf8 (Join-Path $evidence 'capture-source-hashes.json')
@{project = $project.Substring($repoRoot.Length + 1).Replace('\', '/'); captured_at = (Get-Date).ToString('o')} | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $evidence 'capture-source-project.json')
