import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Phone, Mail } from 'lucide-react';

export default function ReferrerList({ referrers, customers, onEdit }) {
  // Count customers per referrer
  const countMap = {};
  customers.forEach(c => {
    if (c.referrer_id) countMap[c.referrer_id] = (countMap[c.referrer_id] || 0) + 1;
  });

  if (referrers.length === 0) {
    return <div className="text-center py-12 text-muted-foreground text-sm">ยังไม่มีผู้แนะนำ</div>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {referrers.map(r => (
        <div key={r.id} className="bg-card rounded-xl border p-4 space-y-2 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold">{r.name}</h3>
              <div className="flex items-center gap-3 mt-1">
                {r.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{r.phone}</span>}
                {r.email && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{r.email}</span>}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(r)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={r.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
              {r.status === 'active' ? 'Active' : 'Inactive'}
            </Badge>
            <span className="text-xs text-muted-foreground">ลูกค้าที่แนะนำ: <span className="font-semibold text-foreground">{countMap[r.id] || 0}</span> ราย</span>
          </div>
          {r.bank_name && (
            <p className="text-[11px] text-muted-foreground">บัญชี: {r.bank_name} {r.bank_account}</p>
          )}
        </div>
      ))}
    </div>
  );
}