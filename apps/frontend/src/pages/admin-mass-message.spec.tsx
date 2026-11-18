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
        ? { recipients: 3, emailRecipients: 2 }
        : { recipients: 12, emailRecipients: 8 },
    );
    apiMocks.post.mockResolvedValue({ recipients: 3, emailsSent: 2 });
  });

  it('previews BBCode, confirms with the recipient count and shows the result', async () => {
    renderPage();
    expect(await screen.findByText('12 Spieler, davon 8 mit E-Mail-Adresse')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Zielgruppe'), { target: { value: 'GALACTIC_EMPIRE' } });
    expect(await screen.findByText('3 Spieler, davon 2 mit E-Mail-Adresse')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Betreff'), { target: { value: 'Wartung' } });
    fireEvent.change(screen.getByLabelText('Nachricht'), { target: { value: 'Heute [b]20 Uhr[/b]' } });
    expect(screen.getByText('20 Uhr').tagName).toBe('STRONG');
    fireEvent.change(screen.getByLabelText('Versandmedium'), { target: { value: 'EMAIL' } });

    fireEvent.click(screen.getByRole('button', { name: 'Nachricht senden' }));
    expect(screen.getByText('An 2 Spieler senden?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Jetzt senden' }));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/messages/admin/broadcast', {
        broadcastId: expect.stringMatching(/^[0-9a-f-]{36}$/),
        subject: 'Wartung',
        body: 'Heute [b]20 Uhr[/b]',
        target: 'GALACTIC_EMPIRE',
        medium: 'EMAIL',
      }),
    );
    expect(await screen.findByText('2 von 3 E-Mails versendet.')).toBeTruthy();
  });

  it('sends through PM by default and only disables email sends for an empty email audience', async () => {
    apiMocks.get.mockResolvedValue({ recipients: 12, emailRecipients: 0 });
    apiMocks.post.mockResolvedValue({ recipients: 12, emailsSent: 0 });
    renderPage();
    expect(await screen.findByText('12 Spieler, davon 0 mit E-Mail-Adresse')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Betreff'), { target: { value: 'Wartung' } });
    fireEvent.change(screen.getByLabelText('Nachricht'), { target: { value: 'Heute 20 Uhr' } });
    fireEvent.change(screen.getByLabelText('Versandmedium'), { target: { value: 'EMAIL' } });
    expect((screen.getByRole('button', { name: 'Nachricht senden' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Versandmedium'), { target: { value: 'PM' } });
    fireEvent.click(screen.getByRole('button', { name: 'Nachricht senden' }));
    fireEvent.click(screen.getByRole('button', { name: 'Jetzt senden' }));
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/messages/admin/broadcast', expect.objectContaining({ medium: 'PM' })));
    expect(await screen.findByText('Persönliche Nachricht an 12 Spieler verschickt.')).toBeTruthy();
  });
});
