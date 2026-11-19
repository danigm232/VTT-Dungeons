param([ValidateSet('before','after','test')][string]$Phase='after',[ValidateSet('pecio','retiro','campamentos')][string]$Project='pecio',[ValidateSet('Overlays','Stature','Integrated')][string]$Scene='Overlays')
$ErrorActionPreference='Stop'
$repoRoot=Split-Path -Parent $PSScriptRoot
$projectRoot=Join-Path $repoRoot "prototypes/godot-$Project"
$folder=Join-Path $repoRoot 'output/npc-sprites-20261115/overlays-options-20261116'
New-Item -ItemType Directory -Path $folder -Force | Out-Null
$engine='C:\Users\User\AppData\Local\Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe\Godot_v4.7.2-stable_win64_console.exe'
$log=Join-Path $folder "$Project-$($Scene.ToLowerInvariant())-$Phase.log"
$script=if($Phase -eq 'test'){'res://sprites/test_condition_overlays.gd'}else{'res://sprites/capture_condition_overlays.gd'}
if($Scene -eq 'Stature'){$script='res://sprites/capture_stature.gd'}
if($Scene -eq 'Integrated'){$script='res://sprites/capture_condition_integrated.gd'}
$arguments=@('--path',('"'+$projectRoot+'"'),'--log-file',('"'+$log+'"'),'--script',$script,'--audio-driver','Dummy','--max-fps','60')
if($Phase -eq 'test'){$arguments+='--headless'}else{$arguments+=@('--windowed','--resolution','1280x720')}
$arguments+=@('--',('--phase='+$Phase),('--loading-port='+(48120+@('pecio','retiro','campamentos').IndexOf($Project))))
$taskAppData=Join-Path $repoRoot "runtime/condition-overlays-appdata/$Project-$Phase"
New-Item -ItemType Directory -Path $taskAppData -Force | Out-Null
$previousAppData=$env:APPDATA
try{$env:APPDATA=$taskAppData;$process=Start-Process -FilePath $engine -ArgumentList $arguments -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru}finally{$env:APPDATA=$previousAppData}
$deadline=(Get-Date).AddMinutes(8)
while(-not $process.WaitForExit(1000)){
 if(Test-Path -LiteralPath $log){$s=Get-Content -LiteralPath $log -Raw;if($s -match '(?im)^(?:SCRIPT ERROR|ERROR):'){$process.Kill();throw "Condition review stopped: $log"}}
 if((Get-Date) -gt $deadline){$process.Kill();throw "Condition review timed out: $log"}
}
$result=Get-Content -LiteralPath $log -Raw
Write-Host ($result.Split("`n") | Select-Object -Last 9 | Out-String)
if($process.ExitCode -ne 0 -or $result -match '(?im)^(?:SCRIPT ERROR|ERROR):'){throw "Condition review failed: $log"}
