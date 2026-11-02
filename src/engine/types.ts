export type Level = "green" | "yellow" | "red";

/** Normalized product, independent of the data source (Open Food Facts, local DB). */
export interface Product {
  code: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  /** per 100 g or 100 ml */
  carbs100: number;
  sugars100: number;
  fiber100: number;
  protein100?: number;
  /** declared serving size, in g or ml; undefined when the label gives none */
  serving?: number;
  unit: "g" | "ml";
  ingredients: string[];
  /** Open Food Facts category tags, e.g. "en:breads" */
  categories: string[];
  /** marketing claims found on the label, e.g. "no added sugar" */
  claims: string[];
  /** glycemic index, estimated (0–100); null when unknown or not applicable */
  gi: number | null;
  giSource: "measured" | "estimated" | "none";
  /** nutrition table missing on the source: verdict cannot be trusted */
  incomplete?: boolean;
  source?: "off" | "user" | "usda";
}

export interface Verdict {
  level: Level;
  /** per serving */
  carbs: number;
  sugars: number;
  fiber: number;
  serving: number;
  servingAssumed: boolean;
  gl: number | null;
  hiddenSugars: string[];
  labelTrap: boolean;
  reasons: string[];
  walkMinutes: number;
}
