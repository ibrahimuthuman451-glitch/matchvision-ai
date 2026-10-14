/**
 * MatchVision AI — Set-Piece Tactical Trajectory & Target Zone Engine
 * 
 * Computes aerodynamic delivery trajectories (in-swingers, out-swingers, driven cutbacks,
 * direct wall benders), defensive wall positioning (9.15m FIFA distance), and high-xG
 * target zones inside the penalty box based on ball coordinates and proximity to goal.
 */

import { Ball, Player } from "../types/match";

export type SetPieceCategory =
  | "corner_right"
  | "corner_left"
  | "freekick_direct"
  | "freekick_wide"
  | "freekick_edge_box"
  | "open_play";

export interface SetPieceTargetZone {
  id: string;
  name: string;
  code: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  centerX: number;
  centerY: number;
  expectedThreatXT: number; // 0.0 - 1.0
  expectedGoalXG: number; // 0.0 - 1.0
  threatTier: "CRITICAL" | "HIGH" | "MEDIUM";
  primaryRunner: string;
  tacticalAction: string;
  successProbabilityPct: number;
  accentColor: string;
}

export interface SetPieceTrajectory {
  id: string;
  name: string;
  style: "in_swing" | "out_swing" | "driven_low" | "far_post_float" | "direct_shot";
  start: { x: number; y: number };
  controlPoint: { x: number; y: number }; // Quadratic Bézier apex
  target: { x: number; y: number };
  flightTimeSec: number;
  exitSpeedKmh: number;
  curveAngleDeg: number;
  selectionProbabilityPct: number;
  color: string;
  description: string;
  targetZoneId: string;
}

export interface DefensiveWall {
  required: boolean;
  playerCount: number;
  center: { x: number; y: number };
  angleDeg: number;
  widthM: number;
  distanceFromBallM: number; // standard 9.15m (10 yards)
  wallPoints: { x: number; y: number }[];
}

export interface SetPieceAnalysis {
  isSetPieceScenario: boolean;
  category: SetPieceCategory;
  categoryLabel: string;
  distanceToGoalM: number;
  angleToGoalDeg: number;
  attackingTowardsRight: boolean; // true if attacking x = +52.5m (Arsenal), false if attacking x = -52.5m (City)
  targetGoal: { x: number; y: number };
  ballLocation: { x: number; y: number };
  primaryTaker: string;
  targetZones: SetPieceTargetZone[];
  trajectories: SetPieceTrajectory[];
  defensiveWall: DefensiveWall | null;
  tacticalInsight: string;
}

/**
 * Standard set-piece presets for testing and tactical simulation.
 */
export const SET_PIECE_PRESETS = [
  {
    id: "ars_corner_r",
    name: "Arsenal Right Corner (In-Swinger)",
    ballX: 52.0,
    ballY: 33.5,
    teamId: 0,
    taker: "B. Saka (Left-Footed)",
  },
  {
    id: "ars_corner_l",
    name: "Arsenal Left Corner (Out-Swinger)",
    ballX: 52.0,
    ballY: -33.5,
    teamId: 0,
    taker: "D. Rice (Right-Footed)",
  },
  {
    id: "mci_freekick_direct",
    name: "Man City Direct Free-Kick (23m)",
    ballX: -29.5,
    ballY: 4.5,
    teamId: 1,
    taker: "K. De Bruyne",
  },
  {
    id: "ars_freekick_wide",
    name: "Arsenal Wide Free-Kick (31m Right Channel)",
    ballX: 22.0,
    ballY: 21.0,
    teamId: 0,
    taker: "M. Odegaard",
  },
  {
    id: "mci_corner_r",
    name: "Man City Right Corner (In-Swinger)",
    ballX: -52.0,
    ballY: 33.5,
    teamId: 1,
    taker: "P. Foden",
  },
];

/**
 * Evaluates whether current ball position constitutes a corner or free-kick near the box.
 */
