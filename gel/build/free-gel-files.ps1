# Run by Gel's installer before it replaces an older Gel. Closes every program that has one of
# Gel's files open, so the update never stops with "Failed to uninstall old application files".
# Windows' Restart Manager says which programs are using which files. Gel itself is closed too.
param(
  [Parameter(Mandatory = $true)][string]$Path,
  [switch]$Force
)
$ErrorActionPreference = 'SilentlyContinue'
$log = Join-Path $env:TEMP 'gel-update.log'
function Note([string]$m) { Write-Output $m; Add-Content -LiteralPath $log -Value ((Get-Date -Format s) + ' ' + $m) }
Note ("Freeing Gel's files in $Path" + $(if ($Force) { ' (force)' } else { '' }))
if (-not (Test-Path -LiteralPath $Path)) { Note 'Gel is not installed there.'; exit 0 }
$Path = (Resolve-Path -LiteralPath $Path).Path.TrimEnd('\')

Add-Type -Language CSharp -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public static class GelRestartManager {
  [StructLayout(LayoutKind.Sequential)]
  struct RM_UNIQUE_PROCESS { public int dwProcessId; public System.Runtime.InteropServices.ComTypes.FILETIME ProcessStartTime; }

  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  struct RM_PROCESS_INFO {
    public RM_UNIQUE_PROCESS Process;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 256)] public string strAppName;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 64)] public string strServiceShortName;
    public int ApplicationType;
    public uint AppStatus;
    public uint TSSessionId;
    [MarshalAs(UnmanagedType.Bool)] public bool bRestartable;
  }

  [DllImport("rstrtmgr.dll", CharSet = CharSet.Unicode)] static extern int RmStartSession(out uint handle, int flags, System.Text.StringBuilder key);
  [DllImport("rstrtmgr.dll")] static extern int RmEndSession(uint handle);
  [DllImport("rstrtmgr.dll", CharSet = CharSet.Unicode)] static extern int RmRegisterResources(uint handle, uint nFiles, string[] files, uint nApps, RM_UNIQUE_PROCESS[] apps, uint nServices, string[] services);
  [DllImport("rstrtmgr.dll")] static extern int RmGetList(uint handle, out uint needed, ref uint count, [In, Out] RM_PROCESS_INFO[] info, ref uint rebootReasons);

  // Process ids of every program holding one of these files open.
  public static int[] Users(string[] files) {
    var ids = new List<int>();
    for (int start = 0; start < files.Length; start += 200) {
      int n = Math.Min(200, files.Length - start);
      string[] batch = new string[n];
      Array.Copy(files, start, batch, 0, n);
      uint handle;
      var key = new System.Text.StringBuilder(Guid.NewGuid().ToString());
      if (RmStartSession(out handle, 0, key) != 0) continue;
      try {
        if (RmRegisterResources(handle, (uint)n, batch, 0, null, 0, null) != 0) continue;
        uint needed = 0, count = 0, reasons = 0;
        int res = RmGetList(handle, out needed, ref count, null, ref reasons);
        if (res == 234 && needed > 0) { // ERROR_MORE_DATA: now we know how many
          var info = new RM_PROCESS_INFO[needed];
          count = needed;
          if (RmGetList(handle, out needed, ref count, info, ref reasons) == 0) {
            for (int i = 0; i < count; i++) if (!ids.Contains(info[i].Process.dwProcessId)) ids.Add(info[i].Process.dwProcessId);
          }
        }
      } finally { RmEndSession(handle); }
    }
    return ids.ToArray();
  }
}
'@

# Windows itself and security software are never closed.
$keep = @('explorer', 'svchost', 'System', 'Idle', 'csrss', 'wininit', 'winlogon', 'services', 'lsass', 'smss', 'dwm',
  'MsMpEng', 'NisSrv', 'SecurityHealthService', 'SearchIndexer', 'SearchProtocolHost', 'SearchFilterHost',
  'AvastSvc', 'AvastUI', 'aswEngSrv', 'aswidsagent', 'avgsvc', 'AVGUI')

$targets = @{}
# Gel itself, and anything else running from Gel's folder.
Get-Process | Where-Object { $_.Path -and $_.Path.StartsWith($Path + '\', [StringComparison]::OrdinalIgnoreCase) } | ForEach-Object { $targets[$_.Id] = $_ }
# Programs that have one of Gel's files open (for example another app that opened app.asar).
$files = @(Get-ChildItem -LiteralPath $Path -Recurse -File -Force | ForEach-Object { $_.FullName })
if ($files.Count -gt 0) {
  foreach ($id in [GelRestartManager]::Users($files)) {
    $p = Get-Process -Id $id
    if ($p) { $targets[$p.Id] = $p }
  }
}
# Never close this script or whatever started it: Gel's installer or uninstaller, which keeps its
# own log inside Gel's folder while it works.
# (Windows reuses process ids, so a chain of parents can loop back on itself: stop after a few.)
$all = @{}
Get-CimInstance Win32_Process | ForEach-Object { $all[[int]$_.ProcessId] = [int]$_.ParentProcessId }
$id = $PID
$seen = @{}
for ($i = 0; $i -lt 16 -and $id -and -not $seen.ContainsKey($id); $i++) {
  $seen[$id] = $true
  $targets.Remove($id)
  if (-not $all.ContainsKey($id)) { break }
  $id = $all[$id]
}
foreach ($id in @($targets.Keys)) { if ($keep -contains $targets[$id].ProcessName) { $targets.Remove($id) } }
if ($targets.Count -eq 0) { Note 'Nothing else is using Gel''s files.'; exit 0 }

# Ask nicely first, so programs can save; then make sure.
foreach ($p in $targets.Values) {
  Note ("Closing {0} ({1}), which is using Gel's files" -f $p.ProcessName, $p.Id)
  if (-not $Force) { [void]$p.CloseMainWindow() }
}
if (-not $Force) {
  $deadline = (Get-Date).AddSeconds(6)
  while ((Get-Date) -lt $deadline -and ($targets.Values | Where-Object { -not $_.HasExited })) { Start-Sleep -Milliseconds 250 }
}
foreach ($p in $targets.Values) { if (-not $p.HasExited) { Note ("Force-closing {0} ({1})" -f $p.ProcessName, $p.Id); Stop-Process -Id $p.Id -Force } }
Start-Sleep -Milliseconds 500
Note 'Done.'
exit 0
