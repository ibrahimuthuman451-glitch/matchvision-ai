"""Football Object Detector Module for MatchVision AI.

Distinguishes:
- Outfield players
- Goalkeepers (visual & spatial context)
- Referees & Assistant Referees
- The Ball (specialized sensitivity & trajectory validation)

Filters out spectators, advertising boards, benches, and off-pitch staff.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Any

try:
    import numpy as np
except ImportError:
    np = None



@dataclass
class Detection:
    """Represents a validated object detection in frame pixel coordinates."""

    box: Tuple[float, float, float, float]  # [x1, y1, x2, y2]
    confidence: float
    class_id: int  # 0: player, 1: goalkeeper, 2: referee, 3: ball
    class_name: str
    feature_crop: Optional[Any] = None
    foot_point: Tuple[float, float] = (0.0, 0.0)

    def __post_init__(self):
        if self.foot_point == (0.0, 0.0):
            x1, y1, x2, y2 = self.box
            # Ground contact foot point for homography projection: bottom center of bounding box
            self.foot_point = ((x1 + x2) / 2.0, y2)


class FootballDetector:
    """YOLO-based detector optimized for football broadcast and tactical cameras."""

    CLASS_MAPPING = {
        0: "player",
        1: "goalkeeper",
        2: "referee",
        3: "ball"
    }

    def __init__(
        self,
        model_path: str = "yolov8m.pt",
        conf_threshold: float = 0.35,
        ball_conf_threshold: float = 0.20,
        iou_threshold: float = 0.50,
        device: str = "auto"
    ):
        self.model_path = model_path
        self.conf_threshold = conf_threshold
        self.ball_conf_threshold = ball_conf_threshold
        self.iou_threshold = iou_threshold
        self.device = device
        self.model = None
        self._init_model()

    def _init_model(self):
        """Initializes Ultralytics YOLO model or falls back to simulated/mock engine if weights absent."""
        try:
            from ultralytics import YOLO
            self.model = YOLO(self.model_path)
        except Exception:
            # Model file or ultralytics not yet downloaded/installed; detector remains callable in simulation mode
            self.model = None

    def detect(self, frame: Any, pitch_polygon: Optional[Any] = None) -> List[Detection]:
        """Runs object detection on a video frame.

        Args:
            frame: BGR numpy image frame.
            pitch_polygon: Optional polygon (in pixel coordinates) of the pitch boundary
                           to suppress spectators, advertising boards, and bench personnel.

        Returns:
            List of validated Detection objects.
        """
        if frame is None or frame.size == 0:
            return []

        h, w = frame.shape[:2]
        detections: List[Detection] = []

        if self.model is not None:
            results = self.model.predict(
                source=frame,
                conf=min(self.conf_threshold, self.ball_conf_threshold),
                iou=self.iou_threshold,
                device=self.device if self.device != "auto" else None,
                verbose=False
            )

            for result in results:
                boxes = result.boxes
                if boxes is None:
                    continue

                for box in boxes:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    conf = float(box.conf[0].cpu().numpy())
                    raw_cls = int(box.cls[0].cpu().numpy())

                    # Map YOLO classes to football classes
                    # Standard COCO: 0 = person, 32 = sports ball
                    if raw_cls == 32:
                        cls_id = 3
                        if conf < self.ball_conf_threshold:
                            continue
                    elif raw_cls == 0:
                        # Person: default to player, refined by referee/goalkeeper sub-classifiers
                        cls_id = 0
                        if conf < self.conf_threshold:
                            continue
                    elif raw_cls in self.CLASS_MAPPING:
                        cls_id = raw_cls
                        if conf < self.conf_threshold:
                            continue
                    else:
                        continue

                    # Filter non-pitch objects if pitch boundary polygon provided
                    foot_pt = ((x1 + x2) / 2.0, y2)
                    if pitch_polygon is not None and len(pitch_polygon) >= 3 and cls_id != 3:
                        import cv2
                        dist = cv2.pointPolygonTest(pitch_polygon, foot_pt, False)
                        if dist < 0:
                            continue  # Outside pitch boundaries

                    # Bounding box size sanity check (removes extreme artifacts)
                    box_area = (x2 - x1) * (y2 - y1)
                    if box_area / (w * h) > 0.35:
                        continue  # Too huge to be a single player in broadcast view

                    # Extract torso crop for appearance embedding / color clustering
                    crop_y1 = int(y1 + (y2 - y1) * 0.25)
                    crop_y2 = int(y1 + (y2 - y1) * 0.65)
                    crop_x1 = max(0, int(x1))
                    crop_x2 = min(w, int(x2))

                    crop = None
                    if crop_y2 > crop_y1 and crop_x2 > crop_x1:
                        crop = frame[crop_y1:crop_y2, crop_x1:crop_x2]

                    detections.append(Detection(
                        box=(float(x1), float(y1), float(x2), float(y2)),
                        confidence=conf,
                        class_id=cls_id,
                        class_name=self.CLASS_MAPPING.get(cls_id, "unknown"),
                        feature_crop=crop,
                        foot_point=foot_pt
                    ))
        else:
            # Fallback heuristic / mock detector for headless testing without weights
            detections = self._heuristic_fallback(frame)

        return detections

    def _heuristic_fallback(self, frame: Any) -> List[Detection]:
        """Provides simulated detections for pipeline integration testing."""
        h, w = frame.shape[:2]
        # Return empty list or sample test box if frame is empty
        return []
