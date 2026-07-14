import { parseApiError } from "@/lib/apiError";

export interface HealthDocument {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  preview: string;
  extraction_method?: string;
  created_at: string | null;
}

export interface UploadDocumentResult {
  message: string;
  indexed: boolean;
  extraction_method?: string;
}

export interface PatientRagChatResult {
  answer: string;
  sources_used: number;
  has_patient_docs: boolean;
  mode: string;
}

export async function fetchMyDocuments(): Promise<HealthDocument[]> {
  const res = await fetch("/api/documents", { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(parseApiError(data, "Could not load documents"));
  }
  return (data.documents ?? []) as HealthDocument[];
}

export async function uploadHealthDocument(file: File): Promise<UploadDocumentResult> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/documents/upload", {
    method: "POST",
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(parseApiError(data, "Upload failed"));
  }
  return {
    message: (data.message as string) ?? "Document uploaded",
    indexed: Boolean(data.indexed),
    extraction_method: data.extraction_method as string | undefined,
  };
}

export async function deleteHealthDocument(id: string): Promise<void> {
  const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(parseApiError(data, "Could not delete document"));
  }
}

export async function askPatientRagChat(
  question: string,
  options?: { 
    area?: string; 
    aqi?: number; 
    history?: { role: "user" | "assistant"; text: string }[];
  }
): Promise<PatientRagChatResult> {
  const res = await fetch("/api/rag/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      area: options?.area,
      aqi: options?.aqi,
      history: options?.history,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(parseApiError(data, "Could not answer from RAG"));
  }
  return data as PatientRagChatResult;
}
