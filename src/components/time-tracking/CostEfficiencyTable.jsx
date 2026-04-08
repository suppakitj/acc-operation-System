import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useSortableTable } from '@/hooks/useSortableTable';
import SortableHeader from '@/components/shared/SortableHeader';

function formatHours(mins) {
  if (!mins) return '0';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m} นาที`;
  return `${h} ชม.${m > 0 ? ` ${m} น.` : ''}`;
}

function formatCurrency(n) {
  if (!n) return '฿0';
  return `฿${n.toLocaleString('th-TH')}`;
}

export default function CostEfficiencyTable({ entries }) {
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('-created_date', 500),
    staleTime: 60_000,
  });

  const completed = entries.filter(e => !e.is_running && e.duration_minutes);

  const rows = useMemo(() => {
    const byCustomer = {};
    completed.forEach(e => {
      const key = e.customer_id || '_none';
      if (!byCustomer[key]) byCustomer[key] = { totalMinutes: 0, taskIds: new Set(), entryCount: 0 };
      byCustomer[key].totalMinutes += e.duration_minutes || 0;
      byCustomer[key].taskIds.add(e.task_id);
      byCustomer[key].entryCount++;
    });

    return Object.entries(byCustomer).map(([id, data]) => {
      const cust = customers.find(c => c.id === id);
      const monthlyFee = cust?.monthly_fee || 0;
      const totalHours = data.totalMinutes / 60;
      const costPerHour = totalHours > 0 && monthlyFee > 0 ? monthlyFee / totalHours : 0;

      return {
        id,
        name: cust?.company_name || completed.find(e => e.customer_id === id)?.customer_name || 'ไม่ระบุ',
        monthlyFee,
        totalMinutes: data.totalMinutes,
        totalHours,
        taskCount: data.taskIds.size,
        entryCount: data.entryCount,
        costPerHour,
      };
    });
  }, [completed, customers]);

  const { sorted, sortKey, sortDir, handleSort } = useSortableTable(rows, 'totalMinutes', 'desc');

  if (rows.length === 0) {
    return <div className="text-center py-6 text-muted-foreground text-sm">ไม่มีข้อมูล</div>;
  }

  const avgCostPerHour = (() => {
    const withFee = rows.filter(r => r.costPerHour > 0);
    if (withFee.length === 0) return 0;
    return withFee.reduce((s, r) => s + r.costPerHour, 0) / withFee.length;
  })();

  return (
    <div className="space-y-1">
      {avgCostPerHour > 0 && (
        <div className="text-[10px] text-muted-foreground mb-2 px-1">
          เฉลี่ย Cost/Hour: <span className="font-semibold text-foreground">{formatCurrency(Math.round(avgCostPerHour))}/ชม.</span>
          <span className="ml-2">· สีเขียว = คุ้มทุน (ค่าบริการต่อชั่วโมงสูง) · สีแดง = ใช้เวลาเยอะเทียบค่าบริการ</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b bg-muted/20">
            <tr>
              <SortableHeader label="ลูกค้า" field="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label="ค่าบริการ/เดือน" field="monthlyFee" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right hidden sm:table-cell" />
              <SortableHeader label="เวลาใช้ไป" field="totalMinutes" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right" />
              <SortableHeader label="Cost/Hour" field="costPerHour" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right hidden md:table-cell" />
              <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground text-center">Efficiency</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => {
              let effLevel = 'neutral';
              let EffIcon = Minus;
              if (row.monthlyFee > 0 && row.costPerHour > 0) {
                if (row.costPerHour >= avgCostPerHour * 1.2) {
                  effLevel = 'good';
                  EffIcon = TrendingUp;
                } else if (row.costPerHour <= avgCostPerHour * 0.8) {
                  effLevel = 'bad';
                  EffIcon = TrendingDown;
                }
              }

              const effColors = {
                good: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                bad: 'bg-red-50 text-red-700 border-red-200',
                neutral: 'bg-muted text-muted-foreground border-border',
              };
              const effLabel = { good: 'คุ้มทุน', bad: 'ต้องดู', neutral: 'ไม่มีค่าบริการ' };

              return (
                <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/10 transition-colors">
                  <td className="px-3 py-2 min-w-0">
                    <p className="text-xs font-medium truncate">{row.name}</p>
                    <p className="text-[10px] text-muted-foreground">{row.taskCount} tasks · {row.entryCount} entries</p>
                  </td>
                  <td className="px-3 py-2 text-right text-xs hidden sm:table-cell">
                    {row.monthlyFee > 0 ? (
                      <span className="font-medium">{formatCurrency(row.monthlyFee)}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Badge variant="secondary" className="text-[10px]">{formatHours(row.totalMinutes)}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right text-xs hidden md:table-cell">
                    {row.costPerHour > 0 ? (
                      <span className="font-medium">{formatCurrency(Math.round(row.costPerHour))}/ชม.</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${effColors[effLevel]}`}>
                      <EffIcon className="w-3 h-3" />
                      <span className="hidden sm:inline">{effLabel[effLevel]}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}