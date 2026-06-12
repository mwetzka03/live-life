import type { VisionBoard, VisionBoardElement } from '../models/AppData';
import { IdGenerator, DateUtils } from './DateUtils';

export type VisionBoardInput = Omit<VisionBoard, 'id' | 'createdAt' | 'updatedAt'>;
export type VisionBoardElementInput = Omit<VisionBoardElement, 'id'>;

const DEFAULT_BOARD_NAME = 'Visionboard';

export class VisionBoardService {
  private boards: VisionBoard[];
  private activeId: string | undefined;

  constructor(boards: VisionBoard[], activeId?: string) {
    this.boards = boards;
    this.activeId = activeId;
    if (this.boards.length === 0) {
      const board = this.createDefaultBoard();
      this.activeId = board.id;
    } else if (!this.activeId || !this.boards.some((b) => b.id === this.activeId)) {
      this.activeId = this.boards[0].id;
    }
  }

  private createDefaultBoard(): VisionBoard {
    const now = DateUtils.nowIso();
    const board: VisionBoard = {
      id: IdGenerator.create(),
      name: DEFAULT_BOARD_NAME,
      backgroundColor: '#1e1b4b',
      backgroundOpacity: 100,
      zoom: 1,
      panX: 0,
      panY: 0,
      elements: [],
      createdAt: now,
      updatedAt: now,
    };
    this.boards.push(board);
    return board;
  }

  getAll(): VisionBoard[] {
    return [...this.boards];
  }

  getActiveId(): string {
    if (!this.activeId) {
      const board = this.createDefaultBoard();
      this.activeId = board.id;
    }
    return this.activeId;
  }

  setActiveId(id: string): void {
    if (this.boards.some((b) => b.id === id)) {
      this.activeId = id;
    }
  }

  getActive(): VisionBoard {
    const id = this.getActiveId();
    return this.getById(id)!;
  }

  getById(id: string): VisionBoard | undefined {
    return this.boards.find((b) => b.id === id);
  }

  create(input?: Partial<VisionBoardInput>): VisionBoard {
    const now = DateUtils.nowIso();
    const board: VisionBoard = {
      id: IdGenerator.create(),
      name: input?.name ?? `${DEFAULT_BOARD_NAME} ${this.boards.length + 1}`,
      backgroundColor: input?.backgroundColor ?? '#1e1b4b',
      backgroundOpacity: input?.backgroundOpacity ?? 100,
      zoom: input?.zoom ?? 1,
      panX: input?.panX ?? 0,
      panY: input?.panY ?? 0,
      elements: input?.elements ?? [],
      createdAt: now,
      updatedAt: now,
    };
    this.boards.push(board);
    this.activeId = board.id;
    return board;
  }

  update(id: string, input: Partial<VisionBoardInput>): VisionBoard | null {
    const index = this.boards.findIndex((b) => b.id === id);
    if (index === -1) return null;
    const updated: VisionBoard = {
      ...this.boards[index],
      ...input,
      id,
      updatedAt: DateUtils.nowIso(),
    };
    this.boards[index] = updated;
    return updated;
  }

  delete(id: string): boolean {
    if (this.boards.length <= 1) return false;
    const before = this.boards.length;
    this.boards = this.boards.filter((b) => b.id !== id);
    if (this.activeId === id) {
      this.activeId = this.boards[0]?.id;
    }
    return this.boards.length < before;
  }

  upsertElement(boardId: string, element: VisionBoardElement): VisionBoard | null {
    const board = this.getById(boardId);
    if (!board) return null;
    const index = board.elements.findIndex((e) => e.id === element.id);
    const elements =
      index === -1
        ? [...board.elements, element]
        : board.elements.map((e) => (e.id === element.id ? element : e));
    return this.update(boardId, { elements });
  }

  removeElement(boardId: string, elementId: string): VisionBoard | null {
    const board = this.getById(boardId);
    if (!board) return null;
    return this.update(boardId, {
      elements: board.elements.filter((e) => e.id !== elementId),
    });
  }

  createElement(input: VisionBoardElementInput): VisionBoardElement {
    return {
      ...input,
      id: IdGenerator.create(),
    };
  }
}
