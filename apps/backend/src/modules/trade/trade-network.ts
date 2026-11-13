const TRADE_NETWORK_NAMES: Record<number, string> = {
  1: 'Imperiales Versorgungsnetz',
  2: 'Versorgungsnetz der Rebellenallianz',
  3: 'Hutten-Handelsnetz',
};

export function tradeNetworkName(networkId: number): string {
  return TRADE_NETWORK_NAMES[networkId] ?? `Handelsnetz ${networkId}`;
}
