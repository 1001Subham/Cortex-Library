import base64
import unittest

import cv2
import numpy as np

from app.services.visual_cues import analyze_frame, decode_frame


class VisualCueTests(unittest.TestCase):
    def test_blank_camera_frame_reports_no_face_without_attention_label(self):
        image = np.zeros((240, 320, 3), dtype=np.uint8)
        ok, encoded = cv2.imencode(".jpg", image)
        self.assertTrue(ok)

        result = analyze_frame(base64.b64encode(encoded.tobytes()).decode("ascii"))

        self.assertEqual(result, {"faceDetected": False, "headOrientation": "unknown"})
        self.assertNotIn("attention", result)
        self.assertNotIn("emotion", result)

    def test_malformed_jpeg_is_rejected(self):
        with self.assertRaises(ValueError):
            decode_frame("bm90LWEtanBlZw==")

    def test_oversized_image_dimensions_are_rejected(self):
        image = np.zeros((720, 1280, 3), dtype=np.uint8)
        ok, encoded = cv2.imencode(".jpg", image)
        self.assertTrue(ok)
        with self.assertRaises(ValueError):
            decode_frame(base64.b64encode(encoded.tobytes()).decode("ascii"))


if __name__ == "__main__":
    unittest.main()
