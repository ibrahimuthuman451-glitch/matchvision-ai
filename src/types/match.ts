export interface Player {
  id: number;
  trackId: number;
  name: string;
  number: number;
  role: "GK" | "DEF" | "MID" | "ATT" | "REF";
  teamId: number; // 0 = Team A (Arsenal Red), 1 = Team B (Man City Sky Blue), 2 = Referee (Yellow)
  teamName: string;
  x: number; // Pitch X in meters: [-52.5, +52.5]
  y: number; // Pitch Y in meters: [-34.0, +34.0]
  vx: number; // Velocity m/s
  vy: number;
  speedKmh: number;
  distCoveredM: number;
  sprintCount: number;
  touches: number;
  passAcc: number;
  xtContribution: number;
  // Advanced Individual Tracking Stats
  groundDuelsWon: number;
  groundDuelsTotal: number;
  aerialDuelsWon: number;
  aerialDuelsTotal: number;
  touchesInOppBox: number;
  progressivePasses: number;
  progressiveCarries: number;
  tacklesWon: number;
  tacklesTotal: number;
  interceptions: number;
  recoveries: number;
  pressures: number;
  keyPasses: number;
  passesIntoFinalThird: number;
  dribblesCompleted: number;
  dribblesTotal: number;
  xg: number;
  xa: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2] in broadcast 1920x1080
  footImgPt: [number, number];
  history: [number, number][]; // past pitch coords
}

export interface Ball {
  x: number; // Pitch X meters
  y: number; // Pitch Y meters
  z: number; // Elevation meters (0 = on turf, up to 4.5m for aerial ball)
  vx: number;
  vy: number;
  speedKmh: number;
  carrierTrackId: number | null;
  possessionTeamId: number | null;
  trajectory: [number, number][];
}

export interface MatchEvent {
  id: string;
  type:
    | "pass"
    | "shot"
    | "turnover"
    | "tackle"
    | "interception"
    | "final_third_entry"
    | "box_entry"
    | "ground_duel"
    | "aerial_duel"
    | "progressive_carry";
  timestamp: string; // "MM:SS"
  timeSec: number;
  teamId: number;
  playerId: number;
  playerName: string;
  playerNumber: number;
  x: number;
  y: number;
  outcome: "success" | "saved" | "blocked" | "off_target" | "intercepted" | "won" | "lost";
  xg?: number;
  speedKmh?: number;
  description: string;
}

export interface TeamStats {
  teamId: number;
  teamName: string;
  primaryColor: string;
  secondaryColor: string;
  possessionPct: number;
  defLineHeightM: number;
  compactnessM2: number;
  widthM: number;
  lengthM: number;
  xgTotal: number;
  fieldTiltPct: number;
  ppda: number;
  shots: number;
  shotsOnTarget: number;
  completedPasses: number;
  totalPasses: number;
  // Advanced Team Physical & Tactical Stats
  groundDuelsWon: number;
  groundDuelsTotal: number;
  aerialDuelsWon: number;
  aerialDuelsTotal: number;
  touchesInOppBox: number;
  progressivePasses: number;
  progressiveCarries: number;
  tacklesWon: number;
  tacklesTotal: number;
  interceptions: number;
  recoveries: number;
  passesIntoFinalThird: number;
  passesIntoBox: number;
  bigChancesCreated: number;
  corners: number;
  crossesCompleted: number;
  crossesTotal: number;
}

export interface TacticalOverlaysConfig {
  voronoi: boolean;
  convexHulls: boolean;
  defensiveLines: boolean;
  passNetwork: boolean;
  pitchZones: boolean;
  heatmap: boolean;
  trails: boolean;
  playerBadges: boolean;
  speedVectors: boolean;
  offsideLine: boolean;
}

export type ViewMode = "split" | "tactical" | "broadcast" | "spectacles";

export type GraphicStyle =
  | "lower_third"
  | "tactical_banner"
  | "breaking_alert"
  | "player_card"
  | "spectacles_hud"
  | "live_ticker";

export interface BroadcastGraphic {
  id: string;
  type: GraphicStyle;
  title: string;
  subtitle: string;
  accentColor: string;
  badgeText?: string;
  isOnAir: boolean;
  position: "bottom" | "top" | "center" | "ticker";
  targetDevice?: "all" | "spectacles" | "tv";
  spectaclesGlassTint?: string;
  tickerText?: string;
  timestamp: string;
  author: string;
}

