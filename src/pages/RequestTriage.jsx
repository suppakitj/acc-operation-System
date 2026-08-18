import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle, Users, User, Scale, Clock, Flag, ListChecks, XCircle, Plus, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

const TYPE_LABELS = {
  tax_invoice: 'ใบกำกับภาษี',
  wht_cert: 'หัก ณ ที่จ่าย',
  sso_enroll: 'เข้า สปส.',
  sso_terminate: 'ออก สปส.',
  other: 'อื่น ๆ',
};

const TYPE_COLORS = {
  tax_invoice: 'bg-blue-100 text-blue-700',
  wht_cert: 'bg-purple-100 text-purple-700',
  sso_enroll: 'bg-green-100 text-green-700',
  sso_terminate: 'bg-orange-100 text-orange-700',
  other: 'bg-gray-100 text-gray-600',
};

const PRIORITY_MAP = { urgent: 4, high: 3, medium: 2, low: 1 };
const PRIORITY_LABELS = { urgent: 'เร่งด่วน', high: 'สูง', medium: 'ปกติ', low: 'ต่ำ' };
const PRIORITY_COLORS = { urgent: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700', medium: 'bg-blue-50 text-blue-600', low: 'bg-gray-50 text-gray-500' };

const DISMISS_REASONS = [
  'ไม่ใช่คำสั่งงาน',
  'ซ้ำกับงานเดิม',
  'ลูกค้ายกเลิก',
  'อื่น ๆ',
];

function getAge(createdDate) {
  const diff = Date.now() - new Date(createdDate).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  if (days > 0) return `${days} วัน ${remainHours} ชม.`;
  if (hours > 0) return `${hours} ชม.`;
  const mins = Math.floor(diff / 60000);
  return `${mins} นาที`;
}

function getAgeHours(createdDate) {
  return (Date.now() - new Date(createdDate).getTime()) / 3600000;
}

export default function RequestTriage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [filterType, setFilterType] = useState('all');
  const [filterStatutory, setFilterStatutory] = useState(false);
  const [filterSla, setFilterSla] = useState('all');

  const [dismissOpen, setDismissOpen] = useState(false);
  const [dismissTarget, setDismissTarget] = useState(null);
  const [dismissReason, setDismissReason] = useState('');
  const [dismissCustom, setDismissCustom] = useState('');
  const [dismissLoading, setDismissLoading] = useState(false);

  // Fetch actionable new messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['triage-queue'],
    queryFn: () => base44.entities.LineMessage.filter(
      { direction: 'incoming', triage_status: 'new', is_actionable: true },
      '-created_date', 200
    ),
    refetchInterval: 30000,
  });

  // Fetch SLA configs
  const { data: configs = [] } = useQuery({
    queryKey: ['app-configs-sla'],
    queryFn: () => base44.entities.AppConfig.filter({}),
    staleTime: 60000,
  });

  const slaAmber = parseFloat(configs.find(c => c.key === 'triage_sla_amber_hours')?.value) || 4;
  const slaRed = parseFloat(configs.find(c => c.key === 'triage_sla_red_hours')?.value) || 24;

  // Sort & filter
  const sorted = useMemo(() => {
    let list = [...messages];

    if (filterType !== 'all') list = list.filter(m => m.request_type === filterType);
    if (filterStatutory) list = list.filter(m => m.has_statutory_deadline);
    if (filterSla === 'over_sla') list = list.filter(m => getAgeHours(m.created_date) > slaAmber);

    list.sort((a, b) => {
      if (a.has_statutory_deadline !== b.has_statutory_deadline) return a.has_statutory_deadline ? -1 : 1;
      const pa = PRIORITY_MAP[a.auto_priority] || 0;
      const pb = PRIORITY_MAP[b.auto_priority] || 0;
      if (pa !== pb) return pb - pa;
      return new Date(a.created_date) - new Date(b.created_date);
    });

    return list;
  }, [messages, filterType, filterStatutory, filterSla, slaAmber]);

  // Stats
  const totalPending = messages.length;
  const statutoryCount = messages.filter(m => m.has_statutory_deadline).length;
  const overSlaCount = messages.filter(m => getAgeHours(m.created_date) > slaRed).length;

  // Dismiss handler
  const handleDismiss = async () => {
    if (!dismissTarget) return;
    const reason = dismissReason === 'อื่น ๆ' ? dismissCustom : dismissReason;
    if (!reason.trim()) { toast({ title: 'กรุณาระบุเหตุผล', variant: 'destructive' }); return; }
    setDismissLoading(true);
    try {
      await base44.entities.LineMessage.update(dismissTarget.id, {
        triage_status: 'dismissed',
        dismissed_by: user?.email || '',
        dismissed_at: new Date().toISOString(),
        dismiss_reason: reason,
      });
      qc.invalidateQueries({ queryKey: ['triage-queue'] });
      toast({ title: 'ปิดเรื่องแล้ว' });
      setDismissOpen(false);
      setDismissTarget(null);
      setDismissReason('');
      setDismissCustom('');
    } catch (e) {
      toast({ title: 'เกิดข้อผิดพลาด', description: e.message, variant: 'destructive' });
    } finally {
      setDismissLoading(false);
    }
  };

  // Create task (placeholder — Phase 3 will implement full dialog)
  const handleCreateTask = (msg) => {
    toast({ title: 'สร้างงาน', description: 'ฟีเจอร์สร้างงานจากคำขอจะพร้อมใช้ใน Phase 3' });
  };

  const getRowBg = (msg) => {
    const age = getAgeHours(msg.created_date);
    if (age > slaRed) return 'bg-red-50';
    if (age > slaAmber) return 'bg-yellow-50';
    return '';
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <h1 className="text-xl font-bold">คิวรับเรื่อง</h1>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><ListChecks className="w-5 h-5 text-blue-600" /></div>
              <div><p className="text-2xl font-bold">{totalPending}</p><p className="text-xs text-muted-foreground">คำขอค้างทั้งหมด</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center"><Scale className="w-5 h-5 text-purple-600" /></div>
              <div><p className="text-2xl font-bold">{statutoryCount}</p><p className="text-xs text-muted-foreground">มีกำหนดกฎหมาย</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
              <div><p className="text-2xl font-bold text-red-600">{overSlaCount}</p><p className="text-xs text-muted-foreground">เกิน SLA (แดง)</p></div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40"><SelectValue placeholder="ประเภท" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกประเภท</SelectItem>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterSla} onValueChange={setFilterSla}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              <SelectItem value="over_sla">เกิน SLA</SelectItem>
            </SelectContent>
          </Select>
          <Button variant={filterStatutory ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatutory(!filterStatutory)}>
            <Scale className="w-3.5 h-3.5 mr-1" /> เฉพาะมีกำหนดกฎหมาย
          </Button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
        ) : sorted.length === 0 ? (
          <Card><CardContent className="p-10 text-center text-muted-foreground">ไม่มีคำขอค้าง 🎉</CardContent></Card>
        ) : (
          <div className="border rounded-lg overflow-auto bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">ลูกค้า/กลุ่ม</th>
                  <th className="px-3 py-2 font-medium">ผู้ส่ง</th>
                  <th className="px-3 py-2 font-medium">ข้อความ</th>
                  <th className="px-3 py-2 font-medium">ประเภท</th>
                  <th className="px-3 py-2 font-medium">กฎหมาย</th>
                  <th className="px-3 py-2 font-medium">สำคัญ</th>
                  <th className="px-3 py-2 font-medium">อายุ</th>
                  <th className="px-3 py-2 font-medium">ธง</th>
                  <th className="px-3 py-2 font-medium text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(msg => {
                  const ageHrs = getAgeHours(msg.created_date);
                  return (
                    <tr key={msg.id} className={`border-t hover:bg-muted/30 ${getRowBg(msg)}`}>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {msg.chat_type === 'group' ? <Users className="w-3.5 h-3.5 text-muted-foreground" /> : <User className="w-3.5 h-3.5 text-muted-foreground" />}
                          <span className="truncate max-w-[120px]">{msg.display_name || '-'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 truncate max-w-[100px]">{msg.sender_name || '-'}</td>
                      <td className="px-3 py-2 max-w-[200px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate block cursor-default">{msg.content?.slice(0, 80) || '-'}{msg.content?.length > 80 ? '…' : ''}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-sm whitespace-pre-wrap">{msg.content}</TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="px-3 py-2">
                        <Badge className={`text-[10px] ${TYPE_COLORS[msg.request_type] || TYPE_COLORS.other}`}>{TYPE_LABELS[msg.request_type] || 'อื่น ๆ'}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        {msg.has_statutory_deadline && <span className="text-[11px] text-red-600 font-medium">⚖️ มีกำหนด</span>}
                      </td>
                      <td className="px-3 py-2">
                        <Badge className={`text-[10px] ${PRIORITY_COLORS[msg.auto_priority] || ''}`}>{PRIORITY_LABELS[msg.auto_priority] || '-'}</Badge>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-1">
                          {ageHrs > slaRed && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                          <span>{getAge(msg.created_date)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-0.5">
                          {msg.multi_request && <span className="text-[10px] text-amber-700">หลายคำขอ</span>}
                          {msg.needs_review && <span className="text-[10px] text-red-600">⚠️ ตรวจก่อน</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleCreateTask(msg)}>
                            <Plus className="w-3 h-3 mr-0.5" />สร้างงาน
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => { setDismissTarget(msg); setDismissOpen(true); }}>
                            <XCircle className="w-3 h-3 mr-0.5" />ปิด
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Dismiss Dialog */}
        <Dialog open={dismissOpen} onOpenChange={setDismissOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>ปิดเรื่อง</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground mb-2">เลือกเหตุผลที่ปิดคำขอนี้</p>
            <div className="space-y-2">
              {DISMISS_REASONS.map(r => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="dismiss" value={r} checked={dismissReason === r} onChange={() => setDismissReason(r)} className="accent-primary" />
                  <span className="text-sm">{r}</span>
                </label>
              ))}
              {dismissReason === 'อื่น ๆ' && (
                <Textarea placeholder="ระบุเหตุผล..." value={dismissCustom} onChange={e => setDismissCustom(e.target.value)} className="mt-2" />
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDismissOpen(false)}>ยกเลิก</Button>
              <Button onClick={handleDismiss} disabled={dismissLoading || !dismissReason}>ยืนยันปิดเรื่อง</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}