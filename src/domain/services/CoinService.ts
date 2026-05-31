import type { CoinTransaction } from '../models/AppData';
import { IdGenerator } from './DateUtils';

export class CoinService {
  private transactions: CoinTransaction[];

  constructor(transactions: CoinTransaction[]) {
    this.transactions = transactions;
  }

  getBalance(): number {
    return this.transactions.reduce((sum, tx) => sum + tx.amount, 0);
  }

  getTransactions(): CoinTransaction[] {
    return [...this.transactions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  canSpend(amount: number): boolean {
    return this.getBalance() >= amount;
  }

  earn(amount: number, description: string, referenceId?: string): CoinTransaction {
    const tx: CoinTransaction = {
      id: IdGenerator.create(),
      amount,
      type: 'earn',
      description,
      referenceId,
      createdAt: new Date().toISOString(),
    };
    this.transactions.push(tx);
    return tx;
  }

  spend(amount: number, description: string, referenceId?: string): CoinTransaction | null {
    if (!this.canSpend(amount)) return null;
    const tx: CoinTransaction = {
      id: IdGenerator.create(),
      amount: -amount,
      type: 'spend',
      description,
      referenceId,
      createdAt: new Date().toISOString(),
    };
    this.transactions.push(tx);
    return tx;
  }

  removeByReferenceId(referenceId: string): boolean {
    const index = this.transactions.findIndex((t) => t.referenceId === referenceId);
    if (index === -1) return false;
    this.transactions.splice(index, 1);
    return true;
  }
}
