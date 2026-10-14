import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';

const URG = { urgent: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-green-100 text-green-700' };

export default function MentionCard({ msg, onCreate }) {
  const text = msg.summary_th || String(msg.content || '').slice(0, 120);
  return (
    <Card className="p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium truncate">{msg.customer_name || msg.display_name || '-'}</p>
        {msg.auto_priority && <Badge variant="outline" className={URG[msg.auto_priority]}>{msg.auto_priority}</Badge>}
      </div>
      <p className="text-xs text-muted-foreground">{msg.sender_name || '-'} · {format(new Date(msg.created_date), 'd/M HH:mm')}</p>
      <p className="text-sm line-clamp-3">{text}</p>
      <Button size="sm" className="w-full h-9" onClick={() => onCreate(msg)}><Plus className="w-3 h-3" />สร้างงาน</Button>
    </Card>
  );
}