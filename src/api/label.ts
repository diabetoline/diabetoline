import { postImage, type VisionError } from "./vision";

/** Valorile citite de pe etichetă, la 100 g / 100 ml. */
export interface LabelRead {
  name: string | null; brand: string | null; unit: "g" | "ml";
  carbs100: number | null; sugars100: number | null; fiber100: number | null; protein100: number | null;
  serving: number | null; ingredients: string | null;
}
export type LabelError = VisionError;

export const readLabel = (photoUri: string, lang = "ro") => postImage<LabelRead>("/api/label", photoUri, lang, ["no_table", "unreadable"]);
