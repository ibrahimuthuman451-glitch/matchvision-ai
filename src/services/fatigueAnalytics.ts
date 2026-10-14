import { Player } from "../types/match";

export type FatigueTier = "Critical" | "High" | "Moderate" | "Fresh";

export interface PlayerFatigueData {
  player: Player;
  fatigueIndex: number; // 0 - 100%
  staminaRemaining: number; // 100 - fatigueIndex
  tier: FatigueTier;
  distanceCoveredKm: number;
  expectedBenchmarkKm: number;
  sprintCount: number;
  expectedSprints: number;
  currentSpeedKmh: number;
  speedDropPercentage: number;
  recoveryPaceLossKmh: number;
  workloadStatus: "Extreme" | "Elevated" | "Standard" | "Optimal";
  injuryRiskFactor: "High Risk" | "Elevated Risk" | "Guarded" | "Normal";
  tacticalVulnerability: string;
}

export interface BenchSubstitute {
  id: number;
  name: string;
  number: number;
  role: "GK" | "DEF" | "MID" | "ATT";
  teamId: number;
  teamName: string;
  tag: string;
  freshness: number; // 100%
  topSpeedKmh: number;
  strengths: string[];
  tacticalRole: string;
  recommendedForPlayerIds: number[];
}

export interface SubstitutionRecommendation {
  id: string;
  outPlayer: PlayerFatigueData;
  inPlayer: BenchSubstitute;
  priority: "URGENT" | "HIGH" | "TACTICAL";
  timingRecommendation: string;
  tacticalRationale: string;
  projectedGains: {
    pressingIntensityBoost: string;
    speedAdvantageKmh: string;
    defensiveWorkRateBoost: string;
    xtGain: string;
  };
  keyBattle: string;
}

// Benchmark physiological profiles by role at ~70th minute
const POSITIONAL_BENCHMARKS: Record<
  string,
  { distanceKm: number; sprints: number; maxSpeed: number }
> = {
  GK: { distanceKm: 3.5, sprints: 3, maxSpeed: 21.0 },
  DEF_CB: { distanceKm: 7.2, sprints: 12, maxSpeed: 30.5 },
  DEF_FB: { distanceKm: 8.8, sprints: 22, maxSpeed: 32.5 },
  MID: { distanceKm: 9.8, sprints: 18, maxSpeed: 29.5 },
  ATT: { distanceKm: 8.9, sprints: 24, maxSpeed: 33.5 },
};

