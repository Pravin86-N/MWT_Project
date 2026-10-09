// Smart Web Audio API Notification Sound Engine
// FuelNet 360 Operational Auditory Feedback

const STORAGE_KEY = "fdms_sound_enabled";

// Rate limiting to prevent repeated annoying alerts
let lastWarningSoundTime = 0;
const WARNING_SOUND_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export function isSoundEnabled() {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === null) return true; // Default ON for critical operations
    return val === "true";
  } catch (e) {
    return true;
  }
}

export function setSoundEnabled(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
    window.dispatchEvent(new CustomEvent("fdms-sound-preference-changed", { detail: { enabled } }));
  } catch (e) {
    console.warn("[Sound] Failed to persist sound preference:", e);
  }
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!window.__fdmsAudioContext) {
    window.__fdmsAudioContext = new AudioContextClass();
  }
  if (window.__fdmsAudioContext.state === "suspended") {
    window.__fdmsAudioContext.resume().catch(() => {});
  }
  return window.__fdmsAudioContext;
}

/**
 * 1. New Order: Short cheerful double chime
 */
export function playNewOrderSound() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  osc1.type = "sine";
  osc1.frequency.setValueAtTime(587.33, now); // D5
  osc1.frequency.exponentialRampToValueAtTime(880, now + 0.18); // A5

  osc1.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc1.stop(now + 0.35);
}

/**
 * 2. Low Inventory: Warning double beep (rate-limited to avoid annoying repetitions)
 */
export function playLowInventorySound(force = false) {
  if (!isSoundEnabled()) return;
  const nowMs = Date.now();
  if (!force && nowMs - lastWarningSoundTime < WARNING_SOUND_COOLDOWN_MS) {
    return; // Rate limited
  }
  lastWarningSoundTime = nowMs;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.setValueAtTime(0.001, now + 0.12);
  gain.gain.setValueAtTime(0.15, now + 0.18);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

  osc.type = "triangle";
  osc.frequency.setValueAtTime(440, now); // A4

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.32);
}

/**
 * 3. Emergency / SOS: Critical alert tone
 */
export function playEmergencySound() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.linearRampToValueAtTime(440, now + 0.45);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.5);
}

// Alias for emergency critical alert
export const playCriticalAlertSound = playEmergencySound;

/**
 * 4. Delivery Completed: Success chime
 */
export function playDeliveryCompletedSound() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  [523.25, 659.25, 783.99].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = now + i * 0.1;

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.3);
  });
}