export function analyzeSetPiece(ball: Ball, attackingTeamId: number = 0): SetPieceAnalysis {
  const bx = ball.x;
  const by = ball.y;

  // Determine which goal is being targeted
  // Team 0 attacks +52.5m (Right goal), Team 1 attacks -52.5m (Left goal)
  const attackingTowardsRight = attackingTeamId === 0;
  const goalX = attackingTowardsRight ? 52.5 : -52.5;
  const goalY = 0.0;

  const distToGoal = Math.hypot(goalX - bx, goalY - by);
  const angleToGoal = (Math.atan2(goalY - by, goalX - bx) * 180) / Math.PI;

  // Check if ball is in corner quadrant (within 5.5m of corner flag)
  const isRightCorner =
    (attackingTowardsRight && bx >= 47.0 && by >= 28.0) ||
    (!attackingTowardsRight && bx <= -47.0 && by >= 28.0);
  const isLeftCorner =
    (attackingTowardsRight && bx >= 47.0 && by <= -28.0) ||
    (!attackingTowardsRight && bx <= -47.0 && by <= -28.0);

  // Check if ball is within dangerous free-kick proximity (within 35m of goal)
  const isNearAttackingBox =
    (attackingTowardsRight && bx >= 17.5 && distToGoal <= 38.0) ||
    (!attackingTowardsRight && bx <= -17.5 && distToGoal <= 38.0);

  let category: SetPieceCategory = "open_play";
  let categoryLabel = "Open Play Dynamics";

  if (isRightCorner) {
    category = "corner_right";
    categoryLabel = "Attacking Corner (Right Quadrant)";
  } else if (isLeftCorner) {
    category = "corner_left";
    categoryLabel = "Attacking Corner (Left Quadrant)";
  } else if (isNearAttackingBox) {
    if (distToGoal <= 25.0 && Math.abs(by) <= 15.0) {
      category = "freekick_direct";
      categoryLabel = `Direct Free-Kick (${distToGoal.toFixed(1)}m)`;
    } else if (distToGoal <= 21.0) {
      category = "freekick_edge_box";
      categoryLabel = `Edge-of-Box Free-Kick (${distToGoal.toFixed(1)}m)`;
    } else {
      category = "freekick_wide";
      categoryLabel = `Crossing Free-Kick (${distToGoal.toFixed(1)}m Wide Channel)`;
    }
  }

  const isSetPieceScenario = category !== "open_play";

  // Target zones inside the opponent's 18-yard penalty box
  const targetZones = generatePenaltyBoxTargetZones(attackingTowardsRight, category);

  // Candidate aerodynamic flight trajectories from ball to target zones
  const trajectories = generateTrajectories(bx, by, targetZones, category, attackingTowardsRight, goalX);

  // Compute 9.15m defensive wall if applicable
  const defensiveWall = calculateDefensiveWall(bx, by, goalX, goalY, category, distToGoal);

  // Primary taker selection based on position and team
  const primaryTaker =
    attackingTeamId === 0
      ? isRightCorner
        ? "B. Saka (Left-Footed In-Swinger)"
        : isLeftCorner
        ? "D. Rice (Right-Footed Out-Swinger)"
        : distToGoal <= 26
        ? "M. Odegaard (Curler Specialist)"
        : "B. Saka / D. Rice"
      : isRightCorner
      ? "P. Foden (Left-Footed)"
      : isLeftCorner
      ? "K. De Bruyne (Right-Footed)"
      : "K. De Bruyne (Power & Dip)";

  // Tactical description
  let tacticalInsight = "";
  if (category.startsWith("corner")) {
    tacticalInsight =
      "Optimal delivery targets Near-Post Flick-on (6-yard line) to exploit 1st defender mismatch, with secondary runners crashing Central Sweet Spot.";
  } else if (category === "freekick_direct") {
    tacticalInsight =
      "Direct shooting angle available over 4-man defensive wall towards top near-corner (expected shot velocity: 94 km/h).";
  } else {
    tacticalInsight =
      "Whipped delivery targeting the corridor of uncertainty between 6-yard box and penalty spot.";
  }

  return {
    isSetPieceScenario,
    category,
    categoryLabel,
    distanceToGoalM: parseFloat(distToGoal.toFixed(1)),
    angleToGoalDeg: parseFloat(angleToGoal.toFixed(1)),
    attackingTowardsRight,
    targetGoal: { x: goalX, y: goalY },
    ballLocation: { x: parseFloat(bx.toFixed(2)), y: parseFloat(by.toFixed(2)) },
    primaryTaker,
    targetZones,
    trajectories,
    defensiveWall,
    tacticalInsight,
  };
}

