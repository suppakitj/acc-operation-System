import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Globe, Plus, Search, Pencil, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAccessControl } from '@/components/auth/useAccessControl';
import TablePagination, { paginateData } from '@/components/shared/TablePagination';

const EMPTY_FORM = { code: '', name_th: '', name_en: '', url: '', status: 'active', notes: '' };

export default function ExternalServiceMaster() {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(user);

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['externalServices'],
    queryFn: () => base44.entities.ExternalService.list('-created_date'),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return services;
    const q = search.toLowerCase();
    return services.filter(s =>
      s.code?.toLowerCase().includes(q) ||
      s.name_th?.toLowerCase().includes(q) ||
      s.name_en?.toLowerCase().includes(q)
    );
  }, [services, search]);

  const paged = paginateData(filtered, page, pageSize);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editing) {
        await base44.entities.ExternalService.update(editing.id, data);
      } else {
        await base44.entities.ExternalService.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['externalServices'] });
      toast.success(editing ? 'อัปเดตเรียบร้อย' : 'เพิ่มบริการเรียบร้อย');
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ExternalService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['externalServices'] });
      toast.success('ลบเรียบร้อย');
    },
  });

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (svc) => { setEditing(svc); setForm({ code: svc.code || '', name_th: svc.name_th || '', name_en: svc.name_en || '', url: svc.url || '', status: svc.status || 'active', notes: svc.notes || '' }); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.code || !form.name_th) return toast.error('กรุณากรอกรหัสและชื่อบริการ');
    saveMutation.mutate(form);
  };

  const handleDelete = (svc) => {
    if (!confirm(`ต้องการลบ "${svc.name_th}" ใช่ไหม?`)) return;
    deleteMutation.mutate(svc.id);
  };

  if (!ac.canManageUsers && ac.role !== 'admin' && ac.role !== 'management') {
    return <div className="text-center py-12 text-muted-foreground">ไม่มีสิทธิ์เข้าถึง</div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Globe className="w-5 h-5" /> บริการภายนอก (External Service)
        </h1>
        <p className="text-sm text-muted-foreground">จัดการรายชื่อบริการภายนอกสำหรับ Credential Vault</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-base">รายการบริการ ({filtered.length})</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-[220px]">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <Input className="pl-8 h-9 text-xs" placeholder="ค้นหา..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
              </div>
              <Button size="sm" className="gap-1 text-xs" onClick={openCreate}>
                <Plus className="w-3.5 h-3.5" /> เพิ่มบริการ
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">รหัส</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">ชื่อ (ไทย)</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">ชื่อ (EN)</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden lg:table-cell">URL</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">สถานะ</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-8 text-xs text-muted-foreground">ไม่พบข้อมูล</td></tr>
                    ) : paged.map(svc => (
                      <tr key={svc.id} className="border-b last:border-b-0 hover:bg-muted/10">
                        <td className="px-4 py-2.5 text-xs font-mono font-medium">{svc.code}</td>
                        <td className="px-4 py-2.5 text-xs font-medium">{svc.name_th}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell">{svc.name_en || '—'}</td>
                        <td className="px-4 py-2.5 text-xs hidden lg:table-cell">
                          {svc.url ? (
                            <a href={svc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                              {svc.url.replace(/^https?:\/\//, '').slice(0, 30)} <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant="secondary" className={svc.status === 'active' ? 'bg-green-100 text-green-700 text-[10px]' : 'bg-gray-100 text-gray-600 text-[10px]'}>
                            {svc.status === 'active' ? 'ใช้งาน' : 'ปิดใช้'}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(svc)}>
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(svc)}>
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4">
                <TablePagination totalItems={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'แก้ไขบริการ' : 'เพิ่มบริการภายนอก'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">รหัส (code) *</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="เช่น peak_account" className="text-xs" />
              </div>
              <div>
                <Label className="text-xs">สถานะ</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">ใช้งาน</SelectItem>
                    <SelectItem value="inactive">ปิดใช้</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">ชื่อบริการ (ไทย) *</Label>
              <Input value={form.name_th} onChange={e => setForm(f => ({ ...f, name_th: e.target.value }))} placeholder="เช่น Peak Account" className="text-xs" />
            </div>
            <div>
              <Label className="text-xs">ชื่อบริการ (EN)</Label>
              <Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} placeholder="Peak Account" className="text-xs" />
            </div>
            <div>
              <Label className="text-xs">URL เว็บไซต์</Label>
              <Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." className="text-xs" />
            </div>
            <div>
              <Label className="text-xs">หมายเหตุ</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="text-xs" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={closeForm}>ยกเลิก</Button>
              <Button type="submit" size="sm" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                {editing ? 'อัปเดต' : 'เพิ่ม'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}