param([ValidateSet('pecio','retiro','campamentos')][string]$Project='pecio', [ValidateSet('before','after')][string]$Phase='after', [string]$Mode='Audit')
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$projectRoot = Join-Path $repoRoot "prototypes/godot-$Project"
$evidenceRoot = Join-Path $repoRoot "output/sprite-audit-20261115/$Project"
New-Item -ItemType Directory -Path $evidenceRoot -Force | Out-Null
$taskAppData = Join-Path $repoRoot 'runtime/sprite-audit-appdata'
New-Item -ItemType Directory -Path $taskAppData -Force | Out-Null
$engine = 'C:\Users\User\AppData\Local\Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe\Godot_v4.7.2-stable_win64_console.exe'
$script = if ($Mode -eq 'Audit') {'res://sprites/audit_sprites.gd'} elseif ($Mode -eq 'Test') {'res://sprites/test_sprites.gd'} elseif ($Mode -eq 'Integrated') {'res://sprites/capture_integrated.gd'} else {'res://sprites/capture_sprites.gd'}
$log = Join-Path $evidenceRoot ($Phase+'-'+$Mode.ToLowerInvariant()+'.log')
$arguments = @('--path', ('"'+$projectRoot+'"'), '--log-file', ('"'+$log+'"'), '--script', $script, '--audio-driver','Dummy','--max-fps','60')
if ($Mode -in @('Audit','Test')) {$arguments += '--headless'}
else {$arguments += @('--windowed','--resolution','1600x900')}
$arguments += @('--', ('--phase='+$Phase), ('--destination="'+$evidenceRoot.Replace('\','/')+'"'))
$previousAppData = $env:APPDATA
try {
    $env:APPDATA = $taskAppData
    $process = Start-Process -FilePath $engine -ArgumentList $arguments -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru
} finally {$env:APPDATA = $previousAppData}
$deadline = (Get-Date).AddMinutes(8)
while (-not $process.WaitForExit(1000)) {
    if (Test-Path -LiteralPath $log) {
        $currentLog = Get-Content -LiteralPath $log -Raw
        if ($currentLog -match '(?im)^(?:SCRIPT ERROR|ERROR):') {$process.Kill(); throw "Sprite review stopped after an engine error: $log"}
    }
    if ((Get-Date) -gt $deadline) {$process.Kill(); throw "Sprite review timed out: $log"}
}
$result = Get-Content -LiteralPath $log -Raw
Write-Host ($result.Split("`n") | Select-Object -Last 12 | Out-String)
if ($process.ExitCode -ne 0 -or $result -match '(?im)^(?:SCRIPT ERROR|ERROR):') {throw "Sprite review failed: $log"}
