import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders linked breadcrumb segments and manages the document title', () => {
    document.title = 'SWU · Star Wars Universe';

    const { unmount } = render(
      <MemoryRouter>
        <PageHeader
          segments={[
            { label: 'Datenbank', to: '/database' },
            { label: 'Siedlerliste' },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Datenbank' }).getAttribute('href')).toBe(
      '/database',
    );
    expect(screen.getByText('/ Datenbank / Siedlerliste', { selector: '.sr-only' })).toBeTruthy();
    expect(document.title).toBe('Siedlerliste · Star Wars Universe');

    unmount();
    expect(document.title).toBe('SWU · Star Wars Universe');
  });
});
