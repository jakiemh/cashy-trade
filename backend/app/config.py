from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./cashy_trade.db"
    secret_key: str = "dev-secret-change-in-production"
    bot_api_key: str = "dev-bot-key"
    cors_origins: str = "http://localhost:3000"
    access_token_expire_minutes: int = 60 * 24 * 7
    admin_emails: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def admin_email_list(self) -> set[str]:
        return {email.strip().lower() for email in self.admin_emails.split(",") if email.strip()}


settings = Settings()
