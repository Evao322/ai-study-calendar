import { useLanguage } from "./i18n";

export function LanguageToggle() {
  const { lang, toggleLang } = useLanguage();
  return (
    <button className="lang-toggle" onClick={toggleLang} title="Switch language / 切換語言">
      {lang === "zh" ? "EN" : "中文"}
    </button>
  );
}
