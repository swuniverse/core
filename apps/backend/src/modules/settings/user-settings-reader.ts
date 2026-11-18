import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserSetting } from './entities/user-setting.entity';
import { RpgBehavior } from '@swuniverse/shared';

export const BOOLEAN_SETTING_DEFAULTS = {
  fleet_fixed_default: false,
  reactor_auto_carryover_default: false,
  show_online_status: true,
  email_notification: false,
  storage_notification: false,
  show_pm_read_receipt: true,
  profile_visit_optout: false,
  inbox_messenger_style: false,
} as const;

export type BooleanSettingKey = keyof typeof BOOLEAN_SETTING_DEFAULTS;

const SETTING_DEFAULTS: Record<string, string> = {
  show_online_status: '1',
  email_notification: '0',
  storage_notification: '0',
  show_pm_read_receipt: '1',
  profile_visit_optout: '0',
  inbox_messenger_style: '0',
  fleet_fixed_default: '0',
  reactor_auto_carryover_default: '0',
  css_color_sheet: 'default',
  rgb_code: '',
  default_view: 'maindesk',
  rpg_behavior: String(RpgBehavior.NOT_SET),
};

@Injectable()
export class UserSettingsReader {
  constructor(
    @InjectRepository(UserSetting)
    private readonly settingRepo: Repository<UserSetting>,
  ) {}

  async getSettings(userId: number): Promise<Record<string, string>> {
    const rows = await this.settingRepo.find({ where: { userId } });
    return rows.reduce(
      (settings, row) => ({ ...settings, [row.key]: row.value }),
      { ...SETTING_DEFAULTS },
    );
  }

  async getBoolean(userId: number, key: BooleanSettingKey): Promise<boolean> {
    return (await this.getManyBoolean([userId], key)).get(userId)!;
  }

  async getManyBoolean(
    userIds: number[],
    key: BooleanSettingKey,
  ): Promise<Map<number, boolean>> {
    const uniqueUserIds = [...new Set(userIds)];
    const result = new Map(
      uniqueUserIds.map((userId) => [userId, BOOLEAN_SETTING_DEFAULTS[key]]),
    );
    if (uniqueUserIds.length === 0) return result;

    const rows = await this.settingRepo.find({
      where: { userId: In(uniqueUserIds), key },
    });
    for (const row of rows) result.set(row.userId, row.value === '1');
    return result;
  }
}
