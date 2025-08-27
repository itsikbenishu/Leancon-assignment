from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from api.base_structure.router import api_router as base_structure_api_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/greet")
def greet(name: str = "עולם"):
    return {"message": f"שלום, {name}!"}

app.include_router(base_structure_api_router, prefix="/basic_structure")

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)