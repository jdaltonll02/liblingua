import { useState, useEffect, createContext, useContext } from 'react';
import { getLanguages } from '../api/languages';

// Shared context so multiple selectors on a page don't refetch
const LangContext = createContext(null);

export function LanguageProvider({ children }) {
  const [languages, setLanguages] = useState([]);
  useEffect(() => {
    getLanguages().then((res) => setLanguages(res.data)).catch(() => {});
  }, []);
  return <LangContext.Provider value={languages}>{children}</LangContext.Provider>;
}

export function useLanguages() {
  return useContext(LangContext) ?? [];
}

// Kept for backwards compat — components that import LANGUAGES directly
// get a stable reference once languages load. Falls back to hardcoded if API is slow.
export const LANGUAGES = [
  { value: 'kpelle', label: 'Kpelle' },
  { value: 'bassa',  label: 'Bassa' },
  { value: 'grebo',  label: 'Grebo' },
  { value: 'vai',    label: 'Vai' },
  { value: 'mende',  label: 'Mende' },
  { value: 'loma',   label: 'Loma' },
  { value: 'krahn',  label: 'Krahn' },
  { value: 'dan',    label: 'Dan (Gio)' },
];

export default function LanguageSelector({ value, onChange, label = 'Target Language', className = '' }) {
  const apiLangs = useLanguages();
  const langs = apiLangs.length > 0 ? apiLangs : LANGUAGES;

  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input-field">
        <option value="">-- Select language --</option>
        {langs.map((l) => (
          <option key={l.value} value={l.value}>{l.label}</option>
        ))}
      </select>
    </div>
  );
}
