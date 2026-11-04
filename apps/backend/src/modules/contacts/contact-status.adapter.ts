import { Injectable } from '@nestjs/common';
import type { PersonalContactStatusPort } from '../alliance/relationship-resolver.service';
import { ContactService } from './contact.service';

@Injectable()
export class ContactStatusAdapter implements PersonalContactStatusPort {
  constructor(private readonly contacts: ContactService) {}

  statuses(
    firstPlayerId: number,
    secondPlayerIds: number[],
  ): Promise<Map<number, 'FRIEND' | 'ENEMY'>> {
    return this.contacts.statuses(firstPlayerId, secondPlayerIds);
  }
}
