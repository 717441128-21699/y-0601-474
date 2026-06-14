const STORAGE_PREFIX = 'court-platform-';

export function loadPersist<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function savePersist<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function clearPersist(key: string): void {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    // ignore
  }
}
