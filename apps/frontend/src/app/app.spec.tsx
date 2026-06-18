import { render } from '@testing-library/react';

import App from './app';

vi.mock('pixi.js', () => ({
  Application: vi.fn(),
  Container: vi.fn(),
  Sprite: vi.fn(),
  Graphics: vi.fn(),
  Assets: { load: vi.fn() },
  Texture: { from: vi.fn() },
}));

describe('App', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<App />);
    expect(baseElement).toBeTruthy();
  });

  it('should have the app title', () => {
    const { getAllByText } = render(<App />);
    expect(getAllByText('Star Wars Universe').length).toBeGreaterThan(0);
  });
});
