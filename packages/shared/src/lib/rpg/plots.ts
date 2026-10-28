export interface SaveRpgPlotDto {
  title: string;
  description: string;
}

export interface RpgPlotMemberDto {
  userId: number;
  username: string;
  joinedAt: string;
}

export interface RpgPlotDto {
  id: number;
  title: string;
  description: string;
  creatorId: number;
  creatorName: string;
  startedAt: string;
  endedAt: string | null;
  members: RpgPlotMemberDto[];
}

export interface RpgPlotListDto {
  data: RpgPlotDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
