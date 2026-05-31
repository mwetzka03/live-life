import type { AppData } from '../models/AppData';

const STORAGE_KEY = 'live-life-data';

export class LocalStorageRepository {
  load(): AppData | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AppData;
    } catch {
      return null;
    }
  }

  save(data: AppData): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}
