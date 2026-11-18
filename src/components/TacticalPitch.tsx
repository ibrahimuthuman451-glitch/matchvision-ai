import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Player,
  Ball,
  TacticalOverlaysConfig,
  TelestrationAnnotation,
  TelestrationTool,
  AnalystPostMatchComment,
  TacticalPitchAlert,
  TacticalAlertCategory,
  CoachDirective,
} from "../types/match";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Target,
  Crosshair,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Compass,
  Cpu,
  Activity,
  Users,
  Shield,
  Layers,
  X,
  TrendingUp,
  Flag,
  CornerDownRight,
  Zap,
  ArrowUpRight,
  Bell,
  BellRing,
  BellOff,
  AlertTriangle,
  Volume2,
  VolumeX,
  Play,
  Flame,
  ShieldAlert,
  Eye,
  CheckCircle2,
  Share2,
  PenTool,
  ArrowRight,
  Minus,
  Trash2,
  MessageSquare,
} from "lucide-react";
import {
  TouchlineMarker,
  CalibrationResult,
  generateDetectedMarkers,
  solveTouchlineAutoCalibration,
} from "../services/pitchHomography";
import {
  formationDetector,
  TeamFormationAnalysis,
  PlayerAveragePos,
} from "../services/formationDetector";
import {
  analyzeSetPiece,
  SET_PIECE_PRESETS,
  SetPieceAnalysis,
  SetPieceTrajectory,
  SetPieceTargetZone,
} from "../services/setPieceAnalytics";
import {
  detectLiveTacticalEvents,
  generateSimulatedScenarioAlert,
  tacticalAlertAudio,
  INITIAL_TACTICAL_ALERTS,
  formatMatchTimestamp,
} from "../services/tacticalEventDetector";

interface TacticalPitchProps {
  players: Player[];
  ball: Ball;
  selectedPlayerId: number | null;
  onSelectPlayer: (id: number | null) => void;
  overlays: TacticalOverlaysConfig;
  telestrations?: TelestrationAnnotation[];
  onAddAnnotation?: (ann: TelestrationAnnotation) => void;
  onClearAnnotations?: () => void;
  onUndoAnnotation?: () => void;
  activeTool?: TelestrationTool;
  onSelectTool?: (tool: TelestrationTool) => void;
  activeColor?: string;
  onSelectColor?: (color: string) => void;
  matchTimeSec?: number;
  onAddDirective?: (directive: CoachDirective) => void;
  onSavePunditComment?: (comment: AnalystPostMatchComment) => void;
}

