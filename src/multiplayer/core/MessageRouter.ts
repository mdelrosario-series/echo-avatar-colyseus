// ---------------------------------------------------------------------------
// MessageRouter — pluggable message dispatch for multiplayer messages.
//
// Replaces inline switch statements with a register/dispatch pattern.
// Feature hooks call `register('playerMoved', handler)` to claim a
// message type.  The connection layer calls `dispatch(msg)` for every
// incoming message.
//
// Pure TypeScript class — no React dependency.
// ---------------------------------------------------------------------------

export type MessageHandler<T = any> = (msg: T) => void;

export class MessageRouter<TMsg extends { type: string }> {
  private handlers = new Map<string, MessageHandler>();

  /**
   * Register a handler for a specific message type.
   * Only one handler per type is allowed — later registrations overwrite.
   */
  register<K extends TMsg['type']>(
    type: K,
    handler: MessageHandler<Extract<TMsg, { type: K }>>,
  ): void {
    this.handlers.set(type, handler as MessageHandler);
  }

  /**
   * Remove the handler for a message type.
   */
  unregister(type: TMsg['type']): void {
    this.handlers.delete(type);
  }

  /**
   * Dispatch a message to its registered handler.
   * Returns true if a handler was found, false otherwise.
   */
  dispatch(msg: TMsg): boolean {
    const handler = this.handlers.get(msg.type);
    if (handler) {
      handler(msg);
      return true;
    }
    return false;
  }

  /** Remove all handlers. */
  clear(): void {
    this.handlers.clear();
  }
}
