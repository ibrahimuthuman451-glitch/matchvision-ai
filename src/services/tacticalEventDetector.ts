import { Player, Ball, TacticalPitchAlert, TacticalAlertCategory } from "../types/match";

// Audio synthesized alert chime using Web Audio API
class TacticalAlertAudioSynthesizer {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private initContext() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  public playAlertChime(category: TacticalAlertCategory) {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      if (category === "high_press") {
        // High-pitched rapid double beep
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.setValueAtTime(1174.66, now + 0.08); // D6
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (category === "line_break") {
        // Urgent warning dual tone
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.1); // G5
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        // Upward energetic chime for counter-attack / opportunity
        osc.type = "triangle";
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.07); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.14); // G5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch {
      // Audio autoplay policies or unsupported browser
    }
  }
}

export const tacticalAlertAudio = new TacticalAlertAudioSynthesizer();

// Rolling debounce tracker to prevent alert notification flood
interface EventCooldown {
  category: TacticalAlertCategory;
  lastTriggeredSec: number;
}
const cooldowns: Record<string, number> = {};

// Initial realistic event history for match
export const INITIAL_TACTICAL_ALERTS: TacticalPitchAlert[] = [
  {
    id: "ALERT-INIT-1",
    category: "high_press",
    severity: "critical",
    title: "HIGH-PRESS TRIGGER TRAP ACTIVATED",
    subtitle: "Arsenal 3-Man Synchronized Front Press",
    description:
      "Saka, Ødegaard & Havertz initiated an aggressive 3-point trap on R. Dias in the left defensive channel, cutting off Rodri passing lane.",
    initiatingTeamId: 0,
    initiatingTeamName: "Arsenal",
    targetTeamId: 1,
    primaryPlayerIds: [7, 8, 29], // Saka, Odegaard, Havertz
    primaryPlayerNames: ["B. Saka", "M. Ødegaard", "K. Havertz"],
    targetPlayerId: 13, // Dias
    targetPlayerName: "R. Dias",
    timestamp: "64:18",
    timeSec: 3858,
    durationMs: 7000,
    centroid: { x: 26.5, y: -14.2 },
    targetLocation: { x: 32.0, y: -16.0 },
    zonePolygon: [
      { x: 20.0, y: -26.0 },
      { x: 38.0, y: -26.0 },
      { x: 36.0, y: -4.0 },
      { x: 18.0, y: -4.0 },
    ],
    metrics: {
      closingSpeedKmh: 24.8,
      pressingIntensityPct: 92,
      expectedThreatXt: 0.18,
      spaceMeters: 4.8,
    },
    coachDirectiveSuggestion: "Force turnover toward touchline; direct Havertz to shadow Rodri pivot.",
    acknowledged: true,
  },
  {
    id: "ALERT-INIT-2",
    category: "line_break",
    severity: "warning",
    title: "DEFENSIVE LINE PENETRATION WARNING",
    subtitle: "Haaland Blindside Run Between Saliba & Gabriel",
    description:
      "De Bruyne through-ball corridor identified. Haaland accelerating past offside threshold with 16.4m open space behind central defensive block.",
    initiatingTeamId: 1,
    initiatingTeamName: "Man City",
    targetTeamId: 0,
    primaryPlayerIds: [21, 17], // Haaland, De Bruyne
    primaryPlayerNames: ["E. Haaland", "K. De Bruyne"],
    targetPlayerId: 12, // Saliba
    targetPlayerName: "W. Saliba",
    timestamp: "66:42",
    timeSec: 4002,
    durationMs: 6500,
    centroid: { x: -28.0, y: 1.5 },
    vectorStart: { x: -6.5, y: -8.0 },
    vectorEnd: { x: -36.0, y: 3.5 },
    metrics: {
      closingSpeedKmh: 33.4,
      distanceToGoalM: 21.5,
      spaceMeters: 16.4,
      expectedThreatXt: 0.46,
    },
    coachDirectiveSuggestion: "Drop defensive line 4m deeper; Raya prepare sweeper-keeper anticipation.",
    acknowledged: true,
  },
  {
    id: "ALERT-INIT-3",
    category: "counter_attack",
    severity: "opportunity",
    title: "RAPID COUNTER-ATTACK OVERLOAD",
    subtitle: "Arsenal 3 vs 2 Transition Corridor Open",
    description:
      "Turnover won by Rice. Martinelli and Saka breaking wide at 31.2 km/h with City fullbacks caught high in attacking third.",
    initiatingTeamId: 0,
    initiatingTeamName: "Arsenal",
    targetTeamId: 1,
    primaryPlayerIds: [41, 11, 7], // Rice, Martinelli, Saka
    primaryPlayerNames: ["D. Rice", "G. Martinelli", "B. Saka"],
    targetPlayerId: 25, // Akanji
    targetPlayerName: "M. Akanji",
    timestamp: "68:05",
    timeSec: 4085,
    durationMs: 8000,
    centroid: { x: 4.0, y: 12.0 },
    vectorStart: { x: -12.0, y: 4.0 },
    vectorEnd: { x: 32.0, y: 18.0 },
    metrics: {
      closingSpeedKmh: 31.2,
      numericalAdvantage: "3 v 2",
      distanceToGoalM: 26.0,
      expectedThreatXt: 0.38,
      spaceMeters: 28.5,
    },
    coachDirectiveSuggestion: "Exploit Martinelli pace on outside shoulder; commit runners to back post.",
    acknowledged: true,
  },
];

