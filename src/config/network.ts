// ---------------------------------------------------------------------------
// Network tuning constants — one place to adjust all multiplayer behavior.
// ---------------------------------------------------------------------------

/** Minimum seconds between position broadcasts (~12 Hz). */
export const BROADCAST_INTERVAL = 1 / 12;

/** If a remote player's target is farther than this, snap instantly. */
export const SNAP_DISTANCE = 5;

/** Exponential-decay smoothing constant for remote player interpolation. */
export const INTERP_K = 10;

/** Camera orbit speed from look joystick at full horizontal deflection (rad/s). */
export const CAMERA_JOYSTICK_YAW_SPEED = 2.8;

/**
 * Vertical look from camera stick: total range is 2× this (e.g. 5° → ±5° = 10° total).
 * Full stick up/down maps to this angle from horizontal look.
 */
export const CAMERA_JOYSTICK_PITCH_HALF_DEG = 5;
