import os
from pathlib import Path

from dotenv import load_dotenv

from app import create_app

# Load .env from the backend directory before anything else
_env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=_env_path, override=True)

app = create_app()
