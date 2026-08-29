from datetime import datetime

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: str

    @classmethod
    def create(cls) -> "HealthResponse":
        return cls(
            status="ok",
            service="cortex-library-ml",
            timestamp=datetime.utcnow().isoformat() + "Z",
        )
