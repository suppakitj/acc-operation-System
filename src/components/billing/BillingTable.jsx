import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useSortableTable } from '@/hooks/useSortableTable';
import SortableHeader from '@/components/shared/SortableHeader';

const DEPT_COLORS = {
  accounting: 'bg-blue-50 text-blue-600', audit: 'bg-purple-50 text-purple-600',
  consulting: 'bg-green-50 text-green-600', billing: 'bg-yellow-50 text-yellow-600',
  management: 'bg-red-50 text-red-600', it: 'bg-gray-50 text-gray-600',
};
const DEPT_SHORT = {
  accounting: 'Acco', audit: 'Audi', consulting: 'Cons',
  billing: 'Bill', management: 'Mgmt', it: 'IT',
};

const STATUS_DOT = {
  paid: 'bg-green-500', overdue: 'bg-red-500', sent: 'bg-blue-500',
  draft: 'bg-gray-400', cancelled: 'bg-gray-300', not_invoiced: 'bg-yellow-500',
};
const STATUS_LABEL = {
  paid: 'Paid', overdue: 'Overdue', sent: 'Invoiced',
  draft: 'Draft', cancelled: 'Cancelled', not_invoiced: 'Not Invoiced',
};

export default function BillingTable({ billings, onToggleReceipt, onToggleWht, onToggleReferral, onEdit, onRowClick }) {
  const today = new Date();
  const { sorted, sortKey, sortDir, handleSort } = useSortableTable(billings, 'customer_name', 'asc');

  return (
    <div className="bg-card rounded-lg border overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b bg-muted/20">
            <SortableHeader label="Client" field="customer_name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="uppercase tracking-wider" />
            <SortableHeader label="Dept" field="department" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="uppercase tracking-wider hidden md:table-cell" />
            <SortableHeader label="Period" field="period_month" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="uppercase tracking-wider hidden md:table-cell" />
            <SortableHeader label="Invoice #" field="invoice_number" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="uppercase tracking-wider hidden lg:table-cell" />
            <SortableHeader label="Inv Date" field="billing_date" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="uppercase tracking-wider hidden lg:table-cell" />
            <SortableHeader label="Exp Pay" field="due_date" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="uppercase tracking-wider hidden md:table-cell" />
            <SortableHeader label="Amount" field="amount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="uppercase tracking-wider" />
            <SortableHeader label="Status" field="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="uppercase tracking-wider" />
            <th className="px-2 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell text-center">Receipt</th>
            <th className="px-2 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell text-center">WHT</th>
            <th className="px-2 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell text-center">Ref</th>
            <SortableHeader label="Owner" field="owner" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="uppercase tracking-wider hidden xl:table-cell" />
            <th className="px-2 py-3 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(b => {
            const isOverdue = b.due_date && differenceInDays(today, parseISO(b.due_date)) > 0 && b.status !== 'paid' && b.status !== 'cancelled';
            const daysOverdue = b.due_date ? differenceInDays(today, parseISO(b.due_date)) : 0;
            const dueStyle = isOverdue ? 'text-red-600 font-semibold' : '';
            const rowBg = isOverdue ? 'bg-red-50/40' : '';

            return (
              <tr key={b.id} className={`border-b last:border-b-0 hover:bg-muted/10 transition-colors ${rowBg}`}>
                <td className="px-3 py-3">
                  <span className="text-sm font-medium text-foreground truncate block max-w-[180px]">{b.customer_name}</span>
                </td>
                <td className="px-2 py-3 hidden md:table-cell">
                  {b.department ? (
                    <Badge variant="outline" className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${DEPT_COLORS[b.department] || ''}`}>
                      {DEPT_SHORT[b.department] || b.department}
                    </Badge>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-2 py-3 hidden md:table-cell">
                  <span className="text-xs text-muted-foreground">{b.period_month || '—'}</span>
                </td>
                <td className="px-2 py-3 hidden lg:table-cell">
                  {b.invoice_number ? (
                    <span className="text-xs font-mono text-primary font-semibold">{b.invoice_number}</span>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-2 py-3 hidden lg:table-cell">
                  <span className="text-xs text-muted-foreground">{b.billing_date ? format(parseISO(b.billing_date), 'dd MMM yy') : '—'}</span>
                </td>
                <td className="px-2 py-3 hidden md:table-cell">
                  {b.due_date ? (
                    <span className={`text-xs ${dueStyle}`}>
                      {format(parseISO(b.due_date), 'dd MMM yy')}
                      {isOverdue && daysOverdue > 0 && (
                        <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1 py-0.5 rounded font-semibold">+{daysOverdue}d</span>
                      )}
                    </span>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-3">
                  <div>
                    <span className="text-sm font-bold">฿{(b.amount || 0).toLocaleString()}</span>
                    {b.wht_amount > 0 && (
                      <p className="text-[10px] text-muted-foreground">+WHT ฿{b.wht_amount.toLocaleString()}</p>
                    )}
                  </div>
                </td>
                <td className="px-2 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${STATUS_DOT[b.status] || 'bg-gray-400'}`} />
                    <span className="text-xs font-medium">{STATUS_LABEL[b.status] || b.status}</span>
                  </div>
                </td>
                <td className="px-2 py-3 hidden lg:table-cell text-center" onClick={e => e.stopPropagation()}>
                  <div className="flex flex-col items-center gap-0.5">
                    <Checkbox
                      checked={!!b.receipt_received}
                      onCheckedChange={() => onToggleReceipt(b)}
                      className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                    />
                    {b.receipt_date && <span className="text-[9px] text-muted-foreground">{b.receipt_date}</span>}
                  </div>
                </td>
                <td className="px-2 py-3 hidden lg:table-cell text-center" onClick={e => e.stopPropagation()}>
                  <div className="flex flex-col items-center gap-0.5">
                    <Checkbox
                      checked={!!b.wht_received}
                      onCheckedChange={() => onToggleWht(b)}
                      className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                    />
                    {b.wht_date && <span className="text-[9px] text-muted-foreground">{b.wht_date}</span>}
                  </div>
                </td>
                <td className="px-2 py-3 hidden lg:table-cell text-center" onClick={e => e.stopPropagation()}>
                  <div className="flex flex-col items-center gap-0.5">
                    <Checkbox
                      checked={!!b.referral_commission}
                      onCheckedChange={() => onToggleReferral(b)}
                      className="data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                    />
                  </div>
                </td>
                <td className="px-2 py-3 hidden xl:table-cell">
                  <span className="text-xs text-muted-foreground">{b.owner || '—'}</span>
                </td>
                <td className="px-2 py-3" onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(b)}>แก้ไข</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onRowClick?.(b)}>ดูรายละเอียด</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-4 py-2 border-t flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{billings.length} records</span>
        <span className="text-[11px] text-muted-foreground italic">Click ✓ to toggle Receipt / WHT / Ref (ค่าแนะนำ)</span>
      </div>
    </div>
  );
}