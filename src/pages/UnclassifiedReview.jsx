import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Inbox, Search, Tag, ClipboardPlus, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { parseUTCDate } from '@/lib/dateUtils';
import TablePagination, { paginateData } from '../components/shared/TablePagination';
import CreateTaskFromChat from '../components/chat/CreateTaskFromChat';

// ต้องตรงกับ LineMessage.request_type และ classifier
const REQ_TYPES = [
  { value: 'tax_invoice',   label: 'ออกใบกำกับภาษี',     statutory: false, priority: 'medium' },
  { value: 'wht_cert',      label: 'หัก ณ ที่จ่าย',       statutory: true,  priority: 'high' },
  { value: 'sso_enroll',    label: 'แจ้งเข้าประกันสังคม', statutory: true,  priority: 'high' },
  { value: 'sso_terminate', label: 'แจ้งออกประกันสังคม', statutory: true,  priority: 'high' },
];

// heuristic: normalize ตัดช่องว่าง/จุด/ขีด + lowercase (เหมือน classifier)
const norm = (s) => (s || '').toLowerCase().replace(/[\s.\-/]/g, '');
// คำที่บ่งชี้ว่า "น่าจะเป็นคำขอ"
const CUES = ['ขอ','รบกวน','ช่วย','ออกให้','ทำให้','เตรียม','จัดการ','ดำเนินการ','อยากได้','ต้องการ','ฝาก','ส่งเอกสาร','ส่งไฟล์'];
// คำทักทาย/ขอบคุณ/ตอบกลับ ที่ต้องกรองทิ้ง (ไม่ใช่คำขอ)
const COURTESY = ['ขอบคุณ','ขอบใจ','ขอโทษ','ขออนุญาต','ขอตัว','สวัสดี','โอเค','okay','ok','thanks','thankyou','รับทราบ','ได้เลย','จ้า','เดี๋ยว','ส่งแล้ว','ส่งให้แล้ว','เรียบร้อย'];

function looksLikeRequest(content) {
  const c = norm(content);
  if (!c) return false;
  const hasCue = CUES.some((k) => c.includes(norm(k)));
  const isCourtesy = COURTESY.some((k) => c.includes(norm(k)));
  return hasCue && !isCourtesy;
}

function ageText(created) {
  try {
    const h = (Date.now() - parseUTCDate(created).getTime()) / 3600000;
    if (h < 1) return `${Math.max(1, Math.round(h * 60))} นาที`;
    if (h < 24) return `${Math.round(h)} ชม.`;
    return `${Math.floor(h / 24)} วัน`;
  } catch { return '-'; }
}

