import { useLanguage } from "../context/LanguageContext";

const LanguageSwitcher = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">
        {t.language.select}:
      </span>

      <select
        value={language}
        onChange={(e) =>
          setLanguage(e.target.value as "en" | "hi")
        }
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
      >
        <option value="en">
          {t.language.english}
        </option>

        <option value="hi">
          {t.language.hindi}
        </option>
      </select>
    </div>
  );
};

export default LanguageSwitcher;