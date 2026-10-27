import os
import uvicorn
from backend.main import app
from backend.config import API_HOST, API_PORT

if __name__ == "__main__":
    port = int(os.getenv("PORT", os.getenv("API_PORT", 8000)))
    host = os.getenv("API_HOST", "0.0.0.0")
    print(f"Starting Sahakar-Link production server on http://{host}:{port}")
    uvicorn.run(app, host=host, port=port, log_level="info")
