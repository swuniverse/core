import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StationScrappingPanel } from './StationScrappingPanel';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../services/api', () => ({ api: mocks }));
const data = {
  confirmationCode: 'abc123',
  active: false,
  immediate: false,
  remainingTicks: 15,
  requiredWorkbees: 8,
  dockedWorkbees: 7,
  blockReason: null,
};
const props = () => ({
  stationId: 42,
  refreshKey: 0,
  onChanged: vi.fn(),
  onRemoved: vi.fn(),
});

describe('StationScrappingPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue(data);
    mocks.post.mockResolvedValue({ removed: false });
  });
  it('requires acknowledgement and the code, then refreshes the running countdown', async () => {
    const p = props();
    render(<StationScrappingPanel {...p} />);
    const button = await screen.findByRole('button', {
      name: 'Demontage starten',
    });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Bestätigungscode eingeben'), {
      target: { value: 'abc123' },
    });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('Folgen verstanden'));
    mocks.get.mockResolvedValue({ ...data, active: true });
    fireEvent.click(button);
    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith('/spacecraft/42/scrapping', {
        code: 'abc123',
      }),
    );
    await screen.findByText(/15 Ticks verbleibend/);
    expect(screen.getByText(/Pausiert:/).textContent).toContain('Workbees');
    expect(p.onChanged).toHaveBeenCalledTimes(1);
  });
  it('blocks a crewed station and shows the reason', async () => {
    mocks.get.mockResolvedValue({
      ...data,
      blockReason: 'Station ist bemannt',
    });
    render(<StationScrappingPanel {...props()} />);
    await screen.findByText('Station ist bemannt');
    fireEvent.click(screen.getByLabelText('Folgen verstanden'));
    fireEvent.change(screen.getByLabelText('Bestätigungscode eingeben'), {
      target: { value: 'abc123' },
    });
    expect(
      (
        screen.getByRole('button', {
          name: 'Demontage starten',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
  it('navigates after immediate construction removal', async () => {
    const p = props();
    mocks.get.mockResolvedValue({ ...data, immediate: true });
    mocks.post.mockResolvedValue({ removed: true });
    render(<StationScrappingPanel {...p} />);
    const button = await screen.findByRole('button', {
      name: 'Konstrukt entfernen',
    });
    fireEvent.click(screen.getByLabelText('Folgen verstanden'));
    fireEvent.change(screen.getByLabelText('Bestätigungscode eingeben'), {
      target: { value: 'abc123' },
    });
    fireEvent.click(button);
    await waitFor(() => expect(p.onRemoved).toHaveBeenCalledTimes(1));
    expect(p.onChanged).not.toHaveBeenCalled();
  });
  it('shows API errors without reporting success', async () => {
    const p = props();
    mocks.post.mockRejectedValue(new Error('Bestätigungscode fehlerhaft'));
    render(<StationScrappingPanel {...p} />);
    const button = await screen.findByRole('button', {
      name: 'Demontage starten',
    });
    fireEvent.click(screen.getByLabelText('Folgen verstanden'));
    fireEvent.change(screen.getByLabelText('Bestätigungscode eingeben'), {
      target: { value: 'abc123' },
    });
    fireEvent.click(button);
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Bestätigungscode fehlerhaft',
    );
    expect(p.onChanged).not.toHaveBeenCalled();
  });
});
