import React from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_TABS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'processing', label: 'กำลังประมวลผล' },
  { key: 'completed', label: 'เสร็จสิ้น' },
  { key: 'failed', label: 'ล้มเหลว' },
];

export default function OcrJobFilters({ search, onSearchChange, statusFilter, onStatusChange }) {
  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="ค้นหาชื่อไฟล์, ลูกค้า, หมายเหตุ..."
          className="pl-9 pr-8 h-9 text-sm"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 flex-wrap">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => onStatusChange(tab.key)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors",
              statusFilter === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}