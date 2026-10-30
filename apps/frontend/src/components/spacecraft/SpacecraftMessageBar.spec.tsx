import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { SpacecraftMessageBar, spacecraftEventToast } from './SpacecraftMessageBar';

vi.mock('../../hooks/use-socket', () => ({ useSocket: vi.fn() }));
vi.mock('../Toast', () => ({ useToast: () => ({ info: vi.fn(), warning: vi.fn() }) }));

describe('SpacecraftMessageBar', () => {
  it('maps field effect severity to the visible toast style', () => {
    const toast = { info: vi.fn(), warning: vi.fn(), info: vi.fn() };
    spacecraftEventToast(toast, { shipId: 4, type: 'FIELD_EFFECT', severity: 'WARNING', detail: 'EPS-Leck' }, 4);
    expect(toast.warning).toHaveBeenCalledWith('EPS-Leck');
    spacecraftEventToast(toast, { shipId: 4, type: 'FIELD_EFFECT', severity: 'SUCCESS', detail: 'Regeneration' }, 4);
    expect(toast.info).toHaveBeenCalledWith('Regeneration');
  });

  it('mounts the ship message listener', () => {
    render(<SpacecraftMessageBar shipId={4} />);
  });
});