/**
 * Builds standard FIFA target zones inside the active 18-yard box.
 */
function generatePenaltyBoxTargetZones(
  attackingTowardsRight: boolean,
  category: SetPieceCategory
): SetPieceTargetZone[] {
  // Oriented relative to target goal:
  // If attacking right (+52.5m), box is from x = 36.0m to 52.5m.
  // If attacking left (-52.5m), box is from x = -52.5m to -36.0m.
  const sign = attackingTowardsRight ? 1 : -1;
  const baseGoalX = attackingTowardsRight ? 52.5 : -52.5;

  return [
    // Zone 1: Near Post Flick-On Area (5.5m - 10m from goal line, near post side)
    {
      id: "zone_near_post",
      name: "Near Post Flick-On Area",
      code: "NEAR-POST",
      xMin: Math.min(baseGoalX - sign * 5.5, baseGoalX - sign * 11.0),
      xMax: Math.max(baseGoalX - sign * 5.5, baseGoalX - sign * 11.0),
      yMin: category === "corner_left" ? -14.0 : 4.0,
      yMax: category === "corner_left" ? -4.0 : 14.0,
      centerX: parseFloat((baseGoalX - sign * 7.8).toFixed(1)),
      centerY: category === "corner_left" ? -8.5 : 8.5,
      expectedThreatXT: 0.84,
      expectedGoalXG: 0.31,
      threatTier: "CRITICAL",
      primaryRunner: attackingTowardsRight ? "Gabriel Magalhães" : "R. Dias",
      tacticalAction: "Front-post glance / flick across goal",
      successProbabilityPct: 44,
      accentColor: "#ef4444", // High-danger Red
    },

    // Zone 2: Central 6-to-12 Yard Sweet Spot (Directly in front of goal)
    {
      id: "zone_central_spot",
      name: "Penalty Spot Sweet Spot",
      code: "CENTRAL-BOX",
      xMin: Math.min(baseGoalX - sign * 8.5, baseGoalX - sign * 16.0),
      xMax: Math.max(baseGoalX - sign * 8.5, baseGoalX - sign * 16.0),
      yMin: -6.5,
      yMax: 6.5,
      centerX: parseFloat((baseGoalX - sign * 11.0).toFixed(1)),
      centerY: 0.0,
      expectedThreatXT: 0.92,
      expectedGoalXG: 0.38,
      threatTier: "CRITICAL",
      primaryRunner: attackingTowardsRight ? "W. Saliba / K. Havertz" : "E. Haaland",
      tacticalAction: "Direct aerial header on target",
      successProbabilityPct: 52,
      accentColor: "#f59e0b", // Amber/Gold
    },

    // Zone 3: Far Post Overload (Back post knockdown)
    {
      id: "zone_far_post",
      name: "Back Post Overload Zone",
      code: "FAR-POST",
      xMin: Math.min(baseGoalX - sign * 6.0, baseGoalX - sign * 13.0),
      xMax: Math.max(baseGoalX - sign * 6.0, baseGoalX - sign * 13.0),
      yMin: category === "corner_left" ? 5.0 : -14.0,
      yMax: category === "corner_left" ? 14.0 : -5.0,
      centerX: parseFloat((baseGoalX - sign * 9.5).toFixed(1)),
      centerY: category === "corner_left" ? 9.5 : -9.5,
      expectedThreatXT: 0.76,
      expectedGoalXG: 0.24,
      threatTier: "HIGH",
      primaryRunner: attackingTowardsRight ? "B. White / D. Rice" : "M. Akanji",
      tacticalAction: "Back post header / nod down across face",
      successProbabilityPct: 38,
      accentColor: "#3b82f6", // Blue
    },

    // Zone 4: Edge of Box / Second Ball Cutback
    {
      id: "zone_edge_cutback",
      name: "Edge of Box Cutback Zone",
      code: "EDGE-RECYCLE",
      xMin: Math.min(baseGoalX - sign * 16.5, baseGoalX - sign * 23.0),
      xMax: Math.max(baseGoalX - sign * 16.5, baseGoalX - sign * 23.0),
      yMin: -10.0,
      yMax: 10.0,
      centerX: parseFloat((baseGoalX - sign * 19.5).toFixed(1)),
      centerY: 0.0,
      expectedThreatXT: 0.62,
      expectedGoalXG: 0.16,
      threatTier: "MEDIUM",
      primaryRunner: attackingTowardsRight ? "M. Odegaard" : "K. De Bruyne",
      tacticalAction: "Driven cutback volley / direct edge strike",
      successProbabilityPct: 32,
      accentColor: "#8b5cf6", // Purple
    },
  ];
}

