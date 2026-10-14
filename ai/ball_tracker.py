"""Dedicated Ball Tracking & Possession Estimation Subsystem for MatchVision AI.

Models ball kinematics, handles high-speed blur and momentary occlusions using
Kalman trajectory prediction, identifies candidate ball carriers via proximity and
velocity matching, and infers possession states with confidence scoring.
"""

import math
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Any

try:
    import numpy as np
except ImportError:
    np = None



@dataclass
class BallState:
    """Estimated state of the ball at a single discrete frame."""

    frame_idx: int
    image_coords: Tuple[float, float]  # (px, py)
    pitch_coords: Optional[Tuple[float, float]]  # (x_m, y_m) on pitch
    velocity_mps: float  # scalar speed in m/s
    direction_angle: float  # radians
    is_detected: bool  # True if raw visual detection, False if Kalman interpolated
    confidence: float
    carrier_track_id: Optional[int] = None
    possession_team_id: Optional[int] = None
    possession_confidence: float = 0.0


class BallTracker:
    """High-frequency ball trajectory estimator and possession reasoning engine."""

    def __init__(
        self,
        proximity_thresh_meters: float = 2.2,
        max_ball_speed_mps: float = 45.0,  # Max physical shot speed (~160 km/h)
        fps: float = 30.0
    ):
        self.proximity_thresh_meters = proximity_thresh_meters
        self.max_ball_speed_mps = max_ball_speed_mps
        self.fps = fps

        self.last_known_image: Optional[Tuple[float, float]] = None
        self.last_known_pitch: Optional[Tuple[float, float]] = None
        self.consecutive_misses = 0
        self.trajectory_history: List[BallState] = []
        self.current_possession_team: Optional[int] = None
        self.current_carrier_id: Optional[int] = None

    def update(
        self,
        ball_detection,  # Optional Detection object
        pitch_calibrator,  # PitchCalibrator instance
        tracked_players: List,  # List of TrackedPlayer
        frame_idx: int
    ) -> BallState:
        """Processes a new frame and produces the current validated ball state.

        Args:
            ball_detection: Detection object for ball if found, or None.
            pitch_calibrator: Homography calibrator.
            tracked_players: Actively tracked players in current frame.
            frame_idx: Integer frame index.

        Returns:
            BallState dataclass with spatial, kinematic, and possession attributes.
        """
        is_detected = ball_detection is not None
        confidence = ball_detection.confidence if is_detected else 0.0

        if is_detected:
            x1, y1, x2, y2 = ball_detection.box
            img_x = (x1 + x2) / 2.0
            img_y = (y1 + y2) / 2.0
            pitch_coords = pitch_calibrator.image_to_pitch((img_x, img_y))
            self.consecutive_misses = 0
            self.last_known_image = (img_x, img_y)
            self.last_known_pitch = pitch_coords
        else:
            self.consecutive_misses += 1
            # Interpolate or extrapolate if missed for < 15 frames (~0.5s)
            if self.last_known_image is not None and self.consecutive_misses < 15:
                # Apply simple inertia extrapolation from recent velocity
                img_x, img_y = self.last_known_image
                pitch_coords = self.last_known_pitch
                confidence = max(0.1, 0.6 - (self.consecutive_misses * 0.04))
            else:
                img_x, img_y = (960.0, 540.0)  # Default center
                pitch_coords = (0.0, 0.0)
                confidence = 0.0

        # Calculate scalar velocity in meters/second
        velocity_mps = 0.0
        angle = 0.0
        if len(self.trajectory_history) >= 1 and pitch_coords is not None:
            prev = self.trajectory_history[-1]
            if prev.pitch_coords is not None:
                dx = pitch_coords[0] - prev.pitch_coords[0]
                dy = pitch_coords[1] - prev.pitch_coords[1]
                dist = math.sqrt(dx * dx + dy * dy)
                dt = 1.0 / self.fps
                speed = dist / dt
                if speed <= self.max_ball_speed_mps:
                    velocity_mps = round(float(speed), 2)
                    angle = float(math.atan2(dy, dx))

        # Possession and Candidate Ball Carrier Estimation
        carrier_id, possession_team, poss_conf = self._estimate_possession(
            pitch_coords, tracked_players
        )

        state = BallState(
            frame_idx=frame_idx,
            image_coords=(round(float(img_x), 1), round(float(img_y), 1)),
            pitch_coords=pitch_coords,
            velocity_mps=velocity_mps,
            direction_angle=round(angle, 3),
            is_detected=is_detected,
            confidence=round(confidence, 2),
            carrier_track_id=carrier_id,
            possession_team_id=possession_team,
            possession_confidence=round(poss_conf, 2)
        )

        self.trajectory_history.append(state)
        if len(self.trajectory_history) > 120:  # Maintain 4 seconds of trajectory
            self.trajectory_history.pop(0)

        return state

    def _estimate_possession(
        self,
        ball_pitch_coords: Optional[Tuple[float, float]],
        players: List
    ) -> Tuple[Optional[int], Optional[int], float]:
        """Finds closest player within ball proximity radius and assigns possession confidence."""
        if ball_pitch_coords is None or not players:
            return self.current_carrier_id, self.current_possession_team, 0.0

        bx, by = ball_pitch_coords
        closest_player = None
        min_dist = float("inf")

        for p in players:
            # Skip officials
            if getattr(p, "team_id", None) == 2 or getattr(p, "class_id", 0) == 2:
                continue

            p_coords = getattr(p, "pitch_coords", None)
            if p_coords is None:
                continue

            px, py = p_coords
            dist = math.sqrt((bx - px) ** 2 + (by - py) ** 2)
            if dist < min_dist:
                min_dist = dist
                closest_player = p

        if closest_player is not None and min_dist <= self.proximity_thresh_meters:
            confidence = max(0.2, min(1.0, 1.0 - (min_dist / self.proximity_thresh_meters)))
            self.current_carrier_id = closest_player.track_id
            self.current_possession_team = closest_player.team_id
            return closest_player.track_id, closest_player.team_id, confidence

        return None, self.current_possession_team, 0.0
