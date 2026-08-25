from sqlalchemy import inspect, text

from app.database import engine


def ensure_schema() -> None:
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    columns = {col["name"] for col in inspector.get_columns("users")}
    if "is_admin" not in columns:
        default = "FALSE" if engine.dialect.name != "sqlite" else "0"
        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT {default}"))
