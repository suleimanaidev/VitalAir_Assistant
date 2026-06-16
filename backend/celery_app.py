from celery import Celery

from config import get_settings

settings = get_settings()

celery = Celery(
    "vitalair",
    broker=settings.effective_celery_broker,
    backend=settings.effective_celery_backend,
    include=["crew.tasks"],
)

celery.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    timezone="UTC",
    enable_utc=True,
)
