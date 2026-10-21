// The backend's units module (unit.controller.ts, dto/unit.dto.ts). GET
// /units returns Mongoose documents (_id); api.ts maps them to `id`.

export interface Unit {
  id: string;
  name: string;
  /** Short form shown next to quantities, e.g. "KG". */
  symbol: string;
}

export type UnitInput = Omit<Unit, "id">;
