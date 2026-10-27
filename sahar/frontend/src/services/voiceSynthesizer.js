// ==============================================================================
// SAHAKAR-LINK VERNACULAR VOICE SYNTHESIZER (BHASHINI SPECIFICATION SIMULATION)
// Native Web Speech Synthesis with support for Hindi (hi-IN) & Indian English (en-IN)
// Designed for rural PACS operators and grassroots cooperative trainees.
// ==============================================================================

class VernacularVoiceService {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.currentUtterance = null;
    this.speaking = false;
    this.listeners = new Set();
  }

  isAvailable() {
    return Boolean(this.synth);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(state) {
    this.speaking = state;
    this.listeners.forEach(fn => fn(state));
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.notify(false);
    }
  }

  speak(text, options = {}) {
    if (!this.synth) return false;
    this.stop();

    const cleanText = text.replace(/[*#_\[\]()]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanText) return false;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = options.lang || 'hi-IN';
    utterance.rate = options.rate || 0.95;
    utterance.pitch = options.pitch || 1.0;

    // Pick best matching voice
    const voices = this.synth.getVoices();
    const matchingVoice = voices.find(v => v.lang.includes(utterance.lang.slice(0, 2))) ||
      voices.find(v => v.lang.includes('en-IN')) ||
      voices[0];

    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onstart = () => {
      this.notify(true);
      if (options.onStart) options.onStart();
    };

    utterance.onend = () => {
      this.notify(false);
      if (options.onEnd) options.onEnd();
    };

    utterance.onerror = () => {
      this.notify(false);
      if (options.onError) options.onError();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
    return true;
  }
}

export const voiceSynthesizer = new VernacularVoiceService();
