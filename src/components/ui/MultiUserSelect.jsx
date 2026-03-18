import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

/**
 * MultiUserSelect — searchable dropdown that allows selecting multiple users.
 *
 * Props:
 *  - values: string[] (selected emails)
 *  - onValuesChange: (emails: string[]) => void
 *  - options: Array<{ value: string, label: string }>
 *  - placeholder: string
 *  - disabled: boolean
 */
export default function MultiUserSelect({
  values = [],
  onValuesChange,
  options = [],
  placeholder = 'เลือกผู้รับผิดชอบ...',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const filtered = search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const toggleValue = (val) => {
    if (values.includes(val)) {
      onValuesChange(values.filter(v => v !== val));
    } else {
      onValuesChange([...values, val]);
    }
  };

  const removeValue = (val, e) => {
    e.stopPropagation();
    onValuesChange(values.filter(v => v !== val));
  };

  const selectedLabels = values.map(v => {
    const opt = options.find(o => o.value === v);
    return { value: v, label: opt?.label || v };
  });

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className={cn(
          'flex min-h-[36px] w-full items-center gap-1 flex-wrap rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        {selectedLabels.length === 0 ? (
          <span className="text-muted-foreground text-sm px-1">{placeholder}</span>
        ) : (
          selectedLabels.map(s => (
            <Badge key={s.value} variant="secondary" className="text-[11px] px-1.5 py-0 gap-1 font-normal">
              {s.label}
              {!disabled && (
                <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={(e) => removeValue(s.value, e)} />
              )}
            </Badge>
          ))
        )}
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-auto" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[8rem] rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
          <div className="flex items-center border-b px-2 py-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0 mr-1.5" />
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="พิมพ์เพื่อค้นหา..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="ml-1 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">ไม่พบข้อมูล</div>
            ) : (
              filtered.map(opt => {
                const isSelected = values.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleValue(opt.value)}
                    className={cn(
                      'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground',
                      isSelected && 'bg-accent/50'
                    )}
                  >
                    <div className={cn(
                      'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                      isSelected ? 'bg-primary text-primary-foreground' : 'opacity-50'
                    )}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    {opt.label}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}