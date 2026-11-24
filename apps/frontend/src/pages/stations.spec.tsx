import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StationsPage } from './stations';

const apiMocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../services/api', () => ({ api: apiMocks }));

const base = {
  shipClassName: 'Sensorphalanx',
  hull: 10,
  hullMax: 20,
  shields: 0,
  shieldsMax: 5,
  energy: 3,
  energyMax: 9,
  crew: 1,
  crewRequired: 1,
  crewMax: 2,
  dockedShips: 1,
  dockCapacity: 2,
  location: { scope: 'GALAXY', layerId: 1, x: 4, y: 5 },
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/stations']}>
      <Routes>
        <Route path="/stations" element={<StationsPage />} />
        <Route path="/spacecraft/:id" element={<p>Detailseite</p>} />
      </Routes>
    </MemoryRouter>,
  );

describe('StationsPage', () => {
  it('lists only stations and opens one like STU stationList', async () => {
    apiMocks.get.mockResolvedValue([
      { ...base, id: 9, name: 'Hoth-Phalanx', kind: 'STATION', stationRole: 'SENSOR' },
      { ...base, id: 2, name: 'Falke', kind: 'SHIP', stationRole: null },
    ]);
    renderPage();

    expect(await screen.findByText('Hoth-Phalanx')).toBeTruthy();
    expect(screen.queryByText('Falke')).toBeNull();
    expect(screen.getByLabelText('Andockbelegung 1 von 2')).toBeTruthy();
    fireEvent.click(screen.getByText('Hoth-Phalanx'));
    expect(await screen.findByText('Detailseite')).toBeTruthy();
  });

  it('reports when the player owns no station', async () => {
    apiMocks.get.mockResolvedValue([{ ...base, id: 2, name: 'Falke', kind: 'SHIP' }]);
    renderPage();
    expect(await screen.findByText('Du besitzt derzeit keine Stationen')).toBeTruthy();
  });
});
