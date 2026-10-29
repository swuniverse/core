export enum MessageTargetKind {
  COLONY = 'COLONY',
  SPACECRAFT = 'SPACECRAFT',
  HOLONET_POST = 'HOLONET_POST',
  ALLIANCE_TOPIC = 'ALLIANCE_TOPIC',
}

export interface MessageTarget {
  kind: MessageTargetKind;
  id: number;
}
