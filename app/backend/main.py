from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # יציאת ברירת מחדל של Vite
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/greet")
def greet(name: str = "עולם"):
    return {"message": f"שלום, {name}!"}
