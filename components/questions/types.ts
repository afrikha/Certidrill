import type { PublicBody } from "@/lib/questions/public";

export interface QuestionInputProps<B extends PublicBody, R> {
  body: B;
  response: R | null;
  onChange: (response: R | null) => void;
  disabled?: boolean;
  /** Prefix for DOM ids, unique per question on the page. */
  uid: string;
}

export type BodyOf<T extends PublicBody["type"]> = Extract<PublicBody, { type: T }>;
