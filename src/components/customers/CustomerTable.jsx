import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

const DEPT_LABELS = { management: 'Management', accounting: 'บัญชี', consulting: 'ที่ปรึกษา', audit: 'Audit', billing: 'Billing', it: 'IT' };

const DEFAULT_WIDTHS = {
  code: 80, company_name: 220, tax_id: 150, department: 140,
  monthly_fee: 120, yearly_fee: 120, status: 90,
};

function ResizeHandle({ onMouseDown }) {
  return (
    <div
      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 z-10"
      onMouseDown={onMouseDown}
    />
  );
}

function SortHeader({ label, field, sort, onSort, width, onResizeStart }) {
  const active = sort.field === field;
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th
      className="relative px-3 py-2.5 text-[11px] font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
      style={{ width, minWidth: 60 }}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">{label}<Icon className={`w-3 h-3 ${active ? 'text-primary' : 'opacity-40'}`} /></span>
      <ResizeHandle onMouseDown={(e) => { e.stopPropagation(); onResizeStart(field, e); }} />
    </th>
  );
}

export default function CustomerTable({ customers, tasks = [], onRowClick }) {
  const [sort, setSort] = useState({ field: 'company_name', dir: 'asc' });
  const [colWidths, setColWidths] = useState(DEFAULT_WIDTHS);
  const resizing = useRef(null);

  const onSort = (field) => {
    setSort(prev => prev.field === field ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' });
  };

  const onResizeStart = useCallback((field, e) => {
    resizing.current = { field, startX: e.clientX, startWidth: colWidths[field] || 100 };
  }, [colWidths]);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!resizing.current) return;
      const { field, startX, startWidth } = resizing.current;
      const diff = e.clientX - startX;
      setColWidths(prev => ({ ...prev, [field]: Math.max(60, startWidth + diff) }));
    };
    const onMouseUp = () => { resizing.current = null; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, []);

  const taskMap = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!t.customer_id) return;
      if (!map[t.customer_id]) map[t.customer_id] = { total: 0, overdue: 0 };
      if (t.status !== 'completed' && t.status !== 'cancelled') {
        map[t.customer_id].total++;
        if (t.due_date && new Date(t.due_date) < new Date()) map[t.customer_id].overdue++;
      }
    });
    return map;
  }, [tasks]);

  const sorted = useMemo(() => {
    const arr = [...customers];
    const { field, dir } = sort;
    arr.sort((a, b) => {
      let va, vb;
      if (field === 'company_name') { va = a.company_name || ''; vb = b.company_name || ''; }
      else if (field === 'code') { va = a.customer_code || ''; vb = b.customer_code || ''; }
      else if (field === 'tax_id') { va = a.tax_id || ''; vb = b.tax_id || ''; }
      else if (field === 'department') { va = (a.departments || []).join(','); vb = (b.departments || []).join(','); }
      else if (field === 'monthly_fee') { va = a.monthly_fee || 0; vb = b.monthly_fee || 0; }
      else if (field === 'yearly_fee') { va = a.yearly_fee || 0; vb = b.yearly_fee || 0; }
      else if (field === 'status') { va = a.status || ''; vb = b.status || ''; }
      else { va = ''; vb = ''; }
      if (typeof va === 'number') return dir === 'asc' ? va - vb : vb - va;
      return dir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return arr;
  }, [customers, sort, taskMap]);

  const cols = [
    { field: 'code', label: 'Code' },
    { field: 'company_name', label: 'Company' },
    { field: 'tax_id', label: 'Tax ID', static: true },
    { field: 'department', label: 'แผนก' },
    { field: 'monthly_fee', label: 'Monthly Fee' },
    { field: 'yearly_fee', label: 'Yearly Fee' },
    { field: 'status', label: 'Status' },
  ];

  return (
    <div className="bg-card rounded-xl border overflow-x-auto">
      <table className="w-full text-left" style={{ tableLayout: 'fixed', minWidth: Object.values(colWidths).reduce((s, v) => s + v, 0) }}>
        <thead className="border-b">
          <tr>
            {cols.map(col => col.static ? (
              <th key={col.field} className="relative px-3 py-2.5 text-[11px] font-semibold text-muted-foreground hidden lg:table-cell" style={{ width: colWidths[col.field], minWidth: 60 }}>
                {col.label}
                <ResizeHandle onMouseDown={(e) => onResizeStart(col.field, e)} />
              </th>
            ) : (
              <SortHeader key={col.field} label={col.label} field={col.field} sort={sort} onSort={onSort} width={colWidths[col.field]} onResizeStart={onResizeStart} />
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(c => {
            const depts = (c.departments || []).map(d => DEPT_LABELS[d] || d);
            return (
              <tr key={c.id} className="border-b last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => onRowClick(c)}>
                <td className="px-3 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">{c.customer_code || ''}</td>
                <td className="px-3 py-3 overflow-hidden">
                  <p className="text-xs font-semibold truncate">{c.company_name}</p>
                  {c.company_name_en && <p className="text-[10px] text-muted-foreground truncate">{c.company_name_en}</p>}
                </td>
                <td className="px-3 py-3 hidden lg:table-cell text-xs text-muted-foreground font-mono whitespace-nowrap overflow-hidden text-ellipsis">{c.tax_id || '—'}</td>
                <td className="px-3 py-3 overflow-hidden">
                  {depts.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {depts.slice(0, 2).map(d => (
                        <Badge key={d} variant="secondary" className="text-[10px] px-1.5 py-0">{d}</Badge>
                      ))}
                      {depts.length > 2 && <span className="text-[9px] text-muted-foreground">+{depts.length - 2}</span>}
                    </div>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-3 text-xs font-medium whitespace-nowrap">
                  {c.monthly_fee ? `฿${c.monthly_fee.toLocaleString()}` : '—'}
                </td>
                <td className="px-3 py-3 text-xs font-medium whitespace-nowrap">
                  {c.yearly_fee ? `฿${c.yearly_fee.toLocaleString()}` : '—'}
                </td>
                <td className="px-3 py-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${c.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                    {c.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}