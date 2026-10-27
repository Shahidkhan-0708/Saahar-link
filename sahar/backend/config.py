import os
import shutil
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# Check if running in Vercel or AWS Lambda serverless environment
IS_VERCEL = bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"))

if IS_VERCEL:
    TMP_DIR = Path("/tmp")
    TMP_DB = TMP_DIR / "sahakar_link.db"
    ORIGIN_DB = BASE_DIR / "sahakar_link.db"

    # Fast copy pre-seeded database to writable /tmp on cold start
    if not TMP_DB.exists() and ORIGIN_DB.exists():
        try:
            shutil.copyfile(str(ORIGIN_DB), str(TMP_DB))
        except Exception as e:
            print(f"Notice: could not copy DB to /tmp: {e}")

    DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{TMP_DB}")
    KEYS_DIR = TMP_DIR / "keys"
    try:
        KEYS_DIR.mkdir(exist_ok=True)
        src_keys = BASE_DIR / "keys"
        if src_keys.exists():
            for k in src_keys.glob("*.pem"):
                dest = KEYS_DIR / k.name
                if not dest.exists():
                    shutil.copyfile(str(k), str(dest))
    except Exception:
        pass
else:
    DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/sahakar_link.db")
    KEYS_DIR = BASE_DIR / "keys"
    try:
        KEYS_DIR.mkdir(exist_ok=True)
    except Exception:
        pass

# Security & JWT
SECRET_KEY = os.getenv("SECRET_KEY", "sahakar-link-sih26087-super-secret-jwt-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

PRIVATE_KEY_PATH = KEYS_DIR / "ed25519_private.pem"
PUBLIC_KEY_PATH = KEYS_DIR / "ed25519_public.pem"

# Server configuration
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("PORT", os.getenv("API_PORT", "8000")))
BASE_URL = os.getenv("BASE_URL", f"http://localhost:{API_PORT}")
FRONTEND_URL = os.getenv("FRONTEND_URL", f"http://localhost:{API_PORT}")
