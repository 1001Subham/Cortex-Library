from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    port: int = 8000
    env: str = "development"
    ml_service_token: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
