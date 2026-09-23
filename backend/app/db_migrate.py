from sqlalchemy import inspect, text



from app.database import engine





def ensure_schema() -> None:

    inspector = inspect(engine)

    tables = set(inspector.get_table_names())



    if "users" in tables:

        columns = {col["name"] for col in inspector.get_columns("users")}

        if "is_admin" not in columns:

            default = "FALSE" if engine.dialect.name != "sqlite" else "0"

            with engine.begin() as conn:

                conn.execute(text(f"ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT {default}"))



    if "signals" in tables:

        columns = {col["name"] for col in inspector.get_columns("signals")}

        if "entry_qty" not in columns:

            with engine.begin() as conn:

                conn.execute(text("ALTER TABLE signals ADD COLUMN entry_qty FLOAT"))

        if "bot_executed" not in columns:
            default = "TRUE" if engine.dialect.name != "sqlite" else "1"
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE signals ADD COLUMN bot_executed BOOLEAN DEFAULT {default}"))



    if "push_subscriptions" not in tables:

        if engine.dialect.name == "sqlite":

            ddl = """

            CREATE TABLE push_subscriptions (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                user_id INTEGER NOT NULL,

                endpoint VARCHAR(500) NOT NULL UNIQUE,

                p256dh VARCHAR(255) NOT NULL,

                auth VARCHAR(255) NOT NULL,

                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY(user_id) REFERENCES users(id)

            )

            """

        else:

            ddl = """

            CREATE TABLE push_subscriptions (

                id SERIAL PRIMARY KEY,

                user_id INTEGER NOT NULL REFERENCES users(id),

                endpoint VARCHAR(500) NOT NULL UNIQUE,

                p256dh VARCHAR(255) NOT NULL,

                auth VARCHAR(255) NOT NULL,

                created_at TIMESTAMP DEFAULT NOW()

            )

            """

        with engine.begin() as conn:

            conn.execute(text(ddl))

    if "password_reset_tokens" not in tables:
        if engine.dialect.name == "sqlite":
            ddl = """
            CREATE TABLE password_reset_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token_hash VARCHAR(64) NOT NULL UNIQUE,
                expires_at DATETIME NOT NULL,
                used_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        else:
            ddl = """
            CREATE TABLE password_reset_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                token_hash VARCHAR(64) NOT NULL UNIQUE,
                expires_at TIMESTAMP NOT NULL,
                used_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )
            """
        with engine.begin() as conn:
            conn.execute(text(ddl))

    if "trades" in tables:
        columns = {col["name"] for col in inspector.get_columns("trades")}
        if "account_type" not in columns:
            with engine.begin() as conn:
                conn.execute(
                    text("ALTER TABLE trades ADD COLUMN account_type VARCHAR(10) DEFAULT 'real'")
                )

