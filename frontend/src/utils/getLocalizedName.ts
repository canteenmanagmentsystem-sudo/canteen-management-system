export const getLocalizedName = (
  item: {
    nameEn?: string | null;
    nameHi?: string | null;
  },
  language: "en" | "hi"
) => {
  if (language === "hi") {
    return item.nameHi || item.nameEn || "";
  }

  return item.nameEn || item.nameHi || "";
};