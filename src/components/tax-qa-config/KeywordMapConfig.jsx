import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Save, X } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY = { keyword: '', expected_income_type: '', expected_rate: 0, note: '' };

export default function KeywordMapConfig({ user }) {
  const qc = useQueryClient();
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState({ ...EMPTY });

  const { data: rows = [] } = useQuery({
    queryKey: ['keyword_map'],
    queryFn: () => base44.entities.TaxQA_IncomeKeywordMap.list('-created_date', 200),
  });

  const auditLog = async (action, entityId, details) => {
    await base44.entities.AuditLog.create({
      action, entity_type: 'TaxQA_IncomeKeywordMap', entity_id: entityId,
      user_email: user?.email, user_name: user?.full_name, details,
    });
  };

  const saveMut = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.TaxQA_IncomeKeywordMap.update(id, data);
      await auditLog('update', id, `แก้ไข Keyword: ${data.keyword} → ${data.expected_income_type} ${data.expected_rate}%`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['keyword_map'] }); setEditId(null); toast.success('บันทึกแล้ว'); },
  });

  const createMut = useMutation({
    mutationFn: async (data) => {
      const c = await base44.entities.TaxQA_IncomeKeywordMap.create(data);
      await auditLog('create', c.id, `เพิ่ม Keyword: ${data.keyword} → ${data.expected_income_type} ${data.expected_rate}%`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['keyword_map'] }); setAdding(false); setNewRow({ ...EMPTY }); toast.success('เพิ่มแล้ว'); },
  });

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Income Keyword Map</CardTitle>
        <Button size="sm" onClick={() => setAdding(true)} disabled={adding}><Plus className="w-4 h-4 mr-1" />เพิ่ม</Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="text-left py-2 px-2">Keyword</th>
              <th className="text-left py-2 px-2">ประเภทเงินได้ที่คาดหวัง</th>
              <th className="text-right py-2 px-2">อัตรา %</th>
              <th className="text-left py-2 px-2">หมายเหตุ</th>
              <th className="py-2 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {adding && (
              <tr className="border-b bg-blue-50/50">
                <td className="py-1 px-2"><Input value={newRow.keyword} onChange={e => setNewRow({ ...newRow, keyword: e.target.value })} className="h-8" /></td>
                <td className="py-1 px-2"><Input value={newRow.expected_income_type} onChange={e => setNewRow({ ...newRow, expected_income_type: e.target.value })} className="h-8" /></td>
                <td className="py-1 px-2"><Input type="number" value={newRow.expected_rate} onChange={e => setNewRow({ ...newRow, expected_rate: parseFloat(e.target.value) || 0 })} className="h-8 w-20 text-right" /></td>
                <td className="py-1 px-2"><Input value={newRow.note} onChange={e => setNewRow({ ...newRow, note: e.target.value })} className="h-8" /></td>
                <td className="py-1 px-2 flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => createMut.mutate(newRow)} disabled={!newRow.keyword}><Save className="w-4 h-4" /></Button>
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
                      <td className="py-1 px-2"><Input value={d.keyword} onChange={e => setEditData({ ...d, keyword: e.target.value })} className="h-8" /></td>
                      <td className="py-1 px-2"><Input value={d.expected_income_type} onChange={e => setEditData({ ...d, expected_income_type: e.target.value })} className="h-8" /></td>
                      <td className="py-1 px-2"><Input type="number" value={d.expected_rate} onChange={e => setEditData({ ...d, expected_rate: parseFloat(e.target.value) || 0 })} className="h-8 w-20 text-right" /></td>
                      <td className="py-1 px-2"><Input value={d.note || ''} onChange={e => setEditData({ ...d, note: e.target.value })} className="h-8" /></td>
                      <td className="py-1 px-2 flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => saveMut.mutate({ id: row.id, data: editData })}><Save className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditId(null)}><X className="w-4 h-4" /></Button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2 px-2 font-medium">{row.keyword}</td>
                      <td className="py-2 px-2">{row.expected_income_type}</td>
                      <td className="py-2 px-2 text-right">{row.expected_rate}%</td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">{row.note || '-'}</td>
                      <td className="py-2 px-2">
                        <Button size="sm" variant="ghost" onClick={() => { setEditId(row.id); setEditData({ ...row }); }}>แก้ไข</Button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}