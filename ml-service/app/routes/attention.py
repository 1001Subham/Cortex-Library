import hmac

from fastapi import APIRouter, Header, HTTPException

from app.config.settings import settings
from app.schemas.attention import FrameRequest, VisualCueResponse
from app.services.visual_cues import analyze_frame

router = APIRouter(prefix="/analyze", tags=["visual cues"])


@router.post("/frame", response_model=VisualCueResponse)
def analyze_reader_frame(
    request: FrameRequest,
    x_internal_token: str | None = Header(default=None),
) -> VisualCueResponse:
    configured_token = settings.ml_service_token
    if not configured_token or not x_internal_token or not hmac.compare_digest(
        configured_token, x_internal_token
    ):
        raise HTTPException(status_code=401, detail="Internal service authentication required")

    try:
        result = analyze_frame(request.frame)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return VisualCueResponse(**result)
