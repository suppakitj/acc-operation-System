import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, MessageSquare, Loader2, Bell, Bot } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerLineGroups({ customerId, readOnly }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [newGroupId, setNewGroupId] = useState('');
  const [newGroupName, setNewGroupName] = useState('');

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['lineGroups', customerId],
    queryFn: () => base44.entities.LineGroup.filter({ customer_id: customerId }),
    enabled: !!customerId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LineGroup.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lineGroups', customerId] });
      setAdding(false);
      setNewGroupId('');
      setNewGroupName('');
      toast.success('เพิ่มกลุ่ม LINE แล้ว');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LineGroup.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lineGroups', customerId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LineGroup.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lineGroups', customerId] });
      toast.success('ลบกลุ่ม LINE แล้ว');
    },
  });

  const handleAdd = () => {
    if (!newGroupName.trim()) return;
    createMutation.mutate({
      customer_id: customerId,
      group_id: newGroupId.trim(),
      group_name: newGroupName.trim(),
      receive_tax_status: false,
    });
  };

  const toggleTaxStatus = (group) => {
    const newVal = !group.receive_tax_status;
    updateMutation.mutate(
      { id: group.id, data: { receive_tax_status: newVal } },
      { onSuccess: () => toast.success(newVal ? `กลุ่ม "${group.group_name}" จะรับแจ้งสถานะภาษีแล้ว` : `ปิดแจ้งสถานะภาษีกลุ่ม "${group.group_name}" แล้ว`) }
    );
  };

  const toggleAutoAck = (group) => {
    const newVal = !group.auto_acknowledge;
    updateMutation.mutate(
      { id: group.id, data: { auto_acknowledge: newVal } },
      { onSuccess: () => toast.success(newVal ? `เปิดตอบรับอัตโนมัติกลุ่ม "${group.group_name}" แล้ว` : `ปิดตอบรับอัตโนมัติกลุ่ม "${group.group_name}" แล้ว`) }
    );
  };

  if (!customerId) {
    return (
      <p className="text-[11px] text-muted-foreground">บันทึกข้อมูลลูกค้าก่อน จึงจะเพิ่มกลุ่ม LINE ได้</p>
    );
  }

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> กำลังโหลด...
        </div>
      ) : groups.length === 0 && !adding ? (
        <p className="text-xs text-muted-foreground">ยังไม่มีกลุ่ม LINE</p>
      ) : (
        <div className="space-y-2">
          {groups.map(g => (
            <div key={g.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <MessageSquare className="w-4 h-4 text-green-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{g.group_name}</p>
                  {g.group_id && (
                    <p className="text-[10px] text-muted-foreground truncate">ID: {g.group_id}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                {/* Auto Acknowledge Toggle */}
                <div className="flex items-center gap-1.5" title={g.auto_acknowledge ? 'ตอบรับ/แจ้งเสร็จอัตโนมัติ' : 'ปิดตอบรับอัตโนมัติ'}>
                  <Bot className={`w-3 h-3 ${g.auto_acknowledge ? 'text-green-600' : 'text-muted-foreground/40'}`} />
                  <Switch
                    checked={!!g.auto_acknowledge}
                    onCheckedChange={() => toggleAutoAck(g)}
                    disabled={readOnly}
                    className="scale-75"
                  />
                </div>
                {g.auto_acknowledge && (
                  <Badge className="bg-green-100 text-green-700 text-[8px] px-1.5 border-green-200">🤖 Auto</Badge>
                )}
                {/* Tax Status Toggle */}
                <div className="flex items-center gap-1.5" title={g.receive_tax_status ? 'รับแจ้งสถานะภาษี' : 'ไม่รับแจ้งสถานะภาษี'}>
                  <Bell className={`w-3 h-3 ${g.receive_tax_status ? 'text-orange-500' : 'text-muted-foreground/40'}`} />
                  <Switch
                    checked={!!g.receive_tax_status}
                    onCheckedChange={() => toggleTaxStatus(g)}
                    disabled={readOnly}
                    className="scale-75"
                  />
                </div>
                {g.receive_tax_status && (
                  <Badge className="bg-orange-100 text-orange-700 text-[8px] px-1.5 border-orange-200">📢 Tax</Badge>
                )}
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate(g.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!readOnly && !adding && (
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => setAdding(true)}>
          <Plus className="w-3.5 h-3.5" /> เพิ่มกลุ่ม LINE
        </Button>
      )}

      {adding && (
        <div className="p-3 rounded-lg border border-dashed space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px]">ชื่อกลุ่ม *</Label>
              <Input
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder="เช่น กลุ่มบัญชี ABC"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Group ID</Label>
              <Input
                value={newGroupId}
                onChange={e => setNewGroupId(e.target.value)}
                placeholder="C..."
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs gap-1" onClick={handleAdd} disabled={!newGroupName.trim() || createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              เพิ่ม
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setAdding(false); setNewGroupId(''); setNewGroupName(''); }}>
              ยกเลิก
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}