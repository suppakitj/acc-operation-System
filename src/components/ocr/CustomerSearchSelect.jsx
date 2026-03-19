import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

export default function CustomerSearchSelect({ customers, value, onChange }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const selectedCustomer = customers.find(c => c.id === value);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers.slice(0, 30);
    const q = search.toLowerCase();
    return customers.filter(c =>
      c.company_name?.toLowerCase().includes(q) ||
      c.company_name_en?.toLowerCase().includes(q) ||
      c.customer_code?.toLowerCase().includes(q) ||
      c.tax_id?.includes(q)
    ).slice(0, 30);
  }, [customers, search]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (customerId) => {
    onChange(customerId);
    setSearch('');
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setSearch('');
  };

  return (
    <div className="space-y-1.5" ref={wrapperRef}>
      <Label>ลูกค้า (ไม่บังคับ)</Label>

      {selectedCustomer ? (
        <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
          <span className="text-sm flex-1 truncate">{selectedCustomer.company_name}</span>
          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleClear}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="พิมพ์ชื่อลูกค้าเพื่อค้นหา..."
            className="pl-8"
          />
        </div>
      )}

      {open && !selectedCustomer && (
        <div className="border rounded-md bg-popover shadow-md max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 text-center">ไม่พบลูกค้า</p>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelect(c.id)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent/10 transition-colors border-b last:border-b-0 truncate"
              >
                {c.company_name}
                {c.customer_code && <span className="text-xs text-muted-foreground ml-2">({c.customer_code})</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}