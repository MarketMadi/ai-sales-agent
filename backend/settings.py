from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://signaldesk:signaldesk@localhost:5433/signaldesk"
    anthropic_api_key: str = ""
    mock_llm: bool = False
    slack_webhook_url: str = ""
    admin_secret: str = "dev-secret"
    project_root: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
