import type { Purchase, ShopItem } from '../models/AppData';
import { IdGenerator, DateUtils } from './DateUtils';
import type { CoinService } from './CoinService';

export type ShopItemInput = Omit<ShopItem, 'id' | 'createdAt' | 'updatedAt'>;

export class ShopService {
  private items: ShopItem[];
  private purchases: Purchase[];
  private coinService: CoinService;

  constructor(items: ShopItem[], purchases: Purchase[], coinService: CoinService) {
    this.items = items;
    this.purchases = purchases;
    this.coinService = coinService;
  }

  getItems(): ShopItem[] {
    return [...this.items].sort((a, b) => a.title.localeCompare(b.title));
  }

  getPurchases(): Purchase[] {
    return [...this.purchases].sort(
      (a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime(),
    );
  }

  getById(id: string): ShopItem | undefined {
    return this.items.find((i) => i.id === id);
  }

  create(input: ShopItemInput): ShopItem {
    const now = DateUtils.nowIso();
    const item: ShopItem = {
      ...input,
      id: IdGenerator.create(),
      createdAt: now,
      updatedAt: now,
    };
    this.items.push(item);
    return item;
  }

  update(id: string, input: Partial<ShopItemInput>): ShopItem | null {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) return null;
    const updated: ShopItem = {
      ...this.items[index],
      ...input,
      id,
      updatedAt: DateUtils.nowIso(),
    };
    this.items[index] = updated;
    return updated;
  }

  delete(id: string): boolean {
    const before = this.items.length;
    this.items = this.items.filter((i) => i.id !== id);
    return this.items.length < before;
  }

  purchase(itemId: string): Purchase | null {
    const item = this.getById(itemId);
    if (!item) return null;
    if (!this.coinService.canSpend(item.price)) return null;

    const tx = this.coinService.spend(item.price, `Shop: ${item.title}`, itemId);
    if (!tx) return null;

    const purchase: Purchase = {
      id: IdGenerator.create(),
      shopItemId: itemId,
      title: item.title,
      coinsSpent: item.price,
      purchasedAt: DateUtils.nowIso(),
    };
    this.purchases.push(purchase);
    return purchase;
  }
}
