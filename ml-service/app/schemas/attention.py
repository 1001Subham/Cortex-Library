from pydantic import BaseModel, field_validator


class FrameRequest(BaseModel):
    frame: str

    @field_validator("frame")
    @classmethod
    def validate_frame(cls, value: str) -> str:
        if not value or len(value) > 350_000 or len(value) % 4:
            raise ValueError("frame must be a bounded base64 JPEG")
        return value


class VisualCueResponse(BaseModel):
    faceDetected: bool
    headOrientation: str
