"""MATCHVISION AI — CLI & Pipeline Orchestrator.

Run options:
  python main.py --mode test                       # Run all automated test suites
  python main.py --mode process --video match.mp4 # Process match video
  python main.py --mode demo                       # Generate and process synthetic football match
"""

import argparse
import json
import sys
import os


def _write_export(pipeline, results, destination: str) -> None:
    """Writes the match artefact JSON used by the commercial web workspace."""
    payload = pipeline.export_match_payload(results)
    with open(destination, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
    print(
        f"Match artefact written to {destination} "
        f"({len(payload['players'])} players, {len(payload['events'])} events)"
    )


def run_tests():
    """Runs all MatchVision AI unit and integration tests."""
    print("==================================================================")
    print("MATCHVISION AI — AUTOMATED TEST SUITE")
    print("==================================================================")

    import tests.test_tracker as t_tracker
    import tests.test_pitch_calibrator as t_calib
    import tests.test_tactical_analytics as t_tactics
    import tests.test_event_detector as t_events
    import tests.test_team_identifier as t_teams
    import tests.test_export as t_export

    try:
        print("[TEST 1/6] Running Tracker and Occlusion Recovery Tests...")
        t_tracker.test_iou_calculation()
        t_tracker.test_tracking_persistence_and_identity_recovery()
        print(" -> PASSED.")

        print("[TEST 2/6] Running Pitch Calibrator & Homography Tests...")
        t_calib.test_pitch_homography_and_coordinates()
        t_calib.test_degraded_calibration_handling()
        print(" -> PASSED.")

        print("[TEST 3/6] Running Tactical Analytics & Spatial Metrics Tests...")
        t_tactics.test_team_metrics_and_defensive_line_height()
        t_tactics.test_expected_threat_grid_lookup()
        print(" -> PASSED.")

        print("[TEST 4/6] Running Football Event Detector Tests...")
        t_events.test_pass_completion_and_turnover()
        print(" -> PASSED.")

        print("[TEST 5/6] Running Team Identification & Jersey Clustering Tests...")
        t_teams.test_tracker_retains_torso_crop_for_team_classification()
        print(" -> PASSED.")

        print("[TEST 6/6] Running Match Artefact Export Contract Tests...")
        t_export.test_export_contract_includes_replay_timeline()
        t_export.test_timeline_decimation_keeps_ends_and_cap()
        print(" -> PASSED.")

        print("==================================================================")
        print("ALL 6/6 TEST SUITES PASSED SUCCESSFULLY (0 FAILURES)")
        print("==================================================================")
        return 0
    except Exception as e:
        print(f"FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1


def run_demo(
    output_path: str = "tracked_match.mp4",
    max_frames: int = 300,
    export_json: str = "demo_match.json",
) -> int:
    """Generates a synthetic match video and runs it through the full CV pipeline.

    Requires no YOLO weights or real footage, so it doubles as an offline smoke test
    of tracking, pitch calibration, team clustering, ball tracking and analytics.
    """
    try:
        import cv2  # noqa: F401
    except ImportError:
        print("Demo mode requires OpenCV and NumPy. Install them with:")
        print("  pip install -r requirements.txt")
        return 1

    from pipeline.synthetic_match import SyntheticMatchProvider
    from pipeline.video_pipeline import MatchVisionPipeline

    input_path = "demo_synthetic_match.mp4"
    provider = SyntheticMatchProvider()

    print(f"Generating {max_frames} synthetic broadcast frames -> {input_path} ...")
    provider.write_video(input_path, num_frames=max_frames)

    pipeline = MatchVisionPipeline(detector=provider)
    print(f"Processing {input_path} -> {output_path} ...")
    results = pipeline.process_video(input_path, output_path, max_frames=max_frames)

    if export_json:
        _write_export(pipeline, results, export_json)

    print("==================================================================")
    print("DEMO COMPLETE")
    print("==================================================================")
    for key, value in results.items():
        print(f"  {key}: {value}")
    print(f"\nOpen {output_path} to inspect the annotated broadcast feed.")
    return 0


def main():
    parser = argparse.ArgumentParser(description="MatchVision AI Engine")
    parser.add_argument("--mode", choices=["process", "test", "demo"], default="test", help="Execution mode")
    parser.add_argument("--video", type=str, default="sample_match.mp4", help="Path to input match video")
    parser.add_argument("--output", type=str, default="tracked_match.mp4", help="Path to output video")
    parser.add_argument("--max-frames", type=int, default=300, help="Max frames to process")
    parser.add_argument("--export-json", type=str, default="", help="Write match artefact JSON to this path")
    args = parser.parse_args()

    if args.mode == "test":
        sys.exit(run_tests())
    elif args.mode == "process":
        from pipeline.video_pipeline import MatchVisionPipeline
        pipeline = MatchVisionPipeline()
        print(f"Processing {args.video} -> {args.output}...")
        results = pipeline.process_video(args.video, args.output, max_frames=args.max_frames)
        print("Results:", results)
        if args.export_json:
            _write_export(pipeline, results, args.export_json)
    elif args.mode == "demo":
        export_path = args.export_json or "demo_match.json"
        sys.exit(run_demo(args.output, args.max_frames, export_path))


if __name__ == "__main__":
    main()
