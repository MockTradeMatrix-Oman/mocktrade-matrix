export function getIO(): any {
  return (globalThis as any).__mtm_io ?? null;
}

export function emit(event: string, payload: unknown) {
  getIO()?.emit(event, payload);
}

export function emitToUser(userId: number, event: string, payload: unknown) {
  getIO()?.to(`user:${userId}`).emit(event, payload);
}

export function emitToRoom(room: string, event: string, payload: unknown) {
  getIO()?.to(room).emit(event, payload);
}
