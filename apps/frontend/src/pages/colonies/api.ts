import { api } from '../../services/api';
import type {
  BuildingDef,
  BuildingMassActionMode,
  BuildingMassActionResult,
  BuildingRepairPreview,
  BuildingRepairResult,
  Colony,
  ColonyEventDto,
  CommodityDef,
  ShipClassDef,
  TerraformingDef,
} from './types';

export const colonyApi = {
  fetchColonies: () => api.get<Colony[]>('/colonies'),
  fetchColonyDetail: (id: number) => api.get<Colony>(`/colonies/${id}`),
  fetchCommodities: () => api.get<CommodityDef[]>('/colonies/commodities/all'),
  fetchAvailableBuildings: () =>
    api.get<BuildingDef[]>('/colonies/buildings/available'),
  fetchAllBuildings: () => api.get<BuildingDef[]>('/colonies/buildings/all'),
  fetchTerraforming: () =>
    api.get<TerraformingDef[]>('/colonies/terraforming/all'),
  fetchShipClasses: () => api.get<ShipClassDef[]>('/spacecraft/classes'),

  activateBuildings: (
    colonyId: number,
    mode: BuildingMassActionMode,
    options: { fieldIndexes?: number[]; commodityId?: number } = {},
  ) =>
    api.post<BuildingMassActionResult, unknown>(
      `/colonies/${colonyId}/buildings/activate`,
      {
        mode,
        ...options,
      },
    ),
  deactivateBuildings: (
    colonyId: number,
    mode: BuildingMassActionMode,
    options: { fieldIndexes?: number[]; commodityId?: number } = {},
  ) =>
    api.post<BuildingMassActionResult, unknown>(
      `/colonies/${colonyId}/buildings/deactivate`,
      {
        mode,
        ...options,
      },
    ),
  fetchBuildingRepairPreview: (colonyId: number, fieldIndexes?: number[]) => {
    const query = fieldIndexes?.length
      ? `?fieldIndexes=${fieldIndexes.join(',')}`
      : '';
    return api.get<BuildingRepairPreview>(
      `/colonies/${colonyId}/buildings/repair-preview${query}`,
    );
  },
  repairDamagedBuildings: (colonyId: number, fieldIndexes?: number[]) =>
    api.post<BuildingRepairResult, unknown>(
      `/colonies/${colonyId}/buildings/repair-damaged`,
      { fieldIndexes },
    ),
  buildBuilding: (colonyId: number, fieldIndex: number, buildingId: number) =>
    api.post(`/colonies/${colonyId}/build`, { fieldIndex, buildingId }),
  demolishBuilding: (colonyId: number, fieldIndex: number) =>
    api.delete(`/colonies/${colonyId}/fields/${fieldIndex}/building`),
  toggleBuilding: (colonyId: number, fieldIndex: number) =>
    api.post(`/colonies/${colonyId}/fields/${fieldIndex}/toggle`, {}),
  terraformField: (
    colonyId: number,
    fieldIndex: number,
    terraformingId: number,
  ) =>
    api.post(`/colonies/${colonyId}/fields/${fieldIndex}/terraform`, {
      terraformingId,
    }),

  buildShip: (
    colonyId: number,
    shipClassId: number,
    name: string,
    moduleTypes?: string[],
    buildPlanName?: string,
    moduleCommodityIds?: number[],
  ) =>
    api.post(`/colonies/${colonyId}/build-ship`, {
      shipClassId,
      name,
      moduleTypes,
      buildPlanName,
      moduleCommodityIds,
    }),
  queueShipRepair: (colonyId: number, shipId: number) =>
    api.post(`/colonies/${colonyId}/ships/${shipId}/repair-queue`, {}),
  queueShipRetrofit: (
    colonyId: number,
    shipId: number,
    moduleCommodityIds: number[],
    buildPlanName?: string,
  ) =>
    api.post(`/colonies/${colonyId}/ships/${shipId}/retrofit-queue`, {
      moduleCommodityIds,
      buildPlanName,
    }),
  cancelShipyardQueue: (colonyId: number, queueId: number) =>
    api.delete(`/colonies/${colonyId}/shipyard-queue/${queueId}`),

  startFabrication: (
    colonyId: number,
    itemKey: string,
    queueType: 'MODULE' | 'TORPEDO',
    buildingFunctionId: number,
  ) =>
    api.post(`/colonies/${colonyId}/fabrication-queue`, {
      itemKey,
      queueType,
      amount: 1,
      buildingFunctionId,
    }),
  cancelFabrication: (colonyId: number, queueId: number) =>
    api.delete(`/colonies/${colonyId}/fabrication-queue/${queueId}`),

  queueCrewTraining: (colonyId: number, amount: number) =>
    api.post(`/colonies/${colonyId}/crew-training`, { amount }),
  assignCrewToShip: (colonyId: number, shipId: number, amount: number) =>
    api.post(`/colonies/${colonyId}/ships/${shipId}/crew/assign`, { amount }),
  unassignCrewFromShip: (colonyId: number, shipId: number, amount: number) =>
    api.post(`/colonies/${colonyId}/ships/${shipId}/crew/unassign`, { amount }),

  landShip: (colonyId: number, shipId: number) =>
    api.post(`/colonies/${colonyId}/ships/${shipId}/land`, {}),
  disassembleShip: (colonyId: number, shipId: number) =>
    api.post(`/colonies/${colonyId}/ships/${shipId}/disassemble`, {}),

  buildAirfieldRump: (colonyId: number, shipClassId: number, amount: number) =>
    api.post(`/colonies/${colonyId}/hangar/build-rump`, {
      shipClassId,
      amount,
    }),
  startHangarShip: (colonyId: number, shipClassId: number, name?: string) =>
    api.post(`/colonies/${colonyId}/hangar/start-ship`, { shipClassId, name }),

  loadShields: (colonyId: number, amount: number) =>
    api.post(`/colonies/${colonyId}/shields/load`, { amount }),
  setShieldFrequency: (colonyId: number, frequency: number) =>
    api.post(`/colonies/${colonyId}/shields/frequency`, { frequency }),
  setDefenseTorpedoType: (colonyId: number, commodityId: number | null) =>
    api.post(`/colonies/${colonyId}/defense/torpedo-type`, { commodityId }),

  fetchEvents: (colonyId: number, unreadOnly = false) =>
    api.get<ColonyEventDto[]>(
      `/colonies/${colonyId}/events?limit=50&unreadOnly=${unreadOnly}`,
    ),
  markEventRead: (colonyId: number, eventId: number) =>
    api.post(`/colonies/${colonyId}/events/${eventId}/read`, {}),
  markAllEventsRead: (colonyId: number) =>
    api.post(`/colonies/${colonyId}/events/read-all`, {}),
};
