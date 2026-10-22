import { fireEvent, render, screen } from '@testing-library/react';
import { Tooltip, TooltipTable } from './Tooltip';

function renderTooltips() {
  return render(
    <>
      <Tooltip content="Erster Inhalt">
        <button type="button">Erster Auslöser</button>
      </Tooltip>
      <Tooltip content="Zweiter Inhalt">
        <button type="button">Zweiter Auslöser</button>
      </Tooltip>
    </>,
  );
}

describe('Tooltip', () => {
  it('shows immediately on hover, follows the cursor and hides on leave', () => {
    render(
      <Tooltip content="Kolonieinformationen">
        <button type="button">Kolonie</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button', { name: 'Kolonie' });

    fireEvent.mouseEnter(trigger, { clientX: 80, clientY: 40 });

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.textContent).toBe('Kolonieinformationen');
    expect(tooltip.getAttribute('style')).toContain('left: 80px');
    expect(tooltip.getAttribute('style')).toContain('top: 60px');
    expect(trigger.getAttribute('aria-describedby')).toBe(tooltip.id);

    fireEvent.mouseMove(trigger, { clientX: 120, clientY: 90 });
    expect(tooltip.getAttribute('style')).toContain('left: 120px');
    expect(tooltip.getAttribute('style')).toContain('top: 110px');

    fireEvent.mouseLeave(trigger);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('keeps at most one tooltip open globally', () => {
    renderTooltips();
    fireEvent.mouseEnter(
      screen.getByRole('button', { name: 'Erster Auslöser' }),
      { clientX: 10, clientY: 10 },
    );
    fireEvent.mouseEnter(
      screen.getByRole('button', { name: 'Zweiter Auslöser' }),
      { clientX: 20, clientY: 20 },
    );

    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
    expect(screen.getByRole('tooltip').textContent).toBe('Zweiter Inhalt');
  });

  it('opens on the first touch tap and allows the second tap action', () => {
    const onClick = vi.fn();
    render(
      <Tooltip content="Touch-Inhalt">
        <button type="button" onClick={onClick}>
          Aktion
        </button>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button', { name: 'Aktion' });

    fireEvent.touchStart(trigger, {
      touches: [{ clientX: 40, clientY: 30 }],
    });
    fireEvent.click(trigger);

    expect(screen.getByRole('tooltip').textContent).toBe('Touch-Inhalt');
    expect(onClick).not.toHaveBeenCalled();

    fireEvent.touchStart(trigger, {
      touches: [{ clientX: 40, clientY: 30 }],
    });
    fireEvent.click(trigger);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('closes on outside pointer interaction and Escape', () => {
    const { rerender } = render(
      <Tooltip content="Inhalt">
        <button type="button">Auslöser</button>
      </Tooltip>,
    );
    fireEvent.focus(screen.getByRole('button', { name: 'Auslöser' }));
    expect(screen.getByRole('tooltip')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();

    rerender(
      <Tooltip content="Inhalt">
        <button type="button">Auslöser</button>
      </Tooltip>,
    );
    fireEvent.touchStart(screen.getByRole('button', { name: 'Auslöser' }), {
      touches: [{ clientX: 40, clientY: 30 }],
    });
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('renders a compact table with a title row', () => {
    render(
      <TooltipTable
        title="Kolonieinformationen"
        rows={[
          ['EPS', '20/100'],
          ['Lager', '10/100'],
        ]}
      />,
    );

    expect(
      screen.getByRole('columnheader', { name: 'Kolonieinformationen' }),
    ).toBeTruthy();
    expect(screen.getByRole('cell', { name: 'EPS' })).toBeTruthy();
    expect(screen.getByRole('cell', { name: '20/100' })).toBeTruthy();
  });
});
