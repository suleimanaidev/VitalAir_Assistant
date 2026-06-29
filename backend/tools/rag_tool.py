"""RAG retrieval tools for CrewAI agents — delegates to rag_service for unified fallbacks."""

from __future__ import annotations

from services.rag_service import retrieve_diet_context, retrieve_health_context

health_rag_tool = None
diet_rag_tool = None
patient_health_rag_tool = None

try:
    from crewai.tools import BaseTool

    class HealthRAGTool(BaseTool):
        name: str = "WHO Health Knowledge Base"
        description: str = (
            "Search verified WHO medical guidelines and research papers "
            "about air pollution health effects. Use this BEFORE giving health advice."
        )

        def _run(self, query: str) -> str:
            context = retrieve_health_context(query, k=5)
            return f"Verified Medical Context:\n{context}"

    class DietRAGTool(BaseTool):
        name: str = "Anti-Pollution Diet Knowledge Base"
        description: str = (
            "Search verified nutritionist guidelines and research about foods "
            "that protect against air pollution. Use this BEFORE recommending diet."
        )

        def _run(self, query: str) -> str:
            context = retrieve_diet_context(query, k=5)
            return f"Verified Diet Context:\n{context}"

    class PatientHealthRAGTool(BaseTool):
        name: str = "Patient Health Records"
        description: str = (
            "Search THIS patient's uploaded health documents (prescriptions, lab reports, "
            "doctor notes). ALWAYS use this together with the WHO Knowledge Base when the "
            "patient has uploaded files. Pass a query about their conditions, medications, "
            "or restrictions."
        )

        def _run(self, query: str) -> str:
            from services.user_patient_rag import retrieve_patient_health_for_active_user

            return retrieve_patient_health_for_active_user(query, k=4)

    health_rag_tool = HealthRAGTool()
    diet_rag_tool = DietRAGTool()
    patient_health_rag_tool = PatientHealthRAGTool()

except ImportError:
    patient_health_rag_tool = None