/**
 * Format match seconds into standard football MM:SS string
 */
export function formatMatchTimestamp(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
}

/**
 * Analyzes live player positions and detects critical tactical events in real-time.
 */
export function detectLiveTacticalEvents(
  players: Player[],
  ball: Ball,
  currentSec: number
): TacticalPitchAlert[] {
  const alerts: TacticalPitchAlert[] = [];

  const team0 = players.filter((p) => p.teamId === 0);
  const team1 = players.filter((p) => p.teamId === 1);

  if (team0.length === 0 || team1.length === 0) return alerts;

  // 1. Compute Defensive Lines (second deepest outfield defender)
  const defs0 = team0.filter((p) => p.role === "DEF");
  const defs1 = team1.filter((p) => p.role === "DEF");

  // Arsenal defends negative X (goal at -52.5). Deepest is minimum X.
  const sortedDefs0 = [...defs0].sort((a, b) => a.x - b.x);
  const defLine0X = sortedDefs0.length >= 2 ? sortedDefs0[1].x : -32.0;

  // Man City defends positive X (goal at +52.5). Deepest is maximum X.
  const sortedDefs1 = [...defs1].sort((a, b) => b.x - a.x);
  const defLine1X = sortedDefs1.length >= 2 ? sortedDefs1[1].x : 32.0;

  // 2. Identify Ball Carrier or Closest Player
  let ballCarrier: Player | null = null;
  let minDistToBall = Infinity;
  players.forEach((p) => {
    if (p.teamId === 2) return;
    const d = Math.hypot(p.x - ball.x, p.y - ball.y);
    if (d < minDistToBall) {
      minDistToBall = d;
      ballCarrier = p;
    }
  });

  // =========================================================================
  // A. HIGH-PRESS TRIGGER EVALUATION
  // =========================================================================
  // If ball carrier is in their defensive half and >= 3 opponent players are within 11.5m
  if (ballCarrier && minDistToBall < 4.5) {
    const carrier = ballCarrier as Player;
    const carrierTeamId = carrier.teamId;
    const opposingTeam = carrierTeamId === 0 ? team1 : team0;
    const isInDefensiveThird =
      (carrierTeamId === 0 && carrier.x < -18.0) || (carrierTeamId === 1 && carrier.x > 18.0);

    if (isInDefensiveThird) {
      const nearbyPressers = opposingTeam.filter((p) => {
        const dist = Math.hypot(p.x - carrier.x, p.y - carrier.y);
        return dist < 12.0 && p.role !== "GK";
      });

      if (nearbyPressers.length >= 3) {
        const cooldownKey = `high_press_${opposingTeam[0].teamId}`;
        const lastTrigger = cooldowns[cooldownKey] || 0;

        if (currentSec - lastTrigger > 18) {
          cooldowns[cooldownKey] = currentSec;

          const presserNames = nearbyPressers.slice(0, 3).map((p) => p.name);
          const presserIds = nearbyPressers.slice(0, 3).map((p) => p.id);
          const pressTeamName = opposingTeam[0].teamName;
          const avgSpeed =
            nearbyPressers.reduce((acc, p) => acc + p.speedKmh, 0) / nearbyPressers.length;

          alerts.push({
            id: `ALERT-HP-${Math.floor(currentSec)}-${Date.now().toString().slice(-4)}`,
            category: "high_press",
            severity: "critical",
            title: `⚡ HIGH-PRESS TRIGGER: ${pressTeamName.toUpperCase()} 3-MAN TRAP`,
            subtitle: `${presserNames.join(", ")} pressing ${carrier.name}`,
            description: `${pressTeamName} triggered an aggressive high pressing trap around ${carrier.name} in the defensive third with closing velocity of ${(
              avgSpeed + 14
            ).toFixed(1)} km/h.`,
            initiatingTeamId: opposingTeam[0].teamId,
            initiatingTeamName: pressTeamName,
            targetTeamId: carrierTeamId,
            primaryPlayerIds: presserIds,
            primaryPlayerNames: presserNames,
            targetPlayerId: carrier.id,
            targetPlayerName: carrier.name,
            timestamp: formatMatchTimestamp(currentSec),
            timeSec: currentSec,
            durationMs: 7000,
            centroid: { x: carrier.x, y: carrier.y },
            targetLocation: { x: carrier.x, y: carrier.y },
            zonePolygon: [
              { x: carrier.x - 7, y: carrier.y - 7 },
              { x: carrier.x + 7, y: carrier.y - 7 },
              { x: carrier.x + 8, y: carrier.y + 7 },
              { x: carrier.x - 8, y: carrier.y + 7 },
            ],
            metrics: {
              closingSpeedKmh: parseFloat((avgSpeed + 14).toFixed(1)),
              pressingIntensityPct: Math.min(96, Math.floor(82 + nearbyPressers.length * 4)),
              expectedThreatXt: 0.22,
              spaceMeters: 3.2,
            },
            coachDirectiveSuggestion: `Quick switch to opposite flank or bypass first wave with targeted aerial release.`,
          });
        }
      }
    }
  }

  // =========================================================================
  // B. DEFENSIVE LINE BREAK EVALUATION
  // =========================================================================
  // Check for attacking runners penetrating behind the opponent defensive line
  // Case 1: Man City attacking Arsenal (runner x < defLine0X - 1.0)
  const cityPenetratingRunners = team1.filter(
    (p) => p.role !== "GK" && p.x < defLine0X - 1.0 && p.x > -45.0
  );
  if (cityPenetratingRunners.length > 0) {
    const runner = cityPenetratingRunners[0];
    const cooldownKey = `line_break_team1`;
    const lastTrigger = cooldowns[cooldownKey] || 0;

    if (currentSec - lastTrigger > 20) {
      cooldowns[cooldownKey] = currentSec;
      const distToGoal = Math.abs(-52.5 - runner.x);

      alerts.push({
        id: `ALERT-LB-${Math.floor(currentSec)}-${Date.now().toString().slice(-4)}`,
        category: "line_break",
        severity: "critical",
        title: `🚨 DEFENSIVE LINE BREAK: ${runner.name.toUpperCase()} IN BEHIND`,
        subtitle: `Exploiting space behind Arsenal back line (${defLine0X.toFixed(1)}m)`,
        description: `${runner.name} penetrated Arsenal's defensive line into the box corridor (${distToGoal.toFixed(
          1
        )}m to goal). Immediate recovery challenge required.`,
        initiatingTeamId: 1,
        initiatingTeamName: "Man City",
        targetTeamId: 0,
        primaryPlayerIds: [runner.id],
        primaryPlayerNames: [runner.name],
        targetPlayerId: sortedDefs0[0]?.id || 12,
        targetPlayerName: sortedDefs0[0]?.name || "W. Saliba",
        timestamp: formatMatchTimestamp(currentSec),
        timeSec: currentSec,
        durationMs: 6500,
        centroid: { x: runner.x, y: runner.y },
        vectorStart: { x: defLine0X + 5, y: runner.y },
        vectorEnd: { x: runner.x, y: runner.y },
        metrics: {
          closingSpeedKmh: parseFloat((runner.speedKmh + 16).toFixed(1)),
          distanceToGoalM: parseFloat(distToGoal.toFixed(1)),
          spaceMeters: parseFloat(Math.abs(defLine0X - runner.x).toFixed(1)),
          expectedThreatXt: 0.42,
        },
        coachDirectiveSuggestion: `Compress central box line and force wide away from goal frame.`,
      });
    }
  }

  // Case 2: Arsenal attacking Man City (runner x > defLine1X + 1.0)
  const arsenalPenetratingRunners = team0.filter(
    (p) => p.role !== "GK" && p.x > defLine1X + 1.0 && p.x < 45.0
  );
  if (arsenalPenetratingRunners.length > 0) {
    const runner = arsenalPenetratingRunners[0];
    const cooldownKey = `line_break_team0`;
    const lastTrigger = cooldowns[cooldownKey] || 0;

    if (currentSec - lastTrigger > 20) {
      cooldowns[cooldownKey] = currentSec;
      const distToGoal = Math.abs(52.5 - runner.x);

      alerts.push({
        id: `ALERT-LB-${Math.floor(currentSec)}-${Date.now().toString().slice(-4)}`,
        category: "line_break",
        severity: "opportunity",
        title: `🎯 DEFENSIVE LINE BREAK: ${runner.name.toUpperCase()} PENETRATING`,
        subtitle: `Run behind City offside line (${defLine1X.toFixed(1)}m)`,
        description: `${runner.name} broke behind Manchester City's backline with open channel toward penalty spot (${distToGoal.toFixed(
          1
        )}m to goal).`,
        initiatingTeamId: 0,
        initiatingTeamName: "Arsenal",
        targetTeamId: 1,
        primaryPlayerIds: [runner.id],
        primaryPlayerNames: [runner.name],
        targetPlayerId: sortedDefs1[0]?.id || 25,
        targetPlayerName: sortedDefs1[0]?.name || "M. Akanji",
        timestamp: formatMatchTimestamp(currentSec),
        timeSec: currentSec,
        durationMs: 6500,
        centroid: { x: runner.x, y: runner.y },
        vectorStart: { x: defLine1X - 5, y: runner.y },
        vectorEnd: { x: runner.x, y: runner.y },
        metrics: {
          closingSpeedKmh: parseFloat((runner.speedKmh + 15).toFixed(1)),
          distanceToGoalM: parseFloat(distToGoal.toFixed(1)),
          spaceMeters: parseFloat(Math.abs(runner.x - defLine1X).toFixed(1)),
          expectedThreatXt: 0.39,
        },
        coachDirectiveSuggestion: `Slip through-ball into stride before goalkeeper sweeps off line.`,
      });
    }
  }

  // =========================================================================
  // C. COUNTER-ATTACK TRANSITION OPPORTUNITY EVALUATION
  // =========================================================================
  // When an attacker in the midfield transition corridor has open space and forward momentum
  const transitionRunners0 = team0.filter((p) => p.x > -5 && p.x < 28 && p.role !== "DEF");
  const transitionDefs1 = team1.filter((p) => p.x > 15 && p.role === "DEF");
  if (transitionRunners0.length >= 3 && transitionDefs1.length <= 2) {
    const cooldownKey = `counter_attack_team0`;
    const lastTrigger = cooldowns[cooldownKey] || 0;

    if (currentSec - lastTrigger > 24) {
      cooldowns[cooldownKey] = currentSec;
      const runnerNames = transitionRunners0.slice(0, 3).map((p) => p.name);
      const runnerIds = transitionRunners0.slice(0, 3).map((p) => p.id);

      alerts.push({
        id: `ALERT-CA-${Math.floor(currentSec)}-${Date.now().toString().slice(-4)}`,
        category: "counter_attack",
        severity: "opportunity",
        title: `🚀 COUNTER-ATTACK OVERLOAD: 3 vs 2 TRANSITION CORRIDOR`,
        subtitle: `Arsenal attacking City recovery shape (${runnerNames.join(", ")})`,
        description: `Rapid transitional overload detected. City fullbacks caught high; 3v2 advantage with 24.5m of vacated space ahead.`,
        initiatingTeamId: 0,
        initiatingTeamName: "Arsenal",
        targetTeamId: 1,
        primaryPlayerIds: runnerIds,
        primaryPlayerNames: runnerNames,
        targetPlayerId: transitionDefs1[0]?.id,
        targetPlayerName: transitionDefs1[0]?.name || "R. Dias",
        timestamp: formatMatchTimestamp(currentSec),
        timeSec: currentSec,
        durationMs: 7500,
        centroid: { x: 12.0, y: 0.0 },
        vectorStart: { x: -2.0, y: 0.0 },
        vectorEnd: { x: 30.0, y: 8.0 },
        metrics: {
          closingSpeedKmh: 29.5,
          numericalAdvantage: "3 v 2",
          distanceToGoalM: 28.0,
          expectedThreatXt: 0.36,
          spaceMeters: 24.5,
        },
        coachDirectiveSuggestion: `Attack the isolated center-back with dual overlapping runs to create high-xG cutback.`,
      });
    }
  }

  return alerts;
}

