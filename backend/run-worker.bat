@echo off
set "PYTHON=python"
if exist ".venv\Scripts\python.exe" set "PYTHON=.venv\Scripts\python.exe"
echo Starting development Celery worker...
"%PYTHON%" -m celery -A app.workers.celery_app:celery_app worker --loglevel=INFO --pool=solo
