import { http } from "viem"; // or regular fetch

export interface Team {
  _id: string;
  name_en: string;
  name_fa: string;
  flag: string;
  fifa_code: string;
  iso2: string;
  groups: string;
  id: string;
}

export interface Match {
  _id: string;
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: string;
  away_score: string;
  home_scorers?: string;
  away_scorers?: string;
  group: string;
  matchday: string;
  local_date: string;
  stadium_id: string;
  finished: string; // "TRUE" | "FALSE"
  time_elapsed: string; // "finished" | "notstarted" | live minutes
  type: string; // "group" | "knockout"
  home_team_name_en: string;
  away_team_name_en: string;
}

export interface GroupStanding {
  _id: string;
  group: string;
  teams: {
    team_id: string;
    name_en: string;
    flag: string;
    mp: number; // matches played
    w: number;  // wins
    d: number;  // draws
    l: number;  // losses
    gf: number; // goals for
    ga: number; // goals against
    gd: number; // goal diff
    pts: number;// points
  }[];
}

// Memory cache to prevent hitting rate limits
let cachedTeams: Team[] | null = null;
let cachedMatches: Match[] | null = null;
let cachedGroups: any[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 30 * 1000; // 30 seconds cache TTL

const MOCK_TEAMS: Team[] = [
  { _id: "m1", id: "1", name_en: "Mexico", name_fa: "مکزیک", flag: "https://flagcdn.com/w80/mx.png", fifa_code: "MEX", iso2: "MX", groups: "A" },
  { _id: "m2", id: "2", name_en: "South Africa", name_fa: "آفریقای جنوبی", flag: "https://flagcdn.com/w80/za.png", fifa_code: "RSA", iso2: "ZA", groups: "A" },
  { _id: "m3", id: "3", name_en: "United States", name_fa: "ایالات متحده", flag: "https://flagcdn.com/w80/us.png", fifa_code: "USA", iso2: "US", groups: "D" },
  { _id: "m4", id: "33", name_en: "France", name_fa: "فرانسه", flag: "https://flagcdn.com/w80/fr.png", fifa_code: "FRA", iso2: "FR", groups: "I" },
  { _id: "m5", id: "9", name_en: "Brazil", name_fa: "برزیل", flag: "https://flagcdn.com/w80/br.png", fifa_code: "BRA", iso2: "BR", groups: "C" },
  { _id: "m6", id: "21", name_en: "Netherlands", name_fa: "هلند", flag: "https://flagcdn.com/w80/nl.png", fifa_code: "NED", iso2: "NL", groups: "F" },
  { _id: "m7", id: "41", name_en: "Portugal", name_fa: "پرتغال", flag: "https://flagcdn.com/w80/pt.png", fifa_code: "POR", iso2: "PT", groups: "J" },
  { _id: "m8", id: "5", name_en: "Canada", name_fa: "کانادا", flag: "https://flagcdn.com/w80/ca.png", fifa_code: "CAN", iso2: "CA", groups: "B" }
];

const MOCK_MATCHES: Match[] = [
  {
    _id: "mg1", id: "1", home_team_id: "1", away_team_id: "2", home_score: "2", away_score: "0",
    home_scorers: "J. Quiñones 9', R. Jiménez 67'", away_scorers: "", group: "A", matchday: "1",
    local_date: "06/11/2026 13:00", stadium_id: "1", finished: "TRUE", time_elapsed: "finished", type: "group",
    home_team_name_en: "Mexico", away_team_name_en: "South Africa"
  },
  {
    _id: "mg2", id: "2", home_team_id: "3", away_team_id: "21", home_score: "1", away_score: "3",
    home_scorers: "C. Pulisic 45'", away_scorers: "C. Gakpo 12', M. Depay 34', V. van Dijk 88'", group: "D", matchday: "1",
    local_date: "06/12/2026 20:00", stadium_id: "2", finished: "TRUE", time_elapsed: "finished", type: "group",
    home_team_name_en: "United States", away_team_name_en: "Netherlands"
  },
  {
    _id: "mg3", id: "3", home_team_id: "33", away_team_id: "41", home_score: "0", away_score: "0",
    home_scorers: "", away_scorers: "", group: "I", matchday: "1",
    local_date: "06/13/2026 18:00", stadium_id: "3", finished: "FALSE", time_elapsed: "notstarted", type: "group",
    home_team_name_en: "France", away_team_name_en: "Portugal"
  }
];

const MOCK_STANDINGS: GroupStanding[] = [
  {
    _id: "ms1",
    group: "A",
    teams: [
      { team_id: "1", name_en: "Mexico", flag: "https://flagcdn.com/w80/mx.png", mp: 1, w: 1, d: 0, l: 0, gf: 2, ga: 0, gd: 2, pts: 3 },
      { team_id: "2", name_en: "South Africa", flag: "https://flagcdn.com/w80/za.png", mp: 1, w: 0, d: 0, l: 1, gf: 0, ga: 2, gd: -2, pts: 0 }
    ]
  },
  {
    _id: "ms2",
    group: "D",
    teams: [
      { team_id: "21", name_en: "Netherlands", flag: "https://flagcdn.com/w80/nl.png", mp: 1, w: 1, d: 0, l: 0, gf: 3, ga: 1, gd: 2, pts: 3 },
      { team_id: "3", name_en: "United States", flag: "https://flagcdn.com/w80/us.png", mp: 1, w: 0, d: 0, l: 1, gf: 1, ga: 3, gd: -2, pts: 0 }
    ]
  }
];

export async function fetchLiveTeams(): Promise<Team[]> {
  const now = Date.now();
  if (cachedTeams && now - lastFetchTime < CACHE_TTL) {
    return cachedTeams;
  }

  try {
    const res = await fetch("https://worldcup26.ir/get/teams", { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const data = await res.json();
    if (data && Array.isArray(data.teams)) {
      cachedTeams = data.teams;
      lastFetchTime = now;
      return cachedTeams!;
    }
    throw new Error("Invalid teams format returned");
  } catch (error) {
    console.warn("Failed to fetch live World Cup teams, using local mock fallback:", error);
    return MOCK_TEAMS;
  }
}

export async function fetchLiveMatches(): Promise<Match[]> {
  const now = Date.now();
  if (cachedMatches && now - lastFetchTime < CACHE_TTL) {
    return cachedMatches;
  }

  try {
    const res = await fetch("https://worldcup26.ir/get/games", { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const data = await res.json();
    if (data && Array.isArray(data.games)) {
      cachedMatches = data.games;
      lastFetchTime = now;
      return cachedMatches!;
    }
    throw new Error("Invalid games format returned");
  } catch (error) {
    console.warn("Failed to fetch live World Cup matches, using local mock fallback:", error);
    return MOCK_MATCHES;
  }
}

export async function fetchLiveGroups(): Promise<GroupStanding[]> {
  const now = Date.now();
  if (cachedGroups && now - lastFetchTime < CACHE_TTL) {
    return cachedGroups;
  }

  try {
    const res = await fetch("https://worldcup26.ir/get/groups", { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const data = await res.json();
    if (data && Array.isArray(data.groups)) {
      cachedGroups = data.groups;
      lastFetchTime = now;
      return cachedGroups!;
    }
    throw new Error("Invalid groups format returned");
  } catch (error) {
    console.warn("Failed to fetch live World Cup groups, using local mock fallback:", error);
    return MOCK_STANDINGS;
  }
}