/**
 * Generates an on-demand simulated tactical event for instant testing and demonstration
 */
export function generateSimulatedScenarioAlert(
  category: TacticalAlertCategory,
  matchSec: number,
  initiatingTeamId: number = 0
): TacticalPitchAlert {
  const isArsenal = initiatingTeamId === 0;
  const timeStr = formatMatchTimestamp(matchSec);

  if (category === "high_press") {
    return {
      id: `SIM-HP-${Date.now()}`,
      category: "high_press",
      severity: "critical",
      title: `⚡ HIGH-PRESS TRIGGER: ${isArsenal ? "ARSENAL" : "MAN CITY"} 3-MAN TRAP`,
      subtitle: isArsenal
        ? "Saka, Ødegaard & Havertz Converging on Ball Carrier"
        : "Haaland, Foden & Silva Synchronized High Block",
      description: isArsenal
        ? "Arsenal front three deployed an aggressive pressing trigger near the opponent 18-yard box, collapsing the half-space passing angle."
        : "Man City activated an aggressive frontline press against Arsenal build-up shape, suffocating central exit routes.",
      initiatingTeamId,
      initiatingTeamName: isArsenal ? "Arsenal" : "Man City",
      targetTeamId: isArsenal ? 1 : 0,
      primaryPlayerIds: isArsenal ? [7, 8, 29] : [21, 22, 20],
      primaryPlayerNames: isArsenal
        ? ["B. Saka", "M. Ødegaard", "K. Havertz"]
        : ["E. Haaland", "P. Foden", "B. Silva"],
      targetPlayerId: isArsenal ? 13 : 2,
      targetPlayerName: isArsenal ? "R. Dias" : "B. White",
      timestamp: timeStr,
      timeSec: matchSec,
      durationMs: 7500,
      centroid: isArsenal ? { x: 31.0, y: -12.0 } : { x: -31.0, y: 12.0 },
      targetLocation: isArsenal ? { x: 34.0, y: -14.0 } : { x: -34.0, y: 14.0 },
      zonePolygon: isArsenal
        ? [
            { x: 24.0, y: -24.0 },
            { x: 42.0, y: -24.0 },
            { x: 40.0, y: -2.0 },
            { x: 22.0, y: -2.0 },
          ]
        : [
            { x: -24.0, y: 24.0 },
            { x: -42.0, y: 24.0 },
            { x: -40.0, y: 2.0 },
            { x: -22.0, y: 2.0 },
          ],
      metrics: {
        closingSpeedKmh: 26.4,
        pressingIntensityPct: 94,
        expectedThreatXt: 0.28,
        spaceMeters: 3.5,
      },
      coachDirectiveSuggestion: isArsenal
        ? "Maintain compact perimeter; force error toward touchline."
        : "Use direct aerial outlet to Haaland to escape pressure perimeter.",
    };
  }

  if (category === "line_break") {
    return {
      id: `SIM-LB-${Date.now()}`,
      category: "line_break",
      severity: isArsenal ? "opportunity" : "critical",
      title: isArsenal
        ? "🎯 DEFENSIVE LINE BREAK: SAKA PENETRATING BEHIND GVARDIOL"
        : "🚨 DEFENSIVE LINE BREAK: HAALAND SPRINTING BEHIND SALIBA",
      subtitle: isArsenal
        ? "Through-ball corridor open in right half-space channel"
        : "Direct vertical penetration behind Arsenal offside line",
      description: isArsenal
        ? "Bukayo Saka executed a blindside dart behind Josko Gvardiol, receiving in stride with 19.2m of space before penalty box entry."
        : "Erling Haaland timed a lethal diagonal burst between Saliba and Gabriel at 34.8 km/h, breaking the defensive line threshold.",
      initiatingTeamId,
      initiatingTeamName: isArsenal ? "Arsenal" : "Man City",
      targetTeamId: isArsenal ? 1 : 0,
      primaryPlayerIds: isArsenal ? [7, 8] : [21, 17],
      primaryPlayerNames: isArsenal ? ["B. Saka", "M. Ødegaard"] : ["E. Haaland", "K. De Bruyne"],
      targetPlayerId: isArsenal ? 24 : 12,
      targetPlayerName: isArsenal ? "J. Gvardiol" : "W. Saliba",
      timestamp: timeStr,
      timeSec: matchSec,
      durationMs: 7000,
      centroid: isArsenal ? { x: 38.0, y: 16.0 } : { x: -36.0, y: -4.0 },
      vectorStart: isArsenal ? { x: 18.0, y: 8.0 } : { x: -14.0, y: -2.0 },
      vectorEnd: isArsenal ? { x: 42.0, y: 18.0 } : { x: -42.0, y: -4.0 },
      metrics: {
        closingSpeedKmh: isArsenal ? 31.8 : 34.8,
        distanceToGoalM: 18.2,
        spaceMeters: 19.2,
        expectedThreatXt: 0.48,
      },
      coachDirectiveSuggestion: isArsenal
        ? "Drive to byline and deliver low cutback to incoming late runners."
        : "Saliba recovery sprint; Raya advance to narrow shooting angle immediately.",
    };
  }

  // Counter attack default
  return {
    id: `SIM-CA-${Date.now()}`,
    category: "counter_attack",
    severity: "opportunity",
    title: "🚀 RAPID COUNTER-ATTACK OVERLOAD: 3 vs 2 TRANSITION",
    subtitle: isArsenal
      ? "Arsenal Lightning Break via Martinelli & Saka"
      : "Man City Fast Break Transition via Foden & Haaland",
    description: isArsenal
      ? "Turnover executed in middle third. Rapid 3-man wave attacking City retreating backline with a 3v2 numerical advantage."
      : "Swift counter-attack initiated through central corridor. 3 City runners attacking space behind recovering midfielders.",
    initiatingTeamId,
    initiatingTeamName: isArsenal ? "Arsenal" : "Man City",
    targetTeamId: isArsenal ? 1 : 0,
    primaryPlayerIds: isArsenal ? [11, 7, 29] : [22, 21, 20],
    primaryPlayerNames: isArsenal
      ? ["G. Martinelli", "B. Saka", "K. Havertz"]
      : ["P. Foden", "E. Haaland", "B. Silva"],
    targetPlayerId: isArsenal ? 13 : 6,
    targetPlayerName: isArsenal ? "R. Dias" : "Gabriel",
    timestamp: timeStr,
    timeSec: matchSec,
    durationMs: 8000,
    centroid: isArsenal ? { x: 16.0, y: -8.0 } : { x: -16.0, y: 8.0 },
    vectorStart: isArsenal ? { x: -8.0, y: -12.0 } : { x: 8.0, y: 12.0 },
    vectorEnd: isArsenal ? { x: 36.0, y: -6.0 } : { x: -36.0, y: 6.0 },
    metrics: {
      closingSpeedKmh: 32.5,
      numericalAdvantage: "3 v 2",
      distanceToGoalM: 22.0,
      expectedThreatXt: 0.44,
      spaceMeters: 26.0,
    },
    coachDirectiveSuggestion: "Commit the isolated defender, draw commitment, and release wing runner for high-xG 1v1 finish.",
  };
}
