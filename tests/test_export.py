"""Unit tests for the match artefact exporter (web studio contract)."""

from types import SimpleNamespace

from ai.event_detector import MatchEvent
from pipeline.export import build_match_payload, _decimate_timeline


class _FakeAnalytics:
    def __init__(self):
        self.player_last_pos = {1: (-10.0, 5.0), 2: (12.0, -4.0)}
        self.player_cumulative_distance = {1: 1000.0, 2: 1200.0}
        self.player_speeds_kmh = {1: 7.2, 2: 6.8}
        self.player_max_speed_kmh = {1: 30.1, 2: 31.5}
        self.player_sprints = {1: 10, 2: 12}
        self.possession_frames = {0: 60, 1: 40}

    def compute_team_metrics(self, team_id, players):
        return SimpleNamespace(
            active_player_count=len(players),
            defensive_line_height_m=35.0,
            team_length_m=30.0,
            team_width_m=40.0,
            compactness_m2=600.0,
            centroid=(0.0, 0.0),
            possession_pct=60.0 if team_id == 0 else 40.0,
            xg_total=0.0,
            field_tilt_pct=0.0,
            ppda=0.0,
        )


def test_export_contract_includes_replay_timeline():
    pipeline = SimpleNamespace(
        analytics=_FakeAnalytics(),
        tracker=SimpleNamespace(tracked_players=[]),
        team_identifier=SimpleNamespace(track_team_history={1: [0, 0, 0], 2: [1, 1, 1]}),
        events=[
            MatchEvent(
                event_id="EV-1",
                event_type="pass_complete",
                timestamp_sec=1.5,
                frame_idx=45,
                team_id=0,
                player_id=1,
                receiver_id=2,
                pitch_location=(-5.0, 2.0),
                outcome="success",
                confidence=0.9,
                metadata={"flight_seconds": 0.4},
            )
        ],
        timeline=[
            {"t": 0.25, "b": [0.0, 0.0], "p": {"1": [-11.0, 5.0], "2": [13.0, -4.0]}},
            {"t": 0.5, "b": [0.5, 0.1], "p": {"1": [-10.5, 5.1], "2": [12.5, -4.1]}},
            {"t": 0.75, "b": [1.0, 0.2], "p": {"1": [-10.0, 5.0], "2": [12.0, -4.0]}},
        ],
        timeline_hz=4.0,
    )

    payload = build_match_payload(
        pipeline,
        {
            "input_video": "match.mp4",
            "output_video": "tracked.mp4",
            "processed_frames": 90,
            "source_fps": 30.0,
            "calibration_status": "Calibrated",
        },
    )

    assert payload["schema"] == "matchvision.match.v1"
    assert len(payload["players"]) == 2
    assert len(payload["team_metrics"]) == 2
    assert payload["video"]["calibration"] == "Calibrated"
    assert payload["timeline_hz"] == 4.0

    timeline = payload["timeline"]
    assert len(timeline) == 3
    assert timeline[0]["p"]["1"] == [-11.0, 5.0]
    assert payload["summary"]["timeline_samples"] == 3

    event = payload["events"][0]
    assert event["event_type"] == "pass_complete"
    assert event["receiver_id"] == 2
    assert event["xg"] is None


def test_timeline_decimation_keeps_ends_and_cap():
    samples = [{"t": i * 0.25, "b": None, "p": {}} for i in range(3000)]
    thinned = _decimate_timeline(samples, max_samples=1500)
    assert len(thinned) <= 1501
    assert thinned[0] is samples[0]
    assert thinned[-1] is samples[-1]

    short = samples[:10]
    assert _decimate_timeline(short, max_samples=1500) == short


if __name__ == "__main__":
    test_export_contract_includes_replay_timeline()
    test_timeline_decimation_keeps_ends_and_cap()
    print("ALL EXPORTER TESTS PASSED!")
