from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    port: int = 8000
    env: str = "development"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
