import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const DEFAULT_CARD_MIN_W = 280;
const DEFAULT_CARD_H = 130;
const DEFAULT_GAP = 14;
const PAGER_HEIGHT = 44;

interface FitGridOptions {
  cardMinWidth?: number;
  fallbackCardHeight?: number;
  gap?: number;
  itemSelector?: string;
}

export function useFitGridPagination<T>(items: T[], options: FitGridOptions = {}) {
  const {
    cardMinWidth = DEFAULT_CARD_MIN_W,
    fallbackCardHeight = DEFAULT_CARD_H,
    gap = DEFAULT_GAP,
    itemSelector = '.ll-card, .ll-shop-card, .ll-tx-list li',
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(6);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width <= 0 || height <= 0) return;

      const sample = container.querySelector(itemSelector) as HTMLElement | null;
      const cardHeight = (sample?.offsetHeight ?? fallbackCardHeight) + gap;
      const columns = Math.max(1, Math.floor(width / (cardMinWidth + gap)));
      const probePager = items.length > columns;
      const pagerHeight = probePager ? PAGER_HEIGHT : 0;
      const rows = Math.max(1, Math.floor((height - pagerHeight) / cardHeight));
      const fit = Math.max(1, columns * rows);
      setPageSize((prev) => (prev === fit ? prev : fit));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [items.length, cardMinWidth, fallbackCardHeight, gap, itemSelector]);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = items.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const showPager = items.length > pageSize;

  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(0, pageCount - 1)));
  }, [pageCount, items.length]);

  return {
    containerRef,
    page: safePage,
    setPage,
    pageCount,
    pageItems,
    showPager,
  };
}
