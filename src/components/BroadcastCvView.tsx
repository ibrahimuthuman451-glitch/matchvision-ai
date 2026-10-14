import React, { useEffect, useRef } from "react";
import { Player, Ball, BroadcastGraphic, CommercialSponsor, TelestrationAnnotation } from "../types/match";
import { pitchToBroadcastView } from "../services/matchSimulator";
import { Radio, AlertTriangle, Glasses, Camera, Shield, Zap } from "lucide-react";

interface BroadcastCvViewProps {
  players: Player[];
  ball: Ball;
  selectedPlayerId: number | null;
  onSelectPlayer: (id: number | null) => void;
  showBoxes: boolean;
  showPitchGrid: boolean;
  showTrackingBadges: boolean;
  activeGraphic?: BroadcastGraphic | null;
  isSpectaclesMode?: boolean;
  sponsor?: CommercialSponsor | null;
  cameraAngle?: "main" | "spidercam" | "boxcam" | "benchcam";
  onChangeCameraAngle?: (angle: "main" | "spidercam" | "boxcam" | "benchcam") => void;
  isCleanFeedMode?: boolean;
  telestrationAnnotations?: TelestrationAnnotation[];
}

export const BroadcastCvView: React.FC<BroadcastCvViewProps> = ({
  players,
  ball,
  selectedPlayerId,
  onSelectPlayer,
  showBoxes,
  showPitchGrid,
  showTrackingBadges,
  activeGraphic,
  isSpectaclesMode = false,
  sponsor = null,
  cameraAngle = "main",
  onChangeCameraAngle,
  isCleanFeedMode = false,
  telestrationAnnotations = [],
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Draw Broadcast Stadium Pitch Background
    // Pitch grass gradient
    const turfGrad = ctx.createLinearGradient(0, height * 0.2, 0, height);
    turfGrad.addColorStop(0, "#195029");
    turfGrad.addColorStop(0.5, "#154522");
    turfGrad.addColorStop(1, "#123c1e");
    ctx.fillStyle = turfGrad;
    ctx.fillRect(0, 0, width, height);

    // Stadium stands / crowd backdrop at top
    const standGrad = ctx.createLinearGradient(0, 0, 0, height * 0.25);
    standGrad.addColorStop(0, "#090d16");
    standGrad.addColorStop(0.7, "#111827");
    standGrad.addColorStop(1, "#195029");
    ctx.fillStyle = standGrad;
    ctx.fillRect(0, 0, width, height * 0.25);

    // Advertising boards band
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, height * 0.22, width, height * 0.03);

    // 2. Homography-Projected Pitch Markings
    if (showPitchGrid) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
      ctx.lineWidth = 2.0;

      // Project key pitch landmarks
      const pTL = pitchToBroadcastView(-52.5, -34.0, width, height);
      const pTR = pitchToBroadcastView(52.5, -34.0, width, height);
      const pBR = pitchToBroadcastView(52.5, 34.0, width, height);
      const pBL = pitchToBroadcastView(-52.5, 34.0, width, height);

      // Pitch perimeter trapezoid
      ctx.beginPath();
      ctx.moveTo(pTL.x, pTL.y);
      ctx.lineTo(pTR.x, pTR.y);
      ctx.lineTo(pBR.x, pBR.y);
      ctx.lineTo(pBL.x, pBL.y);
      ctx.closePath();
      ctx.stroke();

      // Halfway line
      const pHalfTop = pitchToBroadcastView(0, -34.0, width, height);
      const pHalfBottom = pitchToBroadcastView(0, 34.0, width, height);
      ctx.beginPath();
      ctx.moveTo(pHalfTop.x, pHalfTop.y);
      ctx.lineTo(pHalfBottom.x, pHalfBottom.y);
      ctx.stroke();

      // Center Circle
      ctx.beginPath();
      const pCenter = pitchToBroadcastView(0, 0, width, height);
      ctx.ellipse(
        pCenter.x,
        pCenter.y,
        9.15 * pCenter.scale * 9,
        9.15 * pCenter.scale * 3.5,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();

      // Penalty Box Left
      const pPenLT = pitchToBroadcastView(-36.0, -20.16, width, height);
      const pPenLB = pitchToBroadcastView(-36.0, 20.16, width, height);
      const pGoalLT = pitchToBroadcastView(-52.5, -20.16, width, height);
      const pGoalLB = pitchToBroadcastView(-52.5, 20.16, width, height);
      ctx.beginPath();
      ctx.moveTo(pGoalLT.x, pGoalLT.y);
      ctx.lineTo(pPenLT.x, pPenLT.y);
      ctx.lineTo(pPenLB.x, pPenLB.y);
      ctx.lineTo(pGoalLB.x, pGoalLB.y);
      ctx.stroke();

      // Penalty Box Right
      const pPenRT = pitchToBroadcastView(36.0, -20.16, width, height);
      const pPenRB = pitchToBroadcastView(36.0, 20.16, width, height);
      const pGoalRT = pitchToBroadcastView(52.5, -20.16, width, height);
      const pGoalRB = pitchToBroadcastView(52.5, 20.16, width, height);
      ctx.beginPath();
      ctx.moveTo(pGoalRT.x, pGoalRT.y);
      ctx.lineTo(pPenRT.x, pPenRT.y);
      ctx.lineTo(pPenRB.x, pPenRB.y);
      ctx.lineTo(pGoalRB.x, pGoalRB.y);
      ctx.stroke();

      ctx.restore();
    }

    // Sort players by perspective depth (y_m) so nearer players render in front
    const sortedPlayers = [...players].sort((a, b) => a.y - b.y);

    // 3. Render Players with CV Bounding Boxes & Badges
    sortedPlayers.forEach((p) => {
      const proj = pitchToBroadcastView(p.x, p.y, width, height);
      const scale = proj.scale;
      const isSelected = p.id === selectedPlayerId;

      // Simulated 2D bounding box
      const boxW = 28 * scale;
      const boxH = 58 * scale;
      const boxX = proj.x - boxW / 2;
      const boxY = proj.y - boxH;

      // Color scheme
      let col = "#ef4444"; // Team A Red
      if (p.teamId === 1) col = "#38bdf8"; // Team B Sky Blue
      else if (p.teamId === 2) col = "#eab308"; // Ref
      if (p.role === "GK") col = p.teamId === 0 ? "#22c55e" : "#f97316";

      // Player Figure Silhouette
      ctx.save();
      // Drop shadow on grass
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.beginPath();
      ctx.ellipse(proj.x, proj.y, 10 * scale, 4 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = "#fbcfe8";
      ctx.beginPath();
      ctx.arc(proj.x, boxY + 8 * scale, 6 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Torso Jersey
      ctx.fillStyle = col;
      ctx.fillRect(proj.x - 7 * scale, boxY + 14 * scale, 14 * scale, 22 * scale);

      // Shorts
      ctx.fillStyle = p.teamId === 0 ? "#ffffff" : "#0f172a";
      ctx.fillRect(proj.x - 6 * scale, boxY + 36 * scale, 12 * scale, 10 * scale);

      // Socks & boots
      ctx.fillStyle = col;
      ctx.fillRect(proj.x - 5 * scale, boxY + 46 * scale, 4 * scale, 12 * scale);
      ctx.fillRect(proj.x + 1 * scale, boxY + 46 * scale, 4 * scale, 12 * scale);

      // Ground Contact Foot Point (Calibrated point)
      ctx.fillStyle = "#00ffff";
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 3, 0, Math.PI * 2);
      ctx.fill();

      // YOLO Bounding Box
      if (showBoxes) {
        ctx.strokeStyle = isSelected ? "#00ffff" : col;
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Corner accents
        const cornerLen = 5 * scale;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.0;

        // Top-left
        ctx.beginPath();
        ctx.moveTo(boxX, boxY + cornerLen);
        ctx.lineTo(boxX, boxY);
        ctx.lineTo(boxX + cornerLen, boxY);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(boxX + boxW, boxY + boxH - cornerLen);
        ctx.lineTo(boxX + boxW, boxY + boxH);
        ctx.lineTo(boxX + boxW - cornerLen, boxY + boxH);
        ctx.stroke();
      }

      // Tracking ID Badge
      if (showTrackingBadges) {
        const badgeTxt = `#${p.trackId} ${p.name.split(" ")[0]} (${p.speedKmh.toFixed(0)}kph)`;
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.fillRect(boxX - 6, boxY - 16, Math.max(72, badgeTxt.length * 6), 14);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px monospace";
        ctx.fillText(badgeTxt, boxX - 3, boxY - 5);
      }

      ctx.restore();
    });

    // 4. Render Ball
    const ballProj = pitchToBroadcastView(ball.x, ball.y, width, height);
    const bScale = ballProj.scale;
    const ballScreenY = ballProj.y - ball.z * 18 * bScale;

    ctx.save();
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.ellipse(ballProj.x, ballProj.y, 5 * bScale, 2.5 * bScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ball
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(ballProj.x, ballScreenY, 4.5 * bScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ball Bounding Box & Conf
    if (showBoxes) {
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 1.5;
      const bBoxR = 8 * bScale;
      ctx.strokeRect(ballProj.x - bBoxR, ballScreenY - bBoxR, bBoxR * 2, bBoxR * 2);

      ctx.fillStyle = "#f97316";
      ctx.font = "bold 9px monospace";
      ctx.fillText(`ball 0.91`, ballProj.x + bBoxR + 2, ballScreenY);
    }
    ctx.restore();

    // 5. Render Projected Telestration Annotations
    if (telestrationAnnotations && telestrationAnnotations.length > 0) {
      ctx.save();
      telestrationAnnotations.forEach((ann) => {
        if (ann.type === "spotlight" && ann.points[0]) {
          const pt = pitchToBroadcastView(ann.points[0].x, ann.points[0].y, width, height);
          ctx.save();
          ctx.fillStyle = `${ann.color}35`;
          ctx.strokeStyle = ann.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(pt.x, pt.y, (ann.radius || 4.5) * pt.scale * 10, (ann.radius || 4.5) * pt.scale * 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          if (ann.label) {
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 11px monospace";
            ctx.fillText(ann.label, pt.x - 25, pt.y - (ann.radius || 4.5) * pt.scale * 4 - 6);
          }
          ctx.restore();
        } else if ((ann.type === "pass_arrow" || ann.type === "run_vector") && ann.points.length >= 2) {
          const p1 = pitchToBroadcastView(ann.points[0].x, ann.points[0].y, width, height);
          const p2 = pitchToBroadcastView(ann.points[1].x, ann.points[1].y, width, height);

          ctx.save();
          ctx.strokeStyle = ann.color;
          ctx.lineWidth = 3.0;
          if (ann.type === "run_vector") {
            ctx.setLineDash([6, 4]);
          }
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();

          // Arrowhead
          const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
          const headLen = 14;
          ctx.fillStyle = ann.color;
          ctx.beginPath();
          ctx.moveTo(p2.x, p2.y);
          ctx.lineTo(p2.x - headLen * Math.cos(angle - Math.PI / 6), p2.y - headLen * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(p2.x - headLen * Math.cos(angle + Math.PI / 6), p2.y - headLen * Math.sin(angle + Math.PI / 6));
          ctx.closePath();
          ctx.fill();

          if (ann.label) {
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 10px monospace";
            ctx.fillText(ann.label, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - 8);
          }
          ctx.restore();
        } else if (ann.type === "offside_plane" && ann.points[0]) {
          const depthPitchX = ann.points[0].x;
          const topEdge = pitchToBroadcastView(depthPitchX, -34, width, height);
          const botEdge = pitchToBroadcastView(depthPitchX, 34, width, height);

          ctx.save();
          ctx.strokeStyle = ann.color;
          ctx.lineWidth = 2.5;
          ctx.setLineDash([4, 2]);
          ctx.beginPath();
          ctx.moveTo(topEdge.x, topEdge.y);
          ctx.lineTo(botEdge.x, botEdge.y);
          ctx.stroke();

          ctx.fillStyle = ann.color;
          ctx.font = "bold 11px monospace";
          ctx.fillText(`OFFSIDE LINE (${Math.abs(depthPitchX).toFixed(1)}m)`, (topEdge.x + botEdge.x) / 2 - 40, (topEdge.y + botEdge.y) / 2);
          ctx.restore();
        } else if (ann.type === "cover_zone" && ann.points[0]) {
          const pt = pitchToBroadcastView(ann.points[0].x, ann.points[0].y, width, height);
          ctx.save();
          ctx.fillStyle = `${ann.color}28`;
          ctx.strokeStyle = ann.color;
          ctx.lineWidth = 2.0;
          ctx.strokeRect(pt.x - 40, pt.y - 25, 80, 50);
          ctx.fillRect(pt.x - 40, pt.y - 25, 80, 50);
          if (ann.label) {
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 10px monospace";
            ctx.fillText(ann.label, pt.x - 35, pt.y - 30);
          }
          ctx.restore();
        }
      });
      ctx.restore();
    }
  }, [players, ball, selectedPlayerId, showBoxes, showPitchGrid, showTrackingBadges, telestrationAnnotations, cameraAngle]);

  return (
    <div className="relative w-full aspect-[16/9] max-h-[640px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Clean SDI Title Safe Guides if isCleanFeedMode */}
      {isCleanFeedMode && (
        <div className="absolute inset-8 pointer-events-none border border-dashed border-red-500/40 rounded flex flex-col justify-between p-2">
          <div className="flex justify-between text-[9px] font-mono text-red-400 font-bold">
            <span>SDI 1080p59.94 CLEAN BROADCAST OUTPUT</span>
            <span>TITLE SAFE 90%</span>
          </div>
          <div className="flex justify-between text-[9px] font-mono text-red-400">
            <span>MATCHVISION BROADCAST ENGINE</span>
            <span>PROGRAM OUT</span>
          </div>
        </div>
      )}

      {/* Camera Angle Selector Bar */}
      {onChangeCameraAngle && !isCleanFeedMode && (
        <div className="absolute bottom-3 left-4 flex items-center gap-1 bg-slate-950/85 backdrop-blur px-2 py-1 rounded-lg border border-slate-800 z-30">
          <span className="text-[10px] font-mono text-slate-400 uppercase mr-1 flex items-center gap-1">
            <Camera className="w-3 h-3 text-cyan-400" /> CAM:
          </span>
          {[
            { id: "main", label: "Main 16:9" },
            { id: "spidercam", label: "SpiderCam 105m" },
            { id: "boxcam", label: "18-Yard Box" },
            { id: "benchcam", label: "Dugout / Bench" },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => onChangeCameraAngle(c.id as any)}
              className={`px-2 py-0.5 text-[10px] rounded font-semibold transition-colors ${
                cameraAngle === c.id
                  ? "bg-cyan-600 text-white font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Spectacles AR Glasses Vignette & Optics Frame if in Spectacles Mode */}
      {isSpectaclesMode && (
        <div className="absolute inset-0 pointer-events-none rounded-xl border-4 border-purple-500/40 shadow-inner bg-gradient-to-b from-purple-950/15 via-transparent to-purple-950/25">
          {/* Top AR Spectacles Telemetry */}
          <div className="absolute top-3 left-4 right-4 flex items-center justify-between text-[10px] font-mono text-purple-300 bg-slate-950/80 backdrop-blur px-3 py-1.5 rounded-lg border border-purple-500/40 shadow-lg">
            <div className="flex items-center gap-2">
              <Glasses className="w-4 h-4 text-purple-400 animate-pulse" />
              <span className="font-bold tracking-wider">SPECTACLES VISION AR-4 PRO</span>
              <span className="text-slate-500">|</span>
              <span className="text-cyan-400">8K RETINAL MicroOLED</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 font-bold">120 FPS · 8ms AR LATENCY</span>
              <span className="text-slate-500">|</span>
              <span className="text-amber-400">BATTERY: 94%</span>
            </div>
          </div>

          {/* AR Crosshairs overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 border border-cyan-400/30 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-cyan-400/60 rounded-full animate-ping" />
            </div>
          </div>
        </div>
      )}

      {/* Commercial Sponsor Bug in Top Right */}
      {sponsor && (
        <div
          className="absolute top-3 right-4 flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-xl backdrop-blur-md border animate-in fade-in duration-300"
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.92)",
            borderColor: sponsor.accentColor,
            boxShadow: `0 0 16px ${sponsor.accentColor}35`,
          }}
        >
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: sponsor.accentColor }}
          />
          <div>
            <div className="text-[10px] font-mono font-black uppercase tracking-wider text-white flex items-center gap-1.5">
              <span>{sponsor.badgeText}</span>
            </div>
            <div className="text-[8px] font-mono text-slate-300">
              {sponsor.tagline}
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Feed Telemetry Badge */}
      {!isSpectaclesMode && !isCleanFeedMode && (
        <div className="absolute top-3 left-4 flex items-center gap-3 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700/60 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-bold text-red-400 font-mono">LIVE FEED</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-[11px] font-mono text-emerald-400">
            HOMOGRAPHY: CALIBRATED (RANSAC 0.96)
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-[11px] font-mono text-slate-300">YOLOv8m · 29.8 FPS</span>
        </div>
      )}

      {/* ON AIR Indicator Badge */}
      {activeGraphic && activeGraphic.isOnAir && !sponsor && (
        <div className="absolute top-3 right-4 flex items-center gap-2 bg-red-600/90 backdrop-blur px-3 py-1 rounded-md text-white font-mono text-xs font-extrabold shadow-lg animate-pulse">
          <Radio className="w-3.5 h-3.5" />
          ON AIR GRAPHIC
        </div>
      )}

      {/* Dynamic Live On-Screen Graphic Overlay (Controlled from Broadcast Room) */}
      {activeGraphic && activeGraphic.isOnAir && (
        <div className="absolute bottom-6 left-6 right-6 flex flex-col items-center pointer-events-none transition-all duration-300">
          {activeGraphic.type === "live_ticker" ? (
            // Full Width Live Ticker Bar
            <div className="w-full bg-slate-950/95 backdrop-blur-md border border-slate-700 rounded-lg p-2.5 shadow-2xl overflow-hidden flex items-center gap-3">
              <div
                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase shrink-0"
                style={{ backgroundColor: activeGraphic.accentColor, color: "#020617" }}
              >
                {activeGraphic.badgeText || "LIVE CRAWL"}
              </div>
              <div className="text-xs font-mono text-slate-200 truncate flex-1 animate-pulse">
                {activeGraphic.tickerText || `${activeGraphic.title} — ${activeGraphic.subtitle}`}
              </div>
            </div>
          ) : activeGraphic.type === "spectacles_hud" ? (
            <div
              className="w-full max-w-lg bg-slate-950/92 backdrop-blur-md rounded-xl p-3.5 shadow-2xl animate-in fade-in slide-in-from-bottom-2 border"
              style={{
                borderColor: activeGraphic.accentColor || "#8b5cf6",
                boxShadow: `0 0 25px ${activeGraphic.accentColor || "#8b5cf6"}40`,
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Glasses className="w-4 h-4 animate-pulse" style={{ color: activeGraphic.accentColor }} />
                  <span
                    className="text-[10px] font-mono font-extrabold tracking-widest uppercase"
                    style={{ color: activeGraphic.accentColor }}
                  >
                    {activeGraphic.badgeText || "SPECTACLES TV FEED"}
                  </span>
                </div>
                <span className="text-[9px] font-mono text-slate-400">
                  {activeGraphic.timestamp} · AR DISPLAY
                </span>
              </div>
              <h4 className="text-sm font-extrabold text-white tracking-wide">
                {activeGraphic.title}
              </h4>
              <p className="text-xs text-slate-200 mt-0.5 leading-snug">{activeGraphic.subtitle}</p>
            </div>
          ) : activeGraphic.type === "breaking_alert" ? (
            <div className="w-full max-w-xl bg-red-950/95 backdrop-blur-md border-l-4 border-l-red-500 border border-red-800/80 rounded-r-xl p-3.5 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 mb-0.5">
                <AlertTriangle className="w-4 h-4 text-red-400 animate-bounce" />
                <span className="text-[10px] font-mono font-black text-red-400 uppercase tracking-widest">
                  {activeGraphic.badgeText || "VAR CHECK / INCIDENT"}
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-extrabold text-white">
                {activeGraphic.title}
              </h4>
              <p className="text-xs text-red-200 mt-0.5">{activeGraphic.subtitle}</p>
            </div>
          ) : (
            <div
              className="w-full max-w-2xl backdrop-blur-md rounded-xl p-3.5 shadow-2xl border transition-all animate-in fade-in slide-in-from-bottom-3"
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.94)",
                borderLeftColor: activeGraphic.accentColor,
                borderLeftWidth: "6px",
                borderColor: "rgba(51, 65, 85, 0.7)",
              }}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span
                  className="text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: `${activeGraphic.accentColor}25`,
                    color: activeGraphic.accentColor,
                  }}
                >
                  {activeGraphic.badgeText || "MATCHVISION TELEVISION"}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {activeGraphic.timestamp}
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                {activeGraphic.title}
              </h4>
              <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                {activeGraphic.subtitle}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
