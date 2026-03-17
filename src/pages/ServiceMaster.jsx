import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Briefcase, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAccessControl } from '../components/auth/useAccessControl';
import TablePagination, { paginateData } from '../components/shared/TablePagination';

export default function ServiceMaster() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ code: '', name_th: '', name_en: '', description: '', status: 'active' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['serviceMaster'],
    queryFn: () => base44.entities.ServiceMaster.list('-created_date', 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceMaster.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['serviceMaster'] }); setShowForm(false); toast.success('เพิ่มบริการเรียบร้อย'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ServiceMaster.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['serviceMaster'] }); setShowForm(false); setEditing(null); toast.success('บันทึกเรียบร้อย'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ServiceMaster.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['serviceMaster'] }); toast.success('ลบเรียบร้อย'); },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ code: '', name_th: '', name_en: '', description: '', status: 'active' });
    setShowForm(true);
  };

  const openEdit = (svc) => {
    setEditing(svc);
    setForm({ code: svc.code || '', name_th: svc.name_th || '', name_en: svc.name_en || '', description: svc.description || '', status: svc.status || 'active' });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.code || !form.name_th) { toast.error('กรุณากรอกรหัสและชื่อบริการ'); return; }
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  const filtered = useMemo(() => {
    return services.filter(s => {
      if (search) {
        const q = search.toLowerCase();
        if (!s.code?.toLowerCase().includes(q) && !s.name_th?.toLowerCase().includes(q) && !s.name_en?.toLowerCase().includes(q)) return false;
      }
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      return true;
    });
  }, [services, search, statusFilter]);

  React.useEffect(() => { setPage(1); }, [search, statusFilter]);

  const paged = paginateData(filtered, page, pageSize);
  const canManage = ac.role === 'admin' || ac.canSeeAll;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Briefcase className="w-5 h-5" /> Service Master
            </h1>
            <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-medium">{services.length} รายการ</span>
          </div>
          <p className="text-xs text-muted-foreground">จัดการประเภทบริการ — ใช้อ้างอิงใน Task, Billing, Customer</p>
        </div>
        {canManage && (
          <Button size="sm" className="gap-1.5 text-xs shrink-0 self-start sm:self-auto" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5" /> เพิ่มบริการ
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ค้นหารหัส, ชื่อบริการ..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-8 text-xs" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs"><SelectValue placeholder="สถานะ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกสถานะ</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground self-center hidden md:block ml-auto">{filtered.length} of {services.length}</span>
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
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">รหัส</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">ชื่อบริการ (TH)</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">ชื่อบริการ (EN)</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden lg:table-cell">รายละเอียด</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">สถานะ</th>
                {canManage && <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground text-center">จัดการ</th>}
              </tr>
            </thead>
            <tbody>
              {paged.map((s, i) => (
                <tr key={s.id} className={`border-b last:border-b-0 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/5'}`}>
                  <td className="px-4 py-2.5 text-xs font-mono font-medium">{s.code}</td>
                  <td className="px-4 py-2.5 text-xs font-medium">{s.name_th}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell">{s.name_en || '-'}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground hidden lg:table-cell truncate max-w-[200px]">{s.description || '-'}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="secondary" className={s.status === 'active' ? 'bg-green-100 text-green-700 text-[10px]' : 'bg-gray-100 text-gray-500 text-[10px]'}>
                      {s.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  {canManage && (
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm('ต้องการลบบริการนี้?')) deleteMutation.mutate(s.id); }}>
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
          <DialogHeader>
            <DialogTitle>{editing ? 'แก้ไขบริการ' : 'เพิ่มบริการใหม่'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">รหัสบริการ *</Label>
              <Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="เช่น accounting, payroll" className="text-xs h-8" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ชื่อบริการ (ไทย) *</Label>
              <Input value={form.name_th} onChange={e => setForm(p => ({ ...p, name_th: e.target.value }))} placeholder="เช่น รับทำบัญชี" className="text-xs h-8" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ชื่อบริการ (อังกฤษ)</Label>
              <Input value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} placeholder="เช่น Accounting Services" className="text-xs h-8" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">รายละเอียด</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">สถานะ</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="w-full text-xs">
              {(createMutation.isPending || updateMutation.isPending) ? 'กำลังบันทึก...' : editing ? 'บันทึก' : 'เพิ่มบริการ'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}