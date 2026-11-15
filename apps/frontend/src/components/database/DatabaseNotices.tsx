import {
  WsEventType,
  type AwardGrantedEventDto,
  type DatabaseEntryDiscoveredEventDto,
} from '@swuniverse/shared';
import { useSocket } from '../../hooks/use-socket';
import { useToast } from '../Toast';

/** New database entries and awards as separate notices (STU achievements, tmw-D5d). */
export function DatabaseNotices() {
  const toast = useToast();
  useSocket(WsEventType.DATABASE_ENTRY_DISCOVERED, (payload) => {
    toast.info((payload as DatabaseEntryDiscoveredEventDto).text);
  });
  useSocket(WsEventType.AWARD_GRANTED, (payload) => {
    toast.info(`Award erhalten: ${(payload as AwardGrantedEventDto).description}`);
  });
  return null;
}
