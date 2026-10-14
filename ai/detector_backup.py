"""Legacy Backup of YOLO Object Detector for MatchVision AI."""

from typing import List, Tuple
import numpy as np


class LegacyDetectorBackup:
    """Original basic YOLO detector preserved for reference and backward compatibility."""

    def __init__(self, model_name: str = "yolov8n.pt"):
        self.model_name = model_name

    def detect_boxes(self, frame: np.ndarray) -> List[Tuple[float, float, float, float]]:
        """Legacy detection method returning bare raw bounding boxes."""
        return []
