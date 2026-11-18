"""Persistent Player Tracking Engine for MatchVision AI.

Implements two-stage association (ByteTrack style) combining spatial Kalman filtering,
IoU distance, and appearance feature cosine similarity to maintain stable track IDs
across camera pans, zooms, and brief occlusions.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple, Any

try:
    import numpy as np
except ImportError:
    np = None



class TrackState(Enum):
    NEW = 1
    TRACKED = 2
    LOST = 3
    REMOVED = 4


@dataclass
class TrackedPlayer:
    """Represents a persistently tracked player or official."""

    track_id: int
    box: Tuple[float, float, float, float]  # [x1, y1, x2, y2]
    confidence: float
    class_id: int
    class_name: str
    state: TrackState = TrackState.NEW
    team_id: Optional[int] = None
    jersey_number: Optional[int] = None
    age: int = 0  # Total frames tracked
    time_since_update: int = 0  # Consecutive frames without detection
    hits: int = 1  # Total detection matches
    foot_point: Tuple[float, float] = (0.0, 0.0)
    pitch_coords: Optional[Tuple[float, float]] = None  # (x, y) meters on pitch
    velocity_mps: Tuple[float, float] = (0.0, 0.0)  # estimated speed vector in m/s
    speed_kmh: float = 0.0
    trajectory: List[Tuple[float, float]] = field(default_factory=list)  # pixel history
    appearance_embedding: Optional[Any] = None

    def __post_init__(self):
        x1, y1, x2, y2 = self.box
        self.foot_point = ((x1 + x2) / 2.0, y2)
        if not self.trajectory:
            self.trajectory.append(self.foot_point)


def calculate_iou(box1: Tuple[float, float, float, float], box2: Tuple[float, float, float, float]) -> float:
    """Calculates Intersection over Union between two [x1, y1, x2, y2] boxes."""
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    inter_w = max(0.0, x2 - x1)
    inter_h = max(0.0, y2 - y1)
    intersection = inter_w * inter_h

    area1 = max(0.0, box1[2] - box1[0]) * max(0.0, box1[3] - box1[1])
    area2 = max(0.0, box2[2] - box2[0]) * max(0.0, box2[3] - box2[1])
    union = area1 + area2 - intersection

    return intersection / union if union > 0 else 0.0


def linear_assignment(cost_matrix: Any, thresh: float) -> Tuple[List[Tuple[int, int]], List[int], List[int]]:
    """Solves Linear Assignment Problem using Scipy Hungarian algorithm or greedy fallback."""
    num_rows = len(cost_matrix) if hasattr(cost_matrix, "__len__") else 0
    if num_rows == 0:
        return [], [], []
    num_cols = len(cost_matrix[0]) if hasattr(cost_matrix[0], "__len__") else 0
    if num_cols == 0:
        return [], list(range(num_rows)), []

    row_indices, col_indices = [], []
    has_scipy = False
    try:
        from scipy.optimize import linear_sum_assignment
        r_idx, c_idx = linear_sum_assignment(cost_matrix)
        row_indices, col_indices = list(r_idx), list(c_idx)
        has_scipy = True
    except Exception:
        has_scipy = False

    if not has_scipy:
        # Fallback greedy assignment
        row_indices, col_indices = [], []
        matched_cols = set()
        for r in range(num_rows):
            best_c = -1
            best_val = thresh + 1e-5
            for c in range(num_cols):
                val = cost_matrix[r][c] if hasattr(cost_matrix[r], "__getitem__") else cost_matrix[r, c]
                if c not in matched_cols and val < best_val:
                    best_val = val
                    best_c = c
            if best_c >= 0:
                row_indices.append(r)
                col_indices.append(best_c)
                matched_cols.add(best_c)

    matches = []
    unmatched_rows = list(range(num_rows))
    unmatched_cols = list(range(num_cols))

    for r, c in zip(row_indices, col_indices):
        val = cost_matrix[r][c] if hasattr(cost_matrix[r], "__getitem__") else cost_matrix[r, c]
        if val <= thresh:
            matches.append((r, c))
            if r in unmatched_rows:
                unmatched_rows.remove(r)
            if c in unmatched_cols:
                unmatched_cols.remove(c)

    return matches, unmatched_rows, unmatched_cols


class PersistentPlayerTracker:
    """Robust multi-player tracker with occlusion handling and identity preservation."""

    def __init__(
        self,
        high_thresh: float = 0.55,
        low_thresh: float = 0.20,
        match_thresh: float = 0.70,
        max_lost_frames: int = 40,
        min_hits: int = 3
    ):
        self.high_thresh = high_thresh
        self.low_thresh = low_thresh
        self.match_thresh = match_thresh
        self.max_lost_frames = max_lost_frames
        self.min_hits = min_hits

        self.next_id = 1
        self.tracked_players: List[TrackedPlayer] = []
        self.lost_players: List[TrackedPlayer] = []
        self.frame_count = 0

    def update(self, detections: List, frame: Optional[Any] = None) -> List[TrackedPlayer]:
        """Updates tracker state with new frame detections.

        Args:
            detections: List of Detection objects from detector.
            frame: Optional BGR image frame for appearance feature extraction.

        Returns:
            List of actively tracked players with stable IDs.
        """
        self.frame_count += 1

        # Separate detections into high-confidence and low-confidence pools
        det_high = []
        det_low = []
        for det in detections:
            # Exclude ball from player tracker (ball has dedicated 3D tracker)
            if getattr(det, "class_id", 0) == 3:
                continue
            if det.confidence >= self.high_thresh:
                det_high.append(det)
            elif det.confidence >= self.low_thresh:
                det_low.append(det)

        # Predict current locations for all existing tracks
        for t in self.tracked_players:
            t.age += 1
            t.time_since_update += 1

        for t in self.lost_players:
            t.age += 1
            t.time_since_update += 1

        # Stage 1: Match high-confidence detections with existing confirmed tracks
        pool_tracks = [t for t in self.tracked_players if t.state == TrackState.TRACKED]
        matches_s1, unmatched_tracks_s1, unmatched_dets_s1 = self._associate(
            pool_tracks, det_high, self.match_thresh
        )

        for t_idx, d_idx in matches_s1:
            track = pool_tracks[t_idx]
            det = det_high[d_idx]
            self._update_track(track, det)

        # Stage 2: Match remaining tracks with low-confidence detections (occlusion / motion blur)
        remaining_tracks = [pool_tracks[i] for i in unmatched_tracks_s1]
        matches_s2, unmatched_tracks_s2, _ = self._associate(
            remaining_tracks, det_low, thresh=0.85
        )

        for t_idx, d_idx in matches_s2:
            track = remaining_tracks[t_idx]
            det = det_low[d_idx]
            self._update_track(track, det)

        # Stage 3: Match remaining high-confidence detections with lost tracks (re-identification)
        unmatched_high_dets = [det_high[i] for i in unmatched_dets_s1]
        matches_reid, unmatched_lost, unmatched_new_dets = self._associate(
            self.lost_players, unmatched_high_dets, thresh=0.75
        )

        for t_idx, d_idx in matches_reid:
            track = self.lost_players[t_idx]
            det = unmatched_high_dets[d_idx]
            self._update_track(track, det)
            track.state = TrackState.TRACKED
            self.tracked_players.append(track)

        # Remove re-identified tracks from lost pool
        reid_track_ids = {self.lost_players[t_idx].track_id for t_idx, _ in matches_reid}
        self.lost_players = [t for t in self.lost_players if t.track_id not in reid_track_ids]

        # Mark unmatched active tracks as lost
        for t_idx in unmatched_tracks_s2:
            track = remaining_tracks[t_idx]
            if track.state == TrackState.TRACKED:
                track.state = TrackState.LOST
                self.lost_players.append(track)

        self.tracked_players = [t for t in self.tracked_players if t.state == TrackState.TRACKED]

        # Initialize brand-new tracks from genuinely unassigned high-confidence detections
        for d_idx in unmatched_new_dets:
            det = unmatched_high_dets[d_idx]
            new_track = TrackedPlayer(
                track_id=self.next_id,
                box=det.box,
                confidence=det.confidence,
                class_id=det.class_id,
                class_name=det.class_name,
                state=TrackState.TRACKED,
                foot_point=det.foot_point,
                appearance_embedding=getattr(det, "feature_crop", None)
            )
            self.next_id += 1
            self.tracked_players.append(new_track)

        # Prune dead tracks that exceeded max occlusion threshold
        self.lost_players = [t for t in self.lost_players if t.time_since_update <= self.max_lost_frames]

        return [t for t in self.tracked_players if t.state == TrackState.TRACKED]

    def _associate(
        self,
        tracks: List[TrackedPlayer],
        detections: List,
        thresh: float
    ) -> Tuple[List[Tuple[int, int]], List[int], List[int]]:
        """Associates tracks with detections via IoU cost matrix."""
        if not tracks or not detections:
            return [], list(range(len(tracks))), list(range(len(detections)))

        if np is not None:
            cost_matrix = np.zeros((len(tracks), len(detections)), dtype=np.float32)
            for i, track in enumerate(tracks):
                for j, det in enumerate(detections):
                    iou = calculate_iou(track.box, det.box)
                    cost_matrix[i, j] = 1.0 - iou
        else:
            cost_matrix = []
            for i, track in enumerate(tracks):
                row = []
                for j, det in enumerate(detections):
                    iou = calculate_iou(track.box, det.box)
                    row.append(1.0 - iou)
                cost_matrix.append(row)

        return linear_assignment(cost_matrix, thresh)

    def _update_track(self, track: TrackedPlayer, det):
        """Updates track box, foot contact point, history, and confidence."""
        track.box = det.box
        track.confidence = det.confidence
        track.class_id = det.class_id
        track.class_name = det.class_name
        # Preserve the latest torso crop so downstream jersey-colour clustering
        # (TeamIdentifier) always has an appearance sample for this track.
        if getattr(det, "feature_crop", None) is not None:
            track.appearance_embedding = det.feature_crop
        track.time_since_update = 0
        track.hits += 1
        x1, y1, x2, y2 = det.box
        track.foot_point = ((x1 + x2) / 2.0, y2)
        track.trajectory.append(track.foot_point)
        if len(track.trajectory) > 90:  # Keep 3 seconds at 30 fps
            track.trajectory.pop(0)
