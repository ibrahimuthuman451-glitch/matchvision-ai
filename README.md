# MatchVision AI — Next-Generation Real-Time Football Intelligence Engine

MatchVision AI transforms 2D broadcast and tactical football video footage into a live, spatially aware, pitch-calibrated representation of a football match.

---

## 1. Architecture Audit & Technical Gaps Analysis

### A. Pre-Audit Assessment of Initial Project Components
1. **`ai/detector.py`**:
   - *Previous state*: Simple generic single-class YOLO detection script.
   - *Gaps identified*: Did not distinguish between outfield players, goalkeepers, referees, and the ball. Vulnerable to false positives from spectators, advertising boards, and bench personnel.
   - *Enhancement*: Added dedicated multi-class categorization (players, goalkeepers, referees, ball), pitch polygon boundary masking to suppress crowd/bench noise, and torso crop extraction for color clustering.
2. **`ai/detector_backup.py`**:
   - *Previous state*: Preserved legacy backup.
3. **`ai/tracker.py`**:
   - *Previous state*: Basic LAP/IoU assignment without multi-stage association, susceptible to identity switches during cross-overs and camera cuts.
   - *Enhancement*: Implemented two-stage ByteTrack architecture with Kalman trajectory prediction, lost track buffer for occlusion recovery, and appearance feature cosine similarity.
4. **`ai/team_identifier.py`**:
   - *Previous state*: Naive RGB thresholding that misclassified players under pitch shadows or grass color reflections.
   - *Enhancement*: CIE-Lab color space K-Means clustering in the upper torso area, grass green and specular glare elimination, neon yellow referee separation, and temporal voting buffer to prevent flickers.
5. **`ai/pitch_calibrator.py`**:
   - *New Module*: Robust homography mapping ($H$) from 2D pixel coordinates to real FIFA pitch coordinates ($105\text{m} \times 68\text{m}$) using ground-contact foot point projection and explicit degraded-mode signaling.
6. **`ai/ball_tracker.py`**:
   - *New Module*: Specialized ball kinematic Kalman filter with occlusion interpolation, proximity-based carrier assignment, and probabilistic possession estimation.
7. **`ai/event_detector.py`**:
   - *New Module*: Real-time technical and tactical event detector (pass initiation, pass completion, turnover, shot with xG, final third entry) with temporal confirmation and duplicate suppression.
8. **`ai/tactical_analytics.py`**:
   - *New Module*: Dynamic team shape metrics, defensive line height ($m$), convex hull compactness ($m^2$), player speed ($km/h$) and distance ($m$), Expected Threat ($xT$) $16 \times 12$ grid model, and calibrated Expected Goals ($xG$).
9. **`config/football_rules.yaml`**:
   - Standardized FIFA field dimensions, detection thresholds, and kinematic boundaries.

---

## 2. Windows Installation & Execution (PowerShell)

### Prerequisites:
- Windows 10 or 11
- Python 3.10+ (added to PATH)
- Node.js 18+ (for Web Studio)

### Step 1: Automatic Setup
In PowerShell (opened in `C:\Users\USER\Desktop\matchvision AI`):
```powershell
.\setup_windows.bat
```

### Step 2: Run Verification Test Suite
```powershell
powershell -ExecutionPolicy Bypass -File .\run_matchvision.ps1 -Mode test
```

### Step 3: Process a Match Video
```powershell
powershell -ExecutionPolicy Bypass -File .\run_matchvision.ps1 -Mode process -Video "sample_match.mp4" -Output "tracked_match.mp4"
```

### Step 4: Run the Live 2D Tactical Visualization Studio
```powershell
powershell -ExecutionPolicy Bypass -File .\run_matchvision.ps1 -Mode web
```
Visit `http://localhost:3000` to interact with the live top-down pitch engine.
