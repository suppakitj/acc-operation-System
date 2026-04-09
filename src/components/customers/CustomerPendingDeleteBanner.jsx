import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Check, X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import moment from 'moment';

export default function CustomerPendingDeleteBanner({ pendingItems, isAdmin, onRefresh }) {
  const [loading, setLoading] = useState(null);

  if (!pendingItems || pendingItems.length === 0) return null;

  const handleApprove = async (c) => {
    if (!confirm(`ยืนยันอนุมัติลบลูกค้า "${c.company_name}" ?`)) return;
    setLoading(c.id);
    try {
      await base44.functions.invoke('customerDeleteManager', { action: 'approve_delete', customer_id: c.id });
      toast.success('อนุมัติลบเรียบร้อย');
      onRefresh();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async (c) => {
    const rejectReason = prompt('เหตุผลที่ไม่อนุมัติ:');
    if (rejectReason === null) return;
    setLoading(c.id);
    try {
      await base44.functions.invoke('customerDeleteManager', { action: 'reject_delete', customer_id: c.id, reject_reason: rejectReason });
      toast.success('ปฏิเสธคำขอลบแล้ว');
      onRefresh();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(null);
    }
  };

  const handleCancel = async (c) => {
    setLoading(c.id);
    try {
      await base44.functions.invoke('customerDeleteManager', { action: 'cancel_delete', customer_id: c.id });
      toast.success('ยกเลิกคำขอลบแล้ว');
      onRefresh();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
        <AlertTriangle className="w-4 h-4" />
        คำขอลบลูกค้ารออนุมัติ ({pendingItems.length})
      </div>
      {pendingItems.map(item => (
        <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold">{item.company_name}</span>
              <Badge variant="outline" className="text-[10px]">{item.customer_code}</Badge>
              <Badge className="text-[10px] bg-amber-100 text-amber-700 border-0">รอ Admin อนุมัติ</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              ขอโดย: {item.delete_requested_by_name || item.delete_requested_by} • {item.delete_requested_at ? moment(item.delete_requested_at).format('DD/MM/YY HH:mm') : ''}
            </p>
            {item.delete_reason && (
              <p className="text-[11px] text-amber-700 mt-0.5">เหตุผล: {item.delete_reason}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isAdmin ? (
              <>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-green-600 border-green-300 hover:bg-green-50"
                  onClick={() => handleApprove(item)} disabled={loading === item.id}>
                  {loading === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} อนุมัติ
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => handleReject(item)} disabled={loading === item.id}>
                  <X className="w-3 h-3" /> ปฏิเสธ
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                onClick={() => handleCancel(item)} disabled={loading === item.id}>
                {loading === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />} ยกเลิกคำขอ
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}