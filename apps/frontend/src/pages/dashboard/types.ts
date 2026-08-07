export interface ActiveResearch {
  name: string;
  progress: number;
  pointsRequired: number;
  ticksRemaining?: number | null;
  commodity?: { id: number; name: string } | null;
  blockedReason?: string | null;
}

export interface ActiveBuildJob {
  fieldIndex: number;
  buildingId: number;
  buildingName: string;
  finishesAt: string | null;
  progress: number;
}

export interface DashboardBuildJob extends ActiveBuildJob {
  colonyName: string;
}

export interface ColonySummary {
  id: number;
  name: string;
  energy: number;
  energyMax: number;
  population: number;
  populationMax: number;
  storageUsed: number;
  storageMax: number;
  locationLabel?: string;
}

export interface HolonetPost {
  id: number;
  title: string;
  createdAt: string;
  category: string;
  commentCount: number;
  isUnread?: boolean;
  author?: { username: string };
  authorName?: string;
}

export interface ColonizationLimit {
  type: string;
  count: number;
  limit: number;
  max: number;
}

export interface ColonizationStatus {
  limits: {
    planet: ColonizationLimit;
    moon: ColonizationLimit;
    asteroid: ColonizationLimit;
  };
}

export interface CrewInfo {
  assigned: number;
  globalLimit: number;
}

export interface Spacecraft {
  id: number;
  name: string;
  status: string;
  alertState?: string;
  arrivalAt: string | null;
  hull?: number;
  hullMax?: number;
  crew?: number;
  crewMax?: number;
  warpdrive?: number;
  warpdriveMax?: number;
}

export interface BaustelleAlert {
  id: string;
  severity: 'critical' | 'warning';
  icon: string;
  label: string;
  detail: string;
  linkTo: string;
}

export interface ColonyWarning {
  colonyId: number;
  colonyName: string;
  type: 'energy' | 'storage';
  message: string;
}

export interface ColonyEvent {
  id: number;
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  createdAt: string;
  colonyName?: string;
  colonyId?: number;
}

export interface RankingEntry {
  username: string;
  value: number;
  rank: number;
  isCurrentUser?: boolean;
}

export interface ServerStats {
  settlers: number;
  colonies: number;
  ships: number;
}

export interface InboxMessage {
  id: number;
  subject: string;
  isRead: boolean;
  isSystem: boolean;
  sender?: { username: string };
  createdAt: string;
}

export interface CurrentObjective {
  id: number;
  title: string;
  description?: string;
  progress?: number;
  target?: number;
}

export interface TickStatus {
  nextTickAt: string;
  currentTickIndex: number;
  totalTicks: number;
}

export interface DashboardData {
  activeResearch: ActiveResearch | null;
  queuedResearch: ActiveResearch | null;
  buildJobs: DashboardBuildJob[];
  holonetPosts: HolonetPost[];
  colonizationLimits: ColonizationStatus | null;
  crewInfo: CrewInfo | null;
  onlinePlayers: Array<{ id: number; username: string; faction: string; avatar?: string | null }>;
  colonyCount: number;
  fleetTotal: number;
  fleetInFlight: number;
  shipsInFlight: Spacecraft[];
  allShips: Spacecraft[];
  researchCompleted: number;
  unreadMessages: number;
  warnings: ColonyWarning[];
  colonyEvents: ColonyEvent[];
  serverStats: ServerStats | null;
  inboxMessages: InboxMessage[];
  tickStatus: TickStatus | null;
  currentObjective: CurrentObjective | null;
  baustelleAlerts: BaustelleAlert[];
}
