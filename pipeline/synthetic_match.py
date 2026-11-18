"""Synthetic football match generator for offline MatchVision AI demos.

Produces a broadcast-style 2D pitch video plus matching Detection objects, so the
full tracking / calibration / analytics pipeline can be exercised end-to-end on a
machine without YOLO weights or a real match video.
"""

import math
from typing import List, Tuple, Optional, Any

try:
    import numpy as np
except ImportError:
    np = None

from ai.detector import Detection


class SyntheticMatchProvider:
    """Drop-in replacement for FootballDetector that fabricates a deterministic match.

    Usage:
        provider = SyntheticMatchProvider()
        provider.write_video("demo_input.mp4", num_frames=300)
        pipeline = MatchVisionPipeline(detector=provider)
        pipeline.process_video("demo_input.mp4", "demo_tracked.mp4", max_frames=300)
    """

    TEAM_A_COLOR = (30, 30, 220)    # BGR red kit
    TEAM_B_COLOR = (225, 140, 30)   # BGR sky blue kit

    def __init__(self, width: int = 1280, height: int = 720, fps: float = 30.0):
        self.width = width
        self.height = height
        self.fps = fps
        self.frame_idx = 0

        # Base formation slots as (u, v) fractions: u across the pitch, v depth (0 far, 1 near).
        self.team_a_slots = [
            (0.18, 0.55), (0.30, 0.30), (0.32, 0.48), (0.33, 0.68), (0.30, 0.85),
            (0.45, 0.35), (0.46, 0.52), (0.47, 0.70), (0.55, 0.42), (0.58, 0.62),
        ]
        self.team_b_slots = [
            (0.82, 0.55), (0.70, 0.30), (0.68, 0.48), (0.67, 0.68), (0.70, 0.85),
            (0.55, 0.33), (0.54, 0.50), (0.53, 0.68), (0.45, 0.40), (0.42, 0.60),
        ]

    # ------------------------------------------------------------------ geometry
    def _image_from_pitch_fraction(self, u: float, v: float) -> Tuple[float, float]:
        """Maps (u, v) pitch fractions onto the trapezoidal broadcast view."""
        v = min(max(v, 0.0), 1.0)
        u = min(max(u, 0.0), 1.0)
        y = self.height * (0.25 + 0.65 * v)
        x_left = self.width * (0.15 - 0.10 * v)
        x_right = self.width * (0.85 + 0.10 * v)
        x = x_left + (x_right - x_left) * u
        return x, y

    def _player_positions(self, frame_idx: int) -> List[Tuple[int, float, float]]:
        """Returns (team_id, image_x, image_y) for every outfield player at a frame."""
        positions = []
        t = frame_idx / max(self.fps, 1.0)
        for team_id, slots, sign in ((0, self.team_a_slots, 1.0), (1, self.team_b_slots, -1.0)):
            for slot_idx, (u, v) in enumerate(slots):
                phase = slot_idx * 0.7
                du = 0.035 * math.sin(t * 0.9 + phase)
                dv = 0.020 * math.cos(t * 0.7 + phase * 1.3)
                x, y = self._image_from_pitch_fraction(u + du * sign, v + dv)
                positions.append((team_id, x, y))
        return positions

    def _ball_position(self, frame_idx: int) -> Tuple[float, float]:
        t = frame_idx / max(self.fps, 1.0)
        u = 0.5 + 0.28 * math.sin(t * 0.55)
        v = 0.55 + 0.22 * math.sin(t * 0.8 + 1.1)
        return self._image_from_pitch_fraction(u, v)

    # ----------------------------------------------------------------- detections
    def detections_at(self, frame_idx: int) -> List[Detection]:
        """Builds Detection objects (with torso crops) for the requested frame."""
        detections: List[Detection] = []

        for team_id, cx, cy in self._player_positions(frame_idx):
            box_h = 44.0 + 46.0 * (cy / self.height)
            box_w = max(12.0, box_h * 0.36)
            x1, y1 = cx - box_w / 2.0, cy - box_h
            x2, y2 = cx + box_w / 2.0, cy
            detections.append(Detection(
                box=(x1, y1, x2, y2),
                confidence=0.92,
                class_id=0,
                class_name="player",
                feature_crop=self._torso_crop(team_id),
                foot_point=(cx, cy),
            ))

        bx, by = self._ball_position(frame_idx)
        detections.append(Detection(
            box=(bx - 6.0, by - 6.0, bx + 6.0, by + 6.0),
            confidence=0.75,
            class_id=3,
            class_name="ball",
            foot_point=(bx, by),
        ))
        return detections

    def _torso_crop(self, team_id: int):
        """Small solid-colour jersey sample so TeamIdentifier can cluster kits."""
        if np is None:
            return None
        color = self.TEAM_A_COLOR if team_id == 0 else self.TEAM_B_COLOR
        crop = np.zeros((24, 12, 3), dtype=np.uint8)
        crop[:, :] = color
        # Add mild shading so clustering is not degenerate
        crop[:6, :] = tuple(max(0, int(c * 0.8)) for c in color)
        return crop

    def detect(self, frame: Any, pitch_polygon: Optional[Any] = None) -> List[Detection]:
        """FootballDetector-compatible interface; advances one frame per call."""
        detections = self.detections_at(self.frame_idx)
        self.frame_idx += 1
        return detections

    def reset(self) -> None:
        self.frame_idx = 0


    # -------------------------------------------------------------------- render
    def render_frame(self, frame_idx: int):
        """Draws a simple broadcast-style pitch frame (requires OpenCV + numpy)."""
        import cv2

        frame = np.zeros((self.height, self.width, 3), dtype=np.uint8)
        frame[:, :] = (60, 130, 60)

        # Pitch boundary trapezoid
        far_l = (int(self.width * 0.15), int(self.height * 0.25))
        far_r = (int(self.width * 0.85), int(self.height * 0.25))
        near_r = (int(self.width * 0.95), int(self.height * 0.90))
        near_l = (int(self.width * 0.05), int(self.height * 0.90))
        cv2.polylines(frame, [np.array([far_l, far_r, near_r, near_l])], True, (235, 235, 235), 3)
        cv2.line(frame,
                 (int(self.width * 0.5), int(self.height * 0.25)),
                 (int(self.width * 0.5), int(self.height * 0.90)),
                 (235, 235, 235), 2)

        for team_id, cx, cy in self._player_positions(frame_idx):
            box_h = 44.0 + 46.0 * (cy / self.height)
            box_w = max(12.0, box_h * 0.36)
            color = self.TEAM_A_COLOR if team_id == 0 else self.TEAM_B_COLOR
            cv2.rectangle(frame,
                          (int(cx - box_w / 2), int(cy - box_h)),
                          (int(cx + box_w / 2), int(cy)),
                          color, -1)
            cv2.circle(frame, (int(cx), int(cy)), 3, (0, 255, 255), -1)

        bx, by = self._ball_position(frame_idx)
        cv2.circle(frame, (int(bx), int(by)), 6, (255, 255, 255), -1)
        return frame

    def write_video(self, output_path: str, num_frames: int = 300) -> str:
        """Writes the synthetic match to an MP4 file and returns its path."""
        import cv2

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(output_path, fourcc, self.fps, (self.width, self.height))
        if not writer.isOpened():
            raise RuntimeError(
                f"OpenCV could not open a video writer for {output_path}. "
                "Install a full opencv-python build with MP4 (mp4v) codec support."
            )
        try:
            for frame_idx in range(num_frames):
                writer.write(self.render_frame(frame_idx))
        finally:
            writer.release()
        return output_path