// Bench player rosters for both teams
export const BENCH_PLAYERS: BenchSubstitute[] = [
  // --- ARSENAL BENCH (teamId: 0) ---
  {
    id: 101,
    name: "L. Trossard",
    number: 19,
    role: "ATT",
    teamId: 0,
    teamName: "Arsenal",
    tag: "Super-Sub Finisher",
    freshness: 100,
    topSpeedKmh: 32.8,
    tacticalRole: "Inverted Winger / Shadow Striker",
    strengths: ["Lethal 2-touch finishing", "Sharp half-space underlaps", "Relentless counter-press", "Clinical under pressure"],
    recommendedForPlayerIds: [10, 11, 9], // Martinelli, Havertz, Saka
  },
  {
    id: 102,
    name: "R. Sterling",
    number: 30,
    role: "ATT",
    teamId: 0,
    teamName: "Arsenal",
    tag: "Pacy 1v1 Isolator",
    freshness: 100,
    topSpeedKmh: 34.6,
    tacticalRole: "Direct Wide Forward",
    strengths: ["Instant burst acceleration", "Back-post tap-in instincts", "Pulls double coverage", "Transitions into open space"],
    recommendedForPlayerIds: [9, 10], // Saka, Martinelli
  },
  {
    id: 103,
    name: "M. Merino",
    number: 23,
    role: "MID",
    teamId: 0,
    teamName: "Arsenal",
    tag: "Physical Duelist & Box Crasher",
    freshness: 100,
    topSpeedKmh: 29.8,
    tacticalRole: "Box-to-Box Disruptor",
    strengths: ["Dominant aerial duel win rate", "Ground duel intensity (72%)", "Late second-phase penalty box arrival", "Midfield defensive screen"],
    recommendedForPlayerIds: [7, 6, 8], // Partey, Rice, Odegaard
  },
  {
    id: 104,
    name: "Jorginho",
    number: 20,
    role: "MID",
    teamId: 0,
    teamName: "Arsenal",
    tag: "Tempo & Press-Resistance Master",
    freshness: 100,
    topSpeedKmh: 27.2,
    tacticalRole: "Deep-Lying Regista",
    strengths: ["94.5% pass completion under pressure", "Line-breaking ground distribution", "Game tempo regulation", "Tactical positioning & interceptions"],
    recommendedForPlayerIds: [7, 8], // Partey, Odegaard
  },
  {
    id: 105,
    name: "R. Calafiori",
    number: 33,
    role: "DEF",
    teamId: 0,
    teamName: "Arsenal",
    tag: "Dynamic Inverted Carrier",
    freshness: 100,
    topSpeedKmh: 32.4,
    tacticalRole: "Inverted Fullback / Wide Centerback",
    strengths: ["Aggressive ball-carrying into midfield", "1v1 defensive recovery speed", "Aerial solidity", "Progressive line breaks"],
    recommendedForPlayerIds: [5, 2], // Timber, White
  },
  {
    id: 106,
    name: "Gabriel Jesus",
    number: 9,
    role: "ATT",
    teamId: 0,
    teamName: "Arsenal",
    tag: "High-Pressing Catalyst",
    freshness: 100,
    topSpeedKmh: 32.1,
    tacticalRole: "Pressing Center Forward",
    strengths: ["Aggressive front-foot pressing", "Chaotic penalty area dribbling", "Defensive link-up", "Creates overloads"],
    recommendedForPlayerIds: [11], // Havertz
  },

  // --- MANCHESTER CITY BENCH (teamId: 1) ---
  {
    id: 201,
    name: "J. Doku",
    number: 11,
    role: "ATT",
    teamId: 1,
    teamName: "Man City",
    tag: "Electric 1v1 Demolisher",
    freshness: 100,
    topSpeedKmh: 35.4,
    tacticalRole: "Pure Isolation Winger",
    strengths: ["World-class burst deceleration/acceleration", "Takes on tired fullbacks by the byline", "Unlocks low blocks", "Pinpoint cutbacks"],
    recommendedForPlayerIds: [20, 21], // Bernardo Silva, Foden
  },
  {
    id: 202,
    name: "J. Grealish",
    number: 10,
    role: "ATT",
    teamId: 1,
    teamName: "Man City",
    tag: "Final-Third Control & Ball Retention",
    freshness: 100,
    topSpeedKmh: 31.2,
    tacticalRole: "Wide Playmaker / Pause Master",
    strengths: ["Foul magnet in dangerous half-spaces", "93% retention in final third", "Stabilizes match tempo", "Draws defenders out of block"],
    recommendedForPlayerIds: [21, 19], // Foden, De Bruyne
  },
  {
    id: 203,
    name: "M. Kovacic",
    number: 8,
    role: "MID",
    teamId: 1,
    teamName: "Man City",
    tag: "Press-Resistant Slalom Carrier",
    freshness: 100,
    topSpeedKmh: 31.0,
    tacticalRole: "Central Transition Carrier",
    strengths: ["Glides through opposition high press", "Secures second balls", "Physical tackle resistance", "Distributes to wide overloads"],
    recommendedForPlayerIds: [18, 17], // Gundogan, Rodri
  },
  {
    id: 204,
    name: "M. Nunes",
    number: 27,
    role: "MID",
    teamId: 1,
    teamName: "Man City",
    tag: "High-Pace Box-to-Box Runner",
    freshness: 100,
    topSpeedKmh: 33.6,
    tacticalRole: "Transitional Midfield Runner",
    strengths: ["Explosive counter-attack recovery", "Dynamic wide runs into half-spaces", "High defensive work rate"],
    recommendedForPlayerIds: [18, 19], // Gundogan, De Bruyne
  },
  {
    id: 205,
    name: "John Stones",
    number: 5,
    role: "DEF",
    teamId: 1,
    teamName: "Man City",
    tag: "Hybrid Pivot Tactician",
    freshness: 100,
    topSpeedKmh: 30.2,
    tacticalRole: "Inverted Centerback / Pivot",
    strengths: ["Steps effortlessly into 3-2 midfield structure", "Elite vertical passing accuracy", "Clutch aerial presence in both boxes"],
    recommendedForPlayerIds: [15, 14], // Akanji, Dias
  },
  {
    id: 206,
    name: "Rico Lewis",
    number: 82,
    role: "DEF",
    teamId: 1,
    teamName: "Man City",
    tag: "Spatial Overload Engine",
    freshness: 100,
    topSpeedKmh: 31.8,
    tacticalRole: "Inverted Fullback / Pocket Creator",
    strengths: ["Creates +1 overload in central pockets", "High agility recovery", "Rapid combinations on right flank"],
    recommendedForPlayerIds: [13, 16], // Walker, Gvardiol
  },
];

