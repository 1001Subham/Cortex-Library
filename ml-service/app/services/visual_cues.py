import base64
import binascii
from io import BytesIO
import threading

import cv2
import mediapipe as mp
import numpy as np
from PIL import Image, UnidentifiedImageError


MAX_FRAME_BYTES = 256 * 1024
MAX_FRAME_DIMENSION = 640
_mesh_lock = threading.Lock()
_face_mesh = mp.solutions.face_mesh.FaceMesh(
    static_image_mode=True,
    max_num_faces=1,
    refine_landmarks=False,
    min_detection_confidence=0.5,
)

_LANDMARKS = (1, 152, 33, 263, 61, 291)
_MODEL_POINTS = np.array(
    [
        (0.0, 0.0, 0.0),
        (0.0, -63.6, -12.5),
        (-43.3, 32.7, -26.0),
        (43.3, 32.7, -26.0),
        (-28.9, -28.9, -24.1),
        (28.9, -28.9, -24.1),
    ],
    dtype=np.float64,
)


def decode_frame(encoded: str) -> np.ndarray:
    try:
        contents = base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise ValueError("frame must be valid base64") from exc

    if len(contents) > MAX_FRAME_BYTES or not contents.startswith(b"\xff\xd8\xff"):
        raise ValueError("frame must be a bounded JPEG")

    try:
        with Image.open(BytesIO(contents)) as decoded:
            if decoded.format != "JPEG" or max(decoded.size) > MAX_FRAME_DIMENSION:
                raise ValueError("frame dimensions or image format are invalid")
            decoded.verify()
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("frame is not a valid JPEG") from exc

    image = cv2.imdecode(np.frombuffer(contents, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("frame dimensions are invalid")
    return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)


def analyze_frame(encoded: str) -> dict:
    image = decode_frame(encoded)
    height, width = image.shape[:2]
    with _mesh_lock:
        result = _face_mesh.process(image)

    if not result.multi_face_landmarks:
        return {"faceDetected": False, "headOrientation": "unknown"}

    landmarks = result.multi_face_landmarks[0].landmark
    image_points = np.array(
        [(landmarks[index].x * width, landmarks[index].y * height) for index in _LANDMARKS],
        dtype=np.float64,
    )
    focal_length = float(width)
    camera_matrix = np.array(
        [[focal_length, 0, width / 2], [0, focal_length, height / 2], [0, 0, 1]],
        dtype=np.float64,
    )
    distortion = np.zeros((4, 1), dtype=np.float64)
    solved, rotation_vector, _ = cv2.solvePnP(
        _MODEL_POINTS,
        image_points,
        camera_matrix,
        distortion,
        flags=cv2.SOLVEPNP_ITERATIVE,
    )

    if not solved:
        orientation = "unknown"
    else:
        rotation_matrix, _ = cv2.Rodrigues(rotation_vector)
        pitch, yaw, _roll = cv2.RQDecomp3x3(rotation_matrix)[0]
        orientation = "forward" if abs(yaw) <= 25 and abs(pitch) <= 25 else "turned_away"

    return {"faceDetected": True, "headOrientation": orientation}
