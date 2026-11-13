const TRADE_NETWORK_NAMES: Record<number, string> = {
  1: 'Imperiales Versorgungsnetz',
  2: 'Versorgungsnetz der Rebellenallianz',
  3: 'Hutten-Handelsnetz',
};

/** Player networks are numbered after their owner (tmw-T12a). */
export function tradeNetworkName(networkId: number, ownerName?: string | null): string {
  return TRADE_NETWORK_NAMES[networkId] ?? (ownerName ? `Handelsnetz von ${ownerName}` : `Handelsnetz ${networkId}`);
}
