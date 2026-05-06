// Registry of question-type plugins. Adding a new type = a new folder + one
// line here. Plugins are pure functions; the runtime only ever needs them
// referenced by their string key.

import type { QuestionType } from "./types";
import { MultipleChoiceType } from "./multiple-choice";
import { TrueFalseType } from "./true-false";

const REGISTRY = {
  "multiple-choice": MultipleChoiceType,
  "true-false": TrueFalseType,
} as const satisfies Record<string, QuestionType<unknown, unknown>>;

export type QuestionTypeKey = keyof typeof REGISTRY;

export function getQuestionType(key: string): QuestionType<unknown, unknown> | null {
  return (REGISTRY as Record<string, QuestionType<unknown, unknown>>)[key] ?? null;
}

export const AUTHORABLE_QUESTION_TYPES: { key: QuestionTypeKey; label: string }[] = [
  { key: "multiple-choice", label: "Multiple choice" },
  { key: "true-false", label: "True / false" },
];
