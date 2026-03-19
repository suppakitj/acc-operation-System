import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, ClipboardList } from 'lucide-react';

const GROUP_LABELS = { individual: 'Individual', sme: 'SME', corporate: 'Corporate', government: 'Govt', other: 'Other' };
const GROUP_COLORS = { individual: 'bg-gray-100 text-gray-700', sme: 'bg-blue-100 text-blue-700', corporate: 'bg-purple-100 text-purple-700', government: 'bg-orange-100 text-orange-700', other: 'bg-gray-100 text-gray-600' };

function SortHeader({ label, field, sort, onSort }) {
  const active = sort.field === field;
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => onSort(field)}>
      <span className="inline-flex items-center gap-1">{label}<Icon className={`w-3 h-3 ${active ? 'text-primary' : 'opacity-40'}`} /></span>
    </th>
  );
}

export default function CustomerTable({ customers, tasks = [], onRowClick }) {
  const [sort, setSort] = useState({ field: 'company_name', dir: 'asc' });

  const onSort = (field) => {
    setSort(prev => prev.field === field ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' });
  };

  // Task counts per customer
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
      else if (field === 'group') { va = a.customer_group || ''; vb = b.customer_group || ''; }
      else if (field === 'team') { va = (a.departments || []).join(','); vb = (b.departments || []).join(','); }
      else if (field === 'owner') { va = a.primary_officer_name || ''; vb = b.primary_officer_name || ''; }
      else if (field === 'tasks') { va = taskMap[a.id]?.total || 0; vb = taskMap[b.id]?.total || 0; }
      else if (field === 'fee') { va = a.monthly_fee || 0; vb = b.monthly_fee || 0; }
      else if (field === 'status') { va = a.status || ''; vb = b.status || ''; }
      else { va = ''; vb = ''; }
      if (typeof va === 'number') return dir === 'asc' ? va - vb : vb - va;
      return dir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return arr;
  }, [customers, sort, taskMap]);

  return (
    <div className="bg-card rounded-xl border overflow-x-auto">
      <table className="w-full text-left">
        <thead className="border-b">
          <tr>
            <SortHeader label="Code" field="code" sort={sort} onSort={onSort} />
            <SortHeader label="Company" field="company_name" sort={sort} onSort={onSort} />
            <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground hidden lg:table-cell">Tax ID</th>
            <SortHeader label="Group" field="group" sort={sort} onSort={onSort} />
            <SortHeader label="Team" field="team" sort={sort} onSort={onSort} />
            <SortHeader label="Owner" field="owner" sort={sort} onSort={onSort} />
            <SortHeader label="Tasks" field="tasks" sort={sort} onSort={onSort} />
            <SortHeader label="Fee" field="fee" sort={sort} onSort={onSort} />
            <SortHeader label="Status" field="status" sort={sort} onSort={onSort} />
          </tr>
        </thead>
        <tbody>
          {sorted.map(c => {
            const tk = taskMap[c.id];
            const hasOwner = !!c.primary_officer_name;
            return (
              <tr key={c.id} className="border-b last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => onRowClick(c)}>
                <td className="px-3 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">{c.customer_code || ''}</td>
                <td className="px-3 py-3 min-w-[180px]">
                  <p className="text-xs font-semibold truncate max-w-[220px]">{c.company_name}</p>
                  {c.company_name_en && <p className="text-[10px] text-muted-foreground truncate max-w-[220px]">{c.company_name_en}</p>}
                </td>
                <td className="px-3 py-3 hidden lg:table-cell text-xs text-muted-foreground font-mono whitespace-nowrap">{c.tax_id || '—'}</td>
                <td className="px-3 py-3">
                  {c.customer_group ? (
                    <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 font-medium ${GROUP_COLORS[c.customer_group] || ''}`}>
                      {GROUP_LABELS[c.customer_group] || c.customer_group}
                    </Badge>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {(c.departments || []).length > 0
                    ? (c.departments || []).slice(0, 2).map(d => d.charAt(0).toUpperCase() + d.slice(0, 3)).join(', ')
                    : '—'}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  {hasOwner ? (
                    <span className="text-xs">{c.primary_officer_name}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-yellow-600"><AlertTriangle className="w-3.5 h-3.5" /></span>
                  )}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  {tk ? (
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <ClipboardList className="w-3.5 h-3.5 text-muted-foreground" />
                      {tk.total}
                      {tk.overdue > 0 && <Badge className="bg-red-100 text-red-700 text-[9px] px-1.5 py-0 border-0">{tk.overdue} overdue</Badge>}
                    </span>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-3 text-xs font-medium whitespace-nowrap">
                  {c.monthly_fee ? `฿${c.monthly_fee.toLocaleString()}` : '—'}
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