/** STU table heading: label plus info icon when the column has a tooltip. */
export function InfoHeading({ label, tooltip }: { label: string; tooltip?: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      {tooltip && <img src="/assets/buttons/info2.png" alt="" aria-hidden="true" className="size-4" />}
    </span>
  );
}
