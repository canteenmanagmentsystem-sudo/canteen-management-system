import { en } from "./en";
import { hi } from "./hi";

export const translations = {
  en,
  hi,
};

export type Language = keyof typeof translations;

