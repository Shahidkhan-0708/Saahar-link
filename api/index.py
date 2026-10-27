import sys
from pathlib import Path

# Add sahar directory to sys.path so backend modules import cleanly
SAHAR_DIR = Path(__file__).resolve().parent.parent / "sahar"
if str(SAHAR_DIR) not in sys.path:
    sys.path.insert(0, str(SAHAR_DIR))

from backend.main import app
