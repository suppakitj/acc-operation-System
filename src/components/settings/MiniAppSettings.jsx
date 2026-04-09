import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, LayoutGrid, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import MiniAppFormDialog from './MiniAppFormDialog';

const CATEGORY_LABEL = {
  tax_gov: '📋 ภาษี & ราชการ',
  accounting: '📊 บัญชี',
  hr_social: '👥 HR & ประกันสังคม',
  internal: '🏢 ระบบภายใน',
  other: '🔗 อื่นๆ',
};

const COLOR_BADGE = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
  pink: 'bg-pink-100 text-pink-700',
  teal: 'bg-teal-100 text-teal-700',
  slate: 'bg-slate-100 text-slate-700',
};

const SUGGESTED_APPS = [
  { name: 'Peak Account', url: 'https://app.peakaccount.com', icon: 'Calculator', color: 'blue', category: 'accounting', sort_order: 1, status: 'active', open_in_new_tab: true },
  { name: 'กรมสรรพากร e-Filing', url: 'https://efiling.rd.go.th', icon: 'Landmark', color: 'red', category: 'tax_gov', sort_order: 2, status: 'active', open_in_new_tab: true },
  { name: 'DBD e-Filing', url: 'https://efiling.dbd.go.th', icon: 'Building2', color: 'purple', category: 'tax_gov', sort_order: 3, status: 'active', open_in_new_tab: true },
  { name: 'ประกันสังคม', url: 'https://www.sso.go.th', icon: 'Users', color: 'green', category: 'hr_social', sort_order: 4, status: 'active', open_in_new_tab: true },
  { name: 'กรมสรรพากร', url: 'https://www.rd.go.th', icon: 'Globe', color: 'amber', category: 'tax_gov', sort_order: 5, status: 'active', open_in_new_tab: true },
  { name: 'กรมพัฒนาธุรกิจ (DBD)', url: 'https://www.dbd.go.th', icon: 'Building2', color: 'teal', category: 'tax_gov', sort_order: 6, status: 'active', open_in_new_tab: true },
];

export default function MiniAppSettings() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [seeding, setSeeding] = useState(false);

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ['miniApps'],
    queryFn: () => base44.entities.MiniApp.list('sort_order', 100),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MiniApp.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['miniApps'] }); toast.success('ลบ Mini App แล้ว'); },
  });

  const handleEdit = (app) => { setEditingApp(app); setDialogOpen(true); };
  const handleAdd = () => { setEditingApp(null); setDialogOpen(true); };

  const handleDelete = (app) => {
    if (!confirm(`ลบ "${app.name}" ใช่หรือไม่?`)) return;
    deleteMutation.mutate(app.id);
  };

  const seedApps = async () => {
    setSeeding(true);
    try {
      await base44.entities.MiniApp.bulkCreate(SUGGESTED_APPS);
      queryClient.invalidateQueries({ queryKey: ['miniApps'] });
      toast.success(`เพิ่ม ${SUGGESTED_APPS.length} Mini Apps แนะนำเรียบร้อย`);
    } catch (e) {
      toast.error('เกิดข้อผิดพลาด: ' + e.message);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <LayoutGrid className="w-4 h-4" /> Mini App Management
          </CardTitle>
          <Button size="sm" className="gap-1.5 text-xs" onClick={handleAdd}>
            <Plus className="w-3.5 h-3.5" /> เพิ่ม Mini App
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">จัดการลิงก์เครื่องมือที่แสดงในหน้า My Day</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">กำลังโหลด...</p>
        ) : apps.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <LayoutGrid className="w-10 h-10 mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">ยังไม่มี Mini App</p>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={seedApps} disabled={seeding}>
              <Sparkles className="w-3.5 h-3.5" /> {seeding ? 'กำลังเพิ่ม...' : 'เพิ่ม App แนะนำ (6 รายการ)'}
            </Button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {apps.map(app => (
              <MiniAppRow key={app.id} app={app} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </CardContent>

      <MiniAppFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        app={editingApp}
      />
    </Card>
  );
}

function MiniAppRow({ app, onEdit, onDelete }) {
  const colorClass = COLOR_BADGE[app.color] || COLOR_BADGE.blue;
  const isEmoji = app.icon && /^[^\x00-\x7F]/.test(app.icon);

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-muted/50 transition-colors group">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
        {isEmoji ? (
          <span className="text-lg">{app.icon}</span>
        ) : (
          <span className="text-[10px] font-bold">{(app.icon || 'G')[0]}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{app.name}</span>
          {app.status === 'inactive' && <Badge variant="outline" className="text-[9px] px-1 py-0">inactive</Badge>}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="truncate max-w-[200px]">{app.url}</span>
          {app.category && <span>• {CATEGORY_LABEL[app.category] || app.category}</span>}
          {app.sort_order != null && <span>• #{app.sort_order}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(app)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(app)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}