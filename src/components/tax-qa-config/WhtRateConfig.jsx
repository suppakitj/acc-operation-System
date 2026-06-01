import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Save, X } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_ROW = { income_type: '', payee_type: '', rate: 0, legal_reference: '', effective_date: '', is_dta_adjustable: false, active: true };

export default function WhtRateConfig({ user }) {
  const qc = useQueryClient();
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState({ ...EMPTY_ROW });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['wht_rate_table'],
    queryFn: () => base44.entities.TaxQA_WhtRateTable.list('-created_date', 200),
  });

  const auditLog = async (action, entityId, details) => {
    await base44.entities.AuditLog.create({
      action, entity_type: 'TaxQA_WhtRateTable', entity_id: entityId,
      user_email: user?.email, user_name: user?.full_name, details,
    });
  };

  const saveMut = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.TaxQA_WhtRateTable.update(id, data);
      await auditLog('update', id, `แก้ไข WHT Rate: ${data.income_type} ${data.payee_type} ${data.rate}%`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wht_rate_table'] }); setEditId(null); toast.success('บันทึกแล้ว'); },
  });

  const createMut = useMutation({
    mutationFn: async (data) => {
      const created = await base44.entities.TaxQA_WhtRateTable.create(data);
      await auditLog('create', created.id, `เพิ่ม WHT Rate: ${data.income_type} ${data.payee_type} ${data.rate}%`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wht_rate_table'] }); setAdding(false); setNewRow({ ...EMPTY_ROW }); toast.success('เพิ่มแล้ว'); },
  });

  const startEdit = (row) => { setEditId(row.id); setEditData({ ...row }); };
  const cancelEdit = () => { setEditId(null); setEditData({}); };

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">WHT Rate Table</CardTitle>
        <Button size="sm" onClick={() => setAdding(true)} disabled={adding}><Plus className="w-4 h-4 mr-1" />เพิ่มแถว</Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="text-left py-2 px-2">ประเภทเงินได้</th>
              <th className="text-left py-2 px-2">ผู้รับ</th>
              <th className="text-right py-2 px-2">อัตรา %</th>
              <th className="text-left py-2 px-2">อ้างอิงกฎหมาย</th>
              <th className="text-left py-2 px-2">วันมีผล</th>
              <th className="text-center py-2 px-2">DTA</th>
              <th className="text-center py-2 px-2">เปิดใช้</th>
              <th className="py-2 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {adding && (
              <tr className="border-b bg-blue-50/50">
                <td className="py-1 px-2"><Input value={newRow.income_type} onChange={e => setNewRow({ ...newRow, income_type: e.target.value })} className="h-8" /></td>
                <td className="py-1 px-2"><Input value={newRow.payee_type} onChange={e => setNewRow({ ...newRow, payee_type: e.target.value })} className="h-8" /></td>
                <td className="py-1 px-2"><Input type="number" value={newRow.rate} onChange={e => setNewRow({ ...newRow, rate: parseFloat(e.target.value) || 0 })} className="h-8 w-20 text-right" /></td>
                <td className="py-1 px-2"><Input value={newRow.legal_reference} onChange={e => setNewRow({ ...newRow, legal_reference: e.target.value })} className="h-8" /></td>
                <td className="py-1 px-2"><Input type="date" value={newRow.effective_date} onChange={e => setNewRow({ ...newRow, effective_date: e.target.value })} className="h-8" /></td>
                <td className="py-1 px-2 text-center"><Switch checked={newRow.is_dta_adjustable} onCheckedChange={v => setNewRow({ ...newRow, is_dta_adjustable: v })} /></td>
                <td className="py-1 px-2 text-center"><Switch checked={newRow.active} onCheckedChange={v => setNewRow({ ...newRow, active: v })} /></td>
                <td className="py-1 px-2 flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => createMut.mutate(newRow)} disabled={!newRow.income_type}><Save className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setAdding(false)}><X className="w-4 h-4" /></Button>
                </td>
              </tr>
            )}
            {rows.map(row => {
              const isEd = editId === row.id;
              const d = isEd ? editData : row;
              return (
                <tr key={row.id} className="border-b hover:bg-muted/30">
                  {isEd ? (
                    <>
                      <td className="py-1 px-2"><Input value={d.income_type} onChange={e => setEditData({ ...d, income_type: e.target.value })} className="h-8" /></td>
                      <td className="py-1 px-2"><Input value={d.payee_type} onChange={e => setEditData({ ...d, payee_type: e.target.value })} className="h-8" /></td>
                      <td className="py-1 px-2"><Input type="number" value={d.rate} onChange={e => setEditData({ ...d, rate: parseFloat(e.target.value) || 0 })} className="h-8 w-20 text-right" /></td>
                      <td className="py-1 px-2"><Input value={d.legal_reference || ''} onChange={e => setEditData({ ...d, legal_reference: e.target.value })} className="h-8" /></td>
                      <td className="py-1 px-2"><Input type="date" value={d.effective_date || ''} onChange={e => setEditData({ ...d, effective_date: e.target.value })} className="h-8" /></td>
                      <td className="py-1 px-2 text-center"><Switch checked={d.is_dta_adjustable} onCheckedChange={v => setEditData({ ...d, is_dta_adjustable: v })} /></td>
                      <td className="py-1 px-2 text-center"><Switch checked={d.active} onCheckedChange={v => setEditData({ ...d, active: v })} /></td>
                      <td className="py-1 px-2 flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => saveMut.mutate({ id: row.id, data: editData })}><Save className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="w-4 h-4" /></Button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2 px-2">{row.income_type}</td>
                      <td className="py-2 px-2">{row.payee_type}</td>
                      <td className="py-2 px-2 text-right">{row.rate}%</td>
                      <td className="py-2 px-2 text-xs">{row.legal_reference || '-'}</td>
                      <td className="py-2 px-2">{row.effective_date || '-'}</td>
                      <td className="py-2 px-2 text-center">{row.is_dta_adjustable ? '✓' : '-'}</td>
                      <td className="py-2 px-2 text-center">
                        <Badge className={row.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{row.active ? 'เปิด' : 'ปิด'}</Badge>
                      </td>
                      <td className="py-2 px-2">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(row)}>แก้ไข</Button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {isLoading && <div className="text-center py-4 text-muted-foreground">กำลังโหลด...</div>}
      </CardContent>
    </Card>
  );
}