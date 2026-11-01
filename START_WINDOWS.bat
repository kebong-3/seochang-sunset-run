@echo off
setlocal
cd /d "%~dp0"

py -3 --version >nul 2>&1
if not errorlevel 1 (
    py -3 "%~dp0tools\serve.py" --open
    if errorlevel 1 goto failed
    goto done
)

where python >nul 2>&1
if errorlevel 1 goto missing
python "%~dp0tools\serve.py" --open
if errorlevel 1 goto failed
goto done

:missing
echo Python 3.9 or later was not found.
echo Install Python, then run this file again.
pause
exit /b 1

:failed
echo.
echo SUNSET RUN could not start. Please read the message above.
pause
exit /b 1

:done
endlocal
exit /b 0
