import { computed, signal, Signal } from '@angular/core';

export interface PageRange {
  start: number;
  end: number;
  total: number;
}

/** Signal-based client-side pagination over a (filtered) list. */
export function createPager<T>(items: Signal<readonly T[]>, pageSize: number | Signal<number>) {
  const size = typeof pageSize === 'number' ? () => pageSize : pageSize;
  const currentPage = signal(1);

  const totalPages = computed(() => Math.max(1, Math.ceil(items().length / size())));

  const pageItems = computed(() => {
    const start = (currentPage() - 1) * size();
    return items().slice(start, start + size());
  });

  const range = computed<PageRange>(() => {
    const total = items().length;
    if (total === 0) {
      return { start: 0, end: 0, total: 0 };
    }
    const start = (currentPage() - 1) * size() + 1;
    return { start, end: Math.min(currentPage() * size(), total), total };
  });

  return {
    currentPage,
    totalPages,
    pageItems,
    range,
    next(): void {
      if (currentPage() < totalPages()) {
        currentPage.update((page) => page + 1);
      }
    },
    previous(): void {
      if (currentPage() > 1) {
        currentPage.update((page) => page - 1);
      }
    },
    goTo(page: number): void {
      if (page >= 1 && page <= totalPages()) {
        currentPage.set(page);
      }
    },
    reset(): void {
      currentPage.set(1);
    },
    /** Pull the current page back into range (e.g. after a delete). */
    clamp(): void {
      if (currentPage() > totalPages()) {
        currentPage.set(totalPages());
      }
    }
  };
}
