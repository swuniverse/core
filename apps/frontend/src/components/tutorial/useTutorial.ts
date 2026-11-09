import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TutorialStepDto, TutorialView, TutorialViewDto } from '@swuniverse/shared';
import { api } from '../../services/api';

type Listener = (name: string) => Promise<void>;
const listeners = new Set<Listener>();

function isTutorialViewDto(value: unknown): value is TutorialViewDto {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<TutorialViewDto>;
  return (
    typeof candidate.currentStepId === 'string' &&
    Array.isArray(candidate.steps) &&
    candidate.steps.every(
      (step) => step !== null && typeof step === 'object' && typeof step.id === 'string',
    )
  );
}

export async function tutorialEvent(name: string): Promise<void> {
  await Promise.all([...listeners].map((listener) => listener(name)));
}

export function useTutorial(view: TutorialView | null) {
  const [tutorial, setTutorial] = useState<TutorialViewDto | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setTutorial(null);
    setDismissed(false);
    if (view) {
      void api.get<unknown>(`/tutorial/${view}`).then((value) => {
        if (active) setTutorial(isTutorialViewDto(value) ? value : null);
      }).catch(() => {
        if (active) setTutorial(null);
      });
    }
    return () => { active = false; };
  }, [view]);

  const index = useMemo(
    () => tutorial?.steps.findIndex((item) => item.id === tutorial.currentStepId) ?? -1,
    [tutorial],
  );
  const step: TutorialStepDto | null = !dismissed && tutorial && index >= 0
    ? tutorial.steps[index]
    : null;

  const moveTo = useCallback(async (nextIndex: number) => {
    if (!tutorial || !view || busy) return;
    const nextStep = tutorial.steps[nextIndex];
    if (!nextStep) return;
    setBusy(true);
    try {
      await api.post(`/tutorial/${view}/step`, { stepId: nextStep.id });
      setTutorial({ ...tutorial, currentStepId: nextStep.id });
    } finally {
      setBusy(false);
    }
  }, [busy, tutorial, view]);

  const finish = useCallback(async () => {
    if (!view || busy) return;
    setBusy(true);
    try {
      await api.post(`/tutorial/${view}/finish`, {});
      setTutorial(null);
    } finally {
      setBusy(false);
    }
  }, [busy, view]);

  const next = useCallback(async () => {
    if (!tutorial || index < 0) return;
    if (index === tutorial.steps.length - 1) await finish();
    else await moveTo(index + 1);
  }, [finish, index, moveTo, tutorial]);

  const back = useCallback(() => moveTo(index - 1), [index, moveTo]);

  useEffect(() => {
    const listener: Listener = async (name) => {
      if (step?.waitFor === name) await next();
    };
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, [next, step?.waitFor]);

  return {
    tutorial,
    step,
    index,
    busy,
    next,
    back,
    finish,
    disable: async () => {
      await api.post('/tutorial/disable', {});
      setTutorial(null);
    },
    dismiss: () => setDismissed(true),
  };
}
