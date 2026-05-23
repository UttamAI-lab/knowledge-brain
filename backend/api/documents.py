from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pathlib import Path
from sqlalchemy.orm import Session
import shutil

from rag.pipeline import ingest_file
from database.session import get_db
from database.crud import save_document_meta, get_all_documents
from auth.roles import get_current_user, require_manager
from database.models import User
from config import settings

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(require_manager),  # ✅ Manager+ only
    db: Session = Depends(get_db),
):
    allowed = {".pdf", ".docx", ".doc"}
    suffix = Path(file.filename).suffix.lower()

    if suffix not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"শুধু {allowed} ফাইল accept করা হয়।"
        )

    save_path = settings.upload_dir / file.filename
    with save_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        result = ingest_file(save_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # ✅ DB তে save করো
    save_document_meta(
        db=db,
        filename=file.filename,
        uploaded_by=current_user.id,
        size_kb=round(save_path.stat().st_size / 1024, 2),
        chunks_count=result["chunks"],
    )

    return {
        "message": "✅ Document uploaded and indexed!",
        **result,
    }


@router.get("/list")
async def list_documents(
    current_user: User = Depends(get_current_user),  # ✅ Login required
    db: Session = Depends(get_db),
):
    docs = get_all_documents(db)
    return {
        "total": len(docs),
        "files": [
            {
                "name": d.filename,
                "size_kb": d.size_kb,
                "chunks": d.chunks_count,
                "uploaded_at": d.created_at,
            }
            for d in docs
        ],
    }


@router.delete("/{filename}")
async def delete_document(
    filename: str,
    current_user: User = Depends(require_manager),  # ✅ Manager+ only
):
    file_path = settings.upload_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="ফাইল পাওয়া যায়নি।")
    file_path.unlink()
    return {"message": f"✅ {filename} deleted."}