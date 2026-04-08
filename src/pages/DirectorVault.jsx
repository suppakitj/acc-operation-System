import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAccessControl } from '@/components/auth/useAccessControl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Shield, Plus, Search, Eye, Pencil, Trash2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import TablePagination, { paginateData } from '@/components/shared/TablePagination';
import DirectorForm from '@/components/directors/DirectorForm';
import DirectorOtpDialog from '@/components/directors/DirectorOtpDialog';

const TAX_LABELS = {
  pnd90: 'ภงด.90',
  pnd91: 'ภงด.91',
  both: 'ภงด.90+91',
  none: 'ไม่ยื่น',
};

export default function DirectorVault() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);

  const { data: directors = [], isLoading } = useQuery({
    queryKey: ['directors'],
    queryFn: () => base44.entities.DirectorInfo.list('-created_date', 500),
    staleTime: 60_000,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('-created_date', 500),
    staleTime: 60_000,
  });

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDirector, setEditingDirector] = useState(null);
  const [editDecryptedData, setEditDecryptedData] = useState(null);
  const [viewDirector, setViewDirector] = useState(null);
  const [editOtpDirector, setEditOtpDirector] = useState(null);
  const [deleteDirector, setDeleteDirector] = useState(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filtered = useMemo(() => {
    if (!search) return directors;
    const s = search.toLowerCase();
    return directors.filter(d =>
      d.customer_name?.toLowerCase().includes(s) ||
      d.position?.toLowerCase().includes(s)
    );
  }, [directors, search]);

  const paged = paginateData(filtered, page, pageSize);

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      const customerName = customers.find(c => c.id === formData.customer_id)?.company_name || '';
      const res = await base44.functions.invoke('directorManager', {
        action: 'save',
        ...formData,
        customer_name: customerName,
      });
      if (res.data.setup_required) {
        toast.error('ยังไม่ได้ตั้งค่า Encryption Key — ไปที่ Settings → เชื่อมต่อ → Credential Vault');
      } else if (res.data.success) {
        toast.success(formData.director_id ? 'อัปเดตข้อมูลกรรมการแล้ว' : 'เพิ่มกรรมการเรียบร้อย');
        queryClient.invalidateQueries({ queryKey: ['directors'] });
        setShowForm(false);
        setEditingDirector(null);
        setEditDecryptedData(null);
      }
    } catch (err) {
      const data = err?.response?.data;
      if (data?.setup_required) toast.error('ยังไม่ได้ตั้งค่า Encryption Key');
      else toast.error(data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDirector) return;
    try {
      await base44.functions.invoke('directorManager', {
        action: 'delete', director_id: deleteDirector.id,
      });
      toast.success('ลบข้อมูลกรรมการแล้ว');
      queryClient.invalidateQueries({ queryKey: ['directors'] });
    } catch {
      toast.error('เกิดข้อผิดพลาดในการลบ');
    } finally {
      setDeleteDirector(null);
    }
  };

  const handleStartEdit = (dir) => {
    setEditOtpDirector(dir);
  };

  const handleEditDecrypted = (data) => {
    setEditDecryptedData(data);
    setEditingDirector(editOtpDirector);
    setEditOtpDirector(null);
    setShowForm(true);
  };

  if (!currentUser) return null;
  if (!ac.canViewDirectorVault) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <ShieldAlert className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Shield className="w-5 h-5" /> ข้อมูลกรรมการ (PDPA)
          </h1>
          <p className="text-sm text-muted-foreground">ข้อมูลเข้ารหัส AES-256 — ต้องยืนยัน OTP ก่อนดู/แก้ไข</p>
        </div>
        <Button onClick={() => { setEditingDirector(null); setEditDecryptedData(null); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> เพิ่มกรรมการ
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="ค้นหาบริษัท / ตำแหน่ง..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
      </div>

      <div className="bg-card rounded-xl border overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b bg-muted/20">
              <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground">บริษัท</th>
              <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground">ตำแหน่ง</th>
              <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground">ชื่อกรรมการ</th>
              <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground hidden md:table-cell">เลขบัตร</th>
              <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground hidden lg:table-cell">ประเภท ภงด.</th>
              <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground w-28"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">กำลังโหลด...</td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">ไม่พบข้อมูล</td></tr>
            ) : paged.map(dir => (
              <tr key={dir.id} className="border-b last:border-b-0 hover:bg-muted/10">
                <td className="px-3 py-2.5 text-xs font-medium">{dir.customer_name}</td>
                <td className="px-3 py-2.5 text-xs">{dir.position || '—'}</td>
                <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground">••••••••</td>
                <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground hidden md:table-cell">••••••••</td>
                <td className="px-3 py-2.5 hidden lg:table-cell">
                  <Badge variant="outline" className="text-[10px]">{TAX_LABELS[dir.tax_filing_type] || '—'}</Badge>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewDirector(dir)} title="ดู (OTP)">
                      <Eye className="w-3.5 h-3.5 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStartEdit(dir)} title="แก้ไข">
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteDirector(dir)} title="ลบ">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination totalItems={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />

      {/* Create/Edit form */}
      <DirectorForm
        open={showForm}
        onOpenChange={(val) => { if (!val) { setShowForm(false); setEditingDirector(null); setEditDecryptedData(null); }}}
        director={editingDirector}
        decryptedData={editDecryptedData}
        customers={customers}
        onSave={handleSave}
        saving={saving}
      />

      {/* View OTP dialog */}
      {viewDirector && (
        <DirectorOtpDialog
          open={!!viewDirector}
          onOpenChange={(val) => { if (!val) setViewDirector(null); }}
          director={viewDirector}
        />
      )}

      {/* Edit OTP dialog (decrypt first, then open form) */}
      {editOtpDirector && (
        <DirectorOtpDialog
          open={!!editOtpDirector}
          onOpenChange={(val) => { if (!val) setEditOtpDirector(null); }}
          director={editOtpDirector}
          onDecrypted={handleEditDecrypted}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteDirector} onOpenChange={(val) => { if (!val) setDeleteDirector(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันลบข้อมูลกรรมการ</AlertDialogTitle>
            <AlertDialogDescription>
              ลบข้อมูลกรรมการของ <strong>{deleteDirector?.customer_name}</strong> ({deleteDirector?.position || 'กรรมการ'})? การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}