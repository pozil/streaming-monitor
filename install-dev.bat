@echo OFF

set ORG_ALIAS=streaming

@echo:
echo Installing Streaming Monitor DEV org (%ORG_ALIAS%)
@echo:

rem Install script
echo Cleaning previous scratch org...
cmd.exe /c sf org delete scratch -p -o %ORG_ALIAS% 2>NUL
@echo:

echo Creating scratch org...
cmd.exe /c sf org create scratch -f config/project-scratch-def.json -a %ORG_ALIAS% -d -y 30
call :checkForError
@echo:

echo Pushing source...
cmd.exe /c sf project deploy start
call :checkForError
@echo:

echo Assigning permissions...
cmd.exe /c sf org assign permset -n Streaming_Monitor
call :checkForError
@echo:

rem Check exit code
@echo:
if ["%errorlevel%"]==["0"] (
  echo Installation completed.
  @echo:
  cmd.exe /c sf org open -p lightning/n/Streaming_Monitor
)

:: ======== FN ======
GOTO :EOF

rem if the app has failed
:checkForError
if NOT ["%errorlevel%"]==["0"] (
    echo Installation failed.
    exit /b %errorlevel%
)