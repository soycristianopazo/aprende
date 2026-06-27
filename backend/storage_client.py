"""Supabase Storage client - uploads files to public buckets via REST API.

Buckets used:
    - logos      (PNG/JPG: logo, banner_logo, footer_image)
    - signatures (PNG/JPG: certificate signature)
    - materials  (PDF: course materials)

Uploaded files become publicly accessible at:
    {SUPABASE_URL}/storage/v1/object/public/{bucket}/{filename}
"""
import os
import httpx
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# Folder name (used in app code) -> bucket name (in Supabase)
FOLDER_TO_BUCKET = {
    "logos": "logos",
    "signatures": "signatures",
    "materials": "materials",
}

ALLOWED_FOLDERS = set(FOLDER_TO_BUCKET.keys())


async def upload_to_storage(folder: str, filename: str, content: bytes, content_type: str = "application/octet-stream") -> str:
    """Upload a file to Supabase Storage and return the public URL.

    Args:
        folder: One of 'logos', 'signatures', 'materials'.
        filename: The file name to use (must be unique inside the bucket).
        content: Raw bytes of the file.
        content_type: MIME type.

    Returns:
        The full public URL of the uploaded object.
    """
    if folder not in FOLDER_TO_BUCKET:
        raise ValueError(f"Invalid folder: {folder}")
    bucket = FOLDER_TO_BUCKET[folder]

    upload_url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{filename}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "apikey": SUPABASE_SERVICE_KEY,
        "Content-Type": content_type,
        "x-upsert": "true",  # overwrite if filename exists
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(upload_url, content=content, headers=headers)
        if resp.status_code not in (200, 201):
            raise RuntimeError(f"Storage upload failed [{resp.status_code}]: {resp.text}")

    return get_public_url(folder, filename)


def get_public_url(folder: str, filename: str) -> str:
    if folder not in FOLDER_TO_BUCKET:
        raise ValueError(f"Invalid folder: {folder}")
    bucket = FOLDER_TO_BUCKET[folder]
    return f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{filename}"


async def delete_from_storage(folder: str, filename: str) -> bool:
    """Delete a file from Supabase Storage. Returns True if successful."""
    if folder not in FOLDER_TO_BUCKET:
        return False
    bucket = FOLDER_TO_BUCKET[folder]
    delete_url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{filename}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "apikey": SUPABASE_SERVICE_KEY,
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.delete(delete_url, headers=headers)
    return resp.status_code in (200, 204)
