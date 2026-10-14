"""Unit tests for Tactical Analytics, Spatial Metrics, and xG / xT Models."""

from ai.tracker import TrackedPlayer
from ai.tactical_analytics import TacticalAnalyticsEngine


def test_team_metrics_and_defensive_line_height():
    engine = TacticalAnalyticsEngine()

    # Create synthetic players for Team 0 defending left goal (-52.5m)
    p1 = TrackedPlayer(track_id=1, box=(0, 0, 10, 10), confidence=0.9, class_id=0, class_name="player")
    p1.team_id = 0
    p1.pitch_coords = (-45.0, 0.0)  # Goalkeeper

    p2 = TrackedPlayer(track_id=2, box=(0, 0, 10, 10), confidence=0.9, class_id=0, class_name="player")
    p2.team_id = 0
    p2.pitch_coords = (-32.0, -15.0)  # Center Back 1

    p3 = TrackedPlayer(track_id=3, box=(0, 0, 10, 10), confidence=0.9, class_id=0, class_name="player")
    p3.team_id = 0
    p3.pitch_coords = (-31.0, 15.0)  # Center Back 2

    p4 = TrackedPlayer(track_id=4, box=(0, 0, 10, 10), confidence=0.9, class_id=0, class_name="player")
    p4.team_id = 0
    p4.pitch_coords = (-10.0, 0.0)  # Midfielder

    metrics = engine.compute_team_metrics(0, [p1, p2, p3, p4])
    assert metrics.active_player_count == 4
    # Defensive line height should be around (-32.0 - (-52.5)) = 20.5 meters
    assert 18.0 <= metrics.defensive_line_height_m <= 23.0
    assert metrics.compactness_m2 > 100.0


def test_expected_threat_grid_lookup():
    engine = TacticalAnalyticsEngine()
    # Danger zone right in front of opposing goal (+48m, 0m)
    xt_danger = engine.get_xt_value(48.0, 0.0)
    # Safe zone in own defensive corner (-48m, -30m)
    xt_safe = engine.get_xt_value(-48.0, -30.0)
    assert xt_danger > xt_safe * 4.0, "xT must be substantially higher near opponent goal"


if __name__ == "__main__":
    test_team_metrics_and_defensive_line_height()
    test_expected_threat_grid_lookup()
    print("ALL TACTICAL ANALYTICS TESTS PASSED!")
