import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/**
 * TablePagination — reusable pagination bar with "rows per page" selector.
 *
 * Props:
 *  - totalItems: number
 *  - page: number (1-based)
 *  - pageSize: number
 *  - onPageChange: (page) => void
 *  - onPageSizeChange: (size) => void
 */
export default function TablePagination({ totalItems, page, pageSize, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeP = Math.min(page, totalPages);
  const from = totalItems === 0 ? 0 : (safeP - 1) * pageSize + 1;
  const to = Math.min(safeP * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 py-2 px-1">
      {/* Rows per page */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">แสดง</span>
        <Select value={String(pageSize)} onValueChange={v => { onPageSizeChange(Number(v)); onPageChange(1); }}>
          <SelectTrigger className="h-7 w-[70px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map(n => (
              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground whitespace-nowrap">รายการ / หน้า</span>
      </div>

      {/* Page info + navigation */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground mr-2">
          {from}–{to} of {totalItems}
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={safeP <= 1} onClick={() => onPageChange(1)}>
          <ChevronsLeft className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={safeP <= 1} onClick={() => onPageChange(safeP - 1)}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <span className="text-xs font-medium px-1">{safeP} / {totalPages}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={safeP >= totalPages} onClick={() => onPageChange(safeP + 1)}>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={safeP >= totalPages} onClick={() => onPageChange(totalPages)}>
          <ChevronsRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Helper: slice data for the current page.
 */
export function paginateData(data, page, pageSize) {
  const start = (page - 1) * pageSize;
  return data.slice(start, start + pageSize);
}