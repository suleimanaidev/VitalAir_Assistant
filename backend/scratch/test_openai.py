import sys
import os
import time
from pathlib import Path
from dotenv import load_dotenv

# Load env from root
_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(_ROOT / ".env")

sys.path.append(str(_ROOT / "backend"))

from config import get_settings
from openai import OpenAI

settings = get_settings()
print(f"OpenAI Key Configured: {bool(settings.openai_api_key)}")
print(f"OpenAI Model Configured: {settings.openai_model}")

if not settings.openai_api_key:
    print("No OpenAI API key found in settings.")
    sys.exit(1)

client = OpenAI(
    api_key=settings.openai_api_key.strip(),
    timeout=10.0,
    max_retries=0,
)

start_time = time.time()
try:
    print("Sending chat completion request to OpenAI...")
    response = client.chat.completions.create(
        model=settings.openai_model.strip() or "gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "hello"},
        ],
        max_tokens=20,
        temperature=0.7,
    )
    duration = time.time() - start_time
    print(f"Success! Response took {duration:.2f} seconds.")
    print("Response content:")
    print(response.choices[0].message.content)
except Exception as e:
    duration = time.time() - start_time
    print(f"Failed after {duration:.2f} seconds with error: {e}")
