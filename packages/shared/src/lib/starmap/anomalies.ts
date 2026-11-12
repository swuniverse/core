/** An active anomaly as shown in local scans, field context and colony scans. */
export interface AnomalyViewDto {
  /** Stable anomaly type key, e.g. `SUBSPACE_ELLIPSE`. */
  type: string;
  name: string;
  remainingTicks: number;
}
