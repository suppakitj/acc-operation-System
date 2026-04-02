import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAccessControl } from '@/components/auth/useAccessControl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeyRound, Plus, Search, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

import CredentialForm from '@/components/credentials/CredentialForm';
import CredentialTable from '@/components/credentials/CredentialTable';
import OtpDecryptDialog from '@/components/credentials/OtpDecryptDialog';
import TablePagination, { paginateData } from '@/components/shared/TablePagination';

const SERVICE_OPTIONS = [
  { value: 'all', label: 'ทุกบริการ' },
  { value: 'peak_account', label: 'Peak Account' },
  { value: 'dbd', label: 'DBD' },
  { value: 'efiling', label: 'e-Filing' },
  { value: 'email', label: 'Email' },
  { value: 'social_security', label: 'ประกันสังคม' },
  { value: 'vat', label: 'VAT' },
  { value: 'other', label: 'อื่นๆ' },
];

export default function CustomerCredentials() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);

  const { data: credentials = [], isLoading } = useQuery({
    queryKey: ['customerCredentials'],
    queryFn: () => base44.entities.CustomerCredential.list('-created_date'),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
  });

  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingCred, setEditingCred] = useState(null);
  const [viewCred, setViewCred] = useState(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filtered = useMemo(() => {
    let result = credentials;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r => r.customer_name?.toLowerCase().includes(s) || r.service_label?.toLowerCase().includes(s));
    }
    if (serviceFilter !== 'all') {
      result = result.filter(r => r.service_type === serviceFilter);
    }
    return result;
  }, [credentials, search, serviceFilter]);

  const paged = paginateData(filtered, page, pageSize);

  const handleSave = async (form) => {
    setSaving(true);
    const res = await base44.functions.invoke('credentialManager', {
      action: 'save',
      ...form,
    });
    setSaving(false);
    if (res.data.success) {
      toast.success(form.credential_id ? 'อัปเดตเรียบร้อย' : 'เพิ่ม Credential เรียบร้อย');
      queryClient.invalidateQueries({ queryKey: ['customerCredentials'] });
      setShowForm(false);
      setEditingCred(null);
    } else {
      toast.error(res.data.error || 'เกิดข้อผิดพลาด');
    }
  };

  const handleDelete = async (cred) => {
    if (!confirm(`ลบ credential ของ ${cred.customer_name} (${cred.service_type}) ?`)) return;
    await base44.functions.invoke('credentialManager', { action: 'delete', credential_id: cred.id });
    queryClient.invalidateQueries({ queryKey: ['customerCredentials'] });
    toast.success('ลบเรียบร้อย');
  };

  const handleEdit = (cred) => {
    setEditingCred(cred);
    setShowForm(true);
  };

  // Access control - only admin & management
  if (!currentUser) return null;
  if (ac.role !== 'admin' && ac.role !== 'management') {
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
            <KeyRound className="w-5 h-5" /> Credential Vault
          </h1>
          <p className="text-sm text-muted-foreground">จัดเก็บ Username & Password ลูกค้าอย่างปลอดภัย (Encrypted + OTP)</p>
        </div>
        <Button onClick={() => { setEditingCred(null); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> เพิ่ม Credential
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ค้นหาลูกค้า..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <Select value={serviceFilter} onValueChange={v => { setServiceFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SERVICE_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <CredentialTable
        data={paged}
        onView={setViewCred}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <TablePagination
        totalItems={filtered.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {/* Form Dialog */}
      <CredentialForm
        open={showForm}
        onOpenChange={setShowForm}
        credential={editingCred}
        customers={customers}
        onSave={handleSave}
        saving={saving}
      />

      {/* OTP Decrypt Dialog */}
      {viewCred && (
        <OtpDecryptDialog
          open={!!viewCred}
          onOpenChange={(val) => { if (!val) setViewCred(null); }}
          credential={viewCred}
        />
      )}
    </div>
  );
}