"""Unit tests for MatchVision AI persistent player tracker."""

try:
    import numpy as np
except ImportError:
    np = None

from ai.detector import Detection
from ai.tracker import PersistentPlayerTracker, calculate_iou


def test_iou_calculation():
    box1 = (100.0, 100.0, 200.0, 200.0)
    box2 = (100.0, 100.0, 200.0, 200.0)
    assert calculate_iou(box1, box2) == 1.0

    box3 = (300.0, 300.0, 400.0, 400.0)
    assert calculate_iou(box1, box3) == 0.0

    box4 = (150.0, 100.0, 250.0, 200.0)
    iou = calculate_iou(box1, box4)
    assert 0.3 < iou < 0.4


def test_tracking_persistence_and_identity_recovery():
    tracker = PersistentPlayerTracker(high_thresh=0.4, low_thresh=0.15)

    # Frame 1: Single player at (100, 100, 160, 240)
    det1 = Detection(box=(100.0, 100.0, 160.0, 240.0), confidence=0.88, class_id=0, class_name="player")
    tracks_f1 = tracker.update([det1])
    assert len(tracks_f1) == 1
    orig_id = tracks_f1[0].track_id

    # Frame 2: Small movement to (105, 102, 165, 242)
    det2 = Detection(box=(105.0, 102.0, 165.0, 242.0), confidence=0.91, class_id=0, class_name="player")
    tracks_f2 = tracker.update([det2])
    assert len(tracks_f2) == 1
    assert tracks_f2[0].track_id == orig_id, "Track ID must remain persistent across consecutive frames"

    # Frame 3: Temporary occlusion (0 detections)
    tracks_f3 = tracker.update([])
    assert len(tracks_f3) == 0, "No active detections in occlusion frame"
    assert len(tracker.lost_players) == 1, "Track must be preserved in lost buffer for recovery"

    # Frame 4: Player emerges at nearby position (110, 105, 170, 245)
    det4 = Detection(box=(110.0, 105.0, 170.0, 245.0), confidence=0.85, class_id=0, class_name="player")
    tracks_f4 = tracker.update([det4])
    assert len(tracks_f4) == 1
    assert tracks_f4[0].track_id == orig_id, "Track ID must be successfully recovered after brief occlusion"


if __name__ == "__main__":
    test_iou_calculation()
    test_tracking_persistence_and_identity_recovery()
    print("ALL TRACKER TESTS PASSED!")
