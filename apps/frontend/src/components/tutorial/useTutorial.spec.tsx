import { act, renderHook, waitFor } from '@testing-library/react';
import type { TutorialViewDto } from '@swuniverse/shared';
import { tutorialEvent, useTutorial } from './useTutorial';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));

const tutorial: TutorialViewDto = {
  version: 1,
  view: 'maindesk',
  currentStepId: 'welcome',
  steps: [
    { id: 'welcome', title: 'Willkommen', text: 'Hallo' },
    { id: 'action', title: 'Aktion', text: 'Klicke', waitFor: 'built' },
  ],
};

describe('useTutorial', () => {
  beforeEach(() => {
    apiMocks.get.mockReset().mockResolvedValue(tutorial);
    apiMocks.post.mockReset().mockResolvedValue({});
  });

  it('loads a view and persists next and back navigation', async () => {
    const { result } = renderHook(() => useTutorial('maindesk'));
    await waitFor(() => expect(result.current.step?.id).toBe('welcome'));

    await act(() => result.current.next());
    expect(apiMocks.post).toHaveBeenLastCalledWith('/tutorial/maindesk/step', {
      stepId: 'action',
    });
    expect(result.current.step?.id).toBe('action');

    await act(() => result.current.back());
    expect(apiMocks.post).toHaveBeenLastCalledWith('/tutorial/maindesk/step', {
      stepId: 'welcome',
    });
  });

  it('advances or finishes a matching waitFor event and dismisses locally', async () => {
    const { result } = renderHook(() => useTutorial('maindesk'));
    await waitFor(() => expect(result.current.step?.id).toBe('welcome'));
    await act(() => result.current.next());

    await act(async () => tutorialEvent('built'));
    expect(apiMocks.post).toHaveBeenLastCalledWith('/tutorial/maindesk/finish', {});
    expect(result.current.step).toBeNull();

    const second = renderHook(() => useTutorial('maindesk'));
    await waitFor(() => expect(second.result.current.step).not.toBeNull());
    act(() => second.result.current.dismiss());
    expect(second.result.current.step).toBeNull();
    expect(apiMocks.post).toHaveBeenCalledTimes(2);
  });
});
