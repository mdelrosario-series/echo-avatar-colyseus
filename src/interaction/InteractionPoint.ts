// ---------------------------------------------------------------------------
// InteractionPoint — an anchor in the world that a player can interact with.
//
// Pure TypeScript class — no React dependency.
// Place these in your scene to create "sit here" / "sleep here" spots.
// ---------------------------------------------------------------------------

export interface InteractionPointConfig {
  /** Unique ID for this point. */
  id: string;
  /** Posture type that this point triggers (must match a key in POSTURES). */
  postureId: string;
  /** World position of the anchor. */
  position: { x: number; y: number; z: number };
  /** Rotation (Y-axis, radians) the player snaps to when using this point. */
  rotationY: number;
  /** How close the player must be to interact (world units). */
  interactionRadius: number;
  /** How many players can use this point simultaneously. */
  capacity: number;
}

export class InteractionPoint {
  readonly id: string;
  readonly postureId: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly rotationY: number;
  readonly interactionRadius: number;
  readonly capacity: number;

  /** IDs of players currently occupying this point. */
  private occupants = new Set<string>();

  constructor(config: InteractionPointConfig) {
    this.id = config.id;
    this.postureId = config.postureId;
    this.x = config.position.x;
    this.y = config.position.y;
    this.z = config.position.z;
    this.rotationY = config.rotationY;
    this.interactionRadius = config.interactionRadius;
    this.capacity = config.capacity;
  }

  /** Whether another player can occupy this point. */
  get isFull(): boolean {
    return this.occupants.size >= this.capacity;
  }

  /** Whether a player is currently using this point. */
  isOccupiedBy(playerId: string): boolean {
    return this.occupants.has(playerId);
  }

  /** Claim a spot. Returns true if successful. */
  occupy(playerId: string): boolean {
    if (this.isFull && !this.occupants.has(playerId)) return false;
    this.occupants.add(playerId);
    return true;
  }

  /** Release a spot. */
  vacate(playerId: string): void {
    this.occupants.delete(playerId);
  }

  /** Distance² from a world position to this point (XZ plane). */
  distanceSqXZ(px: number, pz: number): number {
    const dx = px - this.x;
    const dz = pz - this.z;
    return dx * dx + dz * dz;
  }

  /** Whether a world position is within interaction range. */
  isInRange(px: number, pz: number): boolean {
    return this.distanceSqXZ(px, pz) <= this.interactionRadius * this.interactionRadius;
  }
}
