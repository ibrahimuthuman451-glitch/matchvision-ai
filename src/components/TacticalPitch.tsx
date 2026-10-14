import React, { useState, useEffect, useRef } from "react";
import { Player, Ball, TacticalOverlaysConfig } from "../types/match";
import { ZoomIn, ZoomOut, RotateCcw, Move } from "lucide-react";

interface TacticalPitchProps {
  players: Player[];
  ball: Ball;
  selectedPlayerId: number | null;
  onSelectPlayer: (id: number | null) => void;
  overlays: TacticalOverlaysConfig;
}

export const TacticalPitch: React.FC<TacticalPitchProps> = ({
  players,
  ball,
  selectedPlayerId,
  onSelectPlayer,
  overlays,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Zoom and Pan state for interactive tactical inspection
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasDraggedRef = useRef<boolean>(false);

  // Pitch standard dimensions: 105m x 68m
  const PITCH_L = 105.0;
  const PITCH_W = 68.0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Coordinate Transform: pitch (x: [-52.5, 52.5], y: [-34, 34]) -> Canvas pixels
      const padX = width * 0.04;
      const padY = height * 0.05;
      const pitchDrawW = width - padX * 2;
      const pitchDrawH = height - padY * 2;

      const toScreenX = (x_m: number) => padX + ((x_m + 52.5) / PITCH_L) * pitchDrawW;
      const toScreenY = (y_m: number) => padY + ((y_m + 34.0) / PITCH_W) * pitchDrawH;
      const scaleM = pitchDrawW / PITCH_L;

      // Clear canvas with deep dark grass backdrop
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#0a1f12";
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      // Apply zoom & pan transformation centered at canvas midpoint
      ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-width / 2, -height / 2);

      // 1. Draw Pitch Turf with mowing stripes
      ctx.fillStyle = "#144122"; // Rich football turf green
      ctx.fillRect(padX, padY, pitchDrawW, pitchDrawH);

      const stripes = 15;
      const stripeW = pitchDrawW / stripes;
      for (let i = 0; i < stripes; i++) {
        ctx.fillStyle = i % 2 === 0 ? "#174b27" : "#144323";
        ctx.fillRect(padX + i * stripeW, padY, stripeW, pitchDrawH);
      }

      // Outer Pitch Border & Grass Surround
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 2.0;
      ctx.strokeRect(padX, padY, pitchDrawW, pitchDrawH);

      // 2. Tactical Pitch Zones (5 Vertical Corridors & 3 Horizontal Thirds)
      if (overlays.pitchZones) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
        ctx.lineWidth = 1.0;

        // Thirds (Defensive: -17.5m, Attacking: +17.5m)
        const thirdX1 = toScreenX(-17.5);
        const thirdX2 = toScreenX(17.5);
        ctx.beginPath();
        ctx.moveTo(thirdX1, padY);
        ctx.lineTo(thirdX1, padY + pitchDrawH);
        ctx.moveTo(thirdX2, padY);
        ctx.lineTo(thirdX2, padY + pitchDrawH);
        ctx.stroke();

        // 5 Vertical Channels: Left Wing (-20.16m), Left Half-space (-9.15m), Center, Right Half-space (+9.15m), Right Wing (+20.16m)
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

        // Zone text labels
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "10px sans-serif";
        ctx.fillText("DEFENSIVE THIRD", toScreenX(-35), padY + 16);
        ctx.fillText("MIDDLE THIRD", toScreenX(-6), padY + 16);
        ctx.fillText("FINAL THIRD", toScreenX(24), padY + 16);

        ctx.restore();
      }

      // 3. Pitch Markings (Halfway line, Center Circle, Boxes, Spots)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 1.8;

      // Halfway line
      const midX = toScreenX(0);
      ctx.beginPath();
      ctx.moveTo(midX, padY);
      ctx.lineTo(midX, padY + pitchDrawH);
      ctx.stroke();

      // Center Circle (r = 9.15m) & Center Spot
      const midY = toScreenY(0);
      ctx.beginPath();
      ctx.arc(midX, midY, 9.15 * scaleM, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(midX, midY, 2.8, 0, Math.PI * 2);
      ctx.fill();

      // Left Penalty Area (-52.5m to -36.0m, width 40.32m: [-20.16, +20.16])
      const leftPenX = toScreenX(-52.5);
      const penBoxW = 16.5 * scaleM;
      const penBoxH = 40.32 * scaleM;
      const leftPenY = toScreenY(-20.16);
      ctx.strokeRect(leftPenX, leftPenY, penBoxW, penBoxH);

      // Left Goal Box (5.5m x 18.32m)
      const leftGoalBoxW = 5.5 * scaleM;
      const leftGoalBoxH = 18.32 * scaleM;
      ctx.strokeRect(leftPenX, toScreenY(-9.16), leftGoalBoxW, leftGoalBoxH);

      // Left Penalty Spot (-41.5m)
      ctx.beginPath();
      ctx.arc(toScreenX(-41.5), midY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Left Penalty D Arc
      ctx.beginPath();
      ctx.arc(toScreenX(-41.5), midY, 9.15 * scaleM, -0.92, 0.92);
      ctx.stroke();

      // Right Penalty Area (+36.0m to +52.5m)
      const rightPenX = toScreenX(36.0);
      ctx.strokeRect(rightPenX, leftPenY, penBoxW, penBoxH);

      // Right Goal Box
      ctx.strokeRect(toScreenX(47.0), toScreenY(-9.16), leftGoalBoxW, leftGoalBoxH);

      // Right Penalty Spot (+41.5m)
      ctx.beginPath();
      ctx.arc(toScreenX(41.5), midY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Right Penalty D Arc
      ctx.beginPath();
      ctx.arc(toScreenX(41.5), midY, 9.15 * scaleM, Math.PI - 0.92, Math.PI + 0.92);
      ctx.stroke();

      // Goals (left and right outer frames, 7.32m width)
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.strokeRect(toScreenX(-54.5), toScreenY(-3.66), 2.0 * scaleM, 7.32 * scaleM);
      ctx.strokeRect(toScreenX(52.5), toScreenY(-3.66), 2.0 * scaleM, 7.32 * scaleM);

      // Corner Arcs (r = 1.0m)
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

      // 4. Voronoi Pitch Control Overlay
      if (overlays.voronoi) {
        ctx.save();
        // Render discrete pitch control raster grid
        const cellStep = 18;
        for (let gx = padX; gx < padX + pitchDrawW; gx += cellStep) {
          for (let gy = padY; gy < padY + pitchDrawH; gy += cellStep) {
            let closestDist = Infinity;
            let closestTeam = -1;

            players.forEach((p) => {
              if (p.teamId === 2) return; // ignore referee
              const px = toScreenX(p.x);
              const py = toScreenY(p.y);
              const d = Math.hypot(gx - px, gy - py);
              if (d < closestDist) {
                closestDist = d;
                closestTeam = p.teamId;
              }
            });

            if (closestTeam === 0) {
              ctx.fillStyle = "rgba(239, 68, 68, 0.12)"; // Arsenal Red
              ctx.fillRect(gx, gy, cellStep, cellStep);
            } else if (closestTeam === 1) {
              ctx.fillStyle = "rgba(56, 189, 248, 0.12)"; // City Sky Blue
              ctx.fillRect(gx, gy, cellStep, cellStep);
            }
          }
        }
        ctx.restore();
      }

      // 5. Team Convex Hull Formations
      if (overlays.convexHulls) {
        [0, 1].forEach((tId) => {
          const tPlayers = players.filter((p) => p.teamId === tId && p.role !== "GK");
          if (tPlayers.length >= 3) {
            ctx.save();
            ctx.beginPath();
            // Sort by angle around centroid for convex polygon perimeter
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

            ctx.fillStyle = tId === 0 ? "rgba(239, 68, 68, 0.18)" : "rgba(56, 189, 248, 0.18)";
            ctx.strokeStyle = tId === 0 ? "rgba(239, 68, 68, 0.75)" : "rgba(56, 189, 248, 0.75)";
            ctx.lineWidth = 1.5;
            ctx.fill();
            ctx.stroke();

            // Centroid Crosshair
            const cx = toScreenX(meanX);
            const cy = toScreenY(meanY);
            ctx.strokeStyle = tId === 0 ? "#ef4444" : "#38bdf8";
            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
          }
        });
      }

      // 6. Defensive Line Height Line
      if (overlays.defensiveLines) {
        ctx.save();
        // Team 0 Defensive Line (defends left goal -52.5m)
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

        // Team 1 Defensive Line (defends right goal +52.5m)
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

      // 7. Dynamic Passing Network Links
      if (overlays.passNetwork) {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
        ctx.lineWidth = 1.5;
        // Key established passing channels (e.g. Saliba -> Rice -> Odegaard -> Saka)
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

      // 8. Player Movement Trails
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

      // 9. Render Players
      players.forEach((p) => {
        const sx = toScreenX(p.x);
        const sy = toScreenY(p.y);
        const isSelected = p.id === selectedPlayerId;
        const radius = isSelected ? 11 : 9;

        // Selection Target Ring
        if (isSelected) {
          ctx.save();
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 3.0;
          ctx.beginPath();
          ctx.arc(sx, sy, radius + 6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Velocity vector arrow
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

        // Player Circle Marker
        ctx.save();
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);

        if (p.teamId === 0) {
          // Team A Red
          ctx.fillStyle = p.role === "GK" ? "#16a34a" : "#dc2626";
          ctx.strokeStyle = "#ffffff";
        } else if (p.teamId === 1) {
          // Team B Sky Blue
          ctx.fillStyle = p.role === "GK" ? "#ea580c" : "#38bdf8";
          ctx.strokeStyle = "#0f172a";
        } else {
          // Referee Yellow
          ctx.fillStyle = "#eab308";
          ctx.strokeStyle = "#000000";
        }

        ctx.lineWidth = 1.8;
        ctx.fill();
        ctx.stroke();

        // Jersey Number inside circle
        ctx.fillStyle = p.teamId === 1 && p.role !== "GK" ? "#0f172a" : "#ffffff";
        ctx.font = `bold ${isSelected ? "10px" : "8px"} sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.role === "REF" ? "R" : String(p.number), sx, sy);

        // Player Label Badge
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
      const bx = toScreenX(ball.x);
      const by = toScreenY(ball.y);

      // Ball Possession Halo
      ctx.save();
      ctx.beginPath();
      ctx.arc(bx, by, 10, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(249, 115, 22, 0.25)";
      ctx.fill();

      // Ball Shadow (if elevated)
      if (ball.z > 0.2) {
        ctx.beginPath();
        ctx.arc(bx, by + ball.z * 3, 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.fill();
      }

      // Ball sphere
      ctx.beginPath();
      ctx.arc(bx, by - ball.z * 2.5, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1.2;
      ctx.fill();
      ctx.stroke();

      // Ball velocity trail
      if (ball.speedKmh > 10.0) {
        ctx.fillStyle = "#f97316";
        ctx.font = "9px sans-serif";
        ctx.fillText(`${ball.speedKmh.toFixed(0)} km/h`, bx + 8, by - 6);
      }
      ctx.restore(); // Restore ball/sub-draw context
      ctx.restore(); // Restore zoom & pan transformation matrix
    };

    render();

    // 1. Mouse wheel listener for smooth cursor-anchored tactical pitch zooming
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      // Smooth zoom factor depending on wheel delta
      const delta = e.deltaY;
      const factor = delta < 0 ? 1.14 : 0.88;

      setZoom((prevZoom) => {
        const nextZoom = Math.min(4.5, Math.max(1.0, parseFloat((prevZoom * factor).toFixed(2))));
        if (nextZoom === 1.0) {
          setPan({ x: 0, y: 0 });
        } else {
          // Zoom towards cursor position
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

    // 2. Drag to pan when pitch is zoomed in
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      hasDraggedRef.current = false;
      dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    };

    const handleMouseMove = (e: MouseEvent) => {
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
      isDraggingRef.current = false;
    };

    const handleDoubleClick = () => {
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
    };

    // 3. Canvas click detection (inverted for zoom & pan for pinpoint accuracy)
    const handleClick = (e: MouseEvent) => {
      if (hasDraggedRef.current) {
        hasDraggedRef.current = false;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const rawX = (e.clientX - rect.left) * scaleX;
      const rawY = (e.clientY - rect.top) * scaleY;

      // Invert zoom and pan to retrieve unzoomed canvas pitch coordinates
      const clickX = (rawX - (canvas.width / 2 + pan.x)) / zoom + canvas.width / 2;
      const clickY = (rawY - (canvas.height / 2 + pan.y)) / zoom + canvas.height / 2;

      const padX = canvas.width * 0.04;
      const padY = canvas.height * 0.05;
      const pitchDrawW = canvas.width - padX * 2;
      const pitchDrawH = canvas.height - padY * 2;

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

    // Attach wheel listener to both canvas and outer wrapper for seamless scroll detection
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
  }, [players, ball, selectedPlayerId, overlays, zoom, pan]);

  // Sector jump helper
  const jumpToSector = (targetPanX: number, targetPanY: number, targetZoom: number) => {
    setZoom(targetZoom);
    setPan({ x: targetPanX, y: targetPanY });
  };

  return (
    <div
      className="relative w-full aspect-[105/68] max-h-[640px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center select-none"
    >
      <canvas
        ref={canvasRef}
        width={1050}
        height={680}
        className={`w-full h-full object-contain ${zoom > 1.0 ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"}`}
      />
      {/* Tactical HUD Watermark */}
      <div className="absolute top-3 left-4 pointer-events-none flex items-center gap-2 bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded-md border border-slate-700/50">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[11px] font-mono tracking-wide text-slate-200">
          2D TACTICAL ENGINE · FIFA 105×68m
        </span>
      </div>

      {/* Interactive Zoom & Navigation Controls HUD */}
      <div className="absolute top-3 right-4 flex items-center gap-1.5 bg-slate-900/95 backdrop-blur px-2.5 py-1 rounded-lg border border-slate-700/70 shadow-2xl">
        {/* Preset quick zoom pills */}
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
          title="Zoom In (or spin mouse wheel up)"
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
          title="Zoom Out (or spin mouse wheel down)"
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
            title="Reset Zoom to 100% (or double-click canvas)"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      {/* Sector Quick Jump Pills (bottom-left) */}
      <div className="absolute bottom-3 left-4 hidden md:flex items-center gap-1 bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded-lg border border-slate-700/50 text-[10px] font-mono">
        <span className="text-slate-400 mr-1">SECTOR JUMP:</span>
        <button
          onClick={() => jumpToSector(0, 0, 1.0)}
          className={`px-1.5 py-0.5 rounded hover:bg-slate-800 ${zoom === 1.0 ? "text-cyan-400 font-bold" : "text-slate-300"}`}
        >
          Full
        </button>
        <button
          onClick={() => jumpToSector(300, 0, 2.2)}
          className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-300"
          title="City Penalty Box"
        >
          Man City Box
        </button>
        <button
          onClick={() => jumpToSector(0, 0, 2.2)}
          className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-300"
          title="Center Pitch Battle"
        >
          Midfield
        </button>
        <button
          onClick={() => jumpToSector(-300, 0, 2.2)}
          className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-300"
          title="Arsenal Penalty Box"
        >
          Arsenal Box
        </button>
      </div>

      {/* Zoom Interaction Tip Banner */}
      {zoom > 1.0 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur px-3 py-1 rounded-full border border-slate-700/60 flex items-center gap-2 text-[10px] text-slate-300 pointer-events-none font-mono shadow-lg">
          <Move className="w-3 h-3 text-cyan-400" />
          <span>MOUSE WHEEL TO ZOOM · DRAG TO PAN · DOUBLE-CLICK RESET</span>
        </div>
      )}

      {/* Mini Radar Pitch Navigator when Zoomed In */}
      {zoom > 1.0 && (
        <div className="absolute bottom-3 right-4 bg-slate-900/95 backdrop-blur border border-slate-700/80 p-1.5 rounded-lg shadow-xl pointer-events-none hidden sm:block">
          <div className="relative w-20 h-12 bg-emerald-950/80 rounded border border-emerald-500/40 overflow-hidden flex items-center justify-center">
            {/* Pitch center line & circle in minimap */}
            <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-emerald-500/30" />
            <div className="w-3 h-3 rounded-full border border-emerald-500/30" />
            {/* Viewport rectangle indicating camera frustum on the pitch */}
            <div
              className="absolute border border-cyan-400 bg-cyan-400/20 rounded-[1px]"
              style={{
                width: `${Math.max(14, 80 / zoom)}px`,
                height: `${Math.max(10, 48 / zoom)}px`,
                transform: `translate(${-pan.x / (canvasRef.current ? canvasRef.current.width * 0.45 : 400) * 20}px, ${-pan.y / (canvasRef.current ? canvasRef.current.height * 0.45 : 300) * 12}px)`,
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
