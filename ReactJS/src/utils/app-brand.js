const DEFAULT_APP_NAME = 'EduMoet';
const STORAGE_KEY = 'app_name';

export const getStoredAppName = () =>
  localStorage.getItem(STORAGE_KEY) || DEFAULT_APP_NAME;

export const applyAppName = (name) => {
  const appName = (name || DEFAULT_APP_NAME).trim() || DEFAULT_APP_NAME;
  localStorage.setItem(STORAGE_KEY, appName);
  document.title = `${appName} — Quản lý trường học đa trường`;
  return appName;
};

export const shortAppName = (name = getStoredAppName()) => {
  const n = String(name || DEFAULT_APP_NAME).trim();
  if (n.length <= 2) return n.toUpperCase();
  return n
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};
