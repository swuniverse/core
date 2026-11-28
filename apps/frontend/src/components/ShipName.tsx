import { BbCodeText } from './BbCodeText';

/** A ship name with inline BB-Code (b, i, u, s, color) rendered. */
export function ShipName({
  name,
  className,
}: {
  name: string | null | undefined;
  className?: string;
}) {
  return (
    <BbCodeText text={name} as="span" className={className} inlineOnly />
  );
}
