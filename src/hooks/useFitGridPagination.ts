import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_CARD_MIN_W = 280;
const DEFAULT_CARD_H = 130;
const DEFAULT_GAP = 14;
const PAGER_HEIGHT = 44;
const DEFAULT_MAX_COLUMNS = 5;

interface FitGridOptions<T> {
  cardMinWidth?: number;
  fallbackCardHeight?: number;
  gap?: number;
  maxColumns?: number;
  itemSelector?: string;
  getItemColumnSpan?: (item: T) => number;
}

function packPagesBySpan<T>(items: T[], slotsPerPage: number, getSpan: (item: T) => number): T[][] {
  if (items.length === 0) return [[]];
  const pages: T[][] = [];
  let current: T[] = [];
  let used = 0;

  for (const item of items) {
    const span = Math.min(Math.max(1, getSpan(item)), slotsPerPage);
    if (current.length > 0 && used + span > slotsPerPage) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(item);
    used += span;
  }

  if (current.length > 0) pages.push(current);
  return pages.length > 0 ? pages : [[]];
}

export function useFitGridPagination<T>(items: T[], options: FitGridOptions<T> = {}) {
  const {
    cardMinWidth = DEFAULT_CARD_MIN_W,
    fallbackCardHeight = DEFAULT_CARD_H,
    gap = DEFAULT_GAP,
    maxColumns = DEFAULT_MAX_COLUMNS,
    itemSelector = '.ll-card, .ll-shop-card, .ll-tx-list li',
    getItemColumnSpan,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [slotsPerPage, setSlotsPerPage] = useState(6);
  const [gridColumns, setGridColumns] = useState(1);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width <= 0 || height <= 0) return;

      const columns = Math.min(
        maxColumns,
        Math.max(1, Math.floor((width + gap) / (cardMinWidth + gap))),
      );
      setGridColumns((prev) => (prev === columns ? prev : columns));

      const sample = container.querySelector(itemSelector) as HTMLElement | null;
      const cardHeight = (sample?.offsetHeight ?? fallbackCardHeight) + gap;
      const probePager = items.length > columns;
      const pagerHeight = probePager ? PAGER_HEIGHT : 0;
      const rows = Math.max(1, Math.floor((height - pagerHeight) / cardHeight));
      const fit = Math.max(1, columns * rows);
      setSlotsPerPage((prev) => (prev === fit ? prev : fit));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [items.length, cardMinWidth, fallbackCardHeight, gap, maxColumns, itemSelector]);

  const pages = useMemo(() => {
    if (getItemColumnSpan) {
      return packPagesBySpan(items, slotsPerPage, getItemColumnSpan);
    }
    const pageCount = Math.max(1, Math.ceil(items.length / slotsPerPage));
    return Array.from({ length: pageCount }, (_, i) =>
      items.slice(i * slotsPerPage, i * slotsPerPage + slotsPerPage),
    );
  }, [items, slotsPerPage, getItemColumnSpan]);

  const pageCount = Math.max(1, pages.length);
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = pages[safePage] ?? [];
  const showPager = pageCount > 1;

  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(0, pageCount - 1)));
  }, [pageCount, items.length]);

  const gridStyle = {
    gridTemplateColumns: `repeat(${gridColumns}, minmax(${cardMinWidth}px, 1fr))`,
  } as const;

  return {
    containerRef,
    page: safePage,
    setPage,
    pageCount,
    pageItems,
    showPager,
    gridColumns,
    gridStyle,
  };
}
