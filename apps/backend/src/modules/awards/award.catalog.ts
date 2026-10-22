export const AWARD_CATALOG = [
  { key: 'RESEARCH_STATIONS', description: 'Stationsforschung abgeschlossen', prestige: 10, isNpc: false },
  { key: 'RESEARCH_INTERSTELLAR', description: 'Interstellare Forschung abgeschlossen', prestige: 10, isNpc: false },
  { key: 'DATABASE_COMPLETE', description: 'Eine Datenbankkategorie vervollständigt', prestige: 10, isNpc: false },
  { key: 'LAYER_EXPLORED', description: 'Eine Galaxieebene vollständig erkundet', prestige: 20, isNpc: false },
  { key: 'LOTTERY_WINNER', description: 'Gewinner der Hutten-Lotterie', prestige: 5, isNpc: false },
  { key: 'RPG_DISTINGUISHED_ROLE', description: 'Herausragende Rolle im Rollenspiel', prestige: 10, isNpc: false },
  { key: 'COMMUNITY_HELPER', description: 'Verdienste um die Gemeinschaft', prestige: 10, isNpc: false },
  { key: 'REBEL_COMMAND_POS', description: 'Auszeichnung des Oberkommandos der Rebellenallianz', prestige: 5, isNpc: true },
  { key: 'REBEL_COMMAND_NEG', description: 'Rüge des Oberkommandos der Rebellenallianz', prestige: 0, isNpc: true },
  { key: 'IMPERIAL_COMMAND_POS', description: 'Auszeichnung des Imperialen Oberkommandos', prestige: 5, isNpc: true },
  { key: 'IMPERIAL_COMMAND_NEG', description: 'Rüge des Imperialen Oberkommandos', prestige: 0, isNpc: true },
  { key: 'HUTT_CARTEL_POS', description: 'Gunst des Hutten-Kartells', prestige: 5, isNpc: true },
  { key: 'HUTT_CARTEL_NEG', description: 'Missgunst des Hutten-Kartells', prestige: 0, isNpc: true },
] as const;

export const AWARD_IMAGE = '/favicon.ico';
