import os

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:  # python-dotenv is optional
    pass

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
# Same default as the Nordic Shop agent. Switch to a bigger model with CHAT_MODEL if the numbers in answers are weak.
CHAT_MODEL = os.getenv("CHAT_MODEL", "claude-haiku-4-5-20251001")
ROUTER_MODEL = os.getenv("ROUTER_MODEL", "claude-haiku-4-5-20251001")

# "fake" = in-memory demo data (works without a database). "pg" = Aiven PostgreSQL (Alex).
DB_BACKEND = os.getenv("DB_BACKEND", "fake")
DATABASE_URL = os.getenv("DATABASE_URL", "")
DATABASE_CA = os.getenv("DATABASE_CA", "")

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
