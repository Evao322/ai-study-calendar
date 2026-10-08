import { useLang } from "../i18n";

export function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <button className="lang-toggle" onClick={() => setLang(lang === "zh" ? "en" : "zh")}>
      {lang === "zh" ? "EN" : "中文"}
    </button>
  );
}
