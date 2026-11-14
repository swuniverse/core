import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminMassMessagePage } from './admin-mass-message';
import type * as ApiModule from '../services/api';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, api: apiMocks };
});

function renderPage() {
  return render(<MemoryRouter><AdminMassMessagePage /></MemoryRouter>);
}

describe('AdminMassMessagePage', () => {
  beforeEach(() => {
    apiMocks.get.mockImplementation(async (path: string) =>
      path.endsWith('GALACTIC_EMPIRE')
        ? { recipients: 3, emailRecipients: 2, emailEnabled: true }
        : { recipients: 12, emailRecipients: 8, emailEnabled: true },
    );
    apiMocks.post.mockResolvedValue({ recipients: 3, emailsSent: 2 });
  });

  it('previews BBCode, confirms with the recipient count and shows the result', async () => {
    renderPage();
    expect(await screen.findByText('12 Spieler, davon 8 mit E-Mail-Benachrichtigung')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Zielgruppe'), { target: { value: 'GALACTIC_EMPIRE' } });
    expect(await screen.findByText('3 Spieler, davon 2 mit E-Mail-Benachrichtigung')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Betreff'), { target: { value: 'Wartung' } });
    fireEvent.change(screen.getByLabelText('Nachricht'), { target: { value: 'Heute [b]20 Uhr[/b]' } });
    expect(screen.getByText('20 Uhr').tagName).toBe('STRONG');
    fireEvent.click(screen.getByLabelText(/Zusätzlich als E-Mail/));

    fireEvent.click(screen.getByRole('button', { name: 'Nachricht senden' }));
    expect(screen.getByText('An 3 Spieler senden?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Jetzt senden' }));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/messages/admin/broadcast', {
        broadcastId: expect.stringMatching(/^[0-9a-f-]{36}$/),
        subject: 'Wartung',
        body: 'Heute [b]20 Uhr[/b]',
        target: 'GALACTIC_EMPIRE',
        alsoEmail: true,
      }),
    );
    expect(await screen.findByText('Nachricht an 3 Spieler verschickt, 2 E-Mails versendet.')).toBeTruthy();
  });

  it('disables the email option while email delivery is off', async () => {
    apiMocks.get.mockResolvedValue({ recipients: 12, emailRecipients: 0, emailEnabled: false });
    renderPage();

    expect(await screen.findByText('(E-Mail-Versand deaktiviert)')).toBeTruthy();
    expect((screen.getByLabelText(/Zusätzlich als E-Mail/) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Nachricht senden' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
