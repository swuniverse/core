/** Narrow view onto the websocket gateway's list of connected players. */
export interface OnlinePlayersPort {
  onlineUserIds(): number[];
}

export const ONLINE_PLAYERS = Symbol('ONLINE_PLAYERS');
