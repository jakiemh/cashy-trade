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
        option_columns = {
            "instrument_type": "VARCHAR(10) DEFAULT 'stock'",
            "option_type": "VARCHAR(10)",
            "option_side": "VARCHAR(10)",
            "strike": "FLOAT",
            "expiration": "DATE",
            "contract_multiplier": "INTEGER DEFAULT 100",
        }
        for name, ddl_type in option_columns.items():
            if name not in columns:
                with engine.begin() as conn:
                    conn.execute(text(f"ALTER TABLE trades ADD COLUMN {name} {ddl_type}"))

    if "webauthn_challenges" in tables:
        columns = {col["name"] for col in inspector.get_columns("webauthn_challenges")}
        if "reject" in columns and "login_reject" not in columns:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE webauthn_challenges RENAME COLUMN reject TO login_reject"))
        if "user_handle" not in columns:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE webauthn_challenges ADD COLUMN user_handle VARCHAR(128)"))

    if "webauthn_credentials" not in tables:
        if engine.dialect.name == "sqlite":
            ddl = """
            CREATE TABLE webauthn_credentials (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                credential_id TEXT NOT NULL UNIQUE,
                public_key TEXT NOT NULL,
                user_handle TEXT NOT NULL,
                sign_count INTEGER NOT NULL DEFAULT 0,
                transports VARCHAR(255),
                device_type VARCHAR(32),
                backed_up BOOLEAN NOT NULL DEFAULT 0,
                aaguid VARCHAR(64),
                label VARCHAR(80) NOT NULL DEFAULT 'Device',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_used_at DATETIME,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        else:
            ddl = """
            CREATE TABLE webauthn_credentials (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                credential_id TEXT NOT NULL UNIQUE,
                public_key TEXT NOT NULL,
                user_handle TEXT NOT NULL,
                sign_count INTEGER NOT NULL DEFAULT 0,
                transports VARCHAR(255),
                device_type VARCHAR(32),
                backed_up BOOLEAN NOT NULL DEFAULT FALSE,
                aaguid VARCHAR(64),
                label VARCHAR(80) NOT NULL DEFAULT 'Device',
                created_at TIMESTAMP DEFAULT NOW(),
                last_used_at TIMESTAMP
            )
            """
        with engine.begin() as conn:
            conn.execute(text(ddl))

    if "webauthn_challenges" not in tables:
        if engine.dialect.name == "sqlite":
            ddl = """
            CREATE TABLE webauthn_challenges (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                challenge VARCHAR(200) NOT NULL UNIQUE,
                purpose VARCHAR(16) NOT NULL,
                user_id INTEGER,
                login_reject BOOLEAN NOT NULL DEFAULT 0,
                rp_id VARCHAR(255) NOT NULL,
                origin VARCHAR(255) NOT NULL,
                user_handle VARCHAR(128),
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        else:
            ddl = """
            CREATE TABLE webauthn_challenges (
                id SERIAL PRIMARY KEY,
                challenge VARCHAR(200) NOT NULL UNIQUE,
                purpose VARCHAR(16) NOT NULL,
                user_id INTEGER,
                login_reject BOOLEAN NOT NULL DEFAULT FALSE,
                rp_id VARCHAR(255) NOT NULL,
                origin VARCHAR(255) NOT NULL,
                user_handle VARCHAR(128),
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
            """
        with engine.begin() as conn:
            conn.execute(text(ddl))

