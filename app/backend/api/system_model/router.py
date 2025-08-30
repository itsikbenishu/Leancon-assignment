from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import os

api_router = APIRouter(tags=["system_model"])

@api_router.get("/download")
def download_ifc():
    file_path = os.path.join(os.path.dirname(__file__), "system_model.ifc")

    if os.path.exists(file_path):
        return FileResponse(
            path=file_path,
            media_type='application/octet-stream',
            filename="model.ifc",
            status_code=200  
        )
    
    raise HTTPException(status_code=404, detail="IFC file not found")

