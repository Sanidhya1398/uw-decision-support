from pydantic_settings import BaseSettings
from functools import lru_cache
import os

class Settings(BaseSettings):
    """Application settings."""

    # API Settings
    api_title: str = "UW ML Service"
    api_version: str = "1.0.0"
    api_prefix: str = "/api/v1"

    # Model Settings
    model_dir: str = os.path.join(os.path.dirname(__file__), "..", "models")
    current_model_version: str = "v1"

    # Node.js Backend
    backend_url: str = "http://localhost:3000"

    # Training Settings
    min_training_samples: int = 100
    retrain_interval_hours: int = 24

    # Feature Engineering
    complexity_features: list = [
        "age", "bmi", "sum_assured", "smoking_status",
        "condition_count", "medication_count", "has_cardiac",
        "has_diabetes", "has_hypertension", "has_renal",
        "family_history_cardiac", "family_history_diabetes"
    ]

    test_yield_features: list = [
        "age", "bmi", "smoking_status", "condition_count",
        "has_condition_related", "sum_assured_tier"
    ]

    class Config:
        env_prefix = "ML_"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
