import { IsBoolean, IsEnum, IsInt, Min } from 'class-validator';
import {
  DockingPrivilegeMode,
  DockingPrivilegeType,
} from './entities/docking-privilege.entity';

export class DockingPrivilegeDto {
  @IsEnum(DockingPrivilegeType)
  targetType: DockingPrivilegeType;

  @IsInt()
  @Min(1)
  targetId: number;

  @IsEnum(DockingPrivilegeMode)
  mode: DockingPrivilegeMode;
}

export class ToggleDockPmAutoReadDto {
  @IsBoolean()
  enabled: boolean;
}
