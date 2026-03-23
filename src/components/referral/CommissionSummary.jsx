import React, { useMemo } from 'react';
import { DollarSign, Users, TrendingUp, Percent } from 'lucide-react';

export default function CommissionSummary({ data, referrers }) {
  const stats = useMemo(() => {
    const totalCommission = data.reduce((s, d) => s + d.commission_amount, 0);
    const totalBilling = data.reduce((s, d) => s + d.billing_amount, 0);
    const uniqueReferrers = new Set(data.map(d => d.referrer_id)).size;
    const uniqueCustomers = new Set(data.map(d => d.customer_id)).size;
    return { totalCommission, totalBilling, uniqueReferrers, uniqueCustomers };
  }, [data]);

  const cards = [
    { label: 'ค่าแนะนำรวม', value: `฿${stats.totalCommission.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'bg-amber-100 text-amber-600' },
    { label: 'ยอด Billing รวม', value: `฿${stats.totalBilling.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'bg-blue-100 text-blue-600' },
    { label: 'ผู้แนะนำ', value: `${stats.uniqueReferrers} คน`, icon: Users, color: 'bg-green-100 text-green-600' },
    { label: 'ลูกค้าที่มาจากแนะนำ', value: `${stats.uniqueCustomers} ราย`, icon: Percent, color: 'bg-purple-100 text-purple-600' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map(c => (
        <div key={c.label} className="bg-card rounded-xl border p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${c.color} flex items-center justify-center shrink-0`}>
            <c.icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">{c.label}</p>
            <p className="text-base font-bold">{c.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}