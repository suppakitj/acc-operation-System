import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export default function SortableHeader({ label, field, sortKey, sortDir, onSort, className = '' }) {
  const active = sortKey === field;
  const Icon = !active ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th
      className={`px-3 py-2.5 text-[11px] font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors ${className}`}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon className={`w-3 h-3 ${active ? 'text-primary' : 'opacity-30'}`} />
      </span>
    </th>
  );
}