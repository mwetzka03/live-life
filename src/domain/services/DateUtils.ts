import { v4 as uuidv4 } from 'uuid';

export class IdGenerator {
  static create(): string {
    return uuidv4();
  }
}

export class DateUtils {
  static today(): string {
    return this.toIsoDate(new Date());
  }

  static toIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  static parseIsoDate(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  static addDays(iso: string, days: number): string {
    const date = this.parseIsoDate(iso);
    date.setDate(date.getDate() + days);
    return this.toIsoDate(date);
  }

  static startOfWeek(iso: string): string {
    const date = this.parseIsoDate(iso);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    return this.toIsoDate(date);
  }

  static endOfWeek(iso: string): string {
    return this.addDays(this.startOfWeek(iso), 6);
  }

  static startOfMonth(iso: string): string {
    const date = this.parseIsoDate(iso);
    return this.toIsoDate(new Date(date.getFullYear(), date.getMonth(), 1));
  }

  static endOfMonth(iso: string): string {
    const date = this.parseIsoDate(iso);
    return this.toIsoDate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
  }

  static daysInRange(start: string, end: string): string[] {
    const days: string[] = [];
    let current = start;
    while (current <= end) {
      days.push(current);
      current = this.addDays(current, 1);
    }
    return days;
  }

  static weekDays(start: string): string[] {
    return this.daysInRange(start, this.addDays(start, 6));
  }

  static monthGridDays(iso: string): string[] {
    const first = this.startOfMonth(iso);
    const last = this.endOfMonth(iso);
    const gridStart = this.startOfWeek(first);
    const gridEnd = this.endOfWeek(last);
    return this.daysInRange(gridStart, gridEnd);
  }

  static isSameMonth(a: string, b: string): boolean {
    return a.slice(0, 7) === b.slice(0, 7);
  }

  static formatGerman(iso: string): string {
    return this.parseIsoDate(iso).toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
  }

  static formatEventDate(iso?: string): string {
    if (!iso) return 'Ohne Datum';
    return this.formatGerman(iso);
  }

  static formatMonthYear(iso: string): string {
    return this.parseIsoDate(iso).toLocaleDateString('de-DE', {
      month: 'long',
      year: 'numeric',
    });
  }

  static nowIso(): string {
    return new Date().toISOString();
  }

  static formatTime(time?: string): string {
    if (!time) return '';
    return time.slice(0, 5);
  }

  static timeSortKey(time?: string): string {
    return time ?? '99:99';
  }
}
