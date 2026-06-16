"""RAG retrieval tools for CrewAI agents (plan §2.5)."""

from __future__ import annotations

from rag.chroma_client import chroma_is_available, get_diet_retriever, get_health_retriever

_FALLBACK_HEALTH = (
    "WHO guidance: Limit outdoor exertion when AQI is unhealthy. "
    "Sensitive groups should use N95 masks and keep rescue medication available."
)

_FALLBACK_DIET = (
    "Research suggests vitamin C foods, ginger tea, green tea, omega-3 sources, "
    "and anti-inflammatory spices during high pollution exposure."
)


def _format_docs(docs) -> str:
    return "\n\n---\n\n".join(d.page_content for d in docs)


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
            retriever = get_health_retriever(k=4)
            if retriever is None:
                return f"Verified Medical Context:\n{_FALLBACK_HEALTH}"
            docs = retriever.invoke(query)
            if not docs:
                return f"Verified Medical Context:\n{_FALLBACK_HEALTH}"
            return f"Verified Medical Context:\n{_format_docs(docs)}"

    class DietRAGTool(BaseTool):
        name: str = "Anti-Pollution Diet Knowledge Base"
        description: str = (
            "Search verified nutritionist guidelines and research about foods "
            "that protect against air pollution. Use this BEFORE recommending diet."
        )

        def _run(self, query: str) -> str:
            retriever = get_diet_retriever(k=4)
            if retriever is None:
                return f"Verified Diet Context:\n{_FALLBACK_DIET}"
            docs = retriever.invoke(query)
            if not docs:
                return f"Verified Diet Context:\n{_FALLBACK_DIET}"
            return f"Verified Diet Context:\n{_format_docs(docs)}"

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
