"""Unit tests for MatchVision AI team identification wiring."""

try:
    import numpy as np
except ImportError:
    np = None

from ai.detector import Detection
from ai.tracker import PersistentPlayerTracker
from ai.team_identifier import TeamIdentifier


def _crop(rgb, shade=1.0):
    """Builds a solid-colour BGR torso crop like the detector would produce."""
    color = tuple(int(max(0, min(255, c * shade))) for c in rgb)
    return np.full((24, 12, 3), color, dtype=np.uint8)


def test_tracker_retains_torso_crop_for_team_classification():
    if np is None:
        print(" -> SKIPPED (numpy not installed)")
        return

    red = _crop((30, 30, 220))    # BGR red kit
    blue = _crop((225, 140, 30))  # BGR sky-blue kit

    tracker = PersistentPlayerTracker()
    det_red = Detection(box=(100, 300, 160, 420), confidence=0.9, class_id=0,
                        class_name="player", feature_crop=red)
    det_blue = Detection(box=(500, 300, 560, 420), confidence=0.9, class_id=0,
                         class_name="player", feature_crop=blue)

    tracks = tracker.update([det_red, det_blue])
    assert len(tracks) == 2
    for track in tracks:
        assert track.appearance_embedding is not None, (
            "Tracker must retain the detector torso crop for jersey clustering"
        )

    red_track = next(t for t in tracks if t.box[0] < 300)
    blue_track = next(t for t in tracks if t.box[0] >= 300)

    identifier = TeamIdentifier()
    identifier.fit_teams([red, blue, red, blue, red, blue])

    centers = identifier.team_centers
    assert any(np.linalg.norm(center - np.array([220.0, 30.0, 30.0])) < 40.0 for center in centers), \
        "Fitted kit centres must recover the red jersey colour"
    assert any(np.linalg.norm(center - np.array([30.0, 140.0, 225.0])) < 40.0 for center in centers), \
        "Fitted kit centres must recover the blue jersey colour"

    red_team, _ = identifier.classify_player(red_track.appearance_embedding, red_track.track_id)
    blue_team, _ = identifier.classify_player(blue_track.appearance_embedding, blue_track.track_id)

    assert red_team != blue_team, "Opposing kits must not collapse into a single team"


if __name__ == "__main__":
    test_tracker_retains_torso_crop_for_team_classification()
    print("ALL TEAM IDENTIFIER TESTS PASSED!")