/**
 * Calculates curved Bézier delivery flight arcs.
 */
function generateTrajectories(
  ballX: number,
  ballY: number,
  zones: SetPieceTargetZone[],
  category: SetPieceCategory,
  attackingTowardsRight: boolean,
  goalX: number
): SetPieceTrajectory[] {
  const trajectories: SetPieceTrajectory[] = [];
  const start = { x: ballX, y: ballY };

  // 1. In-Swinging Trajectory (curving towards the goal mouth)
  const nearPostZone = zones.find((z) => z.id === "zone_near_post") || zones[0];
  const inSwingTarget = { x: nearPostZone.centerX, y: nearPostZone.centerY };
  // Control point bowed outwards towards touchline, then bending inward
  const inSwingApex = {
    x: (start.x + inSwingTarget.x) / 2 + (attackingTowardsRight ? -3.5 : 3.5),
    y: (start.y + inSwingTarget.y) / 2 + (start.y > 0 ? 5.5 : -5.5),
  };

  trajectories.push({
    id: "traj_in_swing",
    name: "Whipped In-Swinger",
    style: "in_swing",
    start,
    controlPoint: inSwingApex,
    target: inSwingTarget,
    flightTimeSec: 1.35,
    exitSpeedKmh: 88,
    curveAngleDeg: 28,
    selectionProbabilityPct: 48,
    color: "#06b6d4", // Neon Cyan
    description: "Curving trajectory whipping into the 6-yard channel to attack the front post.",
    targetZoneId: "zone_near_post",
  });

  // 2. Out-Swinging Trajectory (curving away from GK towards penalty spot)
  const centralZone = zones.find((z) => z.id === "zone_central_spot") || zones[1];
  const outSwingTarget = { x: centralZone.centerX, y: centralZone.centerY };
  const outSwingApex = {
    x: (start.x + outSwingTarget.x) / 2 + (attackingTowardsRight ? -1.5 : 1.5),
    y: (start.y + outSwingTarget.y) / 2 - (start.y > 0 ? 4.5 : -4.5),
  };

  trajectories.push({
    id: "traj_out_swing",
    name: "Out-Swinger to Penalty Spot",
    style: "out_swing",
    start,
    controlPoint: outSwingApex,
    target: outSwingTarget,
    flightTimeSec: 1.55,
    exitSpeedKmh: 82,
    curveAngleDeg: -22,
    selectionProbabilityPct: 34,
    color: "#f59e0b", // Warm Amber
    description: "Out-swinging delivery drifting away from GK into runner's aerial striking stride.",
    targetZoneId: "zone_central_spot",
  });

  // 3. Driven Cutback to Edge of Box
  const edgeZone = zones.find((z) => z.id === "zone_edge_cutback") || zones[3];
  const cutbackTarget = { x: edgeZone.centerX, y: edgeZone.centerY };
  const cutbackApex = {
    x: (start.x + cutbackTarget.x) / 2,
    y: (start.y + cutbackTarget.y) / 2,
  };

  trajectories.push({
    id: "traj_driven_cutback",
    name: "Driven Cutback to Edge",
    style: "driven_low",
    start,
    controlPoint: cutbackApex,
    target: cutbackTarget,
    flightTimeSec: 0.95,
    exitSpeedKmh: 96,
    curveAngleDeg: 5,
    selectionProbabilityPct: 18,
    color: "#a855f7", // Vivid Purple
    description: "Firm ground pass bypassing aerial crowd to unlock edge-of-box strike.",
    targetZoneId: "zone_edge_cutback",
  });

  // 4. Direct Free-Kick Shot (if within direct free-kick range)
  if (category === "freekick_direct" || category === "freekick_edge_box") {
    const directTarget = { x: goalX, y: start.y > 0 ? 2.8 : -2.8 }; // Aiming for top corner
    const directApex = {
      x: (start.x + directTarget.x) / 2,
      y: (start.y + directTarget.y) / 2 + (start.y > 0 ? -2.0 : 2.0),
    };

    trajectories.unshift({
      id: "traj_direct_shot",
      name: "Direct Wall Bender (Top Corner)",
      style: "direct_shot",
      start,
      controlPoint: directApex,
      target: directTarget,
      flightTimeSec: 0.88,
      exitSpeedKmh: 104,
      curveAngleDeg: 19,
      selectionProbabilityPct: 62,
      color: "#10b981", // Emerald Green
      description: "Direct dipped shot curling over the defensive wall into the upper corner.",
      targetZoneId: "zone_central_spot",
    });
  }

  return trajectories;
}

