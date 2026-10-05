from fastapi import FastAPI
from app.routes.attention import router as attention_router
from app.routes.health import router as health_router

app = FastAPI(
    title="Cortex Library ML Service",
    description="Attention and engagement analysis service",
    version="0.1.0",
)

app.include_router(health_router)
app.include_router(attention_router)