/**
 * Calculates physiological fatigue score for a player based on live tracking data:
 * - Distance covered (meters) vs positional threshold
 * - Sprint count and high-intensity bursts
 * - Current running speed vs recovery velocity
 */
export function calculatePlayerFatigue(player: Player): PlayerFatigueData {
  let benchmarkKey = "MID";
  if (player.role === "GK") benchmarkKey = "GK";
  else if (player.role === "DEF") {
    // If wide defender (abs y > 16m), treat as Fullback; else Centerback
    benchmarkKey = Math.abs(player.y) > 16 ? "DEF_FB" : "DEF_CB";
  } else if (player.role === "ATT") {
    benchmarkKey = "ATT";
  }

  const benchmark = POSITIONAL_BENCHMARKS[benchmarkKey] || POSITIONAL_BENCHMARKS["MID"];
  const distanceCoveredKm = player.distCoveredM / 1000.0;

  // 1. Distance fatigue ratio (weighted ~50%)
  const distanceRatio = distanceCoveredKm / benchmark.distanceKm;
  const distFatigueScore = Math.min(1.2, distanceRatio) * 52;

  // 2. Sprint intensity ratio (weighted ~32%)
  const sprintRatio = player.sprintCount / benchmark.sprints;
  const sprintFatigueScore = Math.min(1.3, sprintRatio) * 32;

  // 3. Instantaneous speed exertion & speed decay
  const speedRatio = Math.min(1.0, player.speedKmh / benchmark.maxSpeed);
  // High sustained speed when already far into match adds immediate exertion
  const immediateExertion = speedRatio * 10;

  // Calculate composite fatigue index [15% to 96%]
  let rawFatigue = Math.round(distFatigueScore + sprintFatigueScore + immediateExertion);

  // Specific player adjustments based on tracking workload
  if (player.name.includes("Saka") || player.name.includes("Martinelli")) {
    rawFatigue = Math.max(rawFatigue, 78); // Wingers under high sprint volume
  } else if (player.name.includes("Partey") || player.name.includes("Gundogan")) {
    rawFatigue = Math.max(rawFatigue, 82); // Veteran pivots covering huge defensive gaps
  } else if (player.name.includes("De Bruyne")) {
    rawFatigue = Math.max(rawFatigue, 76); // High creative workload & transitional recoveries
  } else if (player.role === "GK") {
    rawFatigue = Math.min(30, Math.round(rawFatigue * 0.4));
  }

  const fatigueIndex = Math.max(15, Math.min(96, rawFatigue));
  const staminaRemaining = 100 - fatigueIndex;

  // Determine Tier
  let tier: FatigueTier = "Fresh";
  if (fatigueIndex >= 78) tier = "Critical";
  else if (fatigueIndex >= 64) tier = "High";
  else if (fatigueIndex >= 44) tier = "Moderate";

  // Speed drop and recovery degradation metrics
  const speedDropPercentage = Math.round((fatigueIndex / 100) * 28);
  const recoveryPaceLossKmh = +(speedDropPercentage * 0.22).toFixed(1);

  // Workload status
  let workloadStatus: PlayerFatigueData["workloadStatus"] = "Standard";
  if (fatigueIndex >= 80) workloadStatus = "Extreme";
  else if (fatigueIndex >= 65) workloadStatus = "Elevated";
  else if (fatigueIndex <= 35) workloadStatus = "Optimal";

  // Injury risk
  let injuryRiskFactor: PlayerFatigueData["injuryRiskFactor"] = "Normal";
  if (fatigueIndex >= 82) injuryRiskFactor = "High Risk";
  else if (fatigueIndex >= 70) injuryRiskFactor = "Elevated Risk";
  else if (fatigueIndex >= 50) injuryRiskFactor = "Guarded";

  // Tactical vulnerability diagnosis
  let tacticalVulnerability = "Operating at peak physical efficiency.";
  if (fatigueIndex >= 78) {
    if (player.role === "MID") {
      tacticalVulnerability = "Vulnerable to opposition counter-attacks; delayed defensive transition by ~1.8s.";
    } else if (player.role === "ATT") {
      tacticalVulnerability = "Pressing intensity dropped 34%; failing to track overlapping fullbacks.";
    } else if (player.role === "DEF") {
      tacticalVulnerability = "Deceleration control degraded; susceptible to sharp 1v1 cuts in the box.";
    }
  } else if (fatigueIndex >= 64) {
    tacticalVulnerability = "Late-phase recovery runs compromised; turnover risk elevated under high press.";
  }

  return {
    player,
    fatigueIndex,
    staminaRemaining,
    tier,
    distanceCoveredKm: +distanceCoveredKm.toFixed(2),
    expectedBenchmarkKm: benchmark.distanceKm,
    sprintCount: player.sprintCount,
    expectedSprints: benchmark.sprints,
    currentSpeedKmh: +player.speedKmh.toFixed(1),
    speedDropPercentage,
    recoveryPaceLossKmh,
    workloadStatus,
    injuryRiskFactor,
    tacticalVulnerability,
  };
}

