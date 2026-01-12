# backend/services/common.py
import os
import boto3
from twelvelabs import TwelveLabs
from mypy_boto3_s3 import S3Client
from supabase import create_client, Client

# --- CONFIG ---
R2_ENDPOINT = os.getenv("R2_ENDPOINT")
R2_ACCESS_KEY = os.getenv("R2_ACCESS_KEY")
R2_SECRET_KEY = os.getenv("R2_SECRET_KEY")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME")
TL_API_KEY = os.getenv("TWELVELABS_API_KEY")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


# Initialize Clients
tl_client = TwelveLabs(api_key=TL_API_KEY)

s3_client: S3Client = boto3.client(
    's3',
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=R2_ACCESS_KEY,
    aws_secret_access_key=R2_SECRET_KEY
)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def get_presigned_url(filename: str, expires_in=3600):
    """Generates a read-only signed URL for R2."""
    return s3_client.generate_presigned_url(
        'get_object',
        Params={'Bucket': R2_BUCKET_NAME, 'Key': filename},
        ExpiresIn=expires_in
    )