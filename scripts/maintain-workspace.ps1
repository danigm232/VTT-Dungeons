[CmdletBinding()]
param(
    [switch]$Apply,
    [ValidateRange(7, 3650)][int]$KeepDays = 7,
    [string]$WorkspaceRoot = '',
    [switch]$LibraryOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-MaintenanceTotal($Items, [string]$Property = 'Bytes') {
    $total = [long]0
    foreach ($item in $Items) { $total += [long]$item.$Property }
    return $total
}

function Get-MaintenancePath([string]$Root, [string]$Target) {
    $rootPath = [IO.Path]::GetFullPath($Root).TrimEnd('\', '/')
    $targetPath = [IO.Path]::GetFullPath($Target)
    if (-not $targetPath.StartsWith($rootPath + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'El destino debe estar dentro del proyecto.'
    }
    $relative = $targetPath.Substring($rootPath.Length + 1).Replace('\', '/')
    if ($relative -notmatch '^(backups|output|runtime|tmp)/[^/]+') {
        throw 'Solo se permite limpiar residuos en backups, output, runtime y tmp.'
    }
    $cursor = $targetPath
    while ($cursor.Length -ge $rootPath.Length) {
        $item = Get-Item -LiteralPath $cursor -Force
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'No se permite atravesar enlaces ni junctions.' }
        if ($cursor -eq $rootPath) { break }
        $cursor = Split-Path -LiteralPath $cursor
    }
    $resolved = (Resolve-Path -LiteralPath $targetPath).ProviderPath
    if (-not $resolved.StartsWith($rootPath + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'El destino resuelto sale del proyecto.'
    }
    return $resolved
}

function Get-MaintenanceTree([string]$Target) {
    $pending = [Collections.Generic.Stack[string]]::new()
    $items = [Collections.Generic.List[object]]::new()
    $pending.Push($Target)
    while ($pending.Count) {
        $item = Get-Item -LiteralPath $pending.Pop() -Force
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'La carpeta contiene un enlace; se conserva completa.' }
        $items.Add($item)
        if ($item.PSIsContainer) {
            foreach ($child in Get-ChildItem -LiteralPath $item.FullName -Force) { $pending.Push($child.FullName) }
        }
    }
    return $items.ToArray()
}

function Get-MaintenanceProcesses {
    # Failure to inspect processes must stop cleanup rather than assume none exist.
    return @(Get-CimInstance Win32_Process | Where-Object { $_.CommandLine } | ForEach-Object {
        $_.CommandLine.Replace('/', '\').ToLowerInvariant()
    })
}

function Test-MaintenanceTarget($Context, [string]$Target) {
    $targetPath = Get-MaintenancePath $Context.Root $Target
    $relative = $targetPath.Substring($Context.Root.Length + 1).Replace('\', '/')
    if ($Context.PSObject.Properties['PreserveBuildsWithLiveServers'] -and $Context.PreserveBuildsWithLiveServers -and (Get-Item -LiteralPath $targetPath).PSIsContainer -and $relative -match '^(output|runtime|tmp)/') {
        # A server can select its web build through environment variables that
        # are absent from its command line. Defer all generated-folder cleanup
        # while a table/review server is open, regardless of file age.
        if (@($Context.Processes | Where-Object { $_ -match 'apps\\server\\index\.js|scripts\\[^" ]*review[^" ]*server[^" ]*\.mjs' }).Count) {
            throw 'Hay una mesa o revision abierta: sus posibles compilaciones se conservan aunque sean antiguas.'
        }
    }
    if ($relative.StartsWith('backups/maintenance-reports/', [StringComparison]::OrdinalIgnoreCase)) { throw 'Los registros de mantenimiento se conservan.' }
    foreach ($tracked in $Context.Tracked) {
        if ($tracked -eq $relative -or $tracked.StartsWith($relative + '/', [StringComparison]::OrdinalIgnoreCase)) { throw 'Contiene archivos versionados; se conserva.' }
    }
    foreach ($command in $Context.Processes) {
        if ($command.Contains($targetPath.ToLowerInvariant()) -or $command.Contains($relative.Replace('/', '\').ToLowerInvariant())) { throw 'Un proceso abierto hace referencia a este destino.' }
    }
    $tree = @(Get-MaintenanceTree $targetPath)
    foreach ($item in $tree) {
        if ($item.CreationTimeUtc -ge $Context.Cutoff -or $item.LastWriteTimeUtc -ge $Context.Cutoff) { throw 'Contiene material creado o modificado en los ultimos siete dias (o el plazo elegido).' }
    }
    $files = @($tree | Where-Object { -not $_.PSIsContainer })
    return [pscustomobject]@{ Path = $targetPath; Relative = $relative; Files = $files; Bytes = (Get-MaintenanceTotal $files 'Length') }
}

function Add-MaintenanceImageReferences([string]$Content, $Names) {
    # Search literal extensions first: never backtrack across large embedded
    # Playground/base64 payloads. Ambiguous filenames with spaces are retained.
    $separators = [char[]]" `t`r`n`"'<>()[\]{};,="
    foreach ($match in [regex]::Matches($Content, '(?i)\.(?:png|jpe?g|webp|gif)(?![a-z])')) {
        $start = $Content.LastIndexOfAny($separators, $match.Index) + 1
        $token = $Content.Substring($start, $match.Index + $match.Length - $start)
        [void]$Names.Add([IO.Path]::GetFileName([Uri]::UnescapeDataString($token).Replace('/', '\')))
    }
}

function Get-MaintenanceImageReferences([string]$Root) {
    $names = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    foreach ($area in @('docs', 'scripts', 'output')) {
        if (-not (Test-Path -LiteralPath (Join-Path $Root $area))) { continue }
        foreach ($file in Get-ChildItem -LiteralPath (Join-Path $Root $area) -File -Recurse -Force) {
            if ($file.Extension -notin @('.md', '.html', '.json', '.ts', '.mjs', '.js', '.ps1', '.svg', '.css')) { continue }
            if ($file.FullName -match '[\\/]node_modules[\\/]|[\\/]assets[\\/]') { continue }
            $content = [IO.File]::ReadAllText($file.FullName)
            Add-MaintenanceImageReferences $content $names
        }
    }
    foreach ($file in Get-ChildItem -LiteralPath $Root -Filter '*.md' -File) {
        Add-MaintenanceImageReferences ([IO.File]::ReadAllText($file.FullName)) $names
    }
    return ,$names
}

function New-MaintenancePlan($Context) {
    $candidates = [Collections.Generic.Dictionary[string,string]]::new([StringComparer]::OrdinalIgnoreCase)
    $backups = Join-Path $Context.Root 'backups'
    # Historical intermediate copies only. Accepted milestones, the newest full
    # Pecio copy and later patch archives are intentionally outside this list.
    $superseded = @(
        'alpha-0.1-before-0.1.1-20260913.zip', 'alpha-0.1.1-rc1-20260913.zip',
        'alpha-0.1.1-rc2-20260913.zip', 'alpha-0.1.1-rc3-20260913.zip',
        'alpha-0.2.0-rc2-20260914.zip', 'alpha-0.2.1-dev1-wheel-functional-20260914.zip',
        'alpha-0.2.1-dev1-wheel-wip-20260914.zip', 'astra-pre-review-0.2-20260913-223941.zip',
        'pecio-m2-0.3.2-dev1-20260922.zip', 'pecio-m25-0.3.2-dev2-20260922.zip',
        'pecio-m5-m6-qa-candidate-20260925.zip', 'pecio-m5-m6-qa-candidate-r30-20260925.zip',
        'pecio-m5-m6-qa-candidate-r31-20260925.zip'
    )
    # Never remove these intermediate archives without their retained replacement.
    $milestones = @('alpha-0.1.1-rc4-20260913.zip', 'alpha-0.2.0-rc2-final-20260914.zip',
        'alpha-0.2.1-rc1-20260914.zip', 'alpha-0.3.0-dev1-20260915.zip', 'pecio-m5-m6-qa-candidate-r32-20260925.zip')
    $haveMilestones = @($milestones | Where-Object { -not (Test-Path -LiteralPath (Join-Path $backups $_)) }).Count -eq 0
    if ($haveMilestones) {
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        foreach ($name in $milestones) {
            $archive = [IO.Compression.ZipFile]::OpenRead((Join-Path $backups $name))
            try { if (-not $archive.Entries.Count) { throw 'Un respaldo conservado esta vacio. Limpieza cancelada.' } }
            finally { $archive.Dispose() }
        }
        foreach ($name in $superseded) {
            $target = Join-Path $backups $name
            if (Test-Path -LiteralPath $target) { $candidates[$target] = 'Respaldo intermedio sustituido; hitos y copia completa r32 conservados.' }
        }
    }
    foreach ($area in @('output', 'tmp')) {
        $base = Join-Path $Context.Root $area
        if (-not (Test-Path -LiteralPath $base)) { continue }
        foreach ($file in Get-ChildItem -LiteralPath $base -Filter 'dm.html' -File -Recurse -Force) {
            if ($file.FullName -notmatch '[\\/]apps[\\/]web[\\/]dm\.html$') { continue }
            $build = Split-Path (Split-Path (Split-Path $file.FullName -Parent) -Parent) -Parent
            if ((Test-Path -LiteralPath (Join-Path $build 'assets')) -and ([IO.File]::ReadAllText($file.FullName) -match 'assets/[^"'']+\.js')) {
                $candidates[$build] = 'Cliente compilado antiguo; reconstruible desde las fuentes.'
            }
        }
        foreach ($file in Get-ChildItem -LiteralPath $base -Filter 'index.js' -File -Recurse -Force) {
            if ($file.FullName -match '[\\/]apps[\\/]server[\\/]index\.js$') {
                $build = Split-Path (Split-Path (Split-Path $file.FullName -Parent) -Parent) -Parent
                $candidates[$build] = 'Servidor compilado de pruebas; reconstruible desde las fuentes.'
            }
        }
        foreach ($dir in Get-ChildItem -LiteralPath $base -Directory -Recurse -Force | Where-Object { $_.Name -in @('vite-cache', '.vite') }) {
            $candidates[$dir.FullName] = 'Cache de compilacion regenerable.'
        }
    }
    $tmp = Join-Path $Context.Root 'tmp'
    if (Test-Path -LiteralPath $tmp) {
        foreach ($dir in Get-ChildItem -LiteralPath $tmp -Directory | Where-Object { $_.Name -like 'roadmap-m7-candidate-*' -or $_.Name -eq 'conditions-preview' }) {
            $candidates[$dir.FullName] = 'Candidata o visor aislado antiguo; copia de trabajo desechable.'
        }
        foreach ($file in Get-ChildItem -LiteralPath $tmp -File | Where-Object { $_.Extension -eq '.log' -or $_.Name -eq 'node-v24.21.0-x64.msi' }) {
            if ($file.Extension -eq '.msi' -and -not (Test-Path -LiteralPath (Join-Path $env:ProgramFiles 'nodejs/node.exe'))) { continue }
            $candidates[$file.FullName] = 'Registro temporal o instalador de Node ya instalado.'
        }
    }
    $runtime = Join-Path $Context.Root 'runtime'
    if (Test-Path -LiteralPath $runtime) {
        $rollbacks = @(Get-ChildItem -LiteralPath $runtime -Directory | Where-Object { $_.Name -like 'previous-build-*' } | Sort-Object LastWriteTimeUtc -Descending)
        $keepRollback = @($rollbacks | Select-Object -First 2 -ExpandProperty FullName)
        foreach ($dir in Get-ChildItem -LiteralPath $runtime -Directory) {
            if (($dir.Name -like 'prepared-*' -or $dir.Name -like 'previous-build-*') -and $dir.FullName -notin $keepRollback) {
                $candidates[$dir.FullName] = 'Preparacion antigua o rollback excedente; se conservan los dos mas recientes.'
            }
        }
    }
    $references = Get-MaintenanceImageReferences $Context.Root
    $output = Join-Path $Context.Root 'output'
    if (Test-Path -LiteralPath $output) {
        foreach ($file in Get-ChildItem -LiteralPath $output -File -Recurse -Force) {
            $capturePath = $file.FullName.Substring($output.Length + 1).Replace('\', '/')
            $captureArea = ($capturePath -split '/')[0]
            $reviewArea = $captureArea -match '(audit|review|camera|climate|weather|closeout|correction|spatial|polish|inventory|^camps-|^pecio-|^stormwreck-|^d8-v\d)'
            $sourceMaterial = $capturePath -match '(^|/)(imagegen|originals?|sources?|materials|textures|refs)(/|$)'
            if ($reviewArea -and -not $sourceMaterial -and $file.Extension -in @('.png', '.jpg', '.jpeg', '.webp', '.gif') -and $file.BaseName -match '^[a-z0-9_.-]+$' -and $file.CreationTimeUtc -lt $Context.Cutoff -and $file.LastWriteTimeUtc -lt $Context.Cutoff -and -not $references.Contains($file.Name)) {
                $candidates[$file.FullName] = 'Captura antigua sin referencias en informes, galerias o datos de revision.'
            }
        }
    }
    $plan = [Collections.Generic.List[object]]::new()
    $skipped = [Collections.Generic.List[object]]::new()
    $parents = [Collections.Generic.List[string]]::new()
    foreach ($target in $candidates.Keys | Sort-Object Length, { $_ }) {
        if (@($parents | Where-Object { $target.StartsWith($_ + '\', [StringComparison]::OrdinalIgnoreCase) }).Count) { continue }
        try {
            $candidateItem = Get-Item -LiteralPath $target -Force
            if ($candidateItem.CreationTimeUtc -ge $Context.Cutoff -or $candidateItem.LastWriteTimeUtc -ge $Context.Cutoff) { throw 'Creado o modificado durante el plazo protegido.' }
            $checked = Test-MaintenanceTarget $Context $target
            $plan.Add([pscustomobject]@{ Path = $checked.Path; Relative = $checked.Relative; Bytes = $checked.Bytes; Files = $checked.Files.Count; Reason = $candidates[$target] })
            if ((Get-Item -LiteralPath $target).PSIsContainer) { $parents.Add($target) }
        } catch {
            $skipped.Add([pscustomobject]@{ Relative = $target.Substring($Context.Root.Length + 1).Replace('\', '/'); Reason = $_.Exception.Message })
        }
    }
    return [pscustomobject]@{ Candidates = $plan.ToArray(); Skipped = $skipped.ToArray() }
}

function Invoke-MaintenanceRemoval($Context, $Entry) {
    # Recheck dates, tracked files, active processes and resolved boundaries
    # immediately before each native PowerShell deletion.
    $Context.Processes = Get-MaintenanceProcesses
    $checked = Test-MaintenanceTarget $Context $Entry.Path
    $manifest = @($checked.Files | ForEach-Object {
        [pscustomobject]@{ Path = $_.FullName.Substring($Context.Root.Length + 1).Replace('\', '/'); Bytes = $_.Length;
            CreatedUtc = $_.CreationTimeUtc.ToString('o'); ModifiedUtc = $_.LastWriteTimeUtc.ToString('o') }
    })
    if ($Context.PSObject.Properties['Journal'] -and $Context.Journal) {
        [pscustomobject]@{ Event = 'before-delete'; Path = $checked.Relative; Files = $manifest } |
            ConvertTo-Json -Depth 5 -Compress | Add-Content -LiteralPath $Context.Journal -Encoding UTF8
    }
    Remove-Item -LiteralPath $checked.Path -Recurse -Force -ErrorAction Stop
    return $manifest
}

if ($LibraryOnly) { return }
if (-not $WorkspaceRoot) { $WorkspaceRoot = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '..' }
$taskRoot = (Resolve-Path -LiteralPath $WorkspaceRoot).ProviderPath.TrimEnd('\', '/')
if (-not (Test-Path -LiteralPath (Join-Path $taskRoot 'package.json'))) { throw 'No se reconoce la carpeta del proyecto.' }
$taskTracked = @(& git -c "safe.directory=$($taskRoot.Replace('\','/'))" -C $taskRoot ls-files | Where-Object { $_ -match '^(backups|output|runtime|tmp)/' })
if ($LASTEXITCODE -ne 0) { throw 'No se pudo comprobar Git. Limpieza cancelada.' }
$taskContext = [pscustomobject]@{ Root = $taskRoot; Cutoff = (Get-Date).Date.AddDays(-$KeepDays).ToUniversalTime(); Tracked = $taskTracked; Processes = @(Get-MaintenanceProcesses); PreserveBuildsWithLiveServers = $true; Journal = $null }
Write-Host ('Revisando residuos. Se conserva todo lo creado o modificado desde {0:dd/MM/yyyy}.' -f $taskContext.Cutoff.ToLocalTime())
$taskPlan = New-MaintenancePlan $taskContext
$taskReportDirectory = Join-Path $taskRoot ('backups/maintenance-reports/' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
New-Item -ItemType Directory -Path $taskReportDirectory -Force | Out-Null
$taskContext.Journal = Join-Path $taskReportDirectory 'journal.ndjson'
$taskReport = [ordered]@{ Applied = [bool]$Apply; CreatedAt = (Get-Date).ToString('o'); ProtectedSinceUtc = $taskContext.Cutoff.ToString('o');
    Candidates = $taskPlan.Candidates; Skipped = $taskPlan.Skipped; Deleted = @(); Errors = @(); RemovedBytes = [long]0 }
$taskReport | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $taskReportDirectory 'plan.json') -Encoding UTF8
foreach ($taskGroup in $taskPlan.Candidates | Group-Object Reason) {
    Write-Host ('{0,5} destinos / {1,9:N1} MB  {2}' -f $taskGroup.Count, (($taskGroup.Group | Measure-Object Bytes -Sum).Sum / 1MB), $taskGroup.Name)
}
$taskCount = 0
foreach ($taskEntry in $taskPlan.Candidates) {
    if (-not $Apply) { continue }
    try {
        $taskManifest = @(Invoke-MaintenanceRemoval $taskContext $taskEntry)
        $taskReport.Deleted += $taskManifest
        $taskReport.RemovedBytes += Get-MaintenanceTotal $taskManifest
        [pscustomobject]@{ Event = 'deleted'; Path = $taskEntry.Relative; Bytes = $taskEntry.Bytes } |
            ConvertTo-Json -Compress | Add-Content -LiteralPath $taskContext.Journal -Encoding UTF8
    } catch {
        $taskReport.Errors += [pscustomobject]@{ Path = $taskEntry.Relative; Message = $_.Exception.Message }
        Write-Warning $_.Exception.Message
    }
    $taskCount++
    if ($taskCount % 100 -eq 0) { Write-Host ('Revisados y procesados: {0}/{1}' -f $taskCount, $taskPlan.Candidates.Count) }
}
$taskReport | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $taskReportDirectory 'result.json') -Encoding UTF8
$taskPlanned = Get-MaintenanceTotal $taskPlan.Candidates
Write-Host ('Propuesto: {0:N2} GiB. Eliminado: {1:N2} GiB. Registros: {2}' -f ($taskPlanned / 1GB), ($taskReport.RemovedBytes / 1GB), $taskReportDirectory)
if (-not $Apply) { Write-Host 'Solo inventario. Para limpiar, usa -Apply. Se conservan al menos los ultimos siete dias.' }
if ($taskReport.Errors.Count) { exit 1 }
