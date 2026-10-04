import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { CommodityLocationsDto } from '@swuniverse/shared';

import { CommodityLocationsDialog } from './CommodityLocationsDialog';

const locations: CommodityLocationsDto = {
  commodityId: 1,
  commodityName: 'Durastahl',
  colonies: [
    { colonyId: 2, colonyName: 'Alpha', colonyClassId: 701, amount: 30 },
  ],
  spacecraft: [
    {
      spacecraftId: 9,
      spacecraftName: 'Y-Frachter',
      shipClassId: 101,
      shipClassKey: 'REBEL_FREIGHTER_YT',
      entityType: 'SHIP',
      amount: 12,
    },
  ],
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, resolve, reject };
}

describe('CommodityLocationsDialog', () => {
  it('shows local loading, grouped linked tables, empty, and error states', async () => {
    const pending = deferred<CommodityLocationsDto>();
    const { rerender } = render(
      <CommodityLocationsDialog
        commodityId={1}
        trigger={document.body}
        load={() => pending.promise}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole('status').textContent).toContain(
      'Lagerorte werden geladen',
    );

    await act(async () => pending.resolve(locations));
    expect(
      screen.getByRole('columnheader', { name: 'auf Kolonie' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('columnheader', { name: 'auf Station/Schiff' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: /Alpha/ }).getAttribute('href'),
    ).toBe('/colonies?selected=2');
    expect(
      screen.getByRole('link', { name: /Y-Frachter/ }).getAttribute('href'),
    ).toBe('/spacecraft/9');

    rerender(
      <CommodityLocationsDialog
        commodityId={2}
        trigger={document.body}
        load={async () => ({
          ...locations,
          commodityId: 2,
          colonies: [],
          spacecraft: [],
        })}
        onClose={vi.fn()}
      />,
    );
    expect(
      await screen.findByText('Keine eigenen Lagerorte gefunden.'),
    ).toBeTruthy();

    rerender(
      <CommodityLocationsDialog
        commodityId={3}
        trigger={document.body}
        load={async () => {
          throw new Error('Standorte nicht erreichbar');
        }}
        onClose={vi.fn()}
      />,
    );
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Standorte nicht erreichbar',
    );
  });

  it('ignores a late response after switching commodities', async () => {
    const first = deferred<CommodityLocationsDto>();
    const second = deferred<CommodityLocationsDto>();
    const load = vi.fn((commodityId: number) =>
      commodityId === 1 ? first.promise : second.promise,
    );
    const { rerender } = render(
      <CommodityLocationsDialog
        commodityId={1}
        trigger={document.body}
        load={load}
        onClose={vi.fn()}
      />,
    );
    rerender(
      <CommodityLocationsDialog
        commodityId={2}
        trigger={document.body}
        load={load}
        onClose={vi.fn()}
      />,
    );

    await act(async () =>
      second.resolve({
        ...locations,
        commodityId: 2,
        commodityName: 'Tibanna-Gas',
      }),
    );
    await act(async () => first.resolve(locations));
    expect(screen.getByText('Tibanna-Gas')).toBeTruthy();
    expect(screen.queryByText('Durastahl')).toBeNull();
  });

  it('traps focus and closes through Escape, backdrop, and button', async () => {
    const onClose = vi.fn();
    render(
      <CommodityLocationsDialog
        commodityId={1}
        trigger={document.body}
        load={async () => locations}
        onClose={onClose}
      />,
    );
    const close = screen.getByRole('button', { name: 'Dialog schließen' });
    expect(document.activeElement).toBe(close);
    await act(async () => undefined);

    const last = screen.getByRole('link', { name: /Y-Frachter/ });
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByTestId('commodity-locations-backdrop'));
    fireEvent.click(close);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('restores focus to the exact icon trigger', () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      const [trigger, setTrigger] = useState<HTMLElement | null>(null);
      return (
        <>
          <button
            type="button"
            onClick={(event) => {
              setTrigger(event.currentTarget);
              setOpen(true);
            }}
          >
            Lagerorte öffnen
          </button>
          {open && trigger && (
            <CommodityLocationsDialog
              commodityId={1}
              trigger={trigger}
              load={async () => locations}
              onClose={() => setOpen(false)}
            />
          )}
        </>
      );
    }
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Lagerorte öffnen' });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Dialog schließen' }));
    expect(document.activeElement).toBe(trigger);
  });
});
