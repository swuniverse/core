export const TUTORIAL_VIEWS = [
  'maindesk',
  'colony',
  'research',
  'spacecraft',
  'starmap',
  'messages',
  'holonet',
] as const;

export type TutorialView = (typeof TUTORIAL_VIEWS)[number];

export interface TutorialStepDto {
  id: string;
  title: string;
  text: string;
  targets?: readonly string[];
  waitFor?: string;
  fallbackIndex?: number;
}

export interface TutorialDefinitions {
  version: number;
  views: Partial<Record<TutorialView, readonly TutorialStepDto[]>>;
}

export interface TutorialViewDto {
  version: number;
  view: TutorialView;
  steps: readonly TutorialStepDto[];
  currentStepId: string;
}

export interface SetTutorialStepDto {
  stepId: string;
}
