import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * Multi-select with search for staff/users.
 * Props:
 *  - users: array of { email, full_name }
 *  - selected: array of emails
 *  - onChange: (emails[]) => void
 *  - excludeEmail: email to exclude (e.g. current user)
 */
export default function StaffMultiSelect({ users = [], selected = [], onChange, excludeEmail }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const available = users.filter(u => {
    if (excludeEmail && u.email === excludeEmail) return false;
    if (selected.includes(u.email)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return u.full_name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const handleSelect = (email) => {
    onChange([...selected, email]);
    setSearch('');
    inputRef.current?.focus();
  };

  const handleRemove = (email) => {
    onChange(selected.filter(e => e !== email));
  };

  const getName = (email) => users.find(u => u.email === email)?.full_name || email;

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex flex-wrap gap-1 min-h-[36px] w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-xs cursor-text"
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
      >
        {selected.map(email => (
          <Badge key={email} variant="secondary" className="text-[10px] gap-1 py-0.5 px-1.5">
            {getName(email)}
            <button type="button" onClick={(e) => { e.stopPropagation(); handleRemove(email); }} className="hover:text-destructive">
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? 'พิมพ์ชื่อพนักงาน...' : ''}
          className="flex-1 min-w-[80px] bg-transparent outline-none text-xs placeholder:text-muted-foreground"
        />
      </div>

      {open && available.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
          {available.slice(0, 20).map(u => (
            <button
              key={u.email}
              type="button"
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(u.email); }}
            >
              <span className="font-medium">{u.full_name || u.email}</span>
              {u.full_name && <span className="text-muted-foreground ml-1.5">({u.email})</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}