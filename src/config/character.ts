// ---------------------------------------------------------------------------
// Character tuning constants — one place to adjust all movement behavior.
// ---------------------------------------------------------------------------

/** World-units per second at full input. */
export const SPEED = 4.0;

/** Exponential-decay smoothing for avatar rotation (higher = snappier). */
export const ROTATION_SMOOTHING = 12;

/** Joystick magnitude >= this → run2 animation, below → walk2. */
export const RUN_THRESHOLD = 0.8;

/** Scale so avatar GLB (~1.7 m) fits our player height (~1.5 units). */
export const GLB_SCALE = 0.9;
