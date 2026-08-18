import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { FileText, Shield, UserPlus, UserMinus, Clock, CheckCircle, PlayCircle, Search, Filter, XCircle } from 'lucide-react';
import moment from 'moment';

const REQUEST_TYPES = {
  tax_invoice: { label: 'ออกใบกำกับภาษี', icon: FileText, color: 'bg-blue-100 text-blue-700' },
  withholding_cert: { label: 'ออกใบหัก ณ ที่จ่าย', icon: Shield, color: 'bg-purple-100 text-purple-700' },
  sso_register: { label: 'แจ้งเข้าประกันสังคม', icon: UserPlus, color: 'bg-green-100 text-green-700' },
  sso_terminate: { label: 'แจ้งออกประกันสังคม', icon: UserMinus, color: 'bg-orange-100 text-orange-700' },
};

const STATUS_MAP = {
  pending: { label: 'รอดำเนินการ', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  in_progress: { label: 'กำลังดำเนินการ', color: 'bg-blue-100 text-blue-700', icon: PlayCircle },
  completed: { label: 'เสร็จแล้ว', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'ยกเลิก', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function LineRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [actionDialog, setActionDialog] = useState(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['line-requests', statusFilter],
    queryFn: () => {
      const filter = statusFilter === 'all' ? {} : { status: statusFilter };
      return base44.entities.LineRequest.filter(filter, '-created_date', 100);
    },
  });

  const filtered = useMemo(() => {
    let result = requests;
    if (typeFilter !== 'all') {
      result = result.filter(r => r.request_type === typeFilter);
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(r =>
        (r.customer_name || '').toLowerCase().includes(s) ||
        (r.sender_name || '').toLowerCase().includes(s) ||
        (r.original_message || '').toLowerCase().includes(s) ||
        (r.details || '').toLowerCase().includes(s)
      );
    }
    return result;
  }, [requests, typeFilter, search]);

  const stats = useMemo(() => {
    const all = requests;
    return {
      pending: all.filter(r => r.status === 'pending').length,
      in_progress: all.filter(r => r.status === 'in_progress').length,
      completed: all.filter(r => r.status === 'completed').length,
    };
  }, [requests]);

  async function handleAction(action) {
    setSaving(true);
    const item = actionDialog;
    const updateData = {};

    if (action === 'start') {
      updateData.status = 'in_progress';
      updateData.assigned_to = user.email;
      updateData.assigned_name = user.full_name;
    } else if (action === 'complete') {
      updateData.status = 'completed';
      updateData.completed_at = new Date().toISOString();
      updateData.completed_by = user.email;
      updateData.completed_by_name = user.full_name;
    } else if (action === 'cancel') {
      updateData.status = 'cancelled';
    }

    if (note.trim()) updateData.note = note.trim();

    await base44.entities.LineRequest.update(item.id, updateData);
    toast({ title: 'อัพเดทสำเร็จ' });
    queryClient.invalidateQueries({ queryKey: ['line-requests'] });
    setActionDialog(null);
    setNote('');
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">คำขอจาก LINE</h1>
        <div className="flex items-center gap-2 text-sm">
          <Badge className="bg-yellow-100 text-yellow-700">{stats.pending} รอดำเนินการ</Badge>
          <Badge className="bg-blue-100 text-blue-700">{stats.in_progress} กำลังทำ</Badge>
          <Badge className="bg-green-100 text-green-700">{stats.completed} เสร็จแล้ว</Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="ค้นหา..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><Filter className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกสถานะ</SelectItem>
            <SelectItem value="pending">รอดำเนินการ</SelectItem>
            <SelectItem value="in_progress">กำลังทำ</SelectItem>
            <SelectItem value="completed">เสร็จแล้ว</SelectItem>
            <SelectItem value="cancelled">ยกเลิก</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกประเภท</SelectItem>
            {Object.entries(REQUEST_TYPES).map(([key, val]) => (
              <SelectItem key={key} value={key}>{val.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">ไม่มีคำขอ</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const typeInfo = REQUEST_TYPES[item.request_type] || { label: item.request_type, icon: FileText, color: 'bg-gray-100 text-gray-700' };
            const statusInfo = STATUS_MAP[item.status] || STATUS_MAP.pending;
            const TypeIcon = typeInfo.icon;
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{typeInfo.label}</span>
                        <Badge className={statusInfo.color} variant="secondary">{statusInfo.label}</Badge>
                        {item.customer_name && <span className="text-xs text-muted-foreground">• {item.customer_name}</span>}
                      </div>
                      <p className="text-sm text-foreground mt-1 line-clamp-2">{item.original_message}</p>
                      {item.details && <p className="text-xs text-muted-foreground mt-1">📋 {item.details}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>จาก: {item.sender_name || 'ไม่ทราบ'}</span>
                        <span>{moment(item.created_date).fromNow()}</span>
                        {item.assigned_name && <span>• ผู้รับผิดชอบ: {item.assigned_name}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {item.status === 'pending' && (
                        <Button size="sm" onClick={() => setActionDialog({ ...item, _action: 'start' })}>รับงาน</Button>
                      )}
                      {item.status === 'in_progress' && (
                        <Button size="sm" variant="outline" className="text-green-600 border-green-300" onClick={() => setActionDialog({ ...item, _action: 'complete' })}>
                          ปิดงาน
                        </Button>
                      )}
                      {(item.status === 'pending' || item.status === 'in_progress') && (
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setActionDialog({ ...item, _action: 'cancel' })}>
                          ยกเลิก
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={(open) => { if (!open) { setActionDialog(null); setNote(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?._action === 'start' && 'รับงานนี้'}
              {actionDialog?._action === 'complete' && 'ปิดงาน'}
              {actionDialog?._action === 'cancel' && 'ยกเลิกคำขอ'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">"{actionDialog?.original_message}"</p>
            <Textarea placeholder="หมายเหตุ (ไม่บังคับ)" value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionDialog(null); setNote(''); }}>ยกเลิก</Button>
            <Button onClick={() => handleAction(actionDialog._action)} disabled={saving}>
              {saving ? 'กำลังบันทึก...' : 'ยืนยัน'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}