export default function UnclassifiedReview() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false); // true = แสดงทุก 'other' รวมที่ heuristic ตัดออก
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [classifyMsg, setClassifyMsg] = useState(null);
  const [classifyType, setClassifyType] = useState('tax_invoice');
  const [classifyKeyword, setClassifyKeyword] = useState('');
  const [taskMsg, setTaskMsg] = useState(null);

  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['unclassifiedReview'],
    queryFn: () => base44.entities.LineMessage.filter(
      { direction: 'incoming', triage_status: 'new', request_type: 'other' },
      '-created_date', 500
    ),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['unclassifiedReview'] });
    queryClient.invalidateQueries({ queryKey: ['triage-queue'] });
  };

  const dismissMutation = useMutation({
    mutationFn: (msg) => base44.entities.LineMessage.update(msg.id, {
      triage_status: 'dismissed',
      dismiss_reason: 'ตรวจแล้วไม่ใช่คำขอ',
      dismissed_by: currentUser?.email || '',
      dismissed_at: new Date().toISOString(),
    }),
    onSuccess: () => { invalidate(); toast.success('ปิดเรื่องแล้ว'); },
    onError: (e) => toast.error('ปิดไม่สำเร็จ: ' + e.message),
  });

  // จัดเป็นประเภท + เพิ่มคำเข้า KeywordManager แล้วย้ายข้อความเข้าคิวหลัก
  const classifyMutation = useMutation({
    mutationFn: async () => {
      const meta = REQ_TYPES.find((t) => t.value === classifyType);
      const kw = classifyKeyword.trim();
      if (kw) {
        await base44.entities.RequestKeyword.create({
          request_type: classifyType, keyword: kw, active: true, note: 'เพิ่มจากเลนตรวจ',
        });
      }
      await base44.entities.LineMessage.update(classifyMsg.id, {
        request_type: classifyType,
        is_actionable: true,
        has_statutory_deadline: meta.statutory,
        auto_priority: meta.priority,
        // triage_status คงเป็น 'new' เพื่อให้เด้งเข้าคิวหลัก
      });
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['requestKeywords'] });
      setClassifyMsg(null);
      toast.success('จัดประเภทแล้ว — ย้ายเข้าคิวหลัก' + (classifyKeyword.trim() ? ' + เพิ่มคำ' : ''));
    },
    onError: (e) => toast.error('ไม่สำเร็จ: ' + e.message),
  });

  const openClassify = (msg) => {
    setClassifyMsg(msg);
    setClassifyType('tax_invoice');
    setClassifyKeyword((msg.content || '').trim().slice(0, 60));
  };

  const filtered = useMemo(() => {
    let list = raw;
    if (!showAll) list = list.filter((m) => looksLikeRequest(m.content));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((m) => (m.content || '').toLowerCase().includes(q) || (m.display_name || '').toLowerCase().includes(q));
    }
    return list;
  }, [raw, showAll, search]);

  React.useEffect(() => { setPage(1); }, [search, showAll]);
  const paged = paginateData(filtered, page, pageSize);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><Inbox className="w-5 h-5" /> ข้อความยังไม่ระบุประเภท</h1>
            <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-medium">{filtered.length} รายการ</span>
          </div>
          <p className="text-xs text-muted-foreground">ข้อความที่ระบบยังจับประเภทไม่ได้ แต่น่าจะเป็นคำขอ — เปิดตรวจเป็นระยะเพื่อเก็บคำใหม่เข้า KeywordManager</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ค้นหาข้อความ, กลุ่ม..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-8 text-xs" />
        </div>
        <Button variant={showAll ? 'default' : 'outline'} size="sm" className="text-xs h-8" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'แสดงเฉพาะที่น่าจะเป็นคำขอ' : 'แสดงทั้งหมด (รวมที่กรองออก)'}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">กำลังโหลด...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">ไม่มีข้อความค้างตรวจ 🎉</div>
      ) : (
        <div className="bg-card rounded-lg border overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">ลูกค้า/กลุ่ม</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">ผู้ส่ง</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">ข้อความ</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">อายุ</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((m, i) => (
                <tr key={m.id} className={`border-b last:border-b-0 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/5'}`}>
                  <td className="px-4 py-2.5 text-xs font-medium">{m.display_name || m.customer_name || '-'}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell">{m.sender_name || '-'}</td>
                  <td className="px-4 py-2.5 text-xs truncate max-w-[280px]" title={m.content}>{m.content}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{ageText(m.created_date)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <Button size="sm" className="h-7 text-[11px] gap-1" onClick={() => openClassify(m)}>
                        <Tag className="w-3 h-3" /> เป็นคำขอ
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={() => setTaskMsg(m)}>
                        <ClipboardPlus className="w-3 h-3" /> สร้างงาน
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 text-muted-foreground" onClick={() => { if (confirm('ยืนยันว่าไม่ใช่คำขอ?')) dismissMutation.mutate(m); }}>
                        <XCircle className="w-3 h-3" /> ปิด
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <TablePagination totalItems={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      )}

      {/* Dialog: จัดเป็นประเภท + เพิ่มคำ */}
      <Dialog open={!!classifyMsg} onOpenChange={(o) => { if (!o) setClassifyMsg(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>จัดเป็นคำขอ + สอนระบบ</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="p-2.5 bg-muted rounded text-xs whitespace-pre-wrap">{classifyMsg?.content}</div>
            <div className="space-y-1.5">
              <Label className="text-xs">จัดเป็นประเภท *</Label>
              <Select value={classifyType} onValueChange={setClassifyType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{REQ_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">เพิ่มคำนี้เข้า KeywordManager (แก้ให้สั้น/ตรงประเด็น)</Label>
              <Input value={classifyKeyword} onChange={(e) => setClassifyKeyword(e.target.value)} className="text-xs h-8" placeholder="เว้นว่างได้ถ้าไม่ต้องการเพิ่มคำ" />
              <p className="text-[10px] text-muted-foreground">แนะนำให้ตัดเหลือเฉพาะวลีที่เป็นสัญญาณ เช่น "ขอสำเนา" ไม่ใช่ทั้งประโยค</p>
            </div>
            <Button onClick={() => classifyMutation.mutate()} disabled={classifyMutation.isPending} className="w-full text-xs">
              {classifyMutation.isPending ? 'กำลังบันทึก...' : 'ยืนยัน — ย้ายเข้าคิวหลัก'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: สร้างงานจากข้อความ (ใช้ component เดิม) */}
      {taskMsg && (
        <CreateTaskFromChat
          open={!!taskMsg}
          onOpenChange={(o) => { if (!o) { setTaskMsg(null); invalidate(); } }}
          message={taskMsg}
          chatDisplayName={taskMsg.display_name}
        />
      )}
    </div>
  );
}