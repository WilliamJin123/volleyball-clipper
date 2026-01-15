import sys
import os
from unittest.mock import MagicMock

# Add video_clipping to path so tests can import services
video_clipping_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "video_clipping")
sys.path.insert(0, video_clipping_path)

# Load .env before importing services (so API keys are available)
from dotenv import load_dotenv
env_path = os.path.join(video_clipping_path, ".env")
load_dotenv(env_path)

# Mock the external clients before they're imported to avoid real API calls
# This is done by pre-populating sys.modules with mocks
import unittest.mock

# Create mock modules for external services
mock_twelvelabs = MagicMock()
mock_boto3 = MagicMock()

# Pre-patch to avoid initialization errors if env vars are missing
os.environ.setdefault("TWELVELABS_API_KEY", "test_key")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test_key")
os.environ.setdefault("R2_ENDPOINT", "https://test.r2.dev")
os.environ.setdefault("R2_ACCESS_KEY", "test_key")
os.environ.setdefault("R2_SECRET_KEY", "test_key")
os.environ.setdefault("R2_BUCKET_NAME", "test_bucket")
os.environ.setdefault("R2_PUBLIC_URL", "https://test.r2.dev")