/**
 * Calculates defensive wall position at exactly 9.15m (10 yards).
 */
function calculateDefensiveWall(
  ballX: number,
  ballY: number,
  goalX: number,
  goalY: number,
  category: SetPieceCategory,
  distToGoal: number
): DefensiveWall | null {
  if (category === "open_play" || category.startsWith("corner")) {
    return null;
  }

  if (distToGoal < 9.5 || distToGoal > 35.0) {
    return null;
  }

  // Unit vector from ball to goal center
  const dx = goalX - ballX;
  const dy = goalY - ballY;
  const len = Math.hypot(dx, dy) || 1.0;
  const ux = dx / len;
  const uy = dy / len;

  // Wall is placed 9.15 meters along the ray from ball to goal
  const wallDist = 9.15;
  const wallCenterX = ballX + ux * wallDist;
  const wallCenterY = ballY + uy * wallDist;

  // Orthogonal perpendicular vector to create wall width
  const px = -uy;
  const py = ux;

  const playerCount = distToGoal <= 22 ? 5 : distToGoal <= 28 ? 4 : 3;
  const spacingM = 0.55; // Player shoulder width
  const totalWidth = (playerCount - 1) * spacingM;

  const wallPoints: { x: number; y: number }[] = [];
  for (let i = 0; i < playerCount; i++) {
    const offset = (i - (playerCount - 1) / 2) * spacingM;
    wallPoints.push({
      x: parseFloat((wallCenterX + px * offset).toFixed(2)),
      y: parseFloat((wallCenterY + py * offset).toFixed(2)),
    });
  }

  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

  return {
    required: true,
    playerCount,
    center: { x: parseFloat(wallCenterX.toFixed(2)), y: parseFloat(wallCenterY.toFixed(2)) },
    angleDeg: parseFloat(angleDeg.toFixed(1)),
    widthM: parseFloat(totalWidth.toFixed(1)),
    distanceFromBallM: 9.15,
    wallPoints,
  };
}
