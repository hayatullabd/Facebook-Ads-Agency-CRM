from celery import Celery

from app.core.config import get_settings

settings = get_settings()
redis_url = settings.redis_url or "redis://localhost:6379/0"
celery_app = Celery("facebook_ads_crm", broker=redis_url, backend=redis_url)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    task_track_started=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    broker_transport_options={"visibility_timeout": 3600},
    beat_schedule={"enqueue-hourly-facebook-sync": {"task": "app.workers.tasks.enqueue_connected_agencies", "schedule": 3600.0}},
)
celery_app.autodiscover_tasks(["app.workers"])
