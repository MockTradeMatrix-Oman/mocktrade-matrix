import POWERUPS from "./powerups.json";

export type Powerup = {
  id: string;
  name: string;
  short: string;
  description: string;
  cost: number;
  tone: string;
};

/**
 * Client-safe catalogue. The server reads the same JSON file, so prices and
 * ids can never drift between the shop and the match engine.
 */
export const POWERUP_LIST = POWERUPS as Powerup[];

export function powerupById(id: string) {
  return POWERUP_LIST.find((p) => p.id === id) ?? null;
}
