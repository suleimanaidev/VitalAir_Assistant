from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from db.repositories import (
    MAX_USER_DOCUMENT_BYTES,
    delete_user_document,
    list_user_documents,
    save_user_document,
)
from middleware.jwt_auth import AuthContext, get_auth_context
from routes.profile import _load_user
from services.document_parser import ALLOWED_EXTENSIONS, extract_document_text
from services.user_patient_rag import index_user_document, remove_document_from_index

router = APIRouter(tags=["documents"])


@router.get("/documents")
async def get_my_documents(auth: AuthContext = Depends(get_auth_context)):
    doc = await _load_user(auth)
    user_id = str(doc["_id"])
    items = await list_user_documents(user_id)
    return {"status": "success", "documents": items}


@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    auth: AuthContext = Depends(get_auth_context),
):
    doc = await _load_user(auth)
    user_id = str(doc["_id"])

    filename = (file.filename or "document.txt").strip()
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Allowed formats: .pdf, .doc, .docx, .png, .jpg, .jpeg, .webp, .txt, .md",
        )

    content_type = file.content_type or "application/octet-stream"
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="File is empty")
    if len(raw) > MAX_USER_DOCUMENT_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 500 KB)")

    try:
        text_content, extraction_method = extract_document_text(
            filename, content_type, raw
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if len(text_content) < 20:
        raise HTTPException(
            status_code=400,
            detail="Document has too little readable text for health guidance",
        )

    try:
        doc_id = await save_user_document(
            user_id,
            filename=filename,
            content_type=content_type,
            text_content=text_content,
            size_bytes=len(raw),
            extraction_method=extraction_method,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    indexed = index_user_document(user_id, doc_id, filename, text_content)

    return {
        "status": "success",
        "document_id": doc_id,
        "filename": filename,
        "extraction_method": extraction_method,
        "indexed": indexed,
        "message": (
            "Document saved and indexed in your personal RAG knowledge base. "
            "The health agent will read your prescription on the next route analysis."
            if indexed
            else "Document saved. Vector index unavailable — advice will still use "
            "keyword search from your upload on the next analysis."
        ),
    }


@router.delete("/documents/{document_id}")
async def remove_document(
    document_id: str,
    auth: AuthContext = Depends(get_auth_context),
):
    doc = await _load_user(auth)
    user_id = str(doc["_id"])
    deleted = await delete_user_document(user_id, document_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")
    remove_document_from_index(user_id, document_id)
    return {"status": "success", "message": "Document removed from profile and RAG index"}

