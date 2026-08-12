// Spec §11: idle timeout 30 min, absolute timeout 12h.
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
export const ABSOLUTE_TIMEOUT_MS = 12 * 60 * 60 * 1000;

// Only write `lastActiveAt` if it's gone stale by more than this, so a busy
// user doesn't cause a DB write on every single request.
export const ACTIVITY_TOUCH_THRESHOLD_MS = 60 * 1000;

// Spec §11: lock an account 15 min after 5 failed attempts from the same IP
// or username.
export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

// Spec §11: reset tokens are single-use and expire in 1 hour.
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export const SESSION_COOKIE_NAME = "ihame_session";
