import type {
  StarmapFieldTradePostDto,
  StarmapGalaxyFieldDto,
  StarmapTerritoryOwnerDto,
} from '@swuniverse/shared';

/** Trade post marker on the galaxy map (STU `tradepost` icon); the legend uses the same colour. */
export const TRADE_POST_COLOR = 0xf59e0b;

/** STU `getTerritoryOwnerTitle`. */
export function territoryOwnerTitle(owner: StarmapTerritoryOwnerDto): string {
  return owner.allianceName
    ? `Gebiet: ${owner.allianceName} (${owner.playerName})`
    : `Gebiet: ${owner.playerName}`;
}

/** STU `getTradepostTitle`. */
export function tradePostTitle(post: StarmapFieldTradePostDto): string {
  const condition = post.licenseCondition;
  return condition
    ? `${post.name} (Lizenz für ${condition.durationDays} Tage: ${condition.amount} ${condition.commodityName})`
    : post.name;
}

/** Tooltip lines in STU `getTooltip` order, prefixed with the coordinates. */
export function fieldTooltipLines(field: StarmapGalaxyFieldDto): string[] {
  const details = field.details;
  const lines = [`${field.cx}, ${field.cy}`, field.fieldType.name];
  if (!details) return lines;

  lines.push(...details.effectTexts);
  if (details.isImpassable) lines.push('Unpassierbar');
  if (details.territoryOwner) lines.push(territoryOwnerTitle(details.territoryOwner));

  // STU `getTitle`: "<Posten> über <System>-System, <Region>".
  const title = [
    [details.tradePost && tradePostTitle(details.tradePost), field.starSystem && `${field.starSystem.name}-System`]
      .filter(Boolean)
      .join(' über '),
    details.region?.name,
  ]
    .filter(Boolean)
    .join(', ');
  if (title) lines.push(title);
  return [...new Set(lines)];
}
