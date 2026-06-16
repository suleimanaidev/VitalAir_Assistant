"""Shared LLM setup for CrewAI agents — OpenAI (preferred) or Gemini."""

from __future__ import annotations

import os

from config import get_settings


def configure_llm_env() -> None:
    """Expose API keys from root .env to CrewAI / LiteLLM."""
    settings = get_settings()
    if settings.openai_api_key.strip():
        os.environ["OPENAI_API_KEY"] = settings.openai_api_key.strip()
    if settings.gemini_api_key.strip():
        os.environ["GEMINI_API_KEY"] = settings.gemini_api_key.strip()


def get_crew_llm() -> str:
    """
    Pick model string for CrewAI Agent(llm=...).
    OpenAI is used when OPENAI_API_KEY is set (unless LLM_PROVIDER=gemini).
    """
    settings = get_settings()
    provider = (settings.llm_provider or "auto").strip().lower()

    use_openai = settings.has_openai and provider in ("auto", "openai", "")
    use_gemini = settings.has_gemini and provider in ("auto", "gemini", "")

    if provider == "openai" and settings.has_openai:
        use_openai, use_gemini = True, False
    elif provider == "gemini" and settings.has_gemini:
        use_openai, use_gemini = False, True
    elif use_openai and use_gemini:
        # Both keys present — prefer OpenAI when user supplies it
        use_gemini = False

    if use_openai:
        model = settings.openai_model.strip() or "gpt-4o-mini"
        return model if model.startswith("openai/") else f"openai/{model}"

    if use_gemini:
        return "gemini/gemini-2.0-flash"

    return "openai/gpt-4o-mini"


def crewai_is_available() -> bool:
    try:
        import crewai  # noqa: F401

        return True
    except ImportError:
        return False


def active_llm_provider() -> str:
    settings = get_settings()
    if settings.use_mock_agents:
        return "mock"
    if crewai_is_available() and settings.has_live_llm:
        llm = get_crew_llm()
        if llm.startswith("openai/"):
            return "openai-crewai"
        if llm.startswith("gemini/"):
            return "gemini"
    if settings.has_openai:
        return "openai"
    if settings.has_gemini:
        return "gemini"
    return "mock"
