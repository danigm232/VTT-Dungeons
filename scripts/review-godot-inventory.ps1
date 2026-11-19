param([ValidateSet('pecio','retiro')][string]$Project='pecio', [ValidateSet('Test','Capture')][string]$Mode='Test')
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$projectRoot = Join-Path $repoRoot "prototypes/godot-$Project"
$evidenceRoot = Join-Path $repoRoot 'output/godot-inventory-20261115'
$destination = Join-Path $evidenceRoot $Project
New-Item -ItemType Directory -Path $destination -Force | Out-Null
$taskAppData = Join-Path $repoRoot 'runtime/godot-inventory-appdata'
New-Item -ItemType Directory -Path $taskAppData -Force | Out-Null
$engine = 'C:\Users\User\AppData\Local\Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe\Godot_v4.7.2-stable_win64_console.exe'
$log = Join-Path $destination ($Mode.ToLowerInvariant()+'.log')
$script = if ($Mode -eq 'Test') {'res://inventory/test_backpack.gd'} else {'res://inventory/capture_backpack.gd'}
$arguments = @('--path', ('"'+$projectRoot+'"'), '--log-file', ('"'+$log+'"'), '--script', $script, '--audio-driver','Dummy','--max-fps','60')
if ($Mode -eq 'Test') {$arguments += '--headless'}
else {
    $captureArgument = '--capture-dir="' + $destination.Replace('\','/') + '"'
    $arguments += @('--windowed','--resolution','1600x900','--',$captureArgument)
}
$previousAppData = $env:APPDATA
try {
    $env:APPDATA = $taskAppData
    $process = Start-Process -FilePath $engine -ArgumentList $arguments -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru
} finally {$env:APPDATA = $previousAppData}
$deadline = (Get-Date).AddMinutes(8)
while (-not $process.WaitForExit(1000)) {
    if (Test-Path -LiteralPath $log) {
        $currentLog = Get-Content -LiteralPath $log -Raw
        if ($currentLog -match '(?im)^(?:SCRIPT ERROR|ERROR):') {
            $process.Kill()
            throw "Godot stopped after a render/script error; see $log"
        }
    }
    if ((Get-Date) -gt $deadline) {$process.Kill(); throw "Godot inventory $Mode timed out for $Project"}
}
$text = Get-Content -LiteralPath $log -Raw
$errors = [regex]::Matches($text,'(?im)^(?:SCRIPT ERROR|ERROR):').Count
Write-Host "$Project $Mode : exit=$($process.ExitCode) errors=$errors"
Write-Host ($text.Split("`n") | Select-Object -Last 22 | Out-String)
if ($process.ExitCode -ne 0 -or $errors -gt 0) {throw "Godot inventory review failed: $log"}
