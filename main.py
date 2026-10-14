"""MATCHVISION AI — CLI & Pipeline Orchestrator.

Run options:
  python main.py --mode test                       # Run all automated test suites
  python main.py --mode process --video match.mp4 # Process match video
  python main.py --mode demo                       # Generate and process synthetic football match
"""

import argparse
import sys
import os


def run_tests():
    """Runs all MatchVision AI unit and integration tests."""
    print("==================================================================")
    print("MATCHVISION AI — AUTOMATED TEST SUITE")
    print("==================================================================")

    import tests.test_tracker as t_tracker
    import tests.test_pitch_calibrator as t_calib
    import tests.test_tactical_analytics as t_tactics
    import tests.test_event_detector as t_events

    try:
        print("[TEST 1/4] Running Tracker and Occlusion Recovery Tests...")
        t_tracker.test_iou_calculation()
        t_tracker.test_tracking_persistence_and_identity_recovery()
        print(" -> PASSED.")

        print("[TEST 2/4] Running Pitch Calibrator & Homography Tests...")
        t_calib.test_pitch_homography_and_coordinates()
        t_calib.test_degraded_calibration_handling()
        print(" -> PASSED.")

        print("[TEST 3/4] Running Tactical Analytics & Spatial Metrics Tests...")
        t_tactics.test_team_metrics_and_defensive_line_height()
        t_tactics.test_expected_threat_grid_lookup()
        print(" -> PASSED.")

        print("[TEST 4/4] Running Football Event Detector Tests...")
        t_events.test_pass_completion_and_turnover()
        print(" -> PASSED.")

        print("==================================================================")
        print("ALL 4/4 TEST SUITES PASSED SUCCESSFULLY (0 FAILURES)")
        print("==================================================================")
        return 0
    except Exception as e:
        print(f"FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1


def main():
    parser = argparse.ArgumentParser(description="MatchVision AI Engine")
    parser.add_argument("--mode", choices=["process", "test", "demo"], default="test", help="Execution mode")
    parser.add_argument("--video", type=str, default="sample_match.mp4", help="Path to input match video")
    parser.add_argument("--output", type=str, default="tracked_match.mp4", help="Path to output video")
    parser.add_argument("--max-frames", type=int, default=300, help="Max frames to process")
    args = parser.parse_args()

    if args.mode == "test":
        sys.exit(run_tests())
    elif args.mode == "process":
        from pipeline.video_pipeline import MatchVisionPipeline
        pipeline = MatchVisionPipeline()
        print(f"Processing {args.video} -> {args.output}...")
        results = pipeline.process_video(args.video, args.output, max_frames=args.max_frames)
        print("Results:", results)


if __name__ == "__main__":
    main()
