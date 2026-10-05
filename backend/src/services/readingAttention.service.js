import config from '../config/index.js';
import { HttpError } from '../middleware/httpError.js';
import {
  addVisualCueSample,
  findActiveOwnedSession,
  findOwnedSession,
  getVisualCueSummary,
} from '../repositories/readingAttention.repository.js';

const MAX_FRAME_BYTES = 256 * 1024;
const MAX_FRAME_BASE64_LENGTH = Math.ceil(MAX_FRAME_BYTES / 3) * 4;

function decodeJpeg(frame) {
  if (
    typeof frame !== 'string' ||
    frame.length === 0 ||
    frame.length > MAX_FRAME_BASE64_LENGTH ||
    frame.length % 4 !== 0 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(frame)
  ) {
    throw new HttpError(400, 'A valid JPEG frame is required.');
  }

  const bytes = Buffer.from(frame, 'base64');
  if (
    bytes.length < 4 ||
    bytes.length > MAX_FRAME_BYTES ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8 ||
    bytes[2] !== 0xff
  ) {
    throw new HttpError(400, 'A valid JPEG frame is required.');
  }

  return bytes;
}

function mapSummary(row) {
  if (!row) return null;
  return {
    sessionId: row.session_id,
    samples: Number(row.sample_count),
    faceDetected: Number(row.face_detected_count),
    facingForward: Number(row.forward_facing_count),
    turnedAway: Number(row.turned_away_count),
    noFaceDetected: Number(row.no_face_count),
    updatedAt: row.updated_at,
  };
}

async function analyzeFrame(jpeg) {
  if (!config.mlServiceToken) {
    throw new HttpError(503, 'Visual cue analysis is not configured.');
  }

  let response;
  try {
    response = await fetch(`${config.mlServiceUrl}/analyze/frame`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': config.mlServiceToken,
      },
      body: JSON.stringify({ frame: jpeg.toString('base64') }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw new HttpError(503, 'Visual cue analysis is temporarily unavailable.');
  }

  if (!response.ok) {
    throw new HttpError(503, 'Visual cue analysis is temporarily unavailable.');
  }

  const cue = await response.json();
  if (
    typeof cue.faceDetected !== 'boolean' ||
    !['forward', 'turned_away', 'unknown'].includes(cue.headOrientation)
  ) {
    throw new HttpError(503, 'Visual cue analysis returned an invalid result.');
  }
  return cue;
}

export async function recordVisualCueSample({ userId, bookId, sessionId, frame }) {
  const owned = await findActiveOwnedSession(userId, bookId, sessionId);
  if (!owned) {
    throw new HttpError(403, 'An active reading session for this book is required.');
  }

  const cue = await analyzeFrame(decodeJpeg(frame));
  const row = await addVisualCueSample(userId, bookId, sessionId, cue);
  if (!row) {
    throw new HttpError(403, 'This reading session is not available to this account.');
  }

  return { cue, summary: mapSummary(row) };
}

export async function getReadingVisualCueSummary({ userId, bookId, sessionId }) {
  const owned = await findOwnedSession(userId, bookId, sessionId);
  if (!owned) {
    throw new HttpError(404, 'Reading session not found.');
  }
  return mapSummary(await getVisualCueSummary(userId, bookId, sessionId));
}
