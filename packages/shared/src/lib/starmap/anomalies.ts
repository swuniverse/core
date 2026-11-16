/** An active anomaly as shown in local scans, field context and colony scans. */
export interface AnomalyViewDto {
  /** Stable anomaly type key, e.g. `SUBSPACE_ELLIPSE`. */
  type: string;
  /** Present for locally actionable seasonal anomalies. */
  id?: number;
  canOpen?: boolean;
  name: string;
  remainingTicks: number;
  /** Ion storm intensity (STU 50–200). */
  intensity?: number;
}
