import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { History, User } from 'lucide-react';
import moment from 'moment';

const FIELD_LABELS = {
  username: 'Username',
  password: 'Password',
  url: 'URL',
  notes: 'หมายเหตุ',
  service: 'บริการ',
  customer: 'ลูกค้า',
  created: 'สร้างใหม่',
};

export default function ChangeHistoryDialog({ open, onOpenChange, credential }) {
  const history = credential?.change_history || [];
  const sorted = [...history].reverse(); // newest first

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-4 h-4" /> ประวัติการแก้ไข
          </DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground mb-2">
          {credential?.customer_name} — {credential?.service_name || credential?.service_code}
        </div>

        {sorted.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">ไม่มีประวัติการแก้ไข</p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {sorted.map((entry, idx) => (
              <div key={idx} className="flex gap-3 p-3 rounded-lg bg-muted/30 border">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">{entry.changed_by_name || entry.changed_by}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {entry.changed_at ? moment(entry.changed_at).format('DD/MM/YYYY HH:mm:ss') : '—'}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(entry.fields_changed || []).map((f, fi) => (
                      <Badge key={fi} variant="secondary" className="text-[10px] bg-orange-50 text-orange-700">
                        {FIELD_LABELS[f] || f}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}