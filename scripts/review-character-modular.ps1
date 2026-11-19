param([ValidateSet('pecio','retiro','campamentos')][string]$Project='pecio',[ValidateSet('Surface','Test','Inspect','InspectProof','Capture','Render','Integrated','Performance','Validate','Stormwreck','StormwreckService')][string]$Mode='Surface',[switch]$Headless,[switch]$Network,[string]$Character='',[ValidateSet('','stormwreck-isle')][string]$Campaign='')
$ErrorActionPreference='Stop'
$repoRoot=Split-Path -Parent $PSScriptRoot
$projectRoot=Join-Path $repoRoot "prototypes/godot-$Project"
$folder=Join-Path $repoRoot 'output/character-modular-20261116'
New-Item -ItemType Directory -Path $folder -Force | Out-Null
$engine='C:\Users\User\AppData\Local\Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe\Godot_v4.7.2-stable_win64_console.exe'
$scripts=@{Surface='test_surface.gd';Test='test_modular.gd';Inspect='inspection_boot.gd';InspectProof='test_inspector.gd';Capture='capture_modular.gd';Render='test_render_contract.gd';Integrated='test_effect_integration.gd';Performance='benchmark_modular.gd';Validate='validate_import.gd';Stormwreck='capture_stormwreck.gd';StormwreckService='test_stormwreck_service.gd'}
$log=Join-Path $folder "$Project-$($Mode.ToLowerInvariant()).log"
$arguments=@('--path',('"'+$projectRoot+'"'),'--log-file',('"'+$log+'"'),'--script',('res://characters/'+$scripts[$Mode]),'--audio-driver','Dummy','--max-fps','60')
if($Headless -or $Mode -in @('Test','Validate')){$arguments+='--headless'}else{$arguments+=@('--windowed','--resolution','1280x720')}
$arguments+=@('--',('--loading-port='+(48220+@('pecio','retiro','campamentos').IndexOf($Project))))
if($Network){$arguments+='--test-network'}
if($Campaign){$arguments+=('--campaign='+$Campaign)}
if($Character){if($Character -notmatch '^[a-z][a-z0-9-]+$'){throw 'Invalid character id'};$arguments+=('--stormwreck-id='+$Character)}
$taskAppData=Join-Path $repoRoot "runtime/character-modular-appdata/$Project-$Mode"
New-Item -ItemType Directory -Path $taskAppData -Force | Out-Null
$previousAppData=$env:APPDATA
try{$env:APPDATA=$taskAppData;$process=Start-Process -FilePath $engine -ArgumentList $arguments -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru}finally{$env:APPDATA=$previousAppData}
if($Mode -eq 'Inspect'){Write-Host "Inspector opened; process $($process.Id)";exit 0}
$deadline=(Get-Date).AddMinutes($(if($Mode -eq 'Stormwreck'){20}else{8}))
while(-not $process.WaitForExit(1000)){
 if(Test-Path -LiteralPath $log){$s=Get-Content -LiteralPath $log -Raw;if($s -match '(?im)^(?:SCRIPT ERROR|ERROR):'){$process.Kill();throw "Character modular review stopped: $log"}}
 if((Get-Date) -gt $deadline){$process.Kill();throw "Character modular review timed out: $log"}
}
$result=Get-Content -LiteralPath $log -Raw
Write-Host ($result.Split("`n") | Select-Object -Last 12 | Out-String)
if($process.ExitCode -ne 0 -or $result -match '(?im)^(?:SCRIPT ERROR|ERROR):'){throw "Character modular review failed: $log"}
