import asyncio
from pathlib import Path
import sys
import time

# Ensure backend root is on the path so we can import internal modules
BACKEND_ROOT = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from dotenv import load_dotenv
load_dotenv(BACKEND_ROOT.parent / ".env")

from db.connection import get_db_async
from services.user_patient_rag import sync_user_patient_index_from_mongo


async def migrate():
    print("=========================================")
    print("Starting FAISS Index Migration to OpenAI")
    print("=========================================")
    
    t_start = time.perf_counter()
    
    # 1. Rebuild global indexes (WHO guidelines)
    print("\n[Step 1/2] Rebuilding global WHO health + diet indexes...")
    try:
        from rag.faiss_client import get_health_index, get_diet_index
        health = get_health_index()
        diet = get_diet_index()
        
        # Clear existing indexes to force rebuild
        print("Clearing old global indexes...")
        health.remove_all()
        diet.remove_all()
        
        from rag.ingest import ingest_health_docs
        print("Running ingestion for global documents...")
        ok = ingest_health_docs()
        print(f"Global ingestion status: {'Success' if ok else 'Failed'}")
    except Exception as exc:
        print(f"Error during global index rebuild: {exc}")
        sys.exit(1)
        
    # 2. Rebuild user-uploaded patient document indexes
    print("\n[Step 2/2] Rebuilding user patient document indexes...")
    try:
        db = await get_db_async()
        # Find all user IDs who have documents in the collection
        user_ids = await db.user_documents.distinct("user_id")
        print(f"Found {len(user_ids)} users with patient documents.")
        
        for uid in user_ids:
            print(f"Re-indexing documents for user: {uid}...")
            # sync_user_patient_index_from_mongo deletes old user index and rebuilds it
            docs_count = await sync_user_patient_index_from_mongo(str(uid), force=True)
            print(f"-> Synced {docs_count} documents for user {uid}")
    except Exception as exc:
        print(f"Error during user documents rebuild: {exc}")
        sys.exit(1)
        
    duration = time.perf_counter() - t_start
    print(f"\nMigration completed successfully in {duration:.2f} seconds!")
    print("=========================================")


if __name__ == "__main__":
    asyncio.run(migrate())
