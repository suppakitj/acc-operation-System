import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';

const SVC_COLORS = {
  accounting: 'bg-green-500', payroll: 'bg-blue-500',
  tax_consulting: 'bg-purple-500', audit: 'bg-orange-500', peak_licensing: 'bg-yellow-500',
};
const SVC_LABELS = {
  accounting: 'Acct', payroll: 'Payroll', tax_consulting: 'Tax', audit: 'Audit', peak_licensing: 'Peak',
};
const DEPT_LABELS = {
  management: 'Mgmt', accounting: 'Acct', consulting: 'Consult', audit: 'Audit', billing: 'Billing', it: 'IT',
};

function fmtHours(mins) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h} ชม. ${m} นท.`;
}

function fmtCost(cost) {
  return `฿${cost.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`;
}

function ServiceBar({ breakdown, totalMins }) {
  if (totalMins === 0) return <span className="text-[10px] text-muted-foreground">-</span>;
  return (
    <div className="flex items-center gap-0.5 h-4 w-full max-w-[120px]">
      {Object.entries(breakdown).filter(([, v]) => v > 0).map(([svc, mins]) => {
        const pct = (mins / totalMins) * 100;
        return (
          <div key={svc} className={`h-full rounded-sm ${SVC_COLORS[svc] || 'bg-gray-400'}`}
            style={{ width: `${Math.max(pct, 4)}%` }}
            title={`${SVC_LABELS[svc] || svc}: ${Math.round(pct)}%`}
          />
        );
      })}
    </div>
  );
}

function ExpandedRow({ staff }) {
  return (
    <tr>
      <td colSpan={8} className="px-4 py-3 bg-muted/30">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* By Customer */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase">By Customer</p>
            <div className="space-y-1">
              {staff.byCustomer.slice(0, 10).map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="truncate max-w-[180px]">{c.name || '(ไม่ระบุ)'}</span>
                  <div className="flex gap-3 text-muted-foreground">
                    <span>{fmtHours(c.minutes)}</span>
                    {staff.rate > 0 && <span>{fmtCost((c.minutes / 60) * staff.rate)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* By Service */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase">By Service</p>
            <div className="space-y-1">
              {Object.entries(staff.serviceBreakdown).filter(([, v]) => v > 0).map(([svc, mins]) => (
                <div key={svc} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${SVC_COLORS[svc] || 'bg-gray-400'}`} />
                    <span>{SVC_LABELS[svc] || svc}</span>
                  </div>
                  <div className="flex gap-3 text-muted-foreground">
                    <span>{fmtHours(mins)}</span>
                    {staff.rate > 0 && <span>{fmtCost((mins / 60) * staff.rate)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function StaffCostTable({ staffData, onExportCSV }) {
  const [sortField, setSortField] = useState('totalCost');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const toggleRow = (email) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const sorted = useMemo(() => {
    return [...staffData].sort((a, b) => {
      const va = a[sortField] ?? 0;
      const vb = b[sortField] ?? 0;
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [staffData, sortField, sortDir]);

  const SortHeader = ({ field, children, className = '' }) => (
    <th className={`px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none ${className}`}
      onClick={() => toggleSort(field)}>
      {children} {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">รายละเอียดต้นทุนพนักงาน</h3>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onExportCSV}>
          <Download className="w-3 h-3" /> Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto border rounded-lg bg-card">
        <table className="w-full text-left">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="w-8 px-2 py-2" />
              <SortHeader field="name">พนักงาน</SortHeader>
              <SortHeader field="department" className="hidden md:table-cell">แผนก</SortHeader>
              <SortHeader field="totalMinutes">ชั่วโมงรวม</SortHeader>
              <SortHeader field="rate" className="hidden sm:table-cell">อัตรา (฿/ชม.)</SortHeader>
              <SortHeader field="totalCost">ต้นทุนรวม</SortHeader>
              <th className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase hidden lg:table-cell">Breakdown</th>
              <SortHeader field="taskCount" className="hidden sm:table-cell">Tasks</SortHeader>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-sm text-muted-foreground">ไม่มีข้อมูลในช่วงเวลาที่เลือก</td></tr>
            ) : sorted.map(staff => (
              <React.Fragment key={staff.email}>
                <tr className="border-b last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => toggleRow(staff.email)}>
                  <td className="px-2 py-2.5">
                    {expandedRows.has(staff.email) ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                  </td>
                  <td className="px-2 py-2.5">
                    <div>
                      <p className="text-xs font-semibold">{staff.name}</p>
                      <div className="flex items-center gap-1.5">
                        {staff.initials && <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">{staff.initials}</Badge>}
                        {staff.position && <span className="text-[10px] text-muted-foreground">{staff.position}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 hidden md:table-cell">
                    <Badge variant="outline" className="text-[10px]">{DEPT_LABELS[staff.department] || staff.department || '-'}</Badge>
                  </td>
                  <td className="px-2 py-2.5 text-xs font-medium">{fmtHours(staff.totalMinutes)}</td>
                  <td className="px-2 py-2.5 hidden sm:table-cell text-xs">
                    {staff.rate > 0 ? `฿${staff.rate.toLocaleString()}` : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-2 py-2.5 text-xs font-bold">
                    {staff.rate > 0 ? fmtCost(staff.totalCost) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-2 py-2.5 hidden lg:table-cell">
                    <ServiceBar breakdown={staff.serviceBreakdown} totalMins={staff.totalMinutes} />
                  </td>
                  <td className="px-2 py-2.5 hidden sm:table-cell text-xs text-center">{staff.taskCount}</td>
                </tr>
                {expandedRows.has(staff.email) && <ExpandedRow staff={staff} />}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}