/**
 * Integration adapter interfaces (ADR-008, blueprint §1 / stub register).
 * Everything external sits behind one of these; core flows never depend on them
 * being implemented — mocks are the MVP default.
 */

/** ADR-019 — bounded RAG provider. Offline/kill-switch must not affect core flows (AC12). */
export interface AiProvider {
  readonly name: string;
  chat(request: {
    thread_id: string;
    query: string;
    lang: "en" | "hi" | "mr";
    context?: string[];
  }): Promise<{
    answer: string;
    citations: { ref: string; label: string }[];
    fallback?: boolean;
  }>;
}

/** ADR-018 — Bhashini is an optional ONLINE adapter; null return means "use stored translations". */
export interface LanguageProvider {
  readonly name: string;
  translate(text: string, from: string, to: string): Promise<string | null>;
  speechToText(audio: ArrayBuffer, lang: string): Promise<string | null>;
  textToSpeech(text: string, lang: string): Promise<ArrayBuffer | null>;
}

/** NCCT legacy integration ships as a mock contract only (stub register). */
export interface NcctAdapter {
  readonly name: string;
  submitProgrammeReport(report: {
    institution_code: string;
    programme_id: string;
    counts: Record<string, number>;
  }): Promise<{ accepted: boolean; reference: string | null }>;
}

/** External notifications (SMS/WhatsApp) are in-app only for MVP. */
export interface NotificationAdapter {
  readonly name: string;
  notify(userId: string, kind: string, payload: unknown): Promise<void>;
}

// ---------------------------------------------------------------------------
// Mock implementations — the default wiring until Sprint 5 INT tasks land.
// ---------------------------------------------------------------------------

export const mockAiProvider: AiProvider = {
  name: "mock-ai",
  async chat() {
    return {
      answer: "AI is disabled in this environment. Ask your trainer or see the FAQ.",
      citations: [],
      fallback: true,
    };
  },
};

export const nullLanguageProvider: LanguageProvider = {
  name: "null-language",
  async translate() {
    return null;
  },
  async speechToText() {
    return null;
  },
  async textToSpeech() {
    return null;
  },
};

export const mockNcctAdapter: NcctAdapter = {
  name: "mock-ncct",
  async submitProgrammeReport() {
    return { accepted: false, reference: null };
  },
};

export const inAppNotificationAdapter: NotificationAdapter = {
  name: "in-app",
  async notify() {
    // MVP: in-app drawer only. No external channel calls.
  },
};
