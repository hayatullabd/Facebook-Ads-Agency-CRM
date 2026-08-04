@echo off
set "PYTHON=python"
if exist ".venv\Scripts\python.exe" set "PYTHON=.venv\Scripts\python.exe"
echo Starting development Celery beat...
"%PYTHON%" -m celery -A app.workers.celery_app:celery_app beat --loglevel=INFO
