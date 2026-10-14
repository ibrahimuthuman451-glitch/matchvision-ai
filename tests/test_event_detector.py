"""Unit tests for MatchVision AI Event Detector."""

from ai.ball_tracker import BallState
from ai.tracker import TrackedPlayer
from ai.event_detector import FootballEventDetector


def test_pass_completion_and_turnover():
    detector = FootballEventDetector(fps=30.0)

    # Frame 1: Player 1 (Team 0) has ball
    b1 = BallState(
        frame_idx=1,
        image_coords=(500, 500),
        pitch_coords=(-10.0, 0.0),
        velocity_mps=1.0,
        direction_angle=0.0,
        is_detected=True,
        confidence=0.9,
        carrier_track_id=1,
        possession_team_id=0
    )
    events = detector.update(b1, [], 1)
    assert len(events) == 0

    # Frame 10: Ball in flight with speed 12 m/s
    b2 = BallState(
        frame_idx=10,
        image_coords=(600, 500),
        pitch_coords=(0.0, 0.0),
        velocity_mps=12.0,
        direction_angle=0.0,
        is_detected=True,
        confidence=0.85,
        carrier_track_id=None,
        possession_team_id=0
    )
    events = detector.update(b2, [], 10)
    assert len(events) == 0

    # Frame 25: Player 2 (same team, Team 0) receives ball -> Pass completed!
    b3 = BallState(
        frame_idx=25,
        image_coords=(700, 500),
        pitch_coords=(15.0, 0.0),
        velocity_mps=1.5,
        direction_angle=0.0,
        is_detected=True,
        confidence=0.95,
        carrier_track_id=2,
        possession_team_id=0
    )
    events = detector.update(b3, [], 25)
    assert len(events) == 1
    assert events[0].event_type == "pass_complete"
    assert events[0].player_id == 1
    assert events[0].receiver_id == 2


if __name__ == "__main__":
    test_pass_completion_and_turnover()
    print("ALL EVENT DETECTOR TESTS PASSED!")
