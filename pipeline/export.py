"""Match artefact export for MatchVision AI.

Builds the versioned JSON document the commercial web workspace ingests:

    {
      "schema": "matchvision.match.v1",
      "generated_at": "...",
      "video": {...},
      "team_metrics": [...],
      "players": [...],
      "events": [...],
      "summary": {...}
    }
"""

from datetime import datetime, timezone
import math
from types import SimpleNamespace
from typing import Any, Dict, List, Optional

SCHEMA_VERSION = "matchvision.match.v1"


def _majority_team(team_identifier, track_id: int) -> Optional[int]:
    history = team_identifier.track_team_history.get(track_id) or []
    if not history:
        return None
    return max(set(history), key=history.count)


def _team_name(team_id: int) -> str:
    return {0: "Team A", 1: "Team B", 2: "Referee"}.get(team_id, "Unknown")


def build_match_payload(pipeline: Any, results: Dict[str, Any]) -> Dict[str, Any]:
    """Serialises pipeline state into the match artefact contract."""
    analytics = pipeline.analytics
    current = {p.track_id: p for p in pipeline.tracker.tracked_players}

    track_ids = sorted(
        set(analytics.player_last_pos)
        | set(analytics.player_cumulative_distance)
        | set(current.keys())
    )

    players: List[Dict[str, Any]] = []
    team_track_ids: Dict[int, List[int]] = {0: [], 1: [], 2: []}

    for tid in track_ids:
        team_id = _majority_team(pipeline.team_identifier, tid)
        if team_id is None and tid in current:
            team_id = getattr(current[tid], "team_id", None)
        if team_id in team_track_ids:
            team_track_ids[team_id].append(tid)

        coords = None
        if tid in current and current[tid].pitch_coords is not None:
            coords = current[tid].pitch_coords
        elif tid in analytics.player_last_pos:
            coords = analytics.player_last_pos[tid]

        players.append(
            {
                "track_id": tid,
                "team_id": team_id,
                "team_name": _team_name(team_id) if team_id is not None else None,
                "jersey_number": None,
                "role": "player",
                "pitch_coords": [round(float(coords[0]), 2), round(float(coords[1]), 2)]
                if coords
                else None,
                "distance_m": round(float(analytics.player_cumulative_distance.get(tid, 0.0)), 1),
                "avg_speed_kmh": round(float(analytics.player_speeds_kmh.get(tid, 0.0)), 1),
                "max_speed_kmh": round(float(analytics.player_max_speed_kmh.get(tid, 0.0)), 1),
                "sprints": int(analytics.player_sprints.get(tid, 0)),
            }
        )

    team_metrics: List[Dict[str, Any]] = []
    last_positions = analytics.player_last_pos
    for team_id in (0, 1):
        stubs = [
            SimpleNamespace(team_id=team_id, pitch_coords=coords)
            for tid, coords in last_positions.items()
            if _majority_team(pipeline.team_identifier, tid) == team_id and coords is not None
        ]
        metrics = analytics.compute_team_metrics(team_id, stubs)
        team_metrics.append(
            {
                "team_id": team_id,
                "team_name": _team_name(team_id),
                "active_player_count": metrics.active_player_count,
                "defensive_line_height_m": metrics.defensive_line_height_m,
                "team_length_m": metrics.team_length_m,
                "team_width_m": metrics.team_width_m,
                "compactness_m2": metrics.compactness_m2,
                "centroid": list(metrics.centroid),
                "possession_pct": metrics.possession_pct,
                "xg_total": metrics.xg_total,
                "field_tilt_pct": metrics.field_tilt_pct,
                "ppda": metrics.ppda,
                "track_ids": team_track_ids[team_id],
            }
        )

    events = []
    for event in pipeline.events:
        events.append(
            {
                "event_id": event.event_id,
                "event_type": event.event_type,
                "time_sec": round(float(event.timestamp_sec), 2),
                "frame_idx": int(event.frame_idx),
                "team_id": event.team_id,
                "player_id": event.player_id,
                "receiver_id": event.receiver_id,
                "x": round(float(event.pitch_location[0]), 2),
                "y": round(float(event.pitch_location[1]), 2),
                "end_location": [round(float(v), 2) for v in event.end_location]
                if event.end_location
                else None,
                "outcome": event.outcome,
                "confidence": round(float(event.confidence), 2),
                "xg": event.metadata.get("xg") if event.metadata else None,
                "shot_speed_kmh": event.metadata.get("shot_speed_kmh") if event.metadata else None,
            }
        )

    timeline = _decimate_timeline(getattr(pipeline, "timeline", []) or [])

    total_distance = sum(p["distance_m"] or 0.0 for p in players)
    total_frames = int(results.get("processed_frames") or 0)
    fps = float(results.get("source_fps") or 30.0)

    return {
        "schema": SCHEMA_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "video": {
            "input": results.get("input_video"),
            "output": results.get("output_video"),
            "frames": total_frames,
            "fps": fps,
            "duration_sec": round(total_frames / fps, 2) if fps else None,
            "calibration": results.get("calibration_status"),
        },
        "team_metrics": team_metrics,
        "players": players,
        "events": events,
        "timeline": timeline,
        "timeline_hz": getattr(pipeline, "timeline_hz", None),
        "summary": {
            "players_tracked": len(players),
            "total_distance_m": round(total_distance, 1),
            "events_detected": len(events),
            "timeline_samples": len(timeline),
            "throughput_fps": results.get("throughput_fps"),
            "avg_latency_ms": results.get("avg_latency_ms"),
            "unique_players_tracked": results.get("unique_players_tracked"),
        },
    }


def _decimate_timeline(samples: List[Dict[str, Any]], max_samples: int = 1500) -> List[Dict[str, Any]]:
    """Caps the replay timeline so long matches stay inside the upload limit.

    Samples are uniformly thinned while always keeping the first and last frame.
    """
    if len(samples) <= max_samples:
        return samples

    step = math.ceil(len(samples) / max_samples)
    thinned = samples[::step]
    if thinned and thinned[-1] is not samples[-1]:
        thinned.append(samples[-1])
    return thinned
