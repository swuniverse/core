import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { ActionResult, useActionResult } from './ActionResult';

describe('ActionResult', () => {
  it('collapses results after five lines and renders BBCode and a continuation link', () => {
    render(
      <MemoryRouter>
        <ActionResult
          messages={[
            '[b]Erste[/b]',
            'Zweite',
            'Dritte',
            'Vierte',
            'Fünfte',
            'Sechste',
          ]}
          continueTo="/database"
          continueLabel="Weiter zur Datenbank"
          onClose={() => undefined}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Meldung' })).toBeTruthy();
    expect(screen.getByText('Erste').tagName).toBe('STRONG');
    expect(screen.queryByText('Sechste')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Alle 6 Meldungen anzeigen' }));
    expect(screen.getByText('Sechste')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Weiter zur Datenbank' }).getAttribute('href')).toBe(
      '/database',
    );
  });
});

function Harness() {
  const result = useActionResult();
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => result.show(['Persistente Meldung'])}>Anzeigen</button>
      <button type="button" onClick={() => navigate('/next')}>Wechseln</button>
      <ActionResult messages={result.messages} onClose={result.clear} />
    </>
  );
}

describe('useActionResult', () => {
  it('keeps messages on the page and clears them on route changes', () => {
    render(
      <MemoryRouter initialEntries={['/start']}>
        <Routes>
          <Route path="*" element={<Harness />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Anzeigen' }));
    expect(screen.getByText('Persistente Meldung')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Wechseln' }));
    expect(screen.queryByText('Persistente Meldung')).toBeNull();
  });
});
