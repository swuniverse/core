import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { TutorialViewDto } from '@swuniverse/shared';
import { TutorialPadd } from './TutorialPadd';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));

function dto(overrides: Partial<TutorialViewDto> = {}): TutorialViewDto {
  return {
    version: 1,
    view: 'maindesk',
    currentStepId: 'one',
    steps: [
      { id: 'one', title: 'Erster Schritt', text: '[b]Willkommen[/b]', targets: ['menu'] },
      { id: 'two', title: 'Zweiter Schritt', text: 'Weiter', waitFor: 'done' },
    ],
    ...overrides,
  };
}

describe('TutorialPadd', () => {
  beforeEach(() => {
    apiMocks.get.mockReset().mockResolvedValue(dto());
    apiMocks.post.mockReset().mockResolvedValue({});
    document.body.innerHTML = '<button data-tutorial="menu">Ziel</button>';
  });

  it('renders BBCode, progress, navigation and the accessible exact close menu', async () => {
    render(<TutorialPadd view="maindesk" />);
    expect(await screen.findByRole('heading', { name: 'Erster Schritt' })).toBeTruthy();
    expect(screen.getByText('Willkommen').tagName).toBe('STRONG');
    expect(screen.getByText('Schritt 1/2')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Zurück' }).hasAttribute('disabled')).toBe(true);
    expect(document.querySelector('[data-tutorial="menu"]')?.classList.contains('tutorial-target')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Tutorial schließen' }));
    expect(screen.getByRole('menuitem', { name: 'Später' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Tutorial dieser Seite beenden' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Alle Tutorials abschalten' })).toBeTruthy();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Später' }));
    expect(screen.queryByRole('heading', { name: 'Erster Schritt' })).toBeNull();
    expect(document.querySelector('[data-tutorial="menu"]')?.classList.contains('tutorial-target')).toBe(false);
  });

  it('uses fallback without persisting and disables Next for waitFor', async () => {
    apiMocks.get.mockResolvedValue(dto({
      currentStepId: 'missing',
      steps: [
        { id: 'missing', title: 'Fehlt', text: 'Kein Ziel', targets: ['absent'], fallbackIndex: 1 },
        { id: 'wait', title: 'Warten', text: 'Aktion', waitFor: 'done' },
      ],
    }));
    render(<TutorialPadd view="maindesk" />);
    expect(await screen.findByRole('heading', { name: 'Warten' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Weiter' }).hasAttribute('disabled')).toBe(true);
    expect(apiMocks.post).not.toHaveBeenCalled();
  });

  it('persists navigation and close commands', async () => {
    render(<TutorialPadd view="maindesk" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Weiter' }));
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/tutorial/maindesk/step', { stepId: 'two' }));

    fireEvent.click(screen.getByRole('button', { name: 'Tutorial schließen' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Tutorial dieser Seite beenden' }));
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/tutorial/maindesk/finish', {}));
  });
});
