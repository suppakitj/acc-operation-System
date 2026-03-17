import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, CalendarHeart, Pencil, Trash2 } from 'lucide-react';
import HolidayImportExport from '../components/holiday/HolidayImportExport';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAccessControl } from '../components/auth/useAccessControl';
import TablePagination, { paginateData } from '../components/shared/TablePagination';

const TYPE_LABELS = { national: 'วันหยุดราชการ', religious: 'วันหยุดทางศาสนา', special: 'วันหยุดพิเศษ', company: 'วันหยุดบริษัท' };
const TYPE_COLORS = { national: 'bg-red-100 text-red-700', religious: 'bg-orange-100 text-orange-700', special: 'bg-purple-100 text-purple-700', company: 'bg-blue-100 text-blue-700' };

export default function HolidayMaster() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);

  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name_th: '', name_en: '', date: '', year: new Date().getFullYear(), type: 'national', status: 'active', notes: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['holidayMaster'],
    queryFn: () => base44.entities.HolidayMaster.list('-date', 1000),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.HolidayMaster.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['holidayMaster'] }); setShowForm(false); toast.success('เพิ่มวันหยุดเรียบร้อย'); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HolidayMaster.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['holidayMaster'] }); setShowForm(false); setEditing(null); toast.success('บันทึกเรียบร้อย'); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.HolidayMaster.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['holidayMaster'] }); toast.success('ลบเรียบร้อย'); },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name_th: '', name_en: '', date: '', year: new Date().getFullYear(), type: 'national', status: 'active', notes: '' });
    setShowForm(true);
  };
  const openEdit = (h) => {
    setEditing(h);
    setForm({ name_th: h.name_th || '', name_en: h.name_en || '', date: h.date || '', year: h.year || '', type: h.type || 'national', status: h.status || 'active', notes: h.notes || '' });
    setShowForm(true);
  };
  const handleSubmit = () => {
    if (!form.name_th || !form.date) { toast.error('กรุณากรอกชื่อและวันที่'); return; }
    const year = form.date ? new Date(form.date).getFullYear() : form.year;
    const payload = { ...form, year };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  };

  // Available years from data
  const years = useMemo(() => {
    const s = new Set(holidays.map(h => h.year).filter(Boolean));
    s.add(new Date().getFullYear());
    return [...s].sort((a, b) => b - a);
  }, [holidays]);

  const filtered = useMemo(() => {
    return holidays.filter(h => {
      if (search) {
        const q = search.toLowerCase();
        if (!h.name_th?.toLowerCase().includes(q) && !h.name_en?.toLowerCase().includes(q)) return false;
      }
      if (yearFilter !== 'all' && String(h.year) !== yearFilter) return false;
      if (typeFilter !== 'all' && h.type !== typeFilter) return false;
      return true;
    });
  }, [holidays, search, yearFilter, typeFilter]);

  React.useEffect(() => { setPage(1); }, [search, yearFilter, typeFilter]);
  const paged = paginateData(filtered, page, pageSize);

  const canManage = ac.canManageHolidays !== false;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <CalendarHeart className="w-5 h-5" /> Holiday Master
            </h1>
            <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-medium">{holidays.length} รายการ</span>
          </div>
          <p className="text-xs text-muted-foreground">จัดการวันหยุดประจำปี — ใช้อ้างอิงใน Schedule, Task Due Date</p>
        </div>
        <div className="flex gap-2 shrink-0 self-start sm:self-auto">
          {canManage && <HolidayImportExport holidays={holidays} />}
          {canManage && (
            <Button size="sm" className="gap-1.5 text-xs" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5" /> เพิ่มวันหยุด
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ค้นหาชื่อวันหยุด..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-8 text-xs" />
        </div>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-full sm:w-[110px] h-8 text-xs"><SelectValue placeholder="ปี" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกปี</SelectItem>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[150px] h-8 text-xs"><SelectValue placeholder="ประเภท" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกประเภท</SelectItem>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground self-center hidden md:block ml-auto">{filtered.length} of {holidays.length}</span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">กำลังโหลด...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">ไม่พบข้อมูล</div>
      ) : (
        <div className="bg-card rounded-lg border overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">วันที่</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">ชื่อวันหยุด</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">ชื่อ (EN)</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">ประเภท</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden lg:table-cell">หมายเหตุ</th>
                {canManage && <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground text-center">จัดการ</th>}
              </tr>
            </thead>
            <tbody>
              {paged.map((h, i) => (
                <tr key={h.id} className={`border-b last:border-b-0 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/5'}`}>
                  <td className="px-4 py-2.5 text-xs font-mono">{h.date ? format(new Date(h.date + 'T00:00:00'), 'dd/MM/yyyy') : '-'}</td>
                  <td className="px-4 py-2.5 text-xs font-medium">{h.name_th}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell">{h.name_en || '-'}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="secondary" className={`text-[10px] ${TYPE_COLORS[h.type] || 'bg-gray-100 text-gray-600'}`}>
                      {TYPE_LABELS[h.type] || h.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground hidden lg:table-cell truncate max-w-[200px]">{h.notes || '-'}</td>
                  {canManage && (
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(h)}>
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm('ต้องการลบวันหยุดนี้?')) deleteMutation.mutate(h.id); }}>
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </Button>
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

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'แก้ไขวันหยุด' : 'เพิ่มวันหยุดใหม่'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">ชื่อวันหยุด (ไทย) *</Label>
              <Input value={form.name_th} onChange={e => setForm(p => ({ ...p, name_th: e.target.value }))} placeholder="เช่น วันสงกรานต์" className="text-xs h-8" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ชื่อวันหยุด (อังกฤษ)</Label>
              <Input value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} placeholder="e.g. Songkran Day" className="text-xs h-8" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">วันที่ *</Label>
                <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="text-xs h-8" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">ประเภท</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">หมายเหตุ</Label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="text-xs" />
            </div>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="w-full text-xs">
              {(createMutation.isPending || updateMutation.isPending) ? 'กำลังบันทึก...' : editing ? 'บันทึก' : 'เพิ่มวันหยุด'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}