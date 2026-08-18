import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tags, Plus, Search, Pencil, Trash2, DownloadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { useAccessControl } from '../components/auth/useAccessControl';
import TablePagination, { paginateData } from '../components/shared/TablePagination';

const REQ_TYPES = [
  { value: 'tax_invoice',   label: 'ออกใบกำกับภาษี',     color: 'bg-blue-100 text-blue-700' },
  { value: 'wht_cert',      label: 'หัก ณ ที่จ่าย',       color: 'bg-amber-100 text-amber-700' },
  { value: 'sso_enroll',    label: 'แจ้งเข้าประกันสังคม', color: 'bg-green-100 text-green-700' },
  { value: 'sso_terminate', label: 'แจ้งออกประกันสังคม', color: 'bg-red-100 text-red-700' },
];
const typeLabel = (v) => REQ_TYPES.find((t) => t.value === v)?.label || v;
const typeColor = (v) => REQ_TYPES.find((t) => t.value === v)?.color || 'bg-gray-100 text-gray-600';

export default function KeywordManager() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);
  const canManage = ac.role === 'admin';

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ request_type: 'tax_invoice', keyword: '', active: true, note: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: keywords = [], isLoading } = useQuery({
    queryKey: ['requestKeywords'],
    queryFn: () => base44.entities.RequestKeyword.list('-created_date', 2000),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['requestKeywords'] });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RequestKeyword.create(data),
    onSuccess: () => { invalidate(); setShowForm(false); toast.success('เพิ่มคำเรียบร้อย'); },
    onError: (e) => toast.error('เพิ่มไม่สำเร็จ: ' + e.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RequestKeyword.update(id, data),
    onSuccess: () => { invalidate(); setShowForm(false); setEditing(null); toast.success('บันทึกเรียบร้อย'); },
    onError: (e) => toast.error('บันทึกไม่สำเร็จ: ' + e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RequestKeyword.delete(id),
    onSuccess: () => { invalidate(); toast.success('ลบเรียบร้อย'); },
    onError: (e) => toast.error('ลบไม่สำเร็จ: ' + e.message),
  });
  const seedMutation = useMutation({
    mutationFn: () => base44.functions.invoke('seedRequestKeywords', {}),
    onSuccess: (res) => {
      invalidate();
      const d = res?.data ?? res ?? {};
      toast.success(`โหลดค่าเริ่มต้นแล้ว — เพิ่ม ${d.created ?? 0} คำ (มีอยู่แล้ว ${d.skipped ?? 0})`);
    },
    onError: (e) => toast.error('โหลดค่าเริ่มต้นไม่สำเร็จ: ' + e.message),
  });

  const toggleActive = (kw) => { if (canManage) updateMutation.mutate({ id: kw.id, data: { active: !kw.active } }); };
  const openCreate = () => { setEditing(null); setForm({ request_type: typeFilter !== 'all' ? typeFilter : 'tax_invoice', keyword: '', active: true, note: '' }); setShowForm(true); };
  const openEdit = (kw) => { setEditing(kw); setForm({ request_type: kw.request_type, keyword: kw.keyword || '', active: kw.active !== false, note: kw.note || '' }); setShowForm(true); };
  const handleSubmit = () => {
    if (!form.keyword.trim()) { toast.error('กรุณากรอกคำค้นหา'); return; }
    const data = { ...form, keyword: form.keyword.trim() };
    if (editing) updateMutation.mutate({ id: editing.id, data }); else createMutation.mutate(data);
  };

  const filtered = useMemo(() => keywords.filter((k) => {
    if (typeFilter !== 'all' && k.request_type !== typeFilter) return false;
    if (activeFilter === 'active' && k.active === false) return false;
    if (activeFilter === 'inactive' && k.active !== false) return false;
    if (search && !(k.keyword || '').toLowerCase().includes(search.toLowerCase()) && !(k.note || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [keywords, typeFilter, activeFilter, search]);

  React.useEffect(() => { setPage(1); }, [search, typeFilter, activeFilter]);
  const paged = paginateData(filtered, page, pageSize);
  const countByType = (v) => keywords.filter((k) => k.request_type === v).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><Tags className="w-5 h-5" /> จัดการคำค้นหา</h1>
            <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-medium">{keywords.length} คำ</span>
          </div>
          <p className="text-xs text-muted-foreground">คำที่ระบบใช้จับประเภทคำขอจากข้อความ LINE อัตโนมัติ (แก้ที่นี่มีผลทันที ไม่ต้อง publish โค้ด)</p>
        </div>
        {canManage && (
          <div className="flex gap-2 shrink-0 self-start sm:self-auto">
            {keywords.length === 0 && (
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
                <DownloadCloud className="w-3.5 h-3.5" /> {seedMutation.isPending ? 'กำลังโหลด...' : 'โหลดค่าเริ่มต้น'}
              </Button>
            )}
            <Button size="sm" className="gap-1.5 text-xs" onClick={openCreate}><Plus className="w-3.5 h-3.5" /> เพิ่มคำ</Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {REQ_TYPES.map((t) => (
          <button key={t.value} onClick={() => setTypeFilter(typeFilter === t.value ? 'all' : t.value)}
            className={`text-[11px] rounded-full px-2.5 py-1 border transition-colors ${typeFilter === t.value ? 'border-primary' : 'border-transparent'} ${t.color}`}>
            {t.label} · {countByType(t.value)}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ค้นหาคำ, หมายเหตุ..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-8 text-xs" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[170px] h-8 text-xs"><SelectValue placeholder="ประเภท" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกประเภท</SelectItem>
            {REQ_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={activeFilter} onValueChange={setActiveFilter}>
          <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs"><SelectValue placeholder="สถานะ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกสถานะ</SelectItem>
            <SelectItem value="active">เปิดใช้งาน</SelectItem>
            <SelectItem value="inactive">ปิดใช้งาน</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground self-center hidden md:block ml-auto">{filtered.length} of {keywords.length}</span>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">กำลังโหลด...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {keywords.length === 0 ? 'ยังไม่มีคำค้นหา — กด "โหลดค่าเริ่มต้น" เพื่อเริ่มจาก 89 คำมาตรฐาน' : 'ไม่พบข้อมูล'}
        </div>
      ) : (
        <div className="bg-card rounded-lg border overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">คำค้นหา</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">ประเภท</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">หมายเหตุ</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground text-center">เปิดใช้งาน</th>
                {canManage && <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground text-center">จัดการ</th>}
              </tr>
            </thead>
            <tbody>
              {paged.map((k, i) => (
                <tr key={k.id} className={`border-b last:border-b-0 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/5'} ${k.active === false ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-2.5 text-xs font-medium">{k.keyword}</td>
                  <td className="px-4 py-2.5"><Badge variant="secondary" className={`text-[10px] ${typeColor(k.request_type)}`}>{typeLabel(k.request_type)}</Badge></td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell truncate max-w-[220px]">{k.note || '-'}</td>
                  <td className="px-4 py-2.5 text-center"><Switch checked={k.active !== false} onCheckedChange={() => toggleActive(k)} disabled={!canManage} /></td>
                  {canManage && (
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(k)}><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm(`ลบคำ "${k.keyword}"?`)) deleteMutation.mutate(k.id); }}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <TablePagination totalItems={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        หมายเหตุ: การกำหนด "มีกำหนดกฎหมาย"/priority ต่อประเภท (TYPE_META) และคำบ่งชี้การร้องขอ/คำปฏิเสธ (ACTION/NEGATION cues) ยังอยู่ในโค้ด lineWebhook — หน้านี้จัดการเฉพาะรายการคำค้นหา
      </p>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'แก้ไขคำค้นหา' : 'เพิ่มคำค้นหา'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">ประเภทคำขอ *</Label>
              <Select value={form.request_type} onValueChange={(v) => setForm((p) => ({ ...p, request_type: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{REQ_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">คำค้นหา *</Label>
              <Input value={form.keyword} onChange={(e) => setForm((p) => ({ ...p, keyword: e.target.value }))} placeholder="เช่น ออกใบกำกับ, 50 ทวิ, แจ้งเข้า ปกส" className="text-xs h-8" />
              <p className="text-[10px] text-muted-foreground">พิมพ์แบบมีเว้นวรรค/จุดได้ตามปกติ ระบบจะตัดให้เองตอนเทียบ</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">หมายเหตุ</Label>
              <Input value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} placeholder="เช่น คำที่ลูกค้า ABC ใช้" className="text-xs h-8" />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label className="text-xs">เปิดใช้งาน</Label>
              <Switch checked={form.active} onCheckedChange={(v) => setForm((p) => ({ ...p, active: v }))} />
            </div>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="w-full text-xs">
              {(createMutation.isPending || updateMutation.isPending) ? 'กำลังบันทึก...' : editing ? 'บันทึก' : 'เพิ่มคำ'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}