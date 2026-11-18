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
  setPiece?: boolean;
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

export type TelestrationTool =
  | "select"
  | "pass_arrow"
  | "run_vector"
  | "spotlight"
  | "cover_zone"
  | "offside_plane"
  | "freehand"
  | "point_player"
  | "action_marker"
  | "press_arrow";

export interface TelestrationAnnotation {
  id: string;
  type: TelestrationTool;
  color: string;
  points: { x: number; y: number }[]; // In pitch coordinates [-52.5..52.5, -34..34]
  label?: string;
  subLabel?: string;
  actionCategory?:
    | "goal_chance"
    | "defensive_error"
    | "turnover"
    | "tactical_foul"
    | "counter_attack"
    | "key_pass"
    | "press_trigger"
    | "spacing"
    | "1v1_isolation";
  targetPlayerId?: number;
  targetPlayerName?: string;
  thickness?: number;
  radius?: number; // for spotlight / point_player
  width?: number; // for cover_zone
  height?: number;
  timestamp: string;
  author?: string;
  comment?: string;
}

// --- POST-MATCH PUNDITS & ANALYST COMMENTARY BREAKDOWN ---
export interface AnalystPostMatchComment {
  id: string;
  punditName: string;
  punditRole: string; // "Sky Sports Lead Analyst", "BBC Match of the Day Pundit", "Tactical Analyst"
  punditAvatar: string;
  channel: string; // "SKY SPORTS MNF", "BBC MOTD", "TNT SPORTS", "MATCHVISION STUDIOS"
  matchMinute: string; // e.g. "68:20", "74:10", "Full-Time"
  headline: string;
  comment: string;
  keyTakeaway: string;
  sentiment: "critical" | "praise" | "tactical_breakdown" | "turning_point";
  taggedPlayerIds: number[];
  taggedPlayerNames: string[];
  actionType:
    | "high_press"
    | "defensive_line_break"
    | "1v1_isolation"
    | "counter_attack"
    | "set_piece_delivery"
    | "turnover"
    | "box_defending";
  annotations: TelestrationAnnotation[];
  likes: number;
  timestamp: string;
  rating?: number;
}

// --- COMMERCIAL BROADCASTER SPONSORS ---
export interface CommercialSponsor {
  id: string;
  brandName: string;
  tagline: string;
  accentColor: string;
  badgeText: string;
  logoIcon: string; // e.g. "EASports", "Barclays", "Heineken", "Crypto"
}

// --- PLAYER AGENT & SCOUTING INTELLIGENCE TYPES ---
export interface PlayerRadarStats {
  progressiveThreat: number; // 0-100 percentile
  physicalEndurance: number;
  sprintExplosiveness: number;
  duelDominance: number;
  pressResistance: number;
  chanceCreation: number;
}

export interface PlayerValuation {
  playerId: number;
  playerName: string;
  teamName: string;
  role: string;
  age: number;
  nationality: string;
  marketValueEurM: number;
  valueChangeEurM: number;
  contractExpiry: string;
  agentAgency: string;
  radar: PlayerRadarStats;
  performanceTier: "World Class (Top 1%)" | "Elite UCL Tier" | "Premier League Standout" | "High Potential";
  keySellingPoints: string[];
  tacticalFitClubs: string[];
  physicalSummary: string;
}

export interface HeadToHeadMatchup {
  id: string;
  name: string;
  category: "Wing Duel" | "Striker vs Stopper" | "Midfield Control" | "Fullback vs Winger";
  playerAId: number;
  playerBId: number;
  playerAName: string;
  playerBName: string;
  playerATeam: string;
  playerBTeam: string;
  statComparisons: {
    label: string;
    valA: string | number;
    valB: string | number;
    advantage: "A" | "B" | "EQUAL";
  }[];
  tacticalVerdict: string;
}

// --- USER ROLE DASHBOARD INTERFACES ---
export type UserRole = "broadcast" | "coach" | "player" | "fan" | "admin" | "analyst";

export interface CoachDirective {
  id: string;
  targetPlayerId: number;
  targetPlayerName: string;
  sender: string; // e.g., "M. Arteta (Head Coach)"
  directiveType: "positional" | "pressing" | "tempo" | "setpiece";
  message: string;
  timestamp: string;
  status: "active" | "acknowledged" | "completed";
}

export interface FanPoll {
  id: string;
  question: string;
  options: { label: string; votes: number }[];
  totalVotes: number;
  userVotedIndex: number | null;
  category: "MOTM" | "Prediction" | "Tactics";
}

export interface SystemPipelineTelemetry {
  yoloFps: number;
  yoloLatencyMs: number;
  byteTrackConsistencyPct: number;
  homographyRmsErrorM: number;
  gpuUtilizationPct: number;
  gpuVramUsedGb: number;
  gpuVramTotalGb: number;
  gpuTempC: number;
  activeSockets: number;
  streamBitrateMbps: number;
  droppedFrames: number;
  calibrationStatus: "OPTIMAL" | "DEGRADED" | "RECALIBRATING";
}

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  title: string;
  team?: "Arsenal" | "Manchester City" | "Global Broadcast" | "System Infrastructure";
  avatarColor: string;
  shirtNumber?: number;
  badge: string;
  email: string;
  accessLevel: "Executive" | "Analyst" | "Athlete" | "Fan" | "SuperAdmin";
  preferredDashboard: string;
}

