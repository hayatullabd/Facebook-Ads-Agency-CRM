@echo off
setlocal
cd /d "%~dp0"
set "PYTHON=python"
if exist ".venv\Scripts\python.exe" set "PYTHON=.venv\Scripts\python.exe"
echo Starting development API with auto-reload...
"%PYTHON%" -m uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload
