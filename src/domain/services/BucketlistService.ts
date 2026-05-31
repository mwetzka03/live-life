import type { BucketlistItem } from '../models/AppData';
import { IdGenerator, DateUtils } from './DateUtils';

export type BucketlistItemInput = Omit<BucketlistItem, 'id' | 'createdAt' | 'updatedAt' | 'completed' | 'completedAt'> & {
  completed?: boolean;
  completedAt?: string;
};

export class BucketlistService {
  private items: BucketlistItem[];

  constructor(items: BucketlistItem[]) {
    this.items = items;
  }

  getAll(): BucketlistItem[] {
    return [...this.items].sort((a, b) => {
      const yearA = a.targetYear ?? 9999;
      const yearB = b.targetYear ?? 9999;
      if (yearA !== yearB) return yearA - yearB;
      return a.title.localeCompare(b.title, 'de');
    });
  }

  getById(id: string): BucketlistItem | undefined {
    return this.items.find((i) => i.id === id);
  }

  getYears(): (number | null)[] {
    const years = new Set<number | null>();
    for (const item of this.items) {
      years.add(item.targetYear);
    }
    const numeric = [...years].filter((y): y is number => y !== null).sort((a, b) => a - b);
    const hasUnknown = years.has(null);
    return hasUnknown ? [...numeric, null] : numeric;
  }

  create(input: BucketlistItemInput): BucketlistItem {
    const now = DateUtils.nowIso();
    const item: BucketlistItem = {
      ...input,
      targetYear: input.targetYear ?? null,
      completed: input.completed ?? false,
      completedAt: input.completed ? input.completedAt ?? now : undefined,
      id: IdGenerator.create(),
      createdAt: now,
      updatedAt: now,
    };
    this.items.push(item);
    return item;
  }

  update(id: string, input: Partial<BucketlistItemInput>): BucketlistItem | null {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) return null;
    const now = DateUtils.nowIso();
    const prev = this.items[index];
    const completed = input.completed ?? prev.completed;
    const updated: BucketlistItem = {
      ...prev,
      ...input,
      id,
      completed,
      completedAt: completed ? input.completedAt ?? prev.completedAt ?? now : undefined,
      updatedAt: now,
    };
    this.items[index] = updated;
    return updated;
  }

  toggleComplete(id: string): BucketlistItem | null {
    const item = this.getById(id);
    if (!item) return null;
    return this.update(id, { completed: !item.completed });
  }

  delete(id: string): boolean {
    const before = this.items.length;
    this.items = this.items.filter((i) => i.id !== id);
    return this.items.length < before;
  }
}