export const INITIAL_USERS: UserProfile[] = [
  {
    id: "USER-COACH-1",
    name: "Mikel Arteta",
    role: "coach",
    title: "Arsenal Head Coach & Tactical Director",
    team: "Arsenal",
    avatarColor: "#ef4444",
    badge: "COACH",
    email: "m.arteta@arsenal.com",
    accessLevel: "Executive",
    preferredDashboard: "coach",
  },
  {
    id: "USER-PLAYER-1",
    name: "Bukayo Saka",
    role: "player",
    title: "Arsenal Right Winger #7",
    team: "Arsenal",
    shirtNumber: 7,
    avatarColor: "#f59e0b",
    badge: "PLAYER",
    email: "b.saka@arsenal.com",
    accessLevel: "Athlete",
    preferredDashboard: "player",
  },
  {
    id: "USER-PLAYER-2",
    name: "Erling Haaland",
    role: "player",
    title: "Man City Striker #9",
    team: "Manchester City",
    shirtNumber: 9,
    avatarColor: "#38bdf8",
    badge: "PLAYER",
    email: "e.haaland@mancity.com",
    accessLevel: "Athlete",
    preferredDashboard: "player",
  },
  {
    id: "USER-FAN-1",
    name: "Alex Davies",
    role: "fan",
    title: "Matchday Club Member & Spectacles AR User",
    team: "Arsenal",
    avatarColor: "#8b5cf6",
    badge: "FAN / AR",
    email: "alex.davies@spectator.tv",
    accessLevel: "Fan",
    preferredDashboard: "fan",
  },
  {
    id: "USER-BROADCAST-1",
    name: "Sarah Jenkins",
    role: "broadcast",
    title: "Lead Match Director · Premier League Global Feed",
    team: "Global Broadcast",
    avatarColor: "#ef4444",
    badge: "DIRECTOR",
    email: "s.jenkins@skysports.com",
    accessLevel: "Analyst",
    preferredDashboard: "broadcast",
  },
  {
    id: "USER-ADMIN-1",
    name: "David Thorne",
    role: "admin",
    title: "Computer Vision & Edge Infrastructure Lead",
    team: "System Infrastructure",
    avatarColor: "#10b981",
    badge: "ADMIN",
    email: "d.thorne@matchvision.ai",
    accessLevel: "SuperAdmin",
    preferredDashboard: "admin",
  },
];

// --- PLAYER HISTORICAL STATS & COACH OPPONENT INTELLIGENCE INTERFACES ---
export interface SeasonRecord {
  season: string; // e.g. "2024/25", "2023/24", "2022/23"
  club: string;
  competition: string;
  appearances: number;
  starts: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  xg: number;
  xa: number;
  shotsPer90: number;
  shotAccuracyPct: number;
  passAccuracyPct: number;
  progressivePassesPer90: number;
  keyPassesPer90: number;
  tacklesPer90: number;
  interceptionsPer90: number;
  groundDuelsWonPct: number;
  aerialDuelsWonPct: number;
  avgDistanceKmPer90: number;
  topSpeedKmh: number;
  yellowCards: number;
  redCards: number;
  ratingAvg: number;
}

export interface HeadToHeadRecord {
  opponentTeam: string;
  careerMatches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsScored: number;
  assists: number;
  chancesCreated: number;
  avgDuelsWonPct: number;
  historicalThreatScore: number; // 0-100
  notableMoment: string;
  directOpponentMatchup: string; // e.g. "vs William Saliba", "vs Josko Gvardiol"
  directMatchupSuccessPct: number;
}

export interface TacticalVulnerability {
  area: string;
  description: string;
  coachExploitAdvice: string;
  severity: "critical" | "moderate" | "low";
}

export interface PlayerHistoricalProfile {
  id: number;
  name: string;
  fullName: string;
  shirtNumber: number;
  team: "Arsenal" | "Manchester City";
  isOpponent: boolean;
  role: "GK" | "DEF" | "MID" | "ATT";
  positionDetail: string;
  nationality: string;
  age: number;
  heightCm: number;
  preferredFoot: "Left" | "Right" | "Both";
  marketValueEurM: number;
  seasons: SeasonRecord[];
  headToHead: HeadToHeadRecord;
  recentFormRatings: number[];
  strengths: string[];
  vulnerabilities: TacticalVulnerability[];
  recommendedCoachDirective: {
    directiveType: "positional" | "pressing" | "tempo" | "setpiece";
    message: string;
    targetDefenderOrMidfielder: string;
  };
  preferredAttackZones: string[];
  pressResistanceScore: number;
  fatigueRiskCurrent: number;
  tags: string[];
}

export type TacticalAlertCategory =
  | "high_press"
  | "line_break"
  | "counter_attack"
  | "overload"
  | "space_exploit";

export type TacticalAlertSeverity = "critical" | "warning" | "opportunity";

export interface TacticalAlertCoordinate {
  x: number;
  y: number;
}

export interface TacticalPitchAlert {
  id: string;
  category: TacticalAlertCategory;
  severity: TacticalAlertSeverity;
  title: string;
  subtitle: string;
  description: string;
  initiatingTeamId: number; // 0 = Arsenal, 1 = Man City
  initiatingTeamName: string;
  targetTeamId: number;
  primaryPlayerIds: number[];
  primaryPlayerNames: string[];
  targetPlayerId?: number;
  targetPlayerName?: string;
  timestamp: string; // e.g. "68:45"
  timeSec: number;
  durationMs: number;
  centroid: TacticalAlertCoordinate;
  targetLocation?: TacticalAlertCoordinate;
  vectorStart?: TacticalAlertCoordinate;
  vectorEnd?: TacticalAlertCoordinate;
  zonePolygon?: TacticalAlertCoordinate[];
  metrics: {
    closingSpeedKmh?: number;
    distanceToGoalM?: number;
    numericalAdvantage?: string;
    expectedThreatXt?: number;
    spaceMeters?: number;
    pressingIntensityPct?: number;
  };
  coachDirectiveSuggestion: string;
  acknowledged?: boolean;
}

