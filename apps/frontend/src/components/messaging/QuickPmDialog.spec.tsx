import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { useAuthStore } from '../../stores/auth.store';
import { PmLink } from '../PmLink';
import { QuickPmDialog } from './QuickPmDialog';

const api = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('../../services/api', () => ({ api }));

describe('QuickPmDialog', () => {
  beforeEach(() => {
    api.post.mockReset();
    useAuthStore.setState({ user: { id: 1 } as never });
  });

  it('opens from PmLink on the current page instead of navigating', () => {
    render(
      <MemoryRouter>
        <PmLink playerId={8} playerName="Leia" />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Nachricht an Leia schreiben' }));

    expect(screen.getByRole('dialog', { name: 'Neue private Nachricht' })).toBeTruthy();
    expect(screen.getByText('(8)', { exact: false })).toBeTruthy();
    expect(screen.queryByLabelText(/Betreff/)).toBeNull();
  });

  it('sends without a subject and shows success in the popup', async () => {
    api.post.mockResolvedValue({});
    render(<QuickPmDialog recipient={{ id: 8, name: 'Leia' }} onClose={vi.fn()} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hallo Leia' } });
    fireEvent.click(screen.getByRole('button', { name: 'Absenden' }));

    await screen.findByText('Die Nachricht wurde verschickt');
    expect(api.post).toHaveBeenCalledWith('/messages', {
      recipientId: 8,
      subject: '',
      body: 'Hallo Leia',
    });
  });

  it('keeps errors and the text in the popup', async () => {
    api.post.mockRejectedValue(new Error('Der Siedler ignoriert Dich'));
    render(<QuickPmDialog recipient={{ id: 8, name: 'Leia' }} onClose={vi.fn()} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hallo Leia' } });
    fireEvent.click(screen.getByRole('button', { name: 'Absenden' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Der Siedler ignoriert Dich');
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Hallo Leia');
  });

  it('sends a nearby message with the ship context', async () => {
    api.post.mockResolvedValue({ delivered: true });
    render(
      <QuickPmDialog
        recipient={{ name: 'Leia' }}
        nearby={{ shipId: 7, targetId: 9, targetName: 'Tantive' }}
        onClose={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hallo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Absenden' }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/spacecraft/7/communications/nearby/9', {
        body: 'Hallo',
      }),
    );
  });

  it('closes at once when empty and asks before discarding text', () => {
    const onClose = vi.fn();
    render(<QuickPmDialog recipient={{ id: 8, name: 'Leia' }} onClose={onClose} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Entwurf' } });
    fireEvent.click(screen.getByRole('button', { name: 'Schließen' }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Verwerfen' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Schließen' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
