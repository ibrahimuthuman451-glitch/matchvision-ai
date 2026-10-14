"""End-to-End Modular Video Processing Pipeline for MatchVision AI.

Coordinates:
1. Video Ingestion & Stream Decoding
2. YOLO Football Object Detection
3. Persistent Player Tracking (ByteTrack)
4. Team Identification & Official Differentiation
5. Homography Pitch Calibration & Ground-Contact Projection
6. Ball Tracking & Possession Reasoning
7. Real-Time Tactical & Spatial Analytics
8. Diagnostic Video Generation with Overlays (tracked_match.mp4)
"""

import os
import time
from typing import Dict, List, Optional
import cv2
import numpy as np

from ai.detector import FootballDetector
from ai.tracker import PersistentPlayerTracker
from ai.team_identifier import TeamIdentifier
from ai.pitch_calibrator import PitchCalibrator
from ai.ball_tracker import BallTracker
from ai.event_detector import FootballEventDetector
from ai.tactical_analytics import TacticalAnalyticsEngine


class MatchVisionPipeline:
    """Production-grade pipeline orchestrator for recorded matches and live RTSP/RTMP feeds."""

    def __init__(
        self,
        config_path: str = "config/football_rules.yaml",
        model_path: str = "yolov8m.pt",
        device: str = "auto"
    ):
        self.detector = FootballDetector(model_path=model_path, device=device)
        self.tracker = PersistentPlayerTracker()
        self.team_identifier = TeamIdentifier()
        self.calibrator = PitchCalibrator()
        self.ball_tracker = BallTracker()
        self.event_detector = FootballEventDetector()
        self.analytics = TacticalAnalyticsEngine()

        # Telemetry metrics
        self.total_frames_processed = 0
        self.fps_throughput = 0.0
        self.avg_latency_ms = 0.0

    def process_video(
        self,
        input_video_path: str,
        output_video_path: str = "tracked_match.mp4",
        max_frames: Optional[int] = None,
        stride: int = 1,
        show_preview: bool = False
    ) -> Dict:
        """Processes a video file end-to-end and outputs diagnostic tracked footage.

        Args:
            input_video_path: Path to input mp4/avi/mkv football footage.
            output_video_path: Path to output annotated MP4.
            max_frames: Optional limit for benchmarking.
            stride: Process every Nth frame (default 1 for full temporal continuity).
            show_preview: If True, renders live cv2.imshow window.

        Returns:
            Dictionary of summary telemetry, event counts, and tracking statistics.
        """
        if not os.path.exists(input_video_path):
            raise FileNotFoundError(f"Input video file not found: {input_video_path}")

        cap = cv2.VideoCapture(input_video_path)
        if not cap.isOpened():
            raise RuntimeError(f"Failed to open video source: {input_video_path}")

        src_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        src_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        src_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_src_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        # Setup standard homography view for source resolution
        self.calibrator.set_default_tactical_homography(src_w, src_h)

        # Output video writer
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(output_video_path, fourcc, src_fps / stride, (src_w, src_h))

        frame_idx = 0
        processed_count = 0
        start_time = time.time()
        latencies = []

        all_detected_events = []

        try:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret or frame is None:
                    break

                frame_idx += 1
                if frame_idx % stride != 0:
                    continue

                if max_frames and processed_count >= max_frames:
                    break

                t0 = time.time()

                # Step 1: Detect football objects
                detections = self.detector.detect(frame)

                # Step 2: Persistent multi-player tracking
                tracked_players = self.tracker.update(detections, frame)

                # Step 3: Classify teams and project pitch coordinates
                for p in tracked_players:
                    # Ground contact feet point projected via homography
                    pitch_pt = self.calibrator.image_to_pitch(p.foot_point)
                    p.pitch_coords = pitch_pt

                    # Team classification
                    is_ref = (p.class_id == 2)
                    team_id, team_label = self.team_identifier.classify_player(
                        p.appearance_embedding, p.track_id, is_ref
                    )
                    p.team_id = team_id

                # Step 4: Ball tracking & possession estimation
                ball_det = next((d for d in detections if d.class_id == 3), None)
                ball_state = self.ball_tracker.update(ball_det, self.calibrator, tracked_players, frame_idx)

                # Step 5: Technical and tactical event detection
                new_events = self.event_detector.update(ball_state, tracked_players, frame_idx)
                all_detected_events.extend(new_events)

                # Step 6: Kinematics & spatial metrics
                self.analytics.update_player_kinematics(tracked_players)

                # Step 7: Render broadcast diagnostic overlays onto frame
                annotated_frame = self._render_overlays(frame, tracked_players, ball_state, frame_idx, src_fps)
                writer.write(annotated_frame)

                t1 = time.time()
                latencies.append((t1 - t0) * 1000.0)
                processed_count += 1

                if show_preview:
                    cv2.imshow("MatchVision AI Diagnostic Output", annotated_frame)
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        break

        finally:
            cap.release()
            writer.release()
            if show_preview:
                cv2.destroyAllWindows()

        elapsed = time.time() - start_time
        self.fps_throughput = round(processed_count / elapsed, 1) if elapsed > 0 else 0.0
        self.avg_latency_ms = round(float(np.mean(latencies)), 1) if latencies else 0.0

        return {
            "input_video": input_video_path,
            "output_video": output_video_path,
            "processed_frames": processed_count,
            "source_fps": round(src_fps, 1),
            "throughput_fps": self.fps_throughput,
            "avg_latency_ms": self.avg_latency_ms,
            "unique_players_tracked": self.tracker.next_id - 1,
            "total_events_detected": len(all_detected_events),
            "calibration_status": "Calibrated" if self.calibrator.is_calibrated else "Degraded"
        }

    def _render_overlays(
        self,
        frame: np.ndarray,
        tracked_players: List,
        ball_state,
        frame_idx: int,
        fps: float
    ) -> np.ndarray:
        """Renders tactical badges, player IDs, velocities, and ball trails onto frame."""
        vis = frame.copy()

        # Render Players
        for p in tracked_players:
            x1, y1, x2, y2 = map(int, p.box)
            team_id = getattr(p, "team_id", 0)

            # Color by team
            if team_id == 0:
                box_color = (40, 40, 235)  # Team A Red (BGR)
            elif team_id == 1:
                box_color = (235, 160, 40)  # Team B Sky Blue
            elif team_id == 2:
                box_color = (30, 220, 230)  # Referee Yellow
            else:
                box_color = (50, 200, 50)  # GK Green

            # Bounding box
            cv2.rectangle(vis, (x1, y1), (x2, y2), box_color, 2)

            # Ground contact foot point dot
            foot_x, foot_y = map(int, p.foot_point)
            cv2.circle(vis, (foot_x, foot_y), 4, (0, 255, 255), -1)

            # Player Label Badge
            speed_txt = f"{p.speed_kmh:.1f}kph" if p.speed_kmh > 0 else ""
            coords_txt = f"({p.pitch_coords[0]:.0f}m,{p.pitch_coords[1]:.0f}m)" if p.pitch_coords else ""
            badge_txt = f"#{p.track_id} {speed_txt} {coords_txt}".strip()

            cv2.rectangle(vis, (x1, max(0, y1 - 22)), (x1 + len(badge_txt) * 9, max(22, y1)), box_color, -1)
            cv2.putText(vis, badge_txt, (x1 + 3, max(16, y1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)

        # Render Ball
        if ball_state and ball_state.image_coords:
            bx, by = map(int, ball_state.image_coords)
            cv2.circle(vis, (bx, by), 7, (0, 165, 255), -1)  # Orange outer
            cv2.circle(vis, (bx, by), 4, (255, 255, 255), -1)  # White inner
            ball_label = f"BALL {ball_state.velocity_mps:.1f}m/s"
            cv2.putText(vis, ball_label, (bx + 10, by - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1)

        # HUD Top Banner
        h, w = vis.shape[:2]
        cv2.rectangle(vis, (0, 0), (w, 42), (20, 20, 24), -1)
        hud_text = (
            f"MATCHVISION AI | Frame: {frame_idx} | Time: {frame_idx/fps:.1f}s | "
            f"Tracks: {len(tracked_players)} | Calib: {'ACTIVE' if self.calibrator.is_calibrated else 'DEGRADED'}"
        )
        cv2.putText(vis, hud_text, (20, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 255, 180), 2)

        return vis
