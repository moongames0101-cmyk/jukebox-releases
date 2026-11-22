; Gel's additions to the installer that electron-builder makes.
;
; Before replacing an older Gel, close everything that has Gel's files open (Gel itself, and
; other programs such as an app that opened Gel's app.asar), so the old files can be moved away.
; This takes the place of electron-builder's own "is Gel running?" check.

!macro gelFreeFiles FLAGS
  InitPluginsDir
  SetOutPath "$PLUGINSDIR"
  File "${BUILD_RESOURCES_DIR}\free-gel-files.ps1"
  ${if} ${FileExists} "$INSTDIR\*.*"
    nsExec::ExecToLog `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\free-gel-files.ps1" -Path "$INSTDIR" ${FLAGS}`
    Pop $1
  ${endif}
!macroend

!macro customCheckAppRunning
  !insertmacro gelFreeFiles ""
!macroend

; If the old version still couldn't be removed, close whatever is left by force, clear out the
; old app files by hand and carry on. Only give up if the old app.asar still can't be deleted,
; because Electron would keep loading it instead of the new version.
!macro customUnInstallCheck
  ${if} $R0 != 0
    DetailPrint "The old version was busy ($R0). Closing what's using it and clearing it out."
    !insertmacro gelFreeFiles "-Force"
    ClearErrors
    Delete "$INSTDIR\resources\app.asar"
    RMDir /r "$INSTDIR\resources\app.asar.unpacked"
    RMDir /r "$INSTDIR\resources\app"
    ${if} ${FileExists} "$INSTDIR\resources\app.asar"
      MessageBox MB_OK|MB_ICONEXCLAMATION "Gel couldn't replace its old files because another program is still using them. Restart your computer, then run Gel-Setup.exe again." /SD IDOK
      SetErrorLevel 2
      Quit
    ${endif}
  ${endif}
!macroend
