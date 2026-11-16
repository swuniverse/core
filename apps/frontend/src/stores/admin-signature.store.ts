import { create } from 'zustand';
import type {
  AdminFlightSignatureFieldDto,
  AdminFlightSignatureFilter,
  AdminFlightSignatureQueryDto,
} from '@swuniverse/shared';

export type SignatureViewport = Pick<
  AdminFlightSignatureQueryDto,
  'xStart' | 'xEnd' | 'yStart' | 'yEnd'
> & { layerId: number };

interface AdminSignatureState {
  enabled: boolean;
  filter: AdminFlightSignatureFilter;
  targetId: string;
  viewport: SignatureViewport | null;
  fields: AdminFlightSignatureFieldDto[];
  setEnabled: (enabled: boolean) => void;
  setFilter: (filter: AdminFlightSignatureFilter) => void;
  setTargetId: (targetId: string) => void;
  setViewport: (viewport: SignatureViewport | null) => void;
  setFields: (fields: AdminFlightSignatureFieldDto[]) => void;
}

export const useAdminSignatureStore = create<AdminSignatureState>(
  (set, get) => ({
    enabled: false,
    filter: 'ALL',
    targetId: '',
    viewport: null,
    fields: [],
    setEnabled: (enabled) => set({ enabled, fields: [] }),
    setFilter: (filter) => set({ filter, targetId: '', fields: [] }),
    setTargetId: (targetId) => set({ targetId, fields: [] }),
    setViewport: (viewport) => {
      const current = get().viewport;
      if (
        current?.layerId === viewport?.layerId &&
        current?.xStart === viewport?.xStart &&
        current?.xEnd === viewport?.xEnd &&
        current?.yStart === viewport?.yStart &&
        current?.yEnd === viewport?.yEnd
      )
        return;
      set({ viewport, fields: [] });
    },
    setFields: (fields) => set({ fields }),
  }),
);