export const TacticalPitch: React.FC<TacticalPitchProps> = ({
  players,
  ball,
  selectedPlayerId,
  onSelectPlayer,
  overlays,
  telestrations = [],
  onAddAnnotation,
  onClearAnnotations,
  onUndoAnnotation,
  activeTool,
  onSelectTool,
  activeColor,
  onSelectColor,
  matchTimeSec = 4110,
  onAddDirective,
  onSavePunditComment,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Zoom and Pan state for interactive tactical inspection
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Pundit & Analyst Telestrator State
  const [internalTelestrations, setInternalTelestrations] = useState<TelestrationAnnotation[]>([]);
  const effectiveTelestrations =
    telestrations && telestrations.length > 0 ? telestrations : internalTelestrations;

  const handleAddAnnotation = useCallback(
    (ann: TelestrationAnnotation) => {
      if (onAddAnnotation) onAddAnnotation(ann);
      else setInternalTelestrations((prev) => [...prev, ann]);
    },
    [onAddAnnotation]
  );

  const handleClearAnnotations = useCallback(() => {
    if (onClearAnnotations) onClearAnnotations();
    else setInternalTelestrations([]);
  }, [onClearAnnotations]);

  const handleUndoAnnotation = useCallback(() => {
    if (onUndoAnnotation) onUndoAnnotation();
    else setInternalTelestrations((prev) => prev.slice(0, -1));
  }, [onUndoAnnotation]);

  const [isPunditMode, setIsPunditMode] = useState<boolean>(false);
  const [internalTool, setInternalTool] = useState<TelestrationTool>("pass_arrow");
  const effectiveTool = activeTool || internalTool;
  const setEffectiveTool = (t: TelestrationTool) => {
    if (onSelectTool) onSelectTool(t);
    setInternalTool(t);
  };

  const [internalColor, setInternalColor] = useState<string>("#eab308");
  const effectiveColor = activeColor || internalColor;
  const setEffectiveColor = (c: string) => {
    if (onSelectColor) onSelectColor(c);
    setInternalColor(c);
  };

  // Live drawing states on canvas
  const [isLiveDrawing, setIsLiveDrawing] = useState<boolean>(false);
  const [liveStartPoint, setLiveStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [liveCurrentPoint, setLiveCurrentPoint] = useState<{ x: number; y: number } | null>(null);
  const [liveFreehandPath, setLiveFreehandPath] = useState<{ x: number; y: number }[]>([]);
  const drawStartPitchRef = useRef<{ x: number; y: number } | null>(null);
  const freehandPointsRef = useRef<{ x: number; y: number }[]>([]);

  // Action Marker category picker
  const [selectedActionCategory, setSelectedActionCategory] = useState<{
    id: "turnover" | "goal_chance" | "defensive_error" | "press_trigger" | "1v1_isolation";
    label: string;
    color: string;
  }>({
    id: "defensive_error",
    label: "Defensive Line Gap",
    color: "#ef4444",
  });

  // Pundit quick comment modal inside pitch
  const [showPitchCommentModal, setShowPitchCommentModal] = useState<boolean>(false);
  const [pitchCommentText, setPitchCommentText] = useState<string>("");
  const [pitchPunditName, setPitchPunditName] = useState<string>("Jamie Carragher");
  const [pitchCommentHeadline, setPitchCommentHeadline] = useState<string>("");

  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasDraggedRef = useRef<boolean>(false);

  // Pitch standard FIFA dimensions: 105m x 68m
  const PITCH_L = 105.0;
  const PITCH_W = 68.0;

  // --- AUTO-CALIBRATION & HOMOGRAPHY TRANSFORMATION STATE ---
  const [showHomographyDebug, setShowHomographyDebug] = useState<boolean>(false);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [calibrationSweepProgress, setCalibrationSweepProgress] = useState<number>(0);
  const [drift, setDrift] = useState<{ dx: number; dy: number; rotationDeg: number; scale: number }>({
    dx: 0,
    dy: 0,
    rotationDeg: 0,
    scale: 1.0,
  });

  const [markers, setMarkers] = useState<TouchlineMarker[]>(() =>
    generateDetectedMarkers({ dx: 0, dy: 0, rotationDeg: 0, scale: 1.0 })
  );

  const [calibrationResult, setCalibrationResult] = useState<CalibrationResult>(() =>
    solveTouchlineAutoCalibration(generateDetectedMarkers({ dx: 0, dy: 0, rotationDeg: 0, scale: 1.0 }))
  );

  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [isInspectorExpanded, setIsInspectorExpanded] = useState<boolean>(false);
  const [activeInspectorTab, setActiveInspectorTab] = useState<"matrix" | "markers" | "residuals">("matrix");

  // --- 10-SECOND FORMATION ANALYSIS STATE ---
  const [team0Formation, setTeam0Formation] = useState<TeamFormationAnalysis | null>(null);
  const [team1Formation, setTeam1Formation] = useState<TeamFormationAnalysis | null>(null);
  const [averagePositions, setAveragePositions] = useState<Map<number, PlayerAveragePos>>(new Map());
  const [show10sAverageAnchors, setShow10sAverageAnchors] = useState<boolean>(false);
  const [showFormationDrawer, setShowFormationDrawer] = useState<boolean>(false);
  const [activeFormationTeamTab, setActiveFormationTeamTab] = useState<number>(0);

  // --- SET-PIECE TACTICAL OVERLAY STATE ---
  const [isSetPieceMode, setIsSetPieceMode] = useState<boolean>(true);
  const [selectedSetPiecePresetId, setSelectedSetPiecePresetId] = useState<string>("ars_corner_r");
  const [activeSetPieceBall, setActiveSetPieceBall] = useState<{ x: number; y: number } | null>(null);
  const [activeTrajectoryId, setActiveTrajectoryId] = useState<string | null>(null);
  const [showSetPieceDrawer, setShowSetPieceDrawer] = useState<boolean>(false);

  // Real-time hover cursor coordinate probe
  const [cursorProbe, setCursorProbe] = useState<{
    screenX: number;
    screenY: number;
    pitchX: number;
    pitchY: number;
    reprojectedX: number;
    reprojectedY: number;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // --- REAL-TIME TACTICAL NOTIFICATION SYSTEM STATE ---
  const [activeAlerts, setActiveAlerts] = useState<TacticalPitchAlert[]>([]);
  const [alertHistory, setAlertHistory] = useState<TacticalPitchAlert[]>(INITIAL_TACTICAL_ALERTS);
  const [isAlertsEnabled, setIsAlertsEnabled] = useState<boolean>(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [showAlertsDrawer, setShowAlertsDrawer] = useState<boolean>(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [alertFilter, setAlertFilter] = useState<"all" | TacticalAlertCategory>("all");

  // Real-time tactical detection effect across simulation updates
  const lastAlertCheckRef = useRef(0);
  const recentAlertKeysRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!isAlertsEnabled) return;

    // Replay can push positions at 10 Hz; detection must not run on every tick
    const now = Date.now();
    if (now - lastAlertCheckRef.current < 700) return;
    lastAlertCheckRef.current = now;

    const detected = detectLiveTacticalEvents(players, ball, matchTimeSec);
    const fresh = detected.filter((candidate) => {
      const key = `${candidate.category}:${candidate.title}`;
      const seenAt = recentAlertKeysRef.current.get(key) ?? 0;
      return now - seenAt > 8000;
    });

    fresh.forEach((newAlert) => {
      recentAlertKeysRef.current.set(`${newAlert.category}:${newAlert.title}`, now);
      if (isSoundEnabled) {
        tacticalAlertAudio.playAlertChime(newAlert.category);
      }
      setActiveAlerts((prev) => [newAlert, ...prev.slice(0, 2)]);
      setAlertHistory((prev) => [newAlert, ...prev]);

      // Auto-dismiss alert banner from active HUD after duration
      setTimeout(() => {
        setActiveAlerts((prev) => prev.filter((a) => a.id !== newAlert.id));
      }, newAlert.durationMs);
    });
  }, [players, ball, matchTimeSec, isAlertsEnabled, isSoundEnabled]);

  const handleTriggerScenario = useCallback((category: TacticalAlertCategory) => {
    const simAlert = generateSimulatedScenarioAlert(category, matchTimeSec, 0);
    if (isSoundEnabled) {
      tacticalAlertAudio.playAlertChime(category);
    }
    setActiveAlerts((prev) => [simAlert, ...prev.slice(0, 2)]);
    setAlertHistory((prev) => [simAlert, ...prev]);
    setSelectedAlertId(simAlert.id);

    // Auto-focus camera on pitch
    setZoom(1.6);
    const canvas = canvasRef.current;
    if (canvas) {
      const cx = simAlert.centroid.x;
      const cy = simAlert.centroid.y;
      setPan({
        x: (-cx / 52.5) * (canvas.width * 0.28),
        y: (-cy / 34.0) * (canvas.height * 0.28),
      });
    }

    setToastMessage(`⚡ Simulated ${category.replace("_", " ").toUpperCase()} Triggered`);
    setTimeout(() => setToastMessage(null), 3000);

    setTimeout(() => {
      setActiveAlerts((prev) => prev.filter((a) => a.id !== simAlert.id));
    }, simAlert.durationMs);
  }, [matchTimeSec, isSoundEnabled]);

  const handleFocusAlert = useCallback((alert: TacticalPitchAlert) => {
    setSelectedAlertId(alert.id);
    setZoom(1.65);
    const canvas = canvasRef.current;
    if (canvas) {
      const cx = alert.centroid.x;
      const cy = alert.centroid.y;
      setPan({
        x: (-cx / 52.5) * (canvas.width * 0.3),
        y: (-cy / 34.0) * (canvas.height * 0.3),
      });
    }
    setToastMessage(`Camera locked on ${alert.title}`);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  const handleDismissAlert = useCallback((alertId: string) => {
    setActiveAlerts((prev) => prev.filter((a) => a.id !== alertId));
    if (selectedAlertId === alertId) {
      setSelectedAlertId(null);
    }
  }, [selectedAlertId]);

  const handleDispatchDirectiveFromAlert = useCallback((alert: TacticalPitchAlert) => {
    if (onAddDirective) {
      onAddDirective({
        id: `DIR-ALERT-${Date.now()}`,
        targetPlayerId: alert.targetPlayerId || alert.primaryPlayerIds[0],
        targetPlayerName: alert.targetPlayerName || alert.primaryPlayerNames[0],
        sender: "Tactical Pitch Intelligence",
        directiveType: alert.category === "high_press" ? "pressing" : "positional",
        message: alert.coachDirectiveSuggestion,
        timestamp: alert.timestamp,
        status: "active",
      });
      setToastMessage(`Directive dispatched to ${alert.targetPlayerName || alert.primaryPlayerNames[0]}`);
      setTimeout(() => setToastMessage(null), 3000);
    } else {
      setToastMessage(`Directive queued: "${alert.coachDirectiveSuggestion}"`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  }, [onAddDirective]);

  // Trigger automated calibration routine based on detected touchline markers
  const handleAutoCalibrate = useCallback(() => {
    setIsCalibrating(true);
    setShowHomographyDebug(true);
    setToastMessage("Auto-Calibrating: Sweeping pitch & aligning touchline correspondences...");

    const startTime = Date.now();
    const duration = 1200;

    const animateSweep = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1.0, elapsed / duration);
      setCalibrationSweepProgress(progress);

      if (progress < 1.0) {
        requestAnimationFrame(animateSweep);
      } else {
        const alignedDrift = { dx: 0, dy: 0, rotationDeg: 0, scale: 1.0 };
        setDrift(alignedDrift);
        const alignedMarkers = generateDetectedMarkers(alignedDrift);
        setMarkers(alignedMarkers);
        const solved = solveTouchlineAutoCalibration(alignedMarkers);
        setCalibrationResult(solved);
        setIsCalibrating(false);
        setToastMessage(`✓ Calibration Locked: 13/13 Touchline markers aligned (RMSE: ${solved.meanReprojectionErrorM}m)`);
        setTimeout(() => setToastMessage(null), 4000);
      }
    };

    requestAnimationFrame(animateSweep);
  }, []);

  const handleSimulateDrift = () => {
    const randomDx = +(Math.random() > 0.5 ? 2.5 : -2.3);
    const randomDy = +(Math.random() > 0.5 ? 1.9 : -1.8);
    const randomRot = +(Math.random() > 0.5 ? 1.6 : -1.5);
    const drifted = { dx: randomDx, dy: randomDy, rotationDeg: randomRot, scale: 1.0 };

    setDrift(drifted);
    const driftedMarkers = generateDetectedMarkers(drifted);
    setMarkers(driftedMarkers);
    setShowHomographyDebug(true);

    setCalibrationResult((prev) => ({
      ...prev,
      isCalibrated: false,
      qualityScore: 0.64,
      meanReprojectionErrorM: 2.85,
      maxReprojectionErrorM: 3.45,
      driftOffset: drifted,
      lastCalibratedAt: "DEGRADED (Drift Detected)",
    }));

    setToastMessage("Camera drift simulated (2.85m residual error). Click 'Auto-Calibrate' to re-align.");
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleResetCalibration = () => {
    const baseDrift = { dx: 0, dy: 0, rotationDeg: 0, scale: 1.0 };
    setDrift(baseDrift);
    const baseMarkers = generateDetectedMarkers(baseDrift);
    setMarkers(baseMarkers);
    const solved = solveTouchlineAutoCalibration(baseMarkers);
    setCalibrationResult(solved);
    setSelectedMarkerId(null);
    setToastMessage("Coordinate system reset to canonical default.");
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Determine effective ball position for set-piece analysis
  const currentPreset = SET_PIECE_PRESETS.find((p) => p.id === selectedSetPiecePresetId);
  const effectiveBall =
    isSetPieceMode && currentPreset && !activeSetPieceBall
      ? { ...ball, x: currentPreset.ballX, y: currentPreset.ballY }
      : activeSetPieceBall
      ? { ...ball, x: activeSetPieceBall.x, y: activeSetPieceBall.y }
      : ball;

  const setPieceAnalysis = analyzeSetPiece(
    effectiveBall,
    currentPreset ? currentPreset.teamId : effectiveBall.x > 0 ? 0 : 1
  );

  const shouldRenderSetPiece =
    overlays.setPiece !== false && (isSetPieceMode || setPieceAnalysis.isSetPieceScenario);

  // Formation tracking must not share an effect with canvas painting: state updates
  // here would re-trigger the render effect on every replay tick.
  useEffect(() => {
    formationDetector.recordPositions(players);
    const avgs = formationDetector.getAveragePositions(players);
    setAveragePositions(avgs);
    setTeam0Formation(formationDetector.analyzeFormation(0, players, avgs));
    setTeam1Formation(formationDetector.analyzeFormation(1, players, avgs));
  }, [players]);

  // Main canvas render effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      const padX = width * 0.04;
      const padY = height * 0.05;
      const pitchDrawW = width - padX * 2;
      const pitchDrawH = height - padY * 2;

      const toScreenX = (x_m: number) => padX + ((x_m + 52.5) / PITCH_L) * pitchDrawW;
      const toScreenY = (y_m: number) => padY + ((y_m + 34.0) / PITCH_W) * pitchDrawH;
      const scaleM = pitchDrawW / PITCH_L;

      // Clear canvas with deep dark grass backdrop
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#0a1team1Formation2";
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-width / 2, -height / 2);

      // 1. Pitch Turf
      ctx.fillStyle = "#144122";
      ctx.fillRect(padX, padY, pitchDrawW, pitchDrawH);

      const stripes = 15;
      const stripeW = pitchDrawW / stripes;
      for (let i = 0; i < stripes; i++) {
        ctx.fillStyle = i % 2 === 0 ? "#174b27" : "#144323";
        ctx.fillRect(padX + i * stripeW, padY, stripeW, pitchDrawH);
      }

      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 2.0;
      ctx.strokeRect(padX, padY, pitchDrawW, pitchDrawH);

      // 2. Tactical Pitch Zones
      if (overlays.pitchZones) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
        ctx.lineWidth = 1.0;

        const thirdX1 = toScreenX(-17.5);
        const thirdX2 = toScreenX(17.5);
        ctx.beginPath();
        ctx.moveTo(thirdX1, padY);
        ctx.lineTo(thirdX1, padY + pitchDrawH);
        ctx.moveTo(thirdX2, padY);
        ctx.lineTo(thirdX2, padY + pitchDrawH);
        ctx.stroke();

        const chY1 = toScreenY(-20.16);
        const chY2 = toScreenY(-9.15);
        const chY3 = toScreenY(9.15);
        const chY4 = toScreenY(20.16);

        [chY1, chY2, chY3, chY4].forEach((y) => {
          ctx.beginPath();
          ctx.moveTo(padX, y);
          ctx.lineTo(padX + pitchDrawW, y);
          ctx.stroke();
        });

        ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        ctx.font = "10px sans-serif";
        ctx.fillText("DEFENSIVE THIRD", toScreenX(-35), padY + 16);
        ctx.fillText("MIDDLE THIRD", toScreenX(-6), padY + 16);
        ctx.fillText("FINAL THIRD", toScreenX(24), padY + 16);

        ctx.restore();
      }

      // 3. Pitch Markings
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 1.8;

      const midX = toScreenX(0);
      ctx.beginPath();
      ctx.moveTo(midX, padY);
      ctx.lineTo(midX, padY + pitchDrawH);
      ctx.stroke();

      const midY = toScreenY(0);
      ctx.beginPath();
      ctx.arc(midX, midY, 9.15 * scaleM, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(midX, midY, 2.8, 0, Math.PI * 2);
      ctx.fill();

      const leftPenX = toScreenX(-52.5);
      const penBoxW = 16.5 * scaleM;
      const penBoxH = 40.32 * scaleM;
      const leftPenY = toScreenY(-20.16);
      ctx.strokeRect(leftPenX, leftPenY, penBoxW, penBoxH);

      const leftGoalBoxW = 5.5 * scaleM;
      const leftGoalBoxH = 18.32 * scaleM;
      ctx.strokeRect(leftPenX, toScreenY(-9.16), leftGoalBoxW, leftGoalBoxH);

      ctx.beginPath();
      ctx.arc(toScreenX(-41.5), midY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(toScreenX(-41.5), midY, 9.15 * scaleM, -0.92, 0.92);
      ctx.stroke();

      const rightPenX = toScreenX(36.0);
      ctx.strokeRect(rightPenX, leftPenY, penBoxW, penBoxH);
      ctx.strokeRect(toScreenX(47.0), toScreenY(-9.16), leftGoalBoxW, leftGoalBoxH);

      ctx.beginPath();
      ctx.arc(toScreenX(41.5), midY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(toScreenX(41.5), midY, 9.15 * scaleM, Math.PI - 0.92, Math.PI + 0.92);
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.strokeRect(toScreenX(-54.5), toScreenY(-3.66), 2.0 * scaleM, 7.32 * scaleM);
      ctx.strokeRect(toScreenX(52.5), toScreenY(-3.66), 2.0 * scaleM, 7.32 * scaleM);

      [
        { x: -52.5, y: -34.0, start: 0, end: Math.PI / 2 },
        { x: -52.5, y: 34.0, start: -Math.PI / 2, end: 0 },
        { x: 52.5, y: -34.0, start: Math.PI / 2, end: Math.PI },
        { x: 52.5, y: 34.0, start: Math.PI, end: (Math.PI * 3) / 2 },
      ].forEach((c) => {
        ctx.beginPath();
        ctx.arc(toScreenX(c.x), toScreenY(c.y), 1.0 * scaleM, c.start, c.end);
        ctx.stroke();
      });

      // 4. Voronoi Pitch Control
      if (overlays.voronoi) {
        ctx.save();
        const cellStep = 18;
        for (let gx = padX; gx < padX + pitchDrawW; gx += cellStep) {
          for (let gy = padY; gy < padY + pitchDrawH; gy += cellStep) {
            let closestDist = Infinity;
            let closestTeam = -1;

            players.forEach((p) => {
              if (p.teamId === 2) return;
              const px = toScreenX(p.x);
              const py = toScreenY(p.y);
              const d = Math.hypot(gx - px, gy - py);
              if (d < closestDist) {
                closestDist = d;
                closestTeam = p.teamId;
              }
            });

            if (closestTeam === 0) {
              ctx.fillStyle = "rgba(239, 68, 68, 0.12)";
              ctx.fillRect(gx, gy, cellStep, cellStep);
            } else if (closestTeam === 1) {
              ctx.fillStyle = "rgba(56, 189, 248, 0.12)";
              ctx.fillRect(gx, gy, cellStep, cellStep);
            }
          }
        }
        ctx.restore();
      }

      // 5. Convex Hulls & 10s Formations
      if (overlays.convexHulls) {
        [0, 1].forEach((tId) => {
          const tPlayers = players.filter((p) => p.teamId === tId && p.role !== "GK");
          if (tPlayers.length >= 3) {
            ctx.save();
            ctx.beginPath();
            const meanX = tPlayers.reduce((acc, p) => acc + p.x, 0) / tPlayers.length;
            const meanY = tPlayers.reduce((acc, p) => acc + p.y, 0) / tPlayers.length;
            const sorted = [...tPlayers].sort(
              (a, b) => Math.atan2(a.y - meanY, a.x - meanX) - Math.atan2(b.y - meanY, b.x - meanX)
            );

            sorted.forEach((p, idx) => {
              const sx = toScreenX(p.x);
              const sy = toScreenY(p.y);
              if (idx === 0) ctx.moveTo(sx, sy);
              else ctx.lineTo(sx, sy);
            });
            ctx.closePath();

            ctx.fillStyle = tId === 0 ? "rgba(239, 68, 68, 0.16)" : "rgba(56, 189, 248, 0.16)";
            ctx.strokeStyle = tId === 0 ? "rgba(239, 68, 68, 0.75)" : "rgba(56, 189, 248, 0.75)";
            ctx.lineWidth = 1.5;
            ctx.fill();
            ctx.stroke();

            const cx = toScreenX(meanX);
            const cy = toScreenY(meanY);
            ctx.strokeStyle = tId === 0 ? "#ef4444" : "#38bdf8";
            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, Math.PI * 2);
            ctx.stroke();

            const formation = tId === 0 ? team0Formation : team1Formation;
            if (formation) {
              const badgeText = `${formation.teamName.toUpperCase()} · ${formation.formationLabel} (${formation.tacticalPhase.toUpperCase()})`;
              ctx.font = "bold 9px monospace";
              const textWidth = ctx.measureText(badgeText).width;

              ctx.fillStyle = "rgba(15, 23, 42, 0.90)";
              ctx.strokeStyle = tId === 0 ? "#ef4444" : "#38bdf8";
              ctx.lineWidth = 1.2;
              ctx.beginPath();
              ctx.roundRect(cx - textWidth / 2 - 8, cy - 25, textWidth + 16, 17, 4);
              ctx.fill();
              ctx.stroke();

              ctx.fillStyle = tId === 0 ? "#fca5a5" : "#bae6fd";
              ctx.fillText(badgeText, cx - textWidth / 2, cy - 13);
            }

            ctx.restore();
          }
        });
      }

      // 6. Defensive Lines
      if (overlays.defensiveLines) {
        ctx.save();
        const team0Defs = players.filter((p) => p.teamId === 0 && p.role === "DEF");
        if (team0Defs.length > 0) {
          const minDefX = Math.min(...team0Defs.map((p) => p.x));
          const lineX0 = toScreenX(minDefX);
          ctx.strokeStyle = "rgba(239, 68, 68, 0.9)";
          ctx.lineWidth = 2.0;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(lineX0, padY);
          ctx.lineTo(lineX0, padY + pitchDrawH);
          ctx.stroke();

          const heightM0 = (minDefX - -52.5).toFixed(1);
          ctx.fillStyle = "#ef4444";
          ctx.font = "bold 11px sans-serif";
          ctx.fillText(`DEF LINE: ${heightM0}m`, lineX0 + 5, padY + 28);
        }

        const team1Defs = players.filter((p) => p.teamId === 1 && p.role === "DEF");
        if (team1Defs.length > 0) {
          const maxDefX = Math.max(...team1Defs.map((p) => p.x));
          const lineX1 = toScreenX(maxDefX);
          ctx.strokeStyle = "rgba(56, 189, 248, 0.9)";
          ctx.lineWidth = 2.0;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(lineX1, padY);
          ctx.lineTo(lineX1, padY + pitchDrawH);
          ctx.stroke();

          const heightM1 = (52.5 - maxDefX).toFixed(1);
          ctx.fillStyle = "#38bdf8";
          ctx.font = "bold 11px sans-serif";
          ctx.fillText(`DEF LINE: ${heightM1}m`, lineX1 - 92, padY + 28);
        }
        ctx.restore();
      }

      // 7. Passing Links
      if (overlays.passNetwork) {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
        ctx.lineWidth = 1.5;
        const keyLinks = [
          [3, 6],
          [6, 8],
          [8, 9],
          [8, 10],
          [4, 6],
          [14, 17],
          [17, 19],
          [19, 21],
          [19, 22],
        ];
        keyLinks.forEach(([idA, idB]) => {
          const pA = players.find((p) => p.id === idA);
          const pB = players.find((p) => p.id === idB);
          if (pA && pB) {
            ctx.beginPath();
            ctx.moveTo(toScreenX(pA.x), toScreenY(pA.y));
            ctx.lineTo(toScreenX(pB.x), toScreenY(pB.y));
            ctx.stroke();
          }
        });
        ctx.restore();
      }

      // 8. Movement Trails
      if (overlays.trails) {
        players.forEach((p) => {
          if (p.history.length > 1) {
            ctx.save();
            ctx.beginPath();
            p.history.forEach(([hx, hy], idx) => {
              const sx = toScreenX(hx);
              const sy = toScreenY(hy);
              if (idx === 0) ctx.moveTo(sx, sy);
              else ctx.lineTo(sx, sy);
            });
            ctx.strokeStyle =
              p.teamId === 0
                ? "rgba(239, 68, 68, 0.45)"
                : p.teamId === 1
                ? "rgba(56, 189, 248, 0.45)"
                : "rgba(234, 179, 8, 0.45)";
            ctx.lineWidth = 2.0;
            ctx.stroke();
            ctx.restore();
          }
        });
      }

      // 8B. 10s Average Anchors
      if (show10sAverageAnchors) {
        ctx.save();
        [team0Formation, team1Formation].forEach((formation) => {
          if (!formation) return;
          const isTeam0 = formation.teamId === 0;
          const themeColor = isTeam0 ? "rgba(239, 68, 68, 0.45)" : "rgba(56, 189, 248, 0.45)";

          formation.lines.forEach((line) => {
            const linePlayers = line.playerIds
              .map((id) => averagePositions.get(id))
              .filter((a): a is PlayerAveragePos => Boolean(a));

            if (linePlayers.length > 1) {
              const sortedByY = [...linePlayers].sort((a, b) => a.avgY - b.avgY);
              ctx.save();
              ctx.strokeStyle = themeColor;
              ctx.lineWidth = 1.4;
              ctx.setLineDash([3, 4]);
              ctx.beginPath();
              sortedByY.forEach((p, idx) => {
                const sx = toScreenX(p.avgX);
                const sy = toScreenY(p.avgY);
                if (idx === 0) ctx.moveTo(sx, sy);
                else ctx.lineTo(sx, sy);
              });
              ctx.stroke();
              ctx.restore();
            }
          });
        });

        players.forEach((p) => {
          if (p.teamId === 2) return;
          const avg = averagePositions.get(p.id);
          if (!avg) return;

          const currSX = toScreenX(p.x);
          const currSY = toScreenY(p.y);
          const avgSX = toScreenX(avg.avgX);
          const avgSY = toScreenY(avg.avgY);

          ctx.save();
          ctx.strokeStyle = p.teamId === 0 ? "rgba(239, 68, 68, 0.35)" : "rgba(56, 189, 248, 0.35)";
          ctx.lineWidth = 1.0;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(currSX, currSY);
          ctx.lineTo(avgSX, avgSY);
          ctx.stroke();

          ctx.strokeStyle = p.teamId === 0 ? "rgba(239, 68, 68, 0.65)" : "rgba(56, 189, 248, 0.65)";
          ctx.lineWidth = 1.2;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.arc(avgSX, avgSY, 8.5, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = p.teamId === 0 ? "rgba(239, 68, 68, 0.5)" : "rgba(56, 189, 248, 0.5)";
          ctx.beginPath();
          ctx.arc(avgSX, avgSY, 2.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        });
        ctx.restore();
      }

      // 9. Render Instantaneous Players
      players.forEach((p) => {
        const sx = toScreenX(p.x);
        const sy = toScreenY(p.y);
        const isSelected = p.id === selectedPlayerId;
        const radius = isSelected ? 11 : 9;

        if (isSelected) {
          ctx.save();
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 3.0;
          ctx.beginPath();
          ctx.arc(sx, sy, radius + 6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        if (overlays.speedVectors && p.speedKmh > 8.0) {
          ctx.save();
          const angle = Math.atan2(p.vy, p.vx);
          const arrowLen = Math.min(26, p.speedKmh * 0.9);
          const headX = sx + Math.cos(angle) * arrowLen;
          const headY = sy + Math.sin(angle) * arrowLen;

          ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(headX, headY);
          ctx.stroke();
          ctx.restore();
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);

        if (p.teamId === 0) {
          ctx.fillStyle = p.role === "GK" ? "#16a34a" : "#dc2626";
          ctx.strokeStyle = "#ffffff";
        } else if (p.teamId === 1) {
          ctx.fillStyle = p.role === "GK" ? "#ea580c" : "#38bdf8";
          ctx.strokeStyle = "#0team1Formation72a";
        } else {
          ctx.fillStyle = "#eab308";
          ctx.strokeStyle = "#000000";
        }

        ctx.lineWidth = 1.8;
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = p.teamId === 1 && p.role !== "GK" ? "#0team1Formation72a" : "#ffffff";
        ctx.font = `bold ${isSelected ? "10px" : "8px"} sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.role === "REF" ? "R" : String(p.number), sx, sy);

        if (overlays.playerBadges) {
          ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
          ctx.fillRect(sx - 28, sy + radius + 2, 56, 14);
          ctx.fillStyle = "#f8fafc";
          ctx.font = "8px sans-serif";
          ctx.fillText(p.name.split(" ")[0], sx, sy + radius + 11);
        }

        ctx.restore();
      });

      // 10. Render Ball
      const effectiveBX = toScreenX(effectiveBall.x);
      const effectiveBY = toScreenY(effectiveBall.y);

      ctx.save();
      ctx.beginPath();
      ctx.arc(effectiveBX, effectiveBY, 10, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(249, 115, 22, 0.25)";
      ctx.fill();

      if (effectiveBall.z > 0.2) {
        ctx.beginPath();
        ctx.arc(effectiveBX, effectiveBY + effectiveBall.z * 3, 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(effectiveBX, effectiveBY - effectiveBall.z * 2.5, 5.0, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1.4;
      ctx.fill();
      ctx.stroke();

      if (effectiveBall.speedKmh > 10.0) {
        ctx.fillStyle = "#f97316";
        ctx.font = "9px sans-serif";
        ctx.fillText(`${effectiveBall.speedKmh.toFixed(0)} km/h`, effectiveBX + 8, effectiveBY - 6);
      }
      ctx.restore();

      // =========================================================================
      // 10A. TELESTRATION ANNOTATIONS & PUNDIT ANALYTICAL DRAWINGS
      // =========================================================================
      if (effectiveTelestrations && effectiveTelestrations.length > 0) {
        ctx.save();
        effectiveTelestrations.forEach((ann) => {
          // A. Player Spotlight & Pundit Point Player
          if ((ann.type === "spotlight" || ann.type === "point_player") && ann.points[0]) {
            const sx = toScreenX(ann.points[0].x);
            const sy = toScreenY(ann.points[0].y);
            const r = (ann.radius || 4.8) * scaleM;
            const pulse = Math.sin(Date.now() / 200) * 2;

            ctx.save();
            // Outer glowing shockwave ring
            ctx.strokeStyle = `${ann.color}50`;
            ctx.lineWidth = 1.8;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(sx, sy, r + 5 + pulse, 0, Math.PI * 2);
            ctx.stroke();

            // Main spotlight fill & ring
            const grad = ctx.createRadialGradient(sx, sy, 2, sx, sy, r);
            grad.addColorStop(0, `${ann.color}45`);
            grad.addColorStop(0.8, `${ann.color}20`);
            grad.addColorStop(1, "rgba(0, 0, 0, 0)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = ann.color;
            ctx.lineWidth = 2.4;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
            ctx.stroke();

            // Tactical Label Badge
            if (ann.label) {
              ctx.font = "bold 9.5px monospace";
              const tagW = ctx.measureText(ann.label).width;
              ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
              ctx.strokeStyle = ann.color;
              ctx.lineWidth = 1.2;
              ctx.beginPath();
              ctx.roundRect(sx - tagW / 2 - 6, sy - r - 20, tagW + 12, 16, 4);
              ctx.fill();
              ctx.stroke();

              ctx.fillStyle = "#ffffff";
              ctx.fillText(ann.label, sx - tagW / 2, sy - r - 8);

              if (ann.subLabel) {
                ctx.fillStyle = ann.color;
                ctx.font = "bold 8px monospace";
                ctx.fillText(ann.subLabel, sx - tagW / 2, sy - r - 23);
              }
            }
            ctx.restore();
          }

          // B. Pundit Action Marker Pin (Key Turnover, Defensive Error, Goal Chance)
          else if (ann.type === "action_marker" && ann.points[0]) {
            const sx = toScreenX(ann.points[0].x);
            const sy = toScreenY(ann.points[0].y);
            const pulse = Math.sin(Date.now() / 250);

            ctx.save();
            // Pulsing base beacon ring
            ctx.strokeStyle = `${ann.color}70`;
            ctx.lineWidth = 1.6;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(sx, sy, 14 + pulse * 3, 0, Math.PI * 2);
            ctx.stroke();

            // Pin Core
            ctx.fillStyle = ann.color;
            ctx.beginPath();
            ctx.arc(sx, sy, 6, 0, Math.PI * 2);
            ctx.fill();

            // Inner white dot
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
            ctx.fill();

            // Action Tag Card
            const actionText = ann.label || "TACTICAL ACTION";
            ctx.font = "bold 9px monospace";
            const textW = ctx.measureText(actionText).width;
            ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
            ctx.strokeStyle = ann.color;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.roundRect(sx - textW / 2 - 6, sy - 28, textW + 12, 18, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = "#ffffff";
            ctx.fillText(actionText, sx - textW / 2, sy - 16);

            // Subtext author if present
            if (ann.author) {
              ctx.fillStyle = ann.color;
              ctx.font = "7.5px monospace";
              ctx.fillText(`ANALYST: ${ann.author.toUpperCase()}`, sx - textW / 2, sy + 14);
            }

            ctx.restore();
          }

          // C. Pass Arrow, Sprint Run Vector, & Pressing Arrow
          else if (
            (ann.type === "pass_arrow" || ann.type === "run_vector" || ann.type === "press_arrow") &&
            ann.points.length >= 2
          ) {
            const sx1 = toScreenX(ann.points[0].x);
            const sy1 = toScreenY(ann.points[0].y);
            const sx2 = toScreenX(ann.points[1].x);
            const sy2 = toScreenY(ann.points[1].y);
            ctx.save();
            ctx.strokeStyle = ann.color;
            ctx.lineWidth = ann.type === "press_arrow" ? 2.6 : 3.2;

            if (ann.type === "run_vector") ctx.setLineDash([7, 4]);
            else if (ann.type === "press_arrow") ctx.setLineDash([4, 3]);
            else ctx.setLineDash([]);

            ctx.beginPath();
            ctx.moveTo(sx1, sy1);
            ctx.lineTo(sx2, sy2);
            ctx.stroke();

            // Directional Arrowhead
            const angle = Math.atan2(sy2 - sy1, sx2 - sx1);
            const headLen = 13;
            ctx.fillStyle = ann.color;
            ctx.beginPath();
            ctx.moveTo(sx2, sy2);
            ctx.lineTo(
              sx2 - headLen * Math.cos(angle - Math.PI / 6),
              sy2 - headLen * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
              sx2 - headLen * Math.cos(angle + Math.PI / 6),
              sy2 - headLen * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fill();

            // For press_arrow: second chevron
            if (ann.type === "press_arrow") {
              const bX = sx2 - 9 * Math.cos(angle);
              const bY = sy2 - 9 * Math.sin(angle);
              ctx.beginPath();
              ctx.moveTo(bX, bY);
              ctx.lineTo(
                bX - headLen * Math.cos(angle - Math.PI / 6),
                bY - headLen * Math.sin(angle - Math.PI / 6)
              );
              ctx.lineTo(
                bX - headLen * Math.cos(angle + Math.PI / 6),
                bY - headLen * Math.sin(angle + Math.PI / 6)
              );
              ctx.closePath();
              ctx.fill();
            }

            // Telemetry Badge along line midpoint
            if (ann.label) {
              const midX = (sx1 + sx2) / 2;
              const midY = (sy1 + sy2) / 2;
              ctx.font = "bold 9px monospace";
              const tagW = ctx.measureText(ann.label).width;

              ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
              ctx.strokeStyle = ann.color;
              ctx.lineWidth = 1.0;
              ctx.beginPath();
              ctx.roundRect(midX - tagW / 2 - 5, midY - 14, tagW + 10, 15, 3);
              ctx.fill();
              ctx.stroke();

              ctx.fillStyle = "#ffffff";
              ctx.fillText(ann.label, midX - tagW / 2, midY - 3);
            }
            ctx.restore();
          }

          // D. Freehand Pen Stroke
          else if (ann.type === "freehand" && ann.points.length > 1) {
            ctx.save();
            ctx.strokeStyle = ann.color;
            ctx.lineWidth = 3.0;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.beginPath();
            ann.points.forEach((pt, idx) => {
              const sx = toScreenX(pt.x);
              const sy = toScreenY(pt.y);
              if (idx === 0) ctx.moveTo(sx, sy);
              else ctx.lineTo(sx, sy);
            });
            ctx.stroke();

            // Label at endpoint
            if (ann.label && ann.points.length > 0) {
              const lastPt = ann.points[ann.points.length - 1];
              const lx = toScreenX(lastPt.x);
              const ly = toScreenY(lastPt.y);
              ctx.fillStyle = "rgba(15, 23, 42, 0.90)";
              ctx.strokeStyle = ann.color;
              ctx.lineWidth = 1;
              ctx.font = "bold 8.5px monospace";
              const bW = ctx.measureText(ann.label).width;
              ctx.roundRect(lx + 4, ly - 8, bW + 8, 14, 3);
              ctx.fill();
              ctx.stroke();
              ctx.fillStyle = "#ffffff";
              ctx.fillText(ann.label, lx + 8, ly + 2);
            }
            ctx.restore();
          }

          // E. Cover Zone Shading
          else if (ann.type === "cover_zone" && ann.points[0]) {
            const sx = toScreenX(ann.points[0].x);
            const sy = toScreenY(ann.points[0].y);
            const w = (ann.width || 24) * scaleM;
            const h = (ann.height || 28) * scaleM;
            ctx.save();
            ctx.fillStyle = `${ann.color}25`;
            ctx.strokeStyle = ann.color;
            ctx.lineWidth = 1.8;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(sx, sy, w, h);
            ctx.fillRect(sx, sy, w, h);
            if (ann.label) {
              ctx.fillStyle = "#ffffff";
              ctx.font = "bold 9px monospace";
              ctx.fillText(ann.label, sx + 4, sy + 14);
            }
            ctx.restore();
          }

          // F. Offside Threshold Plane
          else if (ann.type === "offside_plane" && ann.points[0]) {
            const sx = toScreenX(ann.points[0].x);
            ctx.save();
            ctx.strokeStyle = ann.color;
            ctx.lineWidth = 2.2;
            ctx.setLineDash([5, 3]);
            ctx.beginPath();
            ctx.moveTo(sx, padY);
            ctx.lineTo(sx, padY + pitchDrawH);
            ctx.stroke();
            ctx.fillStyle = ann.color;
            ctx.font = "bold 9px monospace";
            ctx.fillText(ann.label || `OFFSIDE LINE (${Math.abs(ann.points[0].x).toFixed(1)}m)`, sx + 4, padY + 28);
            ctx.restore();
          }
        });
        ctx.restore();
      }

      // =========================================================================
      // 10A-2. LIVE PUNDIT DRAWING PREVIEW (IN-PROGRESS DRAGGING)
      // =========================================================================
      if (isLiveDrawing) {
        ctx.save();
        if (
          (effectiveTool === "pass_arrow" || effectiveTool === "run_vector" || effectiveTool === "press_arrow") &&
          liveStartPoint &&
          liveCurrentPoint
        ) {
          const sx1 = toScreenX(liveStartPoint.x);
          const sy1 = toScreenY(liveStartPoint.y);
          const sx2 = toScreenX(liveCurrentPoint.x);
          const sy2 = toScreenY(liveCurrentPoint.y);

          ctx.strokeStyle = effectiveColor;
          ctx.lineWidth = 3.2;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(sx1, sy1);
          ctx.lineTo(sx2, sy2);
          ctx.stroke();

          const angle = Math.atan2(sy2 - sy1, sx2 - sx1);
          ctx.fillStyle = effectiveColor;
          ctx.beginPath();
          ctx.moveTo(sx2, sy2);
          ctx.lineTo(sx2 - 12 * Math.cos(angle - 0.5), sy2 - 12 * Math.sin(angle - 0.5));
          ctx.lineTo(sx2 - 12 * Math.cos(angle + 0.5), sy2 - 12 * Math.sin(angle + 0.5));
          ctx.closePath();
          ctx.fill();

          const d = Math.hypot(liveCurrentPoint.x - liveStartPoint.x, liveCurrentPoint.y - liveStartPoint.y);
          ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
          ctx.strokeStyle = effectiveColor;
          ctx.lineWidth = 1;
          const liveText = `${d.toFixed(1)}m DRAWING...`;
          ctx.font = "bold 9px monospace";
          ctx.beginPath();
          ctx.roundRect((sx1 + sx2) / 2 - 35, (sy1 + sy2) / 2 - 16, 70, 16, 3);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#ffffff";
          ctx.fillText(liveText, (sx1 + sx2) / 2 - 30, (sy1 + sy2) / 2 - 4);
        } else if (effectiveTool === "freehand" && liveFreehandPath.length > 1) {
          ctx.strokeStyle = effectiveColor;
          ctx.lineWidth = 3.0;
          ctx.lineCap = "round";
          ctx.beginPath();
          liveFreehandPath.forEach((pt, idx) => {
            const sx = toScreenX(pt.x);
            const sy = toScreenY(pt.y);
            if (idx === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          });
          ctx.stroke();
        }
        ctx.restore();
      }

      // =========================================================================
      // 10B. SET-PIECE TACTICAL OVERLAY MODE (CORNER & FREE-KICK ENGINE)
      // =========================================================================
      if (shouldRenderSetPiece) {
        ctx.save();

        // Time factor for animated pulse along trajectories
        const animT = (Date.now() % 1600) / 1600;

        // A. PENALTY BOX TARGET ZONES
        setPieceAnalysis.targetZones.forEach((zone) => {
          const zx1 = toScreenX(zone.xMin);
          const zy1 = toScreenY(zone.yMin);
          const zx2 = toScreenX(zone.xMax);
          const zy2 = toScreenY(zone.yMax);

          const zw = Math.abs(zx2 - zx1);
          const zh = Math.abs(zy2 - zy1);
          const leftX = Math.min(zx1, zx2);
          const topY = Math.min(zy1, zy2);

          const isTargeted =
            activeTrajectoryId &&
            setPieceAnalysis.trajectories.some(
              (t) => t.id === activeTrajectoryId && t.targetZoneId === zone.id
            );

          ctx.save();
          // Shaded landing area
          ctx.fillStyle = isTargeted
            ? "rgba(245, 158, 11, 0.28)"
            : zone.threatTier === "CRITICAL"
            ? "rgba(239, 68, 68, 0.16)"
            : "rgba(59, 130, 246, 0.14)";
          ctx.beginPath();
          ctx.roundRect(leftX, topY, zw, zh, 6);
          ctx.fill();

          // Border outline
          ctx.strokeStyle = isTargeted ? "#f59e0b" : zone.accentColor;
          ctx.lineWidth = isTargeted ? 2.2 : 1.4;
          ctx.setLineDash([4, 4]);
          ctx.stroke();

          // Target Center Reticle
          const cX = toScreenX(zone.centerX);
          const cY = toScreenY(zone.centerY);
          ctx.beginPath();
          ctx.arc(cX, cY, 6, 0, Math.PI * 2);
          ctx.strokeStyle = zone.accentColor;
          ctx.lineWidth = 1.2;
          ctx.setLineDash([]);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(cX, cY, 2, 0, Math.PI * 2);
          ctx.fillStyle = zone.accentColor;
          ctx.fill();

          // Target Zone Pill Label
          const zoneTag = `${zone.code} · xG ${zone.expectedGoalXG.toFixed(2)}`;
          ctx.font = "bold 8.5px monospace";
          const tagW = ctx.measureText(zoneTag).width;

          ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
          ctx.strokeStyle = zone.accentColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(cX - tagW / 2 - 5, cY - 18, tagW + 10, 14, 3);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.fillText(zoneTag, cX - tagW / 2, cY - 8);

          // Runner subtext
          ctx.fillStyle = "rgba(241, 245, 249, 0.85)";
          ctx.font = "7.5px monospace";
          ctx.fillText(zone.primaryRunner.split(" ")[0], cX - 14, cY + 16);

          ctx.restore();
        });

        // B. 9.15M DEFENSIVE WALL (FOR DIRECT & EDGE-OF-BOX FREE KICKS)
        if (setPieceAnalysis.defensiveWall) {
          const wall = setPieceAnalysis.defensiveWall;
          ctx.save();

          // 9.15m regulation distance arc
          ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
          ctx.lineWidth = 1.2;
          ctx.setLineDash([3, 4]);
          ctx.beginPath();
          ctx.arc(effectiveBX, effectiveBY, 9.15 * scaleM, 0, Math.PI * 2);
          ctx.stroke();

          // 9.15m FIFA label
          ctx.fillStyle = "#f59e0b";
          ctx.font = "bold 8px monospace";
          ctx.fillText(
            "9.15m (10 YDS) REGULATION WALL RADIUS",
            toScreenX(wall.center.x) - 45,
            toScreenY(wall.center.y) - 16
          );

          // Wall players line
          wall.wallPoints.forEach((wp, wIdx) => {
            const wsx = toScreenX(wp.x);
            const wsy = toScreenY(wp.y);

            ctx.fillStyle = "#1e293b";
            ctx.strokeStyle = "#f59e0b";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(wsx, wsy, 7.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 8px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`W${wIdx + 1}`, wsx, wsy);
          });

          ctx.restore();
        }

        // C. AERODYNAMIC CURVED DELIVERY TRAJECTORIES
        setPieceAnalysis.trajectories.forEach((traj) => {
          const isSelected = activeTrajectoryId === traj.id;
          const isFaded = activeTrajectoryId !== null && !isSelected;

          const sX = toScreenX(traj.start.x);
          const sY = toScreenY(traj.start.y);
          const cpX = toScreenX(traj.controlPoint.x);
          const cpY = toScreenY(traj.controlPoint.y);
          const tX = toScreenX(traj.target.x);
          const tY = toScreenY(traj.target.y);

          ctx.save();
          ctx.globalAlpha = isFaded ? 0.25 : 1.0;

          // Main Bézier Flight Curve
          ctx.strokeStyle = traj.color;
          ctx.lineWidth = isSelected ? 3.5 : 2.2;
          ctx.setLineDash(traj.style === "driven_low" ? [4, 4] : []);
          ctx.beginPath();
          ctx.moveTo(sX, sY);
          ctx.quadraticCurveTo(cpX, cpY, tX, tY);
          ctx.stroke();

          // Animated delivery pulse bead traveling from ball to target
          const pulseX = (1 - animT) * (1 - animT) * sX + 2 * (1 - animT) * animT * cpX + animT * animT * tX;
          const pulseY = (1 - animT) * (1 - animT) * sY + 2 * (1 - animT) * animT * cpY + animT * animT * tY;

          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = traj.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(pulseX, pulseY, isSelected ? 4.5 : 3.5, 0, Math.PI * 2);
          ctx.fill();

          // Target point arrival ring
          ctx.strokeStyle = traj.color;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(tX, tY, 8, 0, Math.PI * 2);
          ctx.stroke();

          // Trajectory telemetry badge near apex
          const labelX = (sX + 2 * cpX + tX) / 4;
          const labelY = (sY + 2 * cpY + tY) / 4;

          const badgeText = `${traj.name} · ${traj.flightTimeSec}s · ${traj.exitSpeedKmh}km/h (${traj.selectionProbabilityPct}%)`;
          ctx.font = "bold 8px monospace";
          const bW = ctx.measureText(badgeText).width;

          ctx.fillStyle = "rgba(15, 23, 42, 0.90)";
          ctx.strokeStyle = traj.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(labelX - bW / 2 - 4, labelY - 8, bW + 8, 14, 3);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.fillText(badgeText, labelX - bW / 2, labelY + 2);

          ctx.restore();
        });

        // D. SET-PIECE BALL ORIGIN BEACON
        ctx.save();
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2.0;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(effectiveBX, effectiveBY, 16, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1;
        const takerText = `SET-PIECE: ${setPieceAnalysis.primaryTaker.toUpperCase()}`;
        ctx.font = "bold 8px monospace";
        const tW = ctx.measureText(takerText).width;
        ctx.beginPath();
        ctx.roundRect(effectiveBX - tW / 2 - 4, effectiveBY - 26, tW + 8, 14, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#38bdf8";
        ctx.fillText(takerText, effectiveBX - tW / 2, effectiveBY - 16);
        ctx.restore();

        ctx.restore();
      }

      // 11. HOMOGRAPHY TRANSFORMATION & TOUCHLINE CALIBRATION DEBUG VIEW LAYER
      if (showHomographyDebug) {
        ctx.save();

        ctx.save();
        ctx.strokeStyle = "rgba(6, 182, 212, 0.15)";
        ctx.lineWidth = 1.0;
        ctx.setLineDash([3, 4]);

        for (let gx = -50; gx <= 50; gx += 10) {
          ctx.beginPath();
          ctx.moveTo(toScreenX(gx), toScreenY(-34));
          ctx.lineTo(toScreenX(gx), toScreenY(34));
          ctx.stroke();
        }

        for (let gy = -34; gy <= 34; gy += 8.5) {
          ctx.beginPath();
          ctx.moveTo(toScreenX(-52.5), toScreenY(gy));
          ctx.lineTo(toScreenX(52.5), toScreenY(gy));
          ctx.stroke();
        }
        ctx.restore();

        const cx0 = toScreenX(0);
        const cy0 = toScreenY(0);

        ctx.save();
        ctx.strokeStyle = "#06b6d4";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(cx0 - 24, cy0);
        ctx.lineTo(cx0 + 24, cy0);
        ctx.moveTo(cx0, cy0 - 24);
        ctx.lineTo(cx0, cy0 + 24);
        ctx.stroke();

        ctx.fillStyle = "#06b6d4";
        ctx.font = "bold 9px monospace";
        ctx.fillText("+X PITCH LENGTH (105m)", cx0 + 32, cy0 - 4);
        ctx.fillText("+Y TOUCHLINE (68m)", cx0 - 42, cy0 + 38);
        ctx.restore();

        [
          { x: -52.5, y: -34.0 },
          { x: 52.5, y: -34.0 },
          { x: 52.5, y: 34.0 },
          { x: -52.5, y: 34.0 },
        ].forEach((corner) => {
          const csx = toScreenX(corner.x);
          const csy = toScreenY(corner.y);

          ctx.save();
          ctx.strokeStyle = "#10b981";
          ctx.lineWidth = 2.0;
          const dirX = corner.x > 0 ? -1 : 1;
          const dirY = corner.y > 0 ? -1 : 1;
          ctx.beginPath();
          ctx.moveTo(csx + dirX * 18, csy);
          ctx.lineTo(csx, csy);
          ctx.lineTo(csx, csy + dirY * 18);
          ctx.stroke();

          ctx.fillStyle = "#34d399";
          ctx.beginPath();
          ctx.arc(csx, csy, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        markers.forEach((m) => {
          const isSelected = selectedMarkerId === m.id;
          const detSX = toScreenX(m.detectedPitchX);
          const detSY = toScreenY(m.detectedPitchY);
          const trueSX = toScreenX(m.truePitchX);
          const trueSY = toScreenY(m.truePitchY);

          const errorM = m.reprojectionErrorM;
          const isAligned = errorM < 0.45;
          const markerColor = isSelected ? "#38bdf8" : isAligned ? "#10b981" : "#f59e0b";

          ctx.save();

          if (errorM > 0.15) {
            ctx.setLineDash([2, 3]);
            ctx.strokeStyle = isAligned ? "rgba(16, 185, 129, 0.7)" : "rgba(245, 158, 11, 0.9)";
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(trueSX, trueSY);
            ctx.lineTo(detSX, detSY);
            ctx.stroke();

            const midLX = (trueSX + detSX) / 2;
            const midLY = (trueSY + detSY) / 2;
            ctx.fillStyle = isAligned ? "#34d399" : "#fbbf24";
            ctx.font = "8px monospace";
            ctx.fillText(`Δ${errorM.toFixed(2)}m`, midLX + 4, midLY - 3);
          }

          ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
          ctx.beginPath();
          ctx.arc(trueSX, trueSY, 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = markerColor;
          ctx.lineWidth = isSelected ? 2.2 : 1.4;
          ctx.beginPath();
          ctx.arc(detSX, detSY, 7, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(detSX - 10, detSY);
          ctx.lineTo(detSX - 4, detSY);
          ctx.moveTo(detSX + 4, detSY);
          ctx.lineTo(detSX + 10, detSY);
          ctx.moveTo(detSX, detSY - 10);
          ctx.lineTo(detSX - 4, detSY);
          ctx.moveTo(detSX, detSY + 4);
          ctx.lineTo(detSX + 10, detSY);
          ctx.stroke();

          ctx.fillStyle = markerColor;
          ctx.beginPath();
          ctx.arc(detSX, detSY, 2.2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = isSelected ? "#e0f2fe" : "rgba(241, 245, 249, 0.95)";
          ctx.font = "bold 8.5px monospace";
          ctx.fillText(m.code, detSX + 9, detSY - 5);

          ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
          ctx.font = "7.5px monospace";
          ctx.fillText(`${(m.confidence * 100).toFixed(0)}%`, detSX + 9, detSY + 5);

          ctx.restore();
        });

        if (isCalibrating) {
          ctx.save();
          const sweepM = -52.5 + calibrationSweepProgress * 105.0;
          const sweepX = toScreenX(sweepM);

          const scanGrad = ctx.createLinearGradient(sweepX - 50, 0, sweepX + 10, 0);
          scanGrad.addColorStop(0, "rgba(6, 182, 212, 0)");
          scanGrad.addColorStop(0.65, "rgba(6, 182, 212, 0.15)");
          scanGrad.addColorStop(1, "rgba(52, 211, 153, 0.45)");
          ctx.fillStyle = scanGrad;
          ctx.fillRect(sweepX - 50, padY, 60, pitchDrawH);

          ctx.strokeStyle = "#34d399";
          ctx.lineWidth = 2.5;
          ctx.shadowColor = "#10b981";
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.moveTo(sweepX, padY);
          ctx.lineTo(sweepX, padY + pitchDrawH);
          ctx.stroke();

          ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
          ctx.strokeStyle = "rgba(52, 211, 153, 0.8)";
          ctx.lineWidth = 1;
          ctx.fillRect(sweepX + 10, padY + 12, 245, 26);
          ctx.strokeRect(sweepX + 10, padY + 12, 245, 26);

          ctx.fillStyle = "#34d399";
          ctx.font = "bold 9.5px monospace";
          ctx.fillText(`HOMOGRAPHY SOLVER · RANSAC ${(calibrationSweepProgress * 100).toFixed(0)}%`, sweepX + 18, padY + 29);
          ctx.restore();
        }

        ctx.restore();
      }

      // =========================================================================
      // 12. REAL-TIME TACTICAL EVENT NOTIFICATION OVERLAYS (HIGH-PRESS, LINE BREAK, COUNTER-ATTACK)
      // =========================================================================
      const alertsToRender = !isAlertsEnabled && !selectedAlertId
        ? []
        : selectedAlertId
        ? alertHistory.filter((a) => a.id === selectedAlertId)
        : activeAlerts;

      alertsToRender.forEach((alert) => {
        const pulse = Math.sin(Date.now() / 180);
        const alertColor =
          alert.category === "high_press"
            ? "#f59e0b"
            : alert.category === "line_break"
            ? "#ef4444"
            : "#06b6d4";

        ctx.save();

        if (alert.category === "high_press") {
          // A. Draw High-Press Trap Zone & Convergence Vectors
          const cx = toScreenX(alert.centroid.x);
          const cy = toScreenY(alert.centroid.y);
          const baseRadius = (alert.metrics.spaceMeters || 6.5) * scaleM;
          const pulsingRadius = baseRadius * (1.0 + 0.12 * pulse);

          // 1. Expanding translucent shockwave ring
          ctx.strokeStyle = `${alertColor}60`;
          ctx.lineWidth = 2.0;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.arc(cx, cy, pulsingRadius * 1.35, 0, Math.PI * 2);
          ctx.stroke();

          // 2. High-intensity trap core
          const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, pulsingRadius);
          grad.addColorStop(0, "rgba(245, 158, 11, 0.40)");
          grad.addColorStop(0.7, "rgba(239, 68, 68, 0.20)");
          grad.addColorStop(1, "rgba(239, 68, 68, 0.0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, pulsingRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = "#f59e0b";
          ctx.lineWidth = 2.2;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(cx, cy, pulsingRadius, 0, Math.PI * 2);
          ctx.stroke();

          // 3. Convergent Pressing Vectors from pressing players to target carrier
          alert.primaryPlayerIds.forEach((pid) => {
            const presser = players.find((p) => p.id === pid);
            if (presser) {
              const px = toScreenX(presser.x);
              const py = toScreenY(presser.y);
              ctx.strokeStyle = "#ef4444";
              ctx.lineWidth = 2.4;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(px, py);
              ctx.lineTo(cx, cy);
              ctx.stroke();

              // Arrowhead towards carrier
              const ang = Math.atan2(cy - py, cx - px);
              ctx.fillStyle = "#ef4444";
              ctx.beginPath();
              ctx.moveTo(cx - Math.cos(ang) * 12, cy - Math.sin(ang) * 12);
              ctx.lineTo(
                cx - Math.cos(ang) * 12 + Math.cos(ang + 2.5) * 8,
                cy - Math.sin(ang) * 12 + Math.sin(ang + 2.5) * 8
              );
              ctx.lineTo(
                cx - Math.cos(ang) * 12 + Math.cos(ang - 2.5) * 8,
                cy - Math.sin(ang) * 12 + Math.sin(ang - 2.5) * 8
              );
              ctx.closePath();
              ctx.fill();
            }
          });

          // 4. Tactical Turf Badge
          const badgeW = 170;
          const badgeH = 22;
          ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
          ctx.strokeStyle = "#f59e0b";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(cx - badgeW / 2, cy - pulsingRadius - 28, badgeW, badgeH, 4);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#fbbf24";
          ctx.font = "bold 9px monospace";
          ctx.textAlign = "center";
          ctx.fillText(`⚡ HIGH-PRESS TRAP (${alert.metrics.pressingIntensityPct || 92}%)`, cx, cy - pulsingRadius - 14);

        } else if (alert.category === "line_break") {
          // B. Draw Defensive Line Break Corridor & Penetration Reticle
          const rx = toScreenX(alert.centroid.x);
          const ry = toScreenY(alert.centroid.y);

          // 1. Break Vector Ray
          if (alert.vectorStart && alert.vectorEnd) {
            const vsx = toScreenX(alert.vectorStart.x);
            const vsy = toScreenY(alert.vectorStart.y);
            const vex = toScreenX(alert.vectorEnd.x);
            const vey = toScreenY(alert.vectorEnd.y);

            const lineGrad = ctx.createLinearGradient(vsx, vsy, vex, vey);
            lineGrad.addColorStop(0, "rgba(239, 68, 68, 0.2)");
            lineGrad.addColorStop(1, "rgba(239, 68, 68, 0.95)");
            ctx.strokeStyle = lineGrad;
            ctx.lineWidth = 3.5;
            ctx.setLineDash([8, 6]);
            ctx.beginPath();
            ctx.moveTo(vsx, vsy);
            ctx.lineTo(vex, vey);
            ctx.stroke();

            // Broken threshold marker
            ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
            ctx.lineWidth = 2.0;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(vsx, vsy - 25);
            ctx.lineTo(vsx, vsy + 25);
            ctx.stroke();
          }

          // 2. Penetrating Runner Target Reticle with dual rotating brackets
          const runnerPulseR = 18 + 4 * pulse;
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 2.2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.arc(rx, ry, runnerPulseR, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.8;
          ctx.setLineDash([]);
          const bSize = 6;
          ctx.strokeRect(rx - runnerPulseR - 4, ry - runnerPulseR - 4, bSize, 0);
          ctx.strokeRect(rx - runnerPulseR - 4, ry - runnerPulseR - 4, 0, bSize);
          ctx.strokeRect(rx + runnerPulseR + 4 - bSize, ry - runnerPulseR - 4, bSize, 0);
          ctx.strokeRect(rx + runnerPulseR + 4, ry - runnerPulseR - 4, 0, bSize);

          // 3. Turf label
          const labelW = 180;
          ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(rx - labelW / 2, ry + runnerPulseR + 8, labelW, 22, 4);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#fca5a5";
          ctx.font = "bold 9px monospace";
          ctx.textAlign = "center";
          ctx.fillText(`🚨 LINE BREAK (${alert.metrics.closingSpeedKmh || 33.4} KM/H)`, rx, ry + runnerPulseR + 22);

        } else if (alert.category === "counter_attack") {
          // C. Draw Counter-Attack Transition Corridor & Speed Chevrons
          const vsx = toScreenX(alert.vectorStart?.x ?? (alert.centroid.x - 14));
          const vsy = toScreenY(alert.vectorStart?.y ?? alert.centroid.y);
          const vex = toScreenX(alert.vectorEnd?.x ?? (alert.centroid.x + 18));
          const vey = toScreenY(alert.vectorEnd?.y ?? alert.centroid.y);

          // Transition Corridor Shading
          const perpAng = Math.atan2(vey - vsy, vex - vsx) + Math.PI / 2;
          const halfWidth = 22 * scaleM;
          const c1x = vsx + Math.cos(perpAng) * halfWidth;
          const c1y = vsy + Math.sin(perpAng) * halfWidth;
          const c2x = vex + Math.cos(perpAng) * halfWidth;
          const c2y = vey + Math.sin(perpAng) * halfWidth;
          const c3x = vex - Math.cos(perpAng) * halfWidth;
          const c3y = vey - Math.sin(perpAng) * halfWidth;
          const c4x = vsx - Math.cos(perpAng) * halfWidth;
          const c4y = vsy - Math.sin(perpAng) * halfWidth;

          const corridorGrad = ctx.createLinearGradient(vsx, vsy, vex, vey);
          corridorGrad.addColorStop(0, "rgba(6, 182, 212, 0.12)");
          corridorGrad.addColorStop(1, "rgba(16, 185, 129, 0.28)");
          ctx.fillStyle = corridorGrad;
          ctx.beginPath();
          ctx.moveTo(c1x, c1y);
          ctx.lineTo(c2x, c2y);
          ctx.lineTo(c3x, c3y);
          ctx.lineTo(c4x, c4y);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = "rgba(6, 182, 212, 0.7)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 6]);
          ctx.stroke();

          // Animated chevrons along centerline
          const midVecX = (vsx + vex) / 2;
          const midVecY = (vsy + vey) / 2;
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 3.0;
          ctx.setLineDash([]);
          const ang = Math.atan2(vey - vsy, vex - vsx);
          for (let step = -1; step <= 1; step++) {
            const chX = midVecX + Math.cos(ang) * (step * 35) + Math.cos(ang) * (pulse * 8);
            const chY = midVecY + Math.sin(ang) * (step * 35) + Math.sin(ang) * (pulse * 8);
            ctx.beginPath();
            ctx.moveTo(chX - Math.cos(ang - 0.7) * 12, chY - Math.sin(ang - 0.7) * 12);
            ctx.lineTo(chX, chY);
            ctx.lineTo(chX - Math.cos(ang + 0.7) * 12, chY - Math.sin(ang + 0.7) * 12);
            ctx.stroke();
          }

          // Central Overload Badge
          const cx = toScreenX(alert.centroid.x);
          const cy = toScreenY(alert.centroid.y);
          const badgeW = 185;
          ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
          ctx.strokeStyle = "#06b6d4";
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.roundRect(cx - badgeW / 2, cy - 14, badgeW, 28, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#67e8f9";
          ctx.font = "bold 9.5px monospace";
          ctx.textAlign = "center";
          ctx.fillText(`🚀 ${alert.metrics.numericalAdvantage || "3 v 2"} OVERLOAD (${alert.metrics.closingSpeedKmh || 31.2} KM/H)`, cx, cy + 3);
        }

        ctx.restore();
      });

      ctx.restore();
    };

    render();

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      const delta = e.deltaY;
      const factor = delta < 0 ? 1.14 : 0.88;

      setZoom((prevZoom) => {
        const nextZoom = Math.min(4.5, Math.max(1.0, parseFloat((prevZoom * factor).toFixed(2))));
        if (nextZoom === 1.0) {
          setPan({ x: 0, y: 0 });
        } else {
          setPan((prevPan) => {
            const dx = mouseX - (canvas.width / 2 + prevPan.x);
            const dy = mouseY - (canvas.height / 2 + prevPan.y);
            const ratio = nextZoom / prevZoom - 1;
            const newPanX = prevPan.x - dx * ratio;
            const newPanY = prevPan.y - dy * ratio;
            const maxPanX = (nextZoom - 1.0) * (canvas.width * 0.46);
            const maxPanY = (nextZoom - 1.0) * (canvas.height * 0.46);
            return {
              x: Math.max(-maxPanX, Math.min(maxPanX, newPanX)),
              y: Math.max(-maxPanY, Math.min(maxPanY, newPanY)),
            };
          });
        }
        return nextZoom;
      });
    };

    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const rawX = (e.clientX - rect.left) * scaleX;
      const rawY = (e.clientY - rect.top) * scaleY;

      const unzoomedX = (rawX - (canvas.width / 2 + pan.x)) / zoom + canvas.width / 2;
      const unzoomedY = (rawY - (canvas.height / 2 + pan.y)) / zoom + canvas.height / 2;

      const padX = canvas.width * 0.04;
      const padY = canvas.height * 0.05;
      const pitchDrawW = canvas.width - padX * 2;
      const pitchDrawH = canvas.height - padY * 2;

      const pitchX = parseFloat((((unzoomedX - padX) / pitchDrawW) * PITCH_L - 52.5).toFixed(2));
      const pitchY = parseFloat((((unzoomedY - padY) / pitchDrawH) * PITCH_W - 34.0).toFixed(2));

      // 1. PUNDIT DRAW MODE HANDLING
      if (isPunditMode) {
        if (effectiveTool === "point_player" || effectiveTool === "spotlight") {
          let nearestPlayer: Player | null = null;
          let minD = 5.5;
          for (const p of players) {
            const d = Math.hypot(p.x - pitchX, p.y - pitchY);
            if (d < minD) {
              minD = d;
              nearestPlayer = p;
            }
          }

          const targetX = nearestPlayer ? nearestPlayer.x : pitchX;
          const targetY = nearestPlayer ? nearestPlayer.y : pitchY;
          const ann: TelestrationAnnotation = {
            id: `POINT-${Date.now()}`,
            type: "point_player",
            color: effectiveColor,
            points: [{ x: targetX, y: targetY }],
            radius: 4.8,
            label: nearestPlayer ? `${nearestPlayer.name} (#${nearestPlayer.number})` : "Tactical Focal Point",
            subLabel: nearestPlayer ? `${pitchPunditName} Spotlight` : "Spatial Point",
            targetPlayerId: nearestPlayer ? nearestPlayer.id : undefined,
            targetPlayerName: nearestPlayer ? nearestPlayer.name : undefined,
            timestamp: formatMatchTimestamp(matchTimeSec),
            author: pitchPunditName,
          };
          handleAddAnnotation(ann);
          setToastMessage(nearestPlayer ? `Pointed: ${nearestPlayer.name} (#${nearestPlayer.number})` : `Pointed tactical focus at (${pitchX}m, ${pitchY}m)`);
          setTimeout(() => setToastMessage(null), 2500);
          return;
        }

        if (effectiveTool === "action_marker") {
          const ann: TelestrationAnnotation = {
            id: `ACT-${Date.now()}`,
            type: "action_marker",
            color: selectedActionCategory.color,
            points: [{ x: pitchX, y: pitchY }],
            label: selectedActionCategory.label,
            actionCategory: selectedActionCategory.id,
            subLabel: `${pitchPunditName} Action Point`,
            timestamp: formatMatchTimestamp(matchTimeSec),
            author: pitchPunditName,
          };
          handleAddAnnotation(ann);
          setToastMessage(`Marked action: "${selectedActionCategory.label}"`);
          setTimeout(() => setToastMessage(null), 2500);
          return;
        }

        if (effectiveTool === "offside_plane") {
          const ann: TelestrationAnnotation = {
            id: `OFF-${Date.now()}`,
            type: "offside_plane",
            color: effectiveColor,
            points: [{ x: pitchX, y: -34 }, { x: pitchX, y: 34 }],
            label: `OFFSIDE LINE (${Math.abs(pitchX).toFixed(1)}m)`,
            timestamp: formatMatchTimestamp(matchTimeSec),
            author: pitchPunditName,
          };
          handleAddAnnotation(ann);
          setToastMessage(`Offside threshold drawn at ${Math.abs(pitchX).toFixed(1)}m`);
          setTimeout(() => setToastMessage(null), 2500);
          return;
        }

        if (effectiveTool === "pass_arrow" || effectiveTool === "run_vector" || effectiveTool === "press_arrow" || effectiveTool === "cover_zone") {
          drawStartPitchRef.current = { x: pitchX, y: pitchY };
          setIsLiveDrawing(true);
          setLiveStartPoint({ x: pitchX, y: pitchY });
          setLiveCurrentPoint({ x: pitchX, y: pitchY });
          return;
        }

        if (effectiveTool === "freehand") {
          freehandPointsRef.current = [{ x: pitchX, y: pitchY }];
          setIsLiveDrawing(true);
          setLiveFreehandPath([{ x: pitchX, y: pitchY }]);
          return;
        }
      }

      // Default Canvas Pan Dragging
      isDraggingRef.current = true;
      hasDraggedRef.current = false;
      dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const rawX = (e.clientX - rect.left) * scaleX;
      const rawY = (e.clientY - rect.top) * scaleY;

      const unzoomedX = (rawX - (canvas.width / 2 + pan.x)) / zoom + canvas.width / 2;
      const unzoomedY = (rawY - (canvas.height / 2 + pan.y)) / zoom + canvas.height / 2;

      const padX = canvas.width * 0.04;
      const padY = canvas.height * 0.05;
      const pitchDrawW = canvas.width - padX * 2;
      const pitchDrawH = canvas.height - padY * 2;

      const probePitchX = ((unzoomedX - padX) / pitchDrawW) * PITCH_L - 52.5;
      const probePitchY = ((unzoomedY - padY) / pitchDrawH) * PITCH_W - 34.0;

      if (
        probePitchX >= -56 &&
        probePitchX <= 56 &&
        probePitchY >= -36 &&
        probePitchY <= 36
      ) {
        setCursorProbe({
          screenX: Math.round(rawX),
          screenY: Math.round(rawY),
          pitchX: parseFloat(probePitchX.toFixed(2)),
          pitchY: parseFloat(probePitchY.toFixed(2)),
          reprojectedX: Math.round(rawX),
          reprojectedY: Math.round(rawY),
        });
      } else {
        setCursorProbe(null);
      }

      // Live Drawing in Pundit Mode
      if (isLiveDrawing && isPunditMode) {
        if (drawStartPitchRef.current) {
          setLiveCurrentPoint({
            x: parseFloat(probePitchX.toFixed(2)),
            y: parseFloat(probePitchY.toFixed(2)),
          });
        }
        if (effectiveTool === "freehand") {
          freehandPointsRef.current.push({
            x: parseFloat(probePitchX.toFixed(2)),
            y: parseFloat(probePitchY.toFixed(2)),
          });
          setLiveFreehandPath([...freehandPointsRef.current]);
        }
        return;
      }

      if (isDraggingRef.current && zoom > 1.0) {
        const diffX = Math.abs(e.clientX - (dragStartRef.current.x + pan.x));
        const diffY = Math.abs(e.clientY - (dragStartRef.current.y + pan.y));
        if (diffX > 3 || diffY > 3) {
          hasDraggedRef.current = true;
        }
        const maxPanX = (zoom - 1.0) * (canvas.width * 0.46);
        const maxPanY = (zoom - 1.0) * (canvas.height * 0.46);
        setPan({
          x: Math.max(-maxPanX, Math.min(maxPanX, e.clientX - dragStartRef.current.x)),
          y: Math.max(-maxPanY, Math.min(maxPanY, e.clientY - dragStartRef.current.y)),
        });
      }
    };

    const handleMouseUp = () => {
      // Finish Live Drawing
      if (isLiveDrawing && isPunditMode) {
        if (drawStartPitchRef.current && liveCurrentPoint) {
          const sX = drawStartPitchRef.current.x;
          const sY = drawStartPitchRef.current.y;
          const eX = liveCurrentPoint.x;
          const eY = liveCurrentPoint.y;
          const dist = Math.hypot(eX - sX, eY - sY);

          if (dist > 1.2) {
            if (effectiveTool === "pass_arrow") {
              handleAddAnnotation({
                id: `PASS-${Date.now()}`,
                type: "pass_arrow",
                color: effectiveColor,
                points: [{ x: sX, y: sY }, { x: eX, y: eY }],
                label: `Pass (${dist.toFixed(1)}m)`,
                timestamp: formatMatchTimestamp(matchTimeSec),
                author: pitchPunditName,
              });
              setToastMessage(`✓ Pass arrow drawn (${dist.toFixed(1)}m vector)`);
            } else if (effectiveTool === "run_vector") {
              const estSpeed = (dist * 1.3 + 18.5).toFixed(1);
              handleAddAnnotation({
                id: `RUN-${Date.now()}`,
                type: "run_vector",
                color: effectiveColor,
                points: [{ x: sX, y: sY }, { x: eX, y: eY }],
                label: `Sprint (${estSpeed} km/h)`,
                timestamp: formatMatchTimestamp(matchTimeSec),
                author: pitchPunditName,
              });
              setToastMessage(`✓ Sprint run vector drawn (${estSpeed} km/h)`);
            } else if (effectiveTool === "press_arrow") {
              handleAddAnnotation({
                id: `PRESS-${Date.now()}`,
                type: "press_arrow",
                color: effectiveColor,
                points: [{ x: sX, y: sY }, { x: eX, y: eY }],
                label: `Pressing Vector (${dist.toFixed(1)}m)`,
                timestamp: formatMatchTimestamp(matchTimeSec),
                author: pitchPunditName,
              });
              setToastMessage(`✓ Pressing vector drawn (${dist.toFixed(1)}m)`);
            } else if (effectiveTool === "cover_zone") {
              const w = Math.max(4, Math.abs(eX - sX));
              const h = Math.max(4, Math.abs(eY - sY));
              handleAddAnnotation({
                id: `ZONE-${Date.now()}`,
                type: "cover_zone",
                color: effectiveColor,
                points: [{ x: Math.min(sX, eX), y: Math.min(sY, eY) }],
                width: w,
                height: h,
                label: `Cover Space (${w.toFixed(1)}m x ${h.toFixed(1)}m)`,
                timestamp: formatMatchTimestamp(matchTimeSec),
                author: pitchPunditName,
              });
              setToastMessage(`✓ Tactical zone drawn`);
            }
          }
        } else if (effectiveTool === "freehand" && freehandPointsRef.current.length > 3) {
          handleAddAnnotation({
            id: `FREE-${Date.now()}`,
            type: "freehand",
            color: effectiveColor,
            points: [...freehandPointsRef.current],
            label: "Movement Line",
            timestamp: formatMatchTimestamp(matchTimeSec),
            author: pitchPunditName,
          });
          setToastMessage(`✓ Freehand line drawn`);
        }

        setIsLiveDrawing(false);
        setLiveStartPoint(null);
        setLiveCurrentPoint(null);
        setLiveFreehandPath([]);
        drawStartPitchRef.current = null;
        freehandPointsRef.current = [];
        setTimeout(() => setToastMessage(null), 2500);
      }

      isDraggingRef.current = false;
    };

    const handleDoubleClick = () => {
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
    };

    const handleClick = (e: MouseEvent) => {
      if (isPunditMode) return;
      if (hasDraggedRef.current) {
        hasDraggedRef.current = false;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const rawX = (e.clientX - rect.left) * scaleX;
      const rawY = (e.clientY - rect.top) * scaleY;

      const clickX = (rawX - (canvas.width / 2 + pan.x)) / zoom + canvas.width / 2;
      const clickY = (rawY - (canvas.height / 2 + pan.y)) / zoom + canvas.height / 2;

      const padX = canvas.width * 0.04;
      const padY = canvas.height * 0.05;
      const pitchDrawW = canvas.width - padX * 2;
      const pitchDrawH = canvas.height - padY * 2;

      // Check marker click for homography debug
      if (showHomographyDebug) {
        let clickedMarker: TouchlineMarker | null = null;
        let minMarkerDist = 18 / zoom;

        markers.forEach((m) => {
          const sx = padX + ((m.detectedPitchX + 52.5) / PITCH_L) * pitchDrawW;
          const sy = padY + ((m.detectedPitchY + 34.0) / PITCH_W) * pitchDrawH;
          const dist = Math.hypot(clickX - sx, clickY - sy);
          if (dist < minMarkerDist) {
            minMarkerDist = dist;
            clickedMarker = m;
          }
        });

        if (clickedMarker) {
          setSelectedMarkerId((clickedMarker as TouchlineMarker).id);
          setIsInspectorExpanded(true);
          setActiveInspectorTab("markers");
          return;
        }
      }

      // Check if user clicked on pitch near box while holding Shift or in Set-Piece mode to reposition set-piece ball
      if (e.shiftKey || (isSetPieceMode && e.altKey)) {
        const pitchX = ((clickX - padX) / pitchDrawW) * PITCH_L - 52.5;
        const pitchY = ((clickY - padY) / pitchDrawH) * PITCH_W - 34.0;
        setActiveSetPieceBall({ x: parseFloat(pitchX.toFixed(1)), y: parseFloat(pitchY.toFixed(1)) });
        setSelectedSetPiecePresetId("custom");
        setToastMessage(`Set-piece ball repositioned to (${pitchX.toFixed(1)}m, ${pitchY.toFixed(1)}m)`);
        setTimeout(() => setToastMessage(null), 3000);
        return;
      }

      let found: Player | null = null;
      let minD = 22 / zoom;

      players.forEach((p) => {
        const sx = padX + ((p.x + 52.5) / PITCH_L) * pitchDrawW;
        const sy = padY + ((p.y + 34.0) / PITCH_W) * pitchDrawH;
        const dist = Math.hypot(clickX - sx, clickY - sy);
        if (dist < minD) {
          minD = dist;
          found = p;
        }
      });

      onSelectPlayer(found ? (found as Player).id : null);
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("dblclick", handleDoubleClick);
    canvas.addEventListener("click", handleClick);

    return () => {
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("dblclick", handleDoubleClick);
      canvas.removeEventListener("click", handleClick);
    };
  }, [
    players,
    averagePositions,
    team0Formation,
    team1Formation,
    ball,
    selectedPlayerId,
    overlays,
    zoom,
    pan,
    showHomographyDebug,
    markers,
    isCalibrating,
    calibrationSweepProgress,
    selectedMarkerId,
    show10sAverageAnchors,
    shouldRenderSetPiece,
    activeTrajectoryId,
    effectiveBall,
    isAlertsEnabled,
    activeAlerts,
    alertHistory,
    selectedAlertId,
    effectiveTelestrations,
    isPunditMode,
    effectiveTool,
    effectiveColor,
    isLiveDrawing,
    liveStartPoint,
    liveCurrentPoint,
    liveFreehandPath,
    selectedActionCategory,
    pitchPunditName,
  ]);

  const jumpToSector = (targetPanX: number, targetPanY: number, targetZoom: number) => {
    setZoom(targetZoom);
    setPan({ x: targetPanX, y: targetPanY });
  };

  return (
    <div className="relative w-full aspect-[105/68] max-h-[640px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center select-none group">
      <canvas
        ref={canvasRef}
        width={1050}
        height={680}
        className={`w-full h-full object-contain ${
          zoom > 1.0 ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"
        }`}
      />

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md px-4 py-1.5 rounded-full border border-cyan-500/60 shadow-xl flex items-center gap-2 text-xs font-mono text-cyan-200 animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Real-Time Tactical Event Visual Alerts HUD Banner */}
      {activeAlerts.length > 0 && isAlertsEnabled && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-2 max-w-[92%] sm:max-w-[560px] w-full pointer-events-auto animate-in fade-in slide-in-from-top-3">
          {activeAlerts.map((alert) => {
            const isHighPress = alert.category === "high_press";
            const isLineBreak = alert.category === "line_break";

            return (
              <div
                key={alert.id}
                className={`p-3 rounded-xl border shadow-2xl backdrop-blur-md flex flex-col gap-2 transition-all ${
                  isHighPress
                    ? "bg-slate-950/95 border-amber-500/80 shadow-amber-950/50 text-amber-100"
                    : isLineBreak
                    ? "bg-slate-950/95 border-red-500/80 shadow-red-950/50 text-red-100"
                    : "bg-slate-950/95 border-cyan-500/80 shadow-cyan-950/50 text-cyan-100"
                }`}
              >
                {/* Alert Top Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-1.5 rounded-lg ${
                        isHighPress
                          ? "bg-amber-500/20 text-amber-400"
                          : isLineBreak
                          ? "bg-red-500/20 text-red-400 animate-pulse"
                          : "bg-cyan-500/20 text-cyan-400"
                      }`}
                    >
                      {isHighPress ? (
                        <Flame className="w-4 h-4 text-amber-400" />
                      ) : isLineBreak ? (
                        <ShieldAlert className="w-4 h-4 text-red-400" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-cyan-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-mono font-black uppercase px-1.5 py-0.2 rounded ${
                            alert.severity === "critical"
                              ? "bg-red-500 text-white"
                              : alert.severity === "warning"
                              ? "bg-amber-500 text-slate-950"
                              : "bg-cyan-500 text-slate-950"
                          }`}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-xs font-mono font-bold text-white tracking-wide">
                          {alert.title}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-300 font-mono mt-0.5">
                        {alert.subtitle} · <span className="text-cyan-400 font-bold">{alert.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleFocusAlert(alert)}
                      className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-mono flex items-center gap-1 transition-colors border border-slate-700"
                      title="Focus Camera on Event Coordinates"
                    >
                      <Eye className="w-3 h-3 text-cyan-400" />
                      <span className="hidden sm:inline">Focus</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsAlertsEnabled(false);
                        setActiveAlerts([]);
                        setToastMessage("🔕 Tactical notifications turned OFF");
                        setTimeout(() => setToastMessage(null), 2500);
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
                      title="Turn OFF all tactical notifications"
                    >
                      <BellOff className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDismissAlert(alert.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Dismiss Alert"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Description & Metrics Badge Row */}
                <div className="text-[11px] text-slate-300 leading-snug">
                  {alert.description}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono pt-1 border-t border-slate-800/80">
                  {alert.metrics.closingSpeedKmh && (
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      Speed: <strong className="text-white">{alert.metrics.closingSpeedKmh} km/h</strong>
                    </span>
                  )}
                  {alert.metrics.pressingIntensityPct && (
                    <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/40 text-amber-300">
                      Press Intensity: <strong>{alert.metrics.pressingIntensityPct}%</strong>
                    </span>
                  )}
                  {alert.metrics.distanceToGoalM && (
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      Dist: <strong className="text-white">{alert.metrics.distanceToGoalM}m</strong>
                    </span>
                  )}
                  {alert.metrics.numericalAdvantage && (
                    <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40 text-cyan-300">
                      Ratio: <strong>{alert.metrics.numericalAdvantage}</strong>
                    </span>
                  )}
                  {alert.metrics.spaceMeters && (
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      Space: <strong className="text-white">{alert.metrics.spaceMeters}m</strong>
                    </span>
                  )}

                  <button
                    onClick={() => handleDispatchDirectiveFromAlert(alert)}
                    className="ml-auto px-2.5 py-0.5 rounded bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-[10px] flex items-center gap-1 transition-all shadow-sm"
                  >
                    <Zap className="w-3 h-3" />
                    Dispatch Directive
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Top Header Tactical Toolbar */}
      <div className="absolute top-3 left-4 flex flex-wrap items-center gap-2 z-30">
        {/* Engine Badge */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur px-2.5 py-1 rounded-lg border border-slate-700/60 shadow-lg text-[11px] font-mono text-slate-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden sm:inline">2D PITCH ENGINE · 105×68m</span>
        </div>

        {/* 1. SET-PIECE TACTICAL OVERLAY MODE TOGGLE */}
        <button
          onClick={() => {
            setIsSetPieceMode((prev) => !prev);
            setShowSetPieceDrawer((prev) => !prev);
          }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold font-mono border transition-all shadow-lg ${
            isSetPieceMode
              ? "bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-amber-950/40"
              : "bg-slate-900/90 text-slate-400 hover:text-slate-200 border-slate-700/60"
          }`}
          title="Toggle Set-Piece Delivery Trajectories & Penalty Box Target Zones"
        >
          <Flag className={`w-3.5 h-3.5 ${isSetPieceMode ? "text-amber-400 animate-bounce" : "text-slate-400"}`} />
          <span className="hidden sm:inline">SET-PIECES:</span>
          <span className="font-bold text-amber-200">
            {setPieceAnalysis.category === "open_play"
              ? "ACTIVE"
              : setPieceAnalysis.category.toUpperCase().replace("_", " ")}
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isSetPieceMode ? "bg-amber-400 shadow-sm shadow-amber-400" : "bg-slate-600"
            }`}
          />
        </button>

        {/* 2. DYNAMIC 10-SECOND FORMATION LABELS IN TACTICAL HUD */}
        {team0Formation && (
          <button
            onClick={() => {
              setActiveFormationTeamTab(0);
              setShowFormationDrawer((prev) => !prev);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-950/80 hover:bg-red-900/90 border border-red-500/50 text-red-200 text-xs font-mono font-bold transition-all shadow-md group/btn"
            title="Arsenal 10s Rolling Formation: Click to inspect tactical lines"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>ARS</span>
            <span className="px-1.5 py-0.2 bg-red-600 text-white rounded text-[11px] font-black border border-red-400/40 shadow-sm">
              {team0Formation.formationLabel}
            </span>
          </button>
        )}

        {team1Formation && (
          <button
            onClick={() => {
              setActiveFormationTeamTab(1);
              setShowFormationDrawer((prev) => !prev);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-950/80 hover:bg-sky-900/90 border border-sky-500/50 text-sky-200 text-xs font-mono font-bold transition-all shadow-md group/btn"
            title="Man City 10s Rolling Formation: Click to inspect tactical lines"
          >
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <span>MCI</span>
            <span className="px-1.5 py-0.2 bg-sky-500 text-slate-950 rounded text-[11px] font-black border border-sky-300/40 shadow-sm">
              {team1Formation.formationLabel}
            </span>
          </button>
        )}

        {/* Toggle 10s Average Position Anchors */}
        <button
          onClick={() => setShow10sAverageAnchors((prev) => !prev)}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono border transition-all ${
            show10sAverageAnchors
              ? "bg-purple-500/25 text-purple-300 border-purple-500/60 font-semibold shadow-sm"
              : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border-slate-700/60"
          }`}
          title="Toggle 10-Second Average Player Position Anchors & Tactical Unit Lines on Pitch"
        >
          <Activity className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">10s AVG</span>
        </button>

        {/* 3. AUTO-CALIBRATE ACTION BUTTON */}
        <button
          onClick={handleAutoCalibrate}
          disabled={isCalibrating}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold font-mono border transition-all shadow-lg ${
            isCalibrating
              ? "bg-emerald-500/25 text-emerald-300 border-emerald-500/70 animate-pulse"
              : calibrationResult.isCalibrated
              ? "bg-slate-900/90 hover:bg-emerald-950/80 text-emerald-400 border-emerald-500/40 hover:border-emerald-400"
              : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/60 animate-bounce"
          }`}
          title="Align coordinate system based on detected touchline markers using RANSAC Homography"
        >
          <Target className={`w-3.5 h-3.5 ${isCalibrating ? "animate-spin text-emerald-400" : "text-emerald-400"}`} />
          <span>{isCalibrating ? "CALIBRATING..." : "AUTO-CALIBRATE"}</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              calibrationResult.isCalibrated ? "bg-emerald-400 shadow-sm shadow-emerald-400" : "bg-amber-400"
            }`}
          />
        </button>

        {/* 4. TOGGLEABLE HOMOGRAPHY DEBUG VIEW BUTTON */}
        <button
          onClick={() => setShowHomographyDebug((prev) => !prev)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold font-mono border transition-all shadow-lg ${
            showHomographyDebug
              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-cyan-950/40"
              : "bg-slate-900/90 text-slate-400 hover:text-slate-200 border-slate-700/60 hover:bg-slate-800"
          }`}
          title="Toggle Homography Transformation Debug View & Touchline Markers Overlay"
        >
          <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">DEBUG</span>
          <span
            className={`text-[9px] px-1 py-0.2 rounded font-bold ${
              showHomographyDebug ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-400"
            }`}
          >
            {showHomographyDebug ? "ON" : "OFF"}
          </span>
        </button>

        {/* 5A. REAL-TIME NOTIFICATIONS MASTER ON/OFF TOGGLE */}
        <button
          onClick={() => {
            const next = !isAlertsEnabled;
            setIsAlertsEnabled(next);
            if (!next) setActiveAlerts([]);
            setToastMessage(next ? "🔔 Tactical Notifications: ON" : "🔕 Tactical Notifications: OFF");
            setTimeout(() => setToastMessage(null), 2500);
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold font-mono border transition-all shadow-lg ${
            isAlertsEnabled
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-emerald-950/40"
              : "bg-slate-900/90 text-slate-400 hover:text-slate-200 border-slate-700/60"
          }`}
          title={isAlertsEnabled ? "Click to TURN OFF tactical notifications" : "Click to TURN ON tactical notifications"}
        >
          {isAlertsEnabled ? (
            <Bell className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <BellOff className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span className="hidden md:inline">NOTIFS:</span>
          <span
            className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
              isAlertsEnabled ? "bg-emerald-400 text-slate-950" : "bg-slate-800 text-slate-400"
            }`}
          >
            {isAlertsEnabled ? "ON" : "OFF"}
          </span>
        </button>

        {/* 5B. REAL-TIME TACTICAL ALERTS DRAWER BUTTON */}
        <button
          onClick={() => setShowAlertsDrawer((prev) => !prev)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold font-mono border transition-all shadow-lg ${
            activeAlerts.length > 0 && isAlertsEnabled
              ? "bg-red-500/25 text-red-200 border-red-500/80 animate-pulse shadow-red-950/60"
              : showAlertsDrawer
              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/70"
              : "bg-slate-900/90 text-slate-300 hover:text-white border-slate-700/60"
          }`}
          title="Open Tactical Event Alerts & Notification Center"
        >
          {activeAlerts.length > 0 && isAlertsEnabled ? (
            <BellRing className="w-3.5 h-3.5 text-red-400 animate-bounce" />
          ) : (
            <Bell className="w-3.5 h-3.5 text-cyan-400" />
          )}
          <span>ALERTS</span>
          {activeAlerts.length > 0 && isAlertsEnabled ? (
            <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white font-bold text-[10px] animate-pulse">
              {activeAlerts.length}
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">
              {alertHistory.length}
            </span>
          )}
        </button>

        {/* 6. PUNDIT TELESTRATOR & COMMENT DRAWING TOGGLE */}
        <button
          onClick={() => {
            const next = !isPunditMode;
            setIsPunditMode(next);
            setToastMessage(next ? "🎨 Pundit Telestrator & Draw Mode: ACTIVE" : "Pundit Draw Mode: OFF");
            setTimeout(() => setToastMessage(null), 2500);
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold font-mono border transition-all shadow-lg ${
            isPunditMode
              ? "bg-amber-500/25 text-amber-300 border-amber-500/80 shadow-amber-950/60 ring-1 ring-amber-500/50"
              : "bg-slate-900/90 text-slate-300 hover:text-white border-slate-700/60"
          }`}
          title="Toggle Pundit & Analyst Telestrator Draw Mode"
        >
          <PenTool className={`w-3.5 h-3.5 ${isPunditMode ? "text-amber-400 animate-bounce" : "text-amber-400"}`} />
          <span className="hidden sm:inline">PUNDIT DRAW</span>
          <span
            className={`text-[9px] px-1 py-0.2 rounded font-bold ${
              isPunditMode ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-400"
            }`}
          >
            {isPunditMode ? "ON" : "OFF"}
          </span>
        </button>
      </div>

      {/* Floating Pundit Telestrator Deck (Visible when Pundit Mode is Active) */}
      {isPunditMode && (
        <div className="absolute top-14 left-4 z-40 bg-slate-950/95 backdrop-blur-md p-2.5 rounded-xl border border-amber-500/50 shadow-2xl flex flex-col gap-2 max-w-[94%] sm:max-w-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400">
              <PenTool className="w-3.5 h-3.5" />
              <span>PUNDIT TELESTRATOR & ACTION MARKER</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400">
                {effectiveTelestrations.length} Markings
              </span>
              <button
                onClick={() => setShowPitchCommentModal(true)}
                className="px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-mono font-semibold flex items-center gap-1 shadow-sm"
              >
                <MessageSquare className="w-3 h-3" />
                <span>Attach Comment</span>
              </button>
              <button
                onClick={() => setIsPunditMode(false)}
                className="text-slate-400 hover:text-white text-xs p-0.5"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Tools Selector */}
          <div className="flex flex-wrap items-center gap-1">
            {[
              { id: "pass_arrow", label: "Pass Arrow" },
              { id: "run_vector", label: "Sprint Run" },
              { id: "point_player", label: "Point Player" },
              { id: "action_marker", label: "Mark Action" },
              { id: "freehand", label: "Freehand Pen" },
              { id: "cover_zone", label: "Cover Zone" },
              { id: "offside_plane", label: "Offside Line" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setEffectiveTool(t.id as TelestrationTool)}
                className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-colors ${
                  effectiveTool === t.id
                    ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Sub-options for Action Marker */}
          {effectiveTool === "action_marker" && (
            <div className="flex items-center gap-1 bg-slate-900 p-1.5 rounded-lg border border-slate-800 text-[10px] font-mono">
              <span className="text-slate-400 mr-1">ACTION:</span>
              {[
                { id: "defensive_error", label: "Defensive Gap", color: "#ef4444" },
                { id: "turnover", label: "Key Turnover", color: "#f59e0b" },
                { id: "goal_chance", label: "Goal Chance", color: "#10b981" },
                { id: "1v1_isolation", label: "1v1 Isolation", color: "#38bdf8" },
                { id: "press_trigger", label: "Press Trigger", color: "#a855f7" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedActionCategory(cat as any)}
                  className={`px-1.5 py-0.5 rounded transition-colors ${
                    selectedActionCategory.id === cat.id
                      ? "bg-amber-500/30 text-amber-300 border border-amber-500/50 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* Color Palette & Actions */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-400">COLOR:</span>
              {[
                { hex: "#eab308", name: "Yellow" },
                { hex: "#06b6d4", name: "Cyan" },
                { hex: "#ef4444", name: "Red" },
                { hex: "#10b981", name: "Green" },
                { hex: "#ffffff", name: "White" },
              ].map((col) => (
                <button
                  key={col.hex}
                  onClick={() => setEffectiveColor(col.hex)}
                  style={{ backgroundColor: col.hex }}
                  className={`w-4 h-4 rounded-full transition-transform ${
                    effectiveColor === col.hex ? "scale-125 ring-2 ring-white" : "opacity-75 hover:opacity-100"
                  }`}
                  title={col.name}
                />
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleUndoAnnotation}
                disabled={effectiveTelestrations.length === 0}
                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 text-[11px] font-mono border border-slate-800"
              >
                Undo
              </button>
              <button
                onClick={handleClearAnnotations}
                disabled={effectiveTelestrations.length === 0}
                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 text-[11px] font-mono border border-slate-800"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Post-Match Comment Popover inside Pitch */}
      {showPitchCommentModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full shadow-2xl flex flex-col gap-3 font-sans text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                <span>Attach Post-Match Analyst Comment</span>
              </div>
              <button
                onClick={() => setShowPitchCommentModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">PUNDIT NAME:</label>
              <select
                value={pitchPunditName}
                onChange={(e) => setPitchPunditName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-medium focus:outline-none"
              >
                <option value="Jamie Carragher">Jamie Carragher (Sky Sports MNF)</option>
                <option value="Gary Neville">Gary Neville (Sky Sports MNF)</option>
                <option value="Thierry Henry">Thierry Henry (CBS Sports / Tactical)</option>
                <option value="Alan Shearer">Alan Shearer (BBC Match of the Day)</option>
                <option value="Karen Carney">Karen Carney (TNT Sports)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">HEADLINE:</label>
              <input
                type="text"
                value={pitchCommentHeadline}
                onChange={(e) => setPitchCommentHeadline(e.target.value)}
                placeholder="e.g. Saliba Depth Gap Allows Blindside Runner"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">ANALYST COMMENTARY:</label>
              <textarea
                rows={3}
                value={pitchCommentText}
                onChange={(e) => setPitchCommentText(e.target.value)}
                placeholder="Explain the movement, player decision, or line break..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowPitchCommentModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pitchCommentText.trim()) {
                    if (onSavePunditComment) {
                      onSavePunditComment({
                        id: `PUNDIT-DIRECT-${Date.now()}`,
                        punditName: pitchPunditName,
                        punditRole: "Tactical Analyst",
                        punditAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
                        channel: "MATCHVISION TACTICAL",
                        matchMinute: formatMatchTimestamp(matchTimeSec),
                        headline: pitchCommentHeadline || "Tactical Phase Breakdown",
                        comment: pitchCommentText,
                        keyTakeaway: "Spatial discipline decides the match outcome.",
                        sentiment: "tactical_breakdown",
                        taggedPlayerIds: selectedPlayerId ? [selectedPlayerId] : [],
                        taggedPlayerNames: selectedPlayerId ? [players.find(p => p.id === selectedPlayerId)?.name || "Player"] : [],
                        actionType: "defensive_line_break",
                        annotations: [...effectiveTelestrations],
                        likes: 1,
                        timestamp: formatMatchTimestamp(matchTimeSec),
                      });
                    }
                    setToastMessage(`✓ Post-match comment attached to ${effectiveTelestrations.length} markings!`);
                    setShowPitchCommentModal(false);
                    setPitchCommentText("");
                    setPitchCommentHeadline("");
                    setTimeout(() => setToastMessage(null), 3000);
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono"
              >
                Save Comment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Zoom & Navigation Controls HUD */}
      <div className="absolute top-3 right-4 flex items-center gap-1.5 bg-slate-900/95 backdrop-blur px-2.5 py-1 rounded-lg border border-slate-700/70 shadow-2xl z-30">
        <div className="hidden sm:flex items-center gap-1 mr-1 border-r border-slate-700/60 pr-2">
          {[1.0, 1.5, 2.0, 3.0].map((level) => (
            <button
              key={level}
              onClick={() => {
                setZoom(level);
                if (level === 1.0) setPan({ x: 0, y: 0 });
              }}
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors ${
                zoom === level
                  ? "bg-cyan-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {level}x
            </button>
          ))}
        </div>

        <button
          onClick={() => setZoom((z) => Math.min(4.5, parseFloat((z + 0.25).toFixed(2))))}
          className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <span className="font-mono text-xs font-bold text-cyan-400 px-1.5 min-w-[42px] text-center">
          {(zoom * 100).toFixed(0)}%
        </span>
        <button
          onClick={() => {
            setZoom((z) => {
              const next = Math.max(1.0, parseFloat((z - 0.25).toFixed(2)));
              if (next === 1.0) setPan({ x: 0, y: 0 });
              return next;
            });
          }}
          className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        {zoom > 1.0 && (
          <button
            onClick={() => {
              setZoom(1.0);
              setPan({ x: 0, y: 0 });
            }}
            className="flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 ml-1 transition-colors"
            title="Reset Zoom to 100%"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      {/* Sector Quick Jump Pills (bottom-left) */}
      <div className="absolute bottom-3 left-4 hidden md:flex items-center gap-1 bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded-lg border border-slate-700/50 text-[10px] font-mono z-20">
        <span className="text-slate-400 mr-1">SECTOR:</span>
        <button
          onClick={() => jumpToSector(0, 0, 1.0)}
          className={`px-1.5 py-0.5 rounded hover:bg-slate-800 ${
            zoom === 1.0 ? "text-cyan-400 font-bold" : "text-slate-300"
          }`}
        >
          Full Pitch
        </button>
        <button
          onClick={() => jumpToSector(300, 0, 2.2)}
          className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-300"
        >
          Man City Box
        </button>
        <button
          onClick={() => jumpToSector(0, 0, 2.2)}
          className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-300"
        >
          Midfield
        </button>
        <button
          onClick={() => jumpToSector(-300, 0, 2.2)}
          className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-300"
        >
          Arsenal Box
        </button>
      </div>

      {/* Live Cursor Coordinate Probe Readout */}
      {cursorProbe && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur px-3 py-1 rounded-full border border-cyan-500/40 hidden md:flex items-center gap-3 text-[10px] font-mono text-slate-300 z-20 shadow-xl pointer-events-none">
          <div className="flex items-center gap-1 text-cyan-400 font-semibold">
            <Compass className="w-3 h-3" />
            <span>PROBE:</span>
          </div>
          <span>
            PITCH:{" "}
            <strong className="text-white">
              {cursorProbe.pitchX > 0 ? `+${cursorProbe.pitchX}` : cursorProbe.pitchX}m,{" "}
              {cursorProbe.pitchY > 0 ? `+${cursorProbe.pitchY}` : cursorProbe.pitchY}m
            </strong>
          </span>
          <span className="text-slate-600">|</span>
          <span>
            SCREEN:{" "}
            <strong className="text-slate-400">
              {cursorProbe.screenX}px, {cursorProbe.screenY}px
            </strong>
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3B. REAL-TIME TACTICAL EVENT NOTIFICATION CENTER & HISTORY DRAWER          */}
      {/* ========================================================================= */}
      {showAlertsDrawer && (
        <div className="absolute top-14 right-4 z-40 w-96 max-h-[520px] bg-slate-900/95 backdrop-blur-md rounded-xl border border-cyan-500/50 shadow-2xl flex flex-col font-mono text-xs overflow-hidden animate-in fade-in slide-in-from-top-2">
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800 bg-slate-950/90">
            <div className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isAlertsEnabled ? "bg-emerald-400 animate-pulse" : "bg-slate-600"
                }`}
              />
              <div>
                <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <span>TACTICAL EVENT MONITOR</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded border font-bold ${
                      isAlertsEnabled
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    {isAlertsEnabled ? "LIVE MONITORING" : "MONITOR PAUSED"}
                  </span>
                </div>
                <div className="text-[9px] text-slate-400">
                  Algorithmic triggers for high-press, breaks & counter-attacks
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Notification Master On/Off Toggle Button */}
              <button
                onClick={() => {
                  const next = !isAlertsEnabled;
                  setIsAlertsEnabled(next);
                  if (!next) setActiveAlerts([]);
                  setToastMessage(next ? "🔔 Tactical Notifications: ON" : "🔕 Tactical Notifications: OFF");
                  setTimeout(() => setToastMessage(null), 2500);
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                  isAlertsEnabled
                    ? "bg-emerald-950/70 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900/70"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
                }`}
                title={isAlertsEnabled ? "Turn OFF notifications" : "Turn ON notifications"}
              >
                {isAlertsEnabled ? (
                  <Bell className="w-3 h-3 text-emerald-400" />
                ) : (
                  <BellOff className="w-3 h-3 text-slate-400" />
                )}
                <span>{isAlertsEnabled ? "NOTIFS: ON" : "NOTIFS: OFF"}</span>
              </button>

              <button
                onClick={() => {
                  const nextSound = !isSoundEnabled;
                  setIsSoundEnabled(nextSound);
                  tacticalAlertAudio.enabled = nextSound;
                  setToastMessage(nextSound ? "Tactical audio chime enabled" : "Tactical audio muted");
                  setTimeout(() => setToastMessage(null), 2000);
                }}
                className={`p-1.5 rounded-lg text-xs transition-colors border ${
                  isSoundEnabled
                    ? "text-cyan-300 bg-cyan-950/40 border-cyan-500/40"
                    : "text-slate-500 bg-slate-800/40 border-slate-700/40 hover:text-slate-300"
                }`}
                title={isSoundEnabled ? "Mute alert chime" : "Enable alert chime"}
              >
                {isSoundEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setShowAlertsDrawer(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Banner when notifications are paused */}
          {!isAlertsEnabled && (
            <div className="mx-2.5 mt-2.5 p-2 rounded-lg bg-amber-950/60 border border-amber-600/50 flex items-center justify-between gap-2 text-amber-200 text-[10px]">
              <div className="flex items-center gap-1.5">
                <BellOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Tactical notifications are <strong>TURNED OFF</strong>.</span>
              </div>
              <button
                onClick={() => {
                  setIsAlertsEnabled(true);
                  setToastMessage("🔔 Tactical Notifications: ON");
                  setTimeout(() => setToastMessage(null), 2000);
                }}
                className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[9px] shrink-0 transition-colors"
              >
                ENABLE
              </button>
            </div>
          )}

          {/* Quick Scenario Simulators */}
          <div className="p-2.5 bg-slate-950/70 border-b border-slate-800 flex flex-col gap-1.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              ON-DEMAND TACTICAL EVENT TRIGGERS:
            </span>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => handleTriggerScenario("high_press")}
                className="py-1 px-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-500/40 text-[9.5px] font-bold flex items-center justify-center gap-1 transition-all"
                title="Simulate 3-man high pressing trigger on ball carrier"
              >
                <Flame className="w-3 h-3 text-amber-400" />
                High-Press
              </button>
              <button
                onClick={() => handleTriggerScenario("line_break")}
                className="py-1 px-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/40 text-[9.5px] font-bold flex items-center justify-center gap-1 transition-all"
                title="Simulate penetrating runner breaking behind defensive line"
              >
                <ShieldAlert className="w-3 h-3 text-red-400" />
                Line Break
              </button>
              <button
                onClick={() => handleTriggerScenario("counter_attack")}
                className="py-1 px-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 text-[9.5px] font-bold flex items-center justify-center gap-1 transition-all"
                title="Simulate 3v2 transition overload counter-attack"
              >
                <TrendingUp className="w-3 h-3 text-cyan-400" />
                Counter (3v2)
              </button>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center border-b border-slate-800 bg-slate-950/40 p-1 gap-1 text-[10px]">
            {[
              { id: "all", label: `All (${alertHistory.length})` },
              { id: "high_press", label: "Press" },
              { id: "line_break", label: "Line Break" },
              { id: "counter_attack", label: "Counter" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setAlertFilter(tab.id as typeof alertFilter)}
                className={`flex-1 py-1 rounded text-center font-bold transition-all ${
                  alertFilter === tab.id
                    ? "bg-slate-800 text-cyan-300 shadow-sm border border-slate-700"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Event Stream History */}
          <div className="p-2.5 flex flex-col gap-2 overflow-y-auto max-h-[340px]">
            {alertHistory
              .filter((a) => alertFilter === "all" || a.category === alertFilter)
              .map((alert) => {
                const isSelected = selectedAlertId === alert.id;
                const isHighPress = alert.category === "high_press";
                const isLineBreak = alert.category === "line_break";

                return (
                  <div
                    key={alert.id}
                    onClick={() => handleFocusAlert(alert)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col gap-1.5 ${
                      isSelected
                        ? "bg-slate-950 border-cyan-400 shadow-md ring-1 ring-cyan-500/30"
                        : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isHighPress
                              ? "bg-amber-400"
                              : isLineBreak
                              ? "bg-red-400"
                              : "bg-cyan-400"
                          }`}
                        />
                        <span
                          className={`text-[9px] font-bold px-1 rounded uppercase ${
                            alert.severity === "critical"
                              ? "bg-red-950 text-red-400 border border-red-800"
                              : alert.severity === "warning"
                              ? "bg-amber-950 text-amber-400 border border-amber-800"
                              : "bg-cyan-950 text-cyan-400 border border-cyan-800"
                          }`}
                        >
                          {alert.category.replace("_", " ")}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">
                        {alert.timestamp}
                      </span>
                    </div>

                    <div className="font-bold text-white text-[11px] leading-tight">
                      {alert.title}
                    </div>

                    <div className="text-[10px] text-slate-400 leading-snug">
                      {alert.description}
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[9.5px] font-mono text-slate-300 bg-slate-900/60 p-1.5 rounded border border-slate-800/80">
                      {alert.metrics.closingSpeedKmh && (
                        <span>Speed: <strong>{alert.metrics.closingSpeedKmh} km/h</strong></span>
                      )}
                      {alert.metrics.pressingIntensityPct && (
                        <span>Intensity: <strong>{alert.metrics.pressingIntensityPct}%</strong></span>
                      )}
                      {alert.metrics.distanceToGoalM && (
                        <span>Goal Dist: <strong>{alert.metrics.distanceToGoalM}m</strong></span>
                      )}
                      {alert.metrics.numericalAdvantage && (
                        <span>Advantage: <strong>{alert.metrics.numericalAdvantage}</strong></span>
                      )}
                    </div>

                    {alert.coachDirectiveSuggestion && (
                      <div className="text-[9px] text-cyan-200/90 bg-cyan-950/40 p-1.5 rounded border border-cyan-800/40">
                        <span className="text-cyan-400 font-bold block mb-0.5">COACH DIRECTIVE:</span>
                        {alert.coachDirectiveSuggestion}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1 border-t border-slate-900">
                      <span>Players: {alert.primaryPlayerNames.join(", ")}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFocusAlert(alert);
                        }}
                        className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
                      >
                        <Eye className="w-2.5 h-2.5" /> Lock Camera
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SET-PIECE TACTICAL SCENARIO & TRAJECTORY DRAWER                        */}
      {/* ========================================================================= */}
      {showSetPieceDrawer && isSetPieceMode && (
        <div className="absolute top-14 left-4 z-40 w-96 max-h-[490px] bg-slate-900/95 backdrop-blur-md rounded-xl border border-amber-500/50 shadow-2xl flex flex-col font-mono text-xs overflow-hidden animate-in fade-in slide-in-from-top-2">
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800 bg-slate-950/80">
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  SET-PIECE TRAJECTORY & TARGET ANALYZER
                </div>
                <div className="text-[9px] text-slate-400">
                  Calculates Bézier flight curves & penalty box target zones
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowSetPieceDrawer(false)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3.5 flex flex-col gap-3 overflow-y-auto max-h-[430px]">
            {/* Situation Banner */}
            <div className="p-3 bg-amber-950/40 rounded-xl border border-amber-500/40 flex flex-col gap-1 text-amber-100">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-wider text-amber-300 font-bold">
                  {setPieceAnalysis.categoryLabel}
                </span>
                <span className="text-[10px] font-bold text-emerald-400">
                  {setPieceAnalysis.distanceToGoalM}m to Goal
                </span>
              </div>
              <div className="text-xs font-black text-white flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Taker: {setPieceAnalysis.primaryTaker}
              </div>
              <div className="text-[9px] text-slate-300 leading-snug mt-0.5">
                {setPieceAnalysis.tacticalInsight}
              </div>
            </div>

            {/* Quick Scenario Preset Selectors */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-400">SET-PIECE SCENARIOS:</span>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                {SET_PIECE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setSelectedSetPiecePresetId(preset.id);
                      setActiveSetPieceBall(null);
                      setActiveTrajectoryId(null);
                      setToastMessage(`Switched to ${preset.name}`);
                      setTimeout(() => setToastMessage(null), 2500);
                    }}
                    className={`p-1.5 rounded-lg border text-left transition-all ${
                      selectedSetPiecePresetId === preset.id && !activeSetPieceBall
                        ? "bg-amber-500/20 text-amber-300 border-amber-500 font-bold shadow-sm"
                        : "bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="truncate">{preset.name}</div>
                    <div className="text-[8.5px] text-slate-500">{preset.taker}</div>
                  </button>
                ))}

                <button
                  onClick={() => {
                    setActiveSetPieceBall(null);
                    setSelectedSetPiecePresetId("live");
                    setActiveTrajectoryId(null);
                    setToastMessage("Using live match ball coordinates for set-piece analysis");
                    setTimeout(() => setToastMessage(null), 2500);
                  }}
                  className={`p-1.5 rounded-lg border text-left transition-all ${
                    selectedSetPiecePresetId === "live"
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500 font-bold shadow-sm"
                      : "bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="truncate">Live Match Ball Position</div>
                  <div className="text-[8.5px] text-slate-500">
                    ({ball.x.toFixed(1)}m, {ball.y.toFixed(1)}m)
                  </div>
                </button>
              </div>
              <div className="text-[8.5px] text-slate-500">
                Tip: Hold Shift + Click anywhere near the box on pitch to place custom ball.
              </div>
            </div>

            {/* Candidate Delivery Trajectories List */}
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] font-bold text-slate-400 flex items-center justify-between">
                <span>DELIVERY TRAJECTORIES ({setPieceAnalysis.trajectories.length})</span>
                <span className="text-[9px] text-slate-500">Click to isolate flight path</span>
              </div>

              <div className="flex flex-col gap-1.5">
                {setPieceAnalysis.trajectories.map((traj) => {
                  const isSelected = activeTrajectoryId === traj.id;
                  return (
                    <div
                      key={traj.id}
                      onClick={() => setActiveTrajectoryId(isSelected ? null : traj.id)}
                      className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-slate-950 border-amber-400 shadow-sm"
                          : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: traj.color }} />
                        <div>
                          <div className="font-bold text-white text-[11px] flex items-center gap-1.5">
                            {traj.name}
                            <span className="text-[9px] px-1 py-0.2 bg-slate-900 rounded text-slate-400">
                              {traj.selectionProbabilityPct}% prob
                            </span>
                          </div>
                          <div className="text-[9px] text-slate-400 mt-0.5">{traj.description}</div>
                        </div>
                      </div>

                      <div className="text-right text-[10px]">
                        <div className="text-cyan-400 font-bold">{traj.exitSpeedKmh} km/h</div>
                        <div className="text-[9px] text-slate-500">{traj.flightTimeSec}s flight</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Target Zones Breakdown */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-400">PENALTY BOX TARGET ZONES:</span>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                {setPieceAnalysis.targetZones.map((zone) => (
                  <div
                    key={zone.id}
                    className="p-2 bg-slate-950/80 rounded-lg border border-slate-800 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-[10px]">{zone.code}</span>
                      <span
                        className={`text-[9px] font-bold px-1 rounded ${
                          zone.threatTier === "CRITICAL"
                            ? "bg-red-950 text-red-400 border border-red-800"
                            : "bg-blue-950 text-blue-400 border border-blue-800"
                        }`}
                      >
                        xG {zone.expectedGoalXG.toFixed(2)}
                      </span>
                    </div>

                    <div className="text-[9px] text-slate-400 leading-snug">
                      Target: <strong className="text-slate-200">{zone.primaryRunner}</strong>
                    </div>

                    <div className="text-[8.5px] text-slate-500 truncate">{zone.tacticalAction}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. 10-SECOND FORMATION ANALYSIS INTELLIGENCE DRAWER                       */}
      {/* ========================================================================= */}
      {showFormationDrawer && (
        <div className="absolute top-14 left-4 z-40 w-96 max-h-[460px] bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700/80 shadow-2xl flex flex-col font-mono text-xs overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800 bg-slate-950/80">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  10s ROLLING FORMATION ANALYZER
                </div>
                <div className="text-[9px] text-slate-400">
                  Time-weighted spatial clustering over last 10.0 seconds
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowFormationDrawer(false)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center border-b border-slate-800 bg-slate-950/50 p-1">
            <button
              onClick={() => setActiveFormationTeamTab(0)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeFormationTeamTab === 0
                  ? "bg-red-950/80 text-red-200 border border-red-500/50 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-500" />
              ARSENAL ({team0Formation?.formationLabel || "4-3-3"})
            </button>
            <button
              onClick={() => setActiveFormationTeamTab(1)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeFormationTeamTab === 1
                  ? "bg-sky-950/80 text-sky-200 border border-sky-500/50 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              MAN CITY ({team1Formation?.formationLabel || "4-2-3-1"})
            </button>
          </div>

          {(() => {
            const current = activeFormationTeamTab === 0 ? team0Formation : team1Formation;
            if (!current) return null;
            const isRed = activeFormationTeamTab === 0;

            return (
              <div className="p-3.5 flex flex-col gap-3 overflow-y-auto max-h-[380px]">
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    isRed
                      ? "bg-red-950/40 border-red-500/40 text-red-100"
                      : "bg-sky-950/40 border-sky-500/40 text-sky-100"
                  }`}
                >
                  <div>
                    <span className="text-[10px] text-slate-400 tracking-wider">DETECTED FORMATION</span>
                    <div className="text-2xl font-black tracking-tight">{current.formationLabel}</div>
                    <div className="text-[10px] font-semibold flex items-center gap-1 mt-0.5 text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Shape: {current.tacticalPhase} · Conf: {(current.confidence * 100).toFixed(0)}%
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <span className="text-[9px] text-slate-400">DEFENSIVE LINE</span>
                    <span className="text-base font-extrabold text-emerald-400">{current.defensiveLineM}m</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">from own goal</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">TEAM WIDTH</span>
                    <span className="text-white font-bold text-xs">{current.teamWidthM}m</span>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">TEAM LENGTH</span>
                    <span className="text-white font-bold text-xs">{current.teamLengthM}m</span>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">CENTROID</span>
                    <span className="text-cyan-400 font-bold text-xs">
                      {current.centroid.x}m, {current.centroid.y}m
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="text-[10px] font-bold text-slate-400 flex items-center justify-between">
                    <span>TACTICAL UNIT LINES (10s DEPTH CLUSTERS)</span>
                    <span className="text-slate-500">{current.lines.length} Units</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {current.lines.map((line, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                line.label === "DEF"
                                  ? "bg-blue-950 text-blue-400 border border-blue-800/50"
                                  : line.label === "DM"
                                  ? "bg-indigo-950 text-indigo-400 border border-indigo-800/50"
                                  : line.label === "MID"
                                  ? "bg-amber-950 text-amber-400 border border-amber-800/50"
                                  : "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                              }`}
                            >
                              {line.label} ({line.count})
                            </span>
                            <span className="text-slate-200 font-bold">{line.name}</span>
                          </div>

                          <span className="text-[10px] text-slate-400">Avg depth: {line.avgDepthM}m</span>
                        </div>

                        <div className="text-[10px] text-slate-400 flex items-center gap-1 flex-wrap">
                          {line.playerNames.map((name, pIdx) => (
                            <span
                              key={pIdx}
                              className="bg-slate-900 px-1.5 py-0.5 rounded text-slate-300 border border-slate-800"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. HOMOGRAPHY VERIFICATION INSPECTOR HUD PANEL (IF DEBUG IS ACTIVE)        */}
      {/* ========================================================================= */}
      {showHomographyDebug && (
        <div
          className={`absolute bottom-3 right-4 z-40 bg-slate-900/95 backdrop-blur-md rounded-xl border border-cyan-500/40 shadow-2xl transition-all flex flex-col ${
            isInspectorExpanded ? "w-84 max-h-[360px]" : "w-auto"
          }`}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-950/70 rounded-t-xl gap-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-[11px] font-mono font-bold text-slate-200 flex items-center gap-1.5">
                  HOMOGRAPHY ENGINE
                  <span
                    className={`text-[8px] font-bold px-1.5 py-0.2 rounded ${
                      calibrationResult.isCalibrated
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    }`}
                  >
                    {calibrationResult.isCalibrated ? "LOCKED" : "DRIFT"}
                  </span>
                </div>
                <div className="text-[9px] font-mono text-slate-400">
                  {calibrationResult.inlierCount}/{calibrationResult.totalMarkers} Touchline Markers Aligned
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsInspectorExpanded((prev) => !prev)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {isInspectorExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>

          {isInspectorExpanded && (
            <div className="p-3 flex flex-col gap-2.5 overflow-y-auto text-xs font-mono">
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setActiveInspectorTab("matrix")}
                  className={`flex-1 py-1 rounded text-[10px] font-bold text-center transition-colors ${
                    activeInspectorTab === "matrix" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  H (3×3) Matrix
                </button>
                <button
                  onClick={() => setActiveInspectorTab("markers")}
                  className={`flex-1 py-1 rounded text-[10px] font-bold text-center transition-colors ${
                    activeInspectorTab === "markers" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Markers ({markers.length})
                </button>
                <button
                  onClick={() => setActiveInspectorTab("residuals")}
                  className={`flex-1 py-1 rounded text-[10px] font-bold text-center transition-colors ${
                    activeInspectorTab === "residuals" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Residuals
                </button>
              </div>

              {activeInspectorTab === "matrix" && (
                <div className="flex flex-col gap-2">
                  <div className="text-[10px] text-slate-400 flex items-center justify-between">
                    <span>ESTIMATED HOMOGRAPHY TRANSFORM</span>
                    <span className="text-emerald-400 font-bold">
                      Q: {(calibrationResult.qualityScore * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex flex-col gap-1 text-[10px]">
                    {calibrationResult.homographyMatrix.map((row, rIdx) => (
                      <div key={rIdx} className="grid grid-cols-3 gap-1 font-mono text-center">
                        {row.map((val, cIdx) => (
                          <div
                            key={cIdx}
                            className={`p-1 rounded ${
                              rIdx === cIdx
                                ? "bg-cyan-950/60 text-cyan-300 font-bold border border-cyan-800/40"
                                : rIdx === 2
                                ? "bg-slate-900 text-slate-400 text-[9px]"
                                : "bg-slate-900/80 text-slate-300"
                            }`}
                          >
                            {val >= 0 ? `+${val.toFixed(4)}` : val.toFixed(4)}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800 flex flex-col">
                      <span className="text-slate-400 text-[9px]">MEAN ERROR</span>
                      <span className="text-emerald-400 font-bold">
                        {calibrationResult.meanReprojectionErrorM} m
                      </span>
                    </div>
                    <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800 flex flex-col">
                      <span className="text-slate-400 text-[9px]">MAX DEVIATION</span>
                      <span className="text-cyan-400 font-bold">
                        {calibrationResult.maxReprojectionErrorM} m
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activeInspectorTab === "markers" && (
                <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto pr-1">
                  {markers.map((m) => {
                    const isSelected = selectedMarkerId === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMarkerId(isSelected ? null : m.id)}
                        className={`p-1.5 rounded border cursor-pointer transition-colors flex items-center justify-between text-[10px] ${
                          isSelected
                            ? "bg-cyan-950 border-cyan-500 text-cyan-200"
                            : "bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              m.reprojectionErrorM < 0.45 ? "bg-emerald-400" : "bg-amber-400"
                            }`}
                          />
                          <div>
                            <div className="font-bold">{m.code}</div>
                            <div className="text-[8.5px] text-slate-400">
                              {m.truePitchX}m, {m.truePitchY}m
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div
                            className={`font-mono font-bold ${
                              m.reprojectionErrorM < 0.45 ? "text-emerald-400" : "text-amber-400"
                            }`}
                          >
                            Δ{m.reprojectionErrorM}m
                          </div>
                          <div className="text-[8.5px] text-slate-400">{(m.confidence * 100).toFixed(0)}% conf</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeInspectorTab === "residuals" && (
                <div className="flex flex-col gap-2 text-[10px]">
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>RANSAC Inliers:</span>
                      <span className="text-emerald-400 font-bold">
                        {calibrationResult.inlierCount} / {calibrationResult.totalMarkers} (100%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${(calibrationResult.inlierCount / calibrationResult.totalMarkers) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-1 border-t border-slate-800 flex items-center gap-1.5">
                <button
                  onClick={handleAutoCalibrate}
                  disabled={isCalibrating}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-colors shadow-sm"
                >
                  <Target className={`w-3 h-3 ${isCalibrating ? "animate-spin" : ""}`} />
                  Auto-Calibrate
                </button>

                <button
                  onClick={handleSimulateDrift}
                  className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-amber-950/70 text-amber-400 hover:text-amber-300 font-semibold text-[10px] flex items-center justify-center gap-1 transition-colors border border-amber-500/30"
                >
                  Drift Test
                </button>

                <button
                  onClick={handleResetCalibration}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mini Radar Pitch Navigator when Zoomed In */}
      {zoom > 1.0 && (
        <div className="absolute bottom-3 right-4 bg-slate-900/95 backdrop-blur border border-slate-700/80 p-1.5 rounded-lg shadow-xl pointer-events-none hidden sm:block z-10">
          <div className="relative w-20 h-12 bg-emerald-950/80 rounded border border-emerald-500/40 overflow-hidden flex items-center justify-center">
            <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-emerald-500/30" />
            <div className="w-3 h-3 rounded-full border border-emerald-500/30" />
            <div
              className="absolute border border-cyan-400 bg-cyan-400/20 rounded-[1px]"
              style={{
                width: `${Math.max(14, 80 / zoom)}px`,
                height: `${Math.max(10, 48 / zoom)}px`,
                transform: `translate(${
                  (-pan.x / (canvasRef.current ? canvasRef.current.width * 0.45 : 400)) * 20
                }px, ${(-pan.y / (canvasRef.current ? canvasRef.current.height * 0.45 : 300)) * 12}px)`,
              }}
            />
          </div>
          <div className="text-[9px] font-mono text-center text-cyan-400 font-bold mt-0.5">
            RADAR {(zoom * 100).toFixed(0)}%
          </div>
        </div>
      )}
    </div>
  );
};
