import type { PlateAnalysis } from "../engine/plate";
import { postImage } from "./vision";

/** Trimite poza farfuriei și primește alimentele estimate, rezumatul și recomandările. */
export const analyzePlate = (photoUri: string, lang: string) => postImage<PlateAnalysis>("/api/plate", photoUri, lang, ["no_food"]);
