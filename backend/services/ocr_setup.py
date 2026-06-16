"""Configure Tesseract OCR for patient document uploads (Windows-friendly)."""

from __future__ import annotations

import os
import shutil
from pathlib import Path

_tesseract_configured = False
_tesseract_path: str | None = None
_ocr_status_cache: dict[str, str | bool] | None = None

# Common Windows install locations (UB Mannheim build)
_WINDOWS_CANDIDATES = [
    Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe"),
    Path(r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"),
    Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "Tesseract-OCR" / "tesseract.exe",
]


def find_tesseract_executable() -> str | None:
    """Return path to tesseract binary if found on PATH or common install dirs."""
    on_path = shutil.which("tesseract")
    if on_path:
        return on_path

    for candidate in _WINDOWS_CANDIDATES:
        if candidate.is_file():
            return str(candidate)

    return None


def configure_tesseract() -> str | None:
    """Point pytesseract at the system binary. Returns path when ready."""
    global _tesseract_configured, _tesseract_path

    if _tesseract_configured:
        return _tesseract_path

    _tesseract_configured = True
    _tesseract_path = find_tesseract_executable()

    if not _tesseract_path:
        return None

    try:
        import pytesseract

        pytesseract.pytesseract.tesseract_cmd = _tesseract_path
    except ImportError:
        return None

    return _tesseract_path


def get_ocr_status() -> dict[str, str | bool]:
    """Diagnostics for upload errors and health checks."""
    global _ocr_status_cache
    if _ocr_status_cache is not None:
        return _ocr_status_cache

    status: dict[str, str | bool] = {
        "pillow": False,
        "pytesseract": False,
        "tesseract_binary": False,
        "ready": False,
        "tesseract_path": "",
        "install_hint": "",
    }

    try:
        import PIL  # noqa: F401

        status["pillow"] = True
    except ImportError:
        status["install_hint"] = "Run: pip install Pillow"

    try:
        import pytesseract  # noqa: F401

        status["pytesseract"] = True
    except ImportError:
        status["install_hint"] = "Run: npm run install:documents"

    path = configure_tesseract()
    if path:
        status["tesseract_binary"] = True
        status["tesseract_path"] = path
        try:
            import pytesseract

            pytesseract.get_tesseract_version()
            status["ready"] = True
        except Exception:
            status["install_hint"] = f"Tesseract found at {path} but failed to run."
    else:
        status["install_hint"] = (
            "Install Tesseract OCR: winget install UB-Mannheim.TesseractOCR "
            "— or download from https://github.com/UB-Mannheim/tesseract/wiki "
            "— then restart the backend."
        )

    _ocr_status_cache = status
    return status


def ocr_unavailable_message() -> str:
    """User-facing hint when image/scanned PDF OCR fails."""
    status = get_ocr_status()
    if not status["pillow"]:
        return "Pillow not installed. Run: pip install Pillow"
    if not status["pytesseract"]:
        return "pytesseract not installed. Run: npm run install:documents"
    if not status["tesseract_binary"]:
        return str(status["install_hint"])
    if not status["ready"]:
        return str(status["install_hint"]) or "Tesseract OCR is not working."
    return "OCR ran but could not read enough text — try a clearer, well-lit photo."


def reset_ocr_cache() -> None:
    """Clear cached status (e.g. after installing Tesseract)."""
    global _ocr_status_cache, _tesseract_configured, _tesseract_path
    _ocr_status_cache = None
    _tesseract_configured = False
    _tesseract_path = None
