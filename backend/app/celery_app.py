from celery import Celery
from app.config import settings

celery_app = Celery(
    "quant_trader",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    beat_schedule={
        "retrain-models-daily": {
            "task": "app.tasks.retrain_all_models",
            "schedule": 86400,
        },
        "verify-predictions": {
            "task": "app.tasks.verify_open_predictions",
            "schedule": 3600,
        },
    },
)