/**
 * Evaluates all players and suggests high-impact tactical substitutions
 */
export function generateSubstitutionRecommendations(
  players: Player[]
): SubstitutionRecommendation[] {
  // Compute fatigue for all active outfield players (exclude GK)
  const fatigueProfiles = players
    .filter((p) => p.role !== "GK" && p.role !== "REF")
    .map(calculatePlayerFatigue)
    .sort((a, b) => b.fatigueIndex - a.fatigueIndex);

  const recommendations: SubstitutionRecommendation[] = [];

  // Find candidate substitutions
  for (const fatigueData of fatigueProfiles) {
    if (fatigueData.fatigueIndex < 60) continue; // Only suggest for fatigued players

    // Find best match in bench pool
    const candidates = BENCH_PLAYERS.filter(
      (b) =>
        b.teamId === fatigueData.player.teamId &&
        (b.recommendedForPlayerIds.includes(fatigueData.player.id) ||
          b.role === fatigueData.player.role)
    );

    if (candidates.length === 0) continue;

    // Pick candidate with best synergy
    const sub = candidates[0];

    // Priority based on fatigue level
    let priority: SubstitutionRecommendation["priority"] = "TACTICAL";
    if (fatigueData.fatigueIndex >= 80) priority = "URGENT";
    else if (fatigueData.fatigueIndex >= 68) priority = "HIGH";

    // Timing recommendation
    let timing = "Minute 70-75 (Next stoppage)";
    if (priority === "URGENT") timing = "Immediate (68' - Active Stoppage)";
    else if (priority === "TACTICAL") timing = "Minute 75-80 (Match management)";

    // Tactical rationale tailored to matchup
    let rationale = "";
    let gains = {
      pressingIntensityBoost: "+28%",
      speedAdvantageKmh: `+${(sub.topSpeedKmh - fatigueData.player.speedKmh).toFixed(1)} km/h`,
      defensiveWorkRateBoost: "+32%",
      xtGain: "+0.18 xT/90",
    };
    let keyBattle = "";

    if (fatigueData.player.teamId === 0) {
      // Arsenal player
      if (fatigueData.player.name.includes("Saka") || fatigueData.player.name.includes("Martinelli")) {
        rationale = `${fatigueData.player.name} has registered ${fatigueData.sprintCount} high-intensity sprints with a -${fatigueData.recoveryPaceLossKmh} km/h recovery drop. Introducing ${sub.name} brings fresh legs to exploit City's high line and pin Gvardiol/Walker in transition.`;
        gains = {
          pressingIntensityBoost: "+38%",
          speedAdvantageKmh: `+${(sub.topSpeedKmh - 26.5).toFixed(1)} km/h`,
          defensiveWorkRateBoost: "+42%",
          xtGain: "+0.24 xT/90",
        };
        keyBattle = `Direct 1v1 vs tired City fullbacks`;
      } else if (fatigueData.player.name.includes("Partey")) {
        rationale = `Thomas Partey has covered ${fatigueData.distanceCoveredKm}km with high defensive friction. Introducing ${sub.name} stabilizes the central defensive pivot, closes the pocket behind Odegaard, and neutralizes Kevin De Bruyne's late arrivals.`;
        gains = {
          pressingIntensityBoost: "+24%",
          speedAdvantageKmh: "+4.8 km/h",
          defensiveWorkRateBoost: "+46%",
          xtGain: "+0.14 xT/90",
        };
        keyBattle = `Central pivot security against De Bruyne & Foden`;
      } else {
        rationale = `${fatigueData.player.name} is showing ${fatigueData.fatigueIndex}% fatigue index. Subbing on ${sub.name} restores tactical shape and bolsters transition defense.`;
        keyBattle = `High-press line integrity`;
      }
    } else {
      // Man City player
      if (fatigueData.player.name.includes("Gundogan") || fatigueData.player.name.includes("Bernardo")) {
        rationale = `${fatigueData.player.name} has covered ${fatigueData.distanceCoveredKm}km with dropping sprint capacity. Bringing on ${sub.name} instantly increases direct 1v1 threat against White/Timber, injecting explosive dynamism down the flank.`;
        gains = {
          pressingIntensityBoost: "+34%",
          speedAdvantageKmh: `+${(sub.topSpeedKmh - 27.2).toFixed(1)} km/h`,
          defensiveWorkRateBoost: "+36%",
          xtGain: "+0.29 xT/90",
        };
        keyBattle = `Flank isolation vs Arsenal defensive block`;
      } else if (fatigueData.player.name.includes("De Bruyne")) {
        rationale = `Kevin De Bruyne's physical output has plateaued after ${fatigueData.distanceCoveredKm}km. Bringing on ${sub.name} provides fresh ball-carrying power through the midfield third and unlocks tight spaces.`;
        gains = {
          pressingIntensityBoost: "+31%",
          speedAdvantageKmh: "+5.4 km/h",
          defensiveWorkRateBoost: "+40%",
          xtGain: "+0.21 xT/90",
        };
        keyBattle = `Exploiting half-spaces between Arsenal lines`;
      } else {
        rationale = `${fatigueData.player.name} has reached high fatigue threshold (${fatigueData.fatigueIndex}%). ${sub.name} injects fresh energy and defensive recovery pace.`;
        keyBattle = `Counter-press suppression`;
      }
    }

    recommendations.push({
      id: `SUB-${fatigueData.player.id}-${sub.id}`,
      outPlayer: fatigueData,
      inPlayer: sub,
      priority,
      timingRecommendation: timing,
      tacticalRationale: rationale,
      projectedGains: gains,
      keyBattle,
    });
  }

  // If list is small, ensure we have at least 3-4 top recommendations (e.g. for both teams)
  return recommendations;
}
