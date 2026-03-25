import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, MessageSquare, Loader2 } from 'lucide-react';
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
    });
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
              <div className="flex items-center gap-2 min-w-0">
                <MessageSquare className="w-4 h-4 text-green-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{g.group_name}</p>
                  {g.group_id && (
                    <p className="text-[10px] text-muted-foreground truncate">ID: {g.group_id}</p>
                  )}
                </div>
              </div>
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