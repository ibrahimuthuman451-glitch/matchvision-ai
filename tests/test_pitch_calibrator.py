"""Unit tests for MatchVision AI Pitch Calibrator and Homography Projection."""

try:
    import numpy as np
except ImportError:
    np = None

from ai.pitch_calibrator import PitchCalibrator


def test_pitch_homography_and_coordinates():
    calibrator = PitchCalibrator()

    # Image points: corners of 1920x1080 frame
    img_pts = [
        (100.0, 100.0),
        (1820.0, 100.0),
        (1900.0, 1000.0),
        (20.0, 1000.0)
    ]
    # Pitch points: 105m x 68m boundaries
    pitch_pts = [
        (-52.5, -34.0),
        (52.5, -34.0),
        (52.5, 34.0),
        (-52.5, 34.0)
    ]

    success = calibrator.calibrate_from_correspondences(img_pts, pitch_pts)
    assert success is True, "Homography calibration must succeed with 4 valid correspondences"
    assert calibrator.is_calibrated is True

    # Test center point projection
    center_img = (960.0, 550.0)
    pitch_center = calibrator.image_to_pitch(center_img)
    assert pitch_center is not None
    # Center should be near (0, 0)
    assert abs(pitch_center[0]) < 15.0
    assert abs(pitch_center[1]) < 15.0

    # Test inverse projection: pitch to image
    reprojected_img = calibrator.pitch_to_image(pitch_center)
    assert reprojected_img is not None
    assert abs(reprojected_img[0] - center_img[0]) < 20.0
    assert abs(reprojected_img[1] - center_img[1]) < 20.0


def test_degraded_calibration_handling():
    calibrator = PitchCalibrator()
    assert calibrator.is_calibrated is False
    assert calibrator.degraded_mode is True

    # Under-constrained: only 2 points
    success = calibrator.calibrate_from_correspondences([(10, 10), (20, 20)], [(-5, -5), (5, 5)])
    assert success is False
    assert calibrator.degraded_mode is True
    assert calibrator.image_to_pitch((100, 100)) is None, "Must return None when degraded"


if __name__ == "__main__":
    test_pitch_homography_and_coordinates()
    test_degraded_calibration_handling()
    print("ALL CALIBRATION TESTS PASSED!")
