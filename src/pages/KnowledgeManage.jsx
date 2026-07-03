import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAccessControl } from '@/components/auth/useAccessControl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookMarked, Plus, Search, Check, XCircle, Pencil, Trash2, Archive, Eye, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

import ArticleForm from '@/components/knowledge/ArticleForm';
import RejectDialog from '@/components/knowledge/RejectDialog';
import { useUserList } from '@/hooks/useUserList';

const STATUS_BADGE = {
  draft: 'bg-gray-100 text-gray-600',
  pending_review: 'bg-yellow-100 text-yellow-700',
  published: 'bg-green-100 text-green-700',
  archived: 'bg-slate-100 text-slate-500',
};

const STATUS_LABEL = {
  draft: 'Draft',
  pending_review: 'รออนุมัติ',
  published: 'เผยแพร่แล้ว',
  archived: 'Archived',
};

export default function KnowledgeManage() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);

  const { data: categories = [] } = useQuery({
    queryKey: ['knowledgeCategories'],
    queryFn: () => base44.entities.KnowledgeCategory.list('sort_order', 50),
    staleTime: 30 * 60_000,
  });

  const { data: allArticles = [], isLoading } = useQuery({
    queryKey: ['knowledgeArticlesAll'],
    queryFn: () => base44.entities.KnowledgeArticle.list('-updated_date', 500),
  });

  const isManager = ['admin', 'management', 'manager', 'super_supervisor'].includes(ac.role);
  const { data: users = [] } = useUserList();
  const { data: lineConfigs = [] } = useQuery({
    queryKey: ['appConfig', 'line_accounting'],
    queryFn: () => base44.entities.AppConfig.list(),
    staleTime: 300_000,
  });

  const visibleArticles = useMemo(() => {
    if (isManager) return allArticles;
    return allArticles.filter(a => a.author_email === currentUser?.email || a.created_by === currentUser?.email);
  }, [allArticles, isManager, currentUser]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [saving, setSaving] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);

  const filtered = useMemo(() => {
    let result = visibleArticles;
    if (statusFilter !== 'all') result = result.filter(a => a.status === statusFilter);
    if (catFilter !== 'all') result = result.filter(a => a.category_id === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(a => a.title?.toLowerCase().includes(q) || a.author_name?.toLowerCase().includes(q));
    }
    return result;
  }, [visibleArticles, statusFilter, catFilter, search]);

  const pendingArticles = useMemo(() =>
    visibleArticles.filter(a => a.status === 'pending_review').sort((a, b) => new Date(a.updated_date) - new Date(b.updated_date)),
    [visibleArticles]
  );

  const handleSave = async (data, articleId) => {
    setSaving(true);
    try {
      if (articleId) {
        await base44.entities.KnowledgeArticle.update(articleId, data);
      } else {
        await base44.entities.KnowledgeArticle.create(data);
      }
      queryClient.invalidateQueries({ queryKey: ['knowledgeArticlesAll'] });
      queryClient.invalidateQueries({ queryKey: ['knowledgeArticles'] });
      setShowForm(false);
      setEditingArticle(null);
      toast.success(articleId ? 'อัปเดตบทความเรียบร้อย' : 'สร้างบทความเรียบร้อย');

      // ส่ง LINE + Noti แจ้งหัวหน้าเมื่อพนักงานส่ง KB รออนุมัติ
      if (data.status === 'pending_review') {
        const staffName = currentUser?.full_name || currentUser?.email || '';
        const articleTitle = data.title || '';
        const categoryName = data.category_name || '';

        // In-app notification → หัวหน้า
        const managers = users.filter(u =>
          ['admin', 'management', 'manager', 'super_supervisor'].includes(u.role) && u.email !== currentUser?.email
        );
        for (const mgr of managers.slice(0, 5)) {
          base44.entities.Notification.create({
            title: `📖 KB รออนุมัติ: ${articleTitle}`,
            message: `${staffName} ส่งบทความ "${articleTitle}" (${categoryName}) เข้ามารออนุมัติ`,
            type: 'task_assigned',
            target_user: mgr.email,
            related_entity_type: 'KnowledgeArticle',
          }).catch(() => {});
        }

        // LINE notification → กลุ่มบัญชี
        const groupId = lineConfigs.find(c => c.key === 'line_group_dept_accounting')?.value;
        if (groupId) {
          base44.functions.invoke('lineSendMessage', {
            line_user_id: groupId,
            message: `📖 KB รออนุมัติ\n━━━━━━━━━━━━━━━━\n📄 ${articleTitle}\n📁 หมวด: ${categoryName || '-'}\n👤 โดย: ${staffName}\n━━━━━━━━━━━━━━━━\nกรุณาตรวจสอบและอนุมัติ`,
            display_name: 'ACC Precision Hub',
            chat_type: 'group',
          }).catch(e => console.warn('KB LINE noti failed:', e.message));
        }
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (article) => {
    const today = new Date().toISOString().split('T')[0];
    await base44.entities.KnowledgeArticle.update(article.id, {
      status: 'published',
      published_by: currentUser?.email,
      published_by_name: currentUser?.full_name,
      published_at: new Date().toISOString(),
      last_reviewed_date: today,
      last_reviewed_by: currentUser?.email,
      last_reviewed_by_name: currentUser?.full_name,
      reject_reason: '',
    });
    queryClient.invalidateQueries({ queryKey: ['knowledgeArticlesAll'] });
    queryClient.invalidateQueries({ queryKey: ['knowledgeArticles'] });
    toast.success(`อนุมัติ "${article.title}" เรียบร้อย`);
  };

  const handleReject = async (reason) => {
    if (!rejectTarget) return;
    setSaving(true);
    await base44.entities.KnowledgeArticle.update(rejectTarget.id, {
      status: 'draft',
      reject_reason: reason,
    });
    queryClient.invalidateQueries({ queryKey: ['knowledgeArticlesAll'] });
    setRejectTarget(null);
    setSaving(false);
    toast.success('ส่งกลับแก้ไขเรียบร้อย');
  };

  const handleArchive = async (article) => {
    await base44.entities.KnowledgeArticle.update(article.id, { status: 'archived' });
    queryClient.invalidateQueries({ queryKey: ['knowledgeArticlesAll'] });
    queryClient.invalidateQueries({ queryKey: ['knowledgeArticles'] });
    toast.success('Archive เรียบร้อย');
  };

  const handleDelete = async (article) => {
    if (!confirm('ลบบทความนี้ถาวร?')) return;
    await base44.entities.KnowledgeArticle.delete(article.id);
    queryClient.invalidateQueries({ queryKey: ['knowledgeArticlesAll'] });
    queryClient.invalidateQueries({ queryKey: ['knowledgeArticles'] });
    toast.success('ลบเรียบร้อย');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <BookMarked className="w-5 h-5" /> จัดการ Knowledge Base
          </h1>
          <p className="text-sm text-muted-foreground">สร้าง แก้ไข และอนุมัติบทความ</p>
        </div>
        <Button onClick={() => { setEditingArticle(null); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> เพิ่มบทความ
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">บทความทั้งหมด</TabsTrigger>
          {isManager && (
            <TabsTrigger value="pending" className="gap-1">
              รออนุมัติ
              {pendingArticles.length > 0 && (
                <Badge className="ml-1 h-5 px-1.5 text-[10px] bg-yellow-500 text-white border-0">{pendingArticles.length}</Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="ค้นหา..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_review">รออนุมัติ</SelectItem>
                <SelectItem value="published">เผยแพร่แล้ว</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกหมวด</SelectItem>
                {categories.filter(c => c.status === 'active').map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="bg-card rounded-lg border overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground">ชื่อบทความ</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground hidden md:table-cell">หมวด</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground">สถานะ</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground hidden lg:table-cell">เขียนโดย</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground hidden lg:table-cell">อัปเดต</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground w-28"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-sm text-muted-foreground">ไม่มีบทความ</td></tr>
                )}
                {filtered.map(a => (
                  <tr key={a.id} className="border-b last:border-b-0 hover:bg-muted/10">
                    <td className="px-3 py-2.5">
                      <p className="text-xs font-medium">{a.title}</p>
                      {a.reject_reason && a.status === 'draft' && (
                        <p className="text-[10px] text-red-500 flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="w-3 h-3" /> {a.reject_reason}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      <span className="text-[10px] text-muted-foreground">{a.category_name || '—'}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge className={`text-[10px] border-0 ${STATUS_BADGE[a.status] || ''}`}>
                        {STATUS_LABEL[a.status] || a.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      <span className="text-[10px] text-muted-foreground">{a.author_name || '—'}</span>
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      <span className="text-[10px] text-muted-foreground">{a.updated_date ? moment(a.updated_date).format('DD/MM/YY') : '—'}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingArticle(a); setShowForm(true); }} title="แก้ไข">
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleArchive(a)} title="Archive">
                          <Archive className="w-3.5 h-3.5 text-orange-400" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(a)} title="ลบ">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {isManager && (
          <TabsContent value="pending" className="space-y-4 mt-4">
            {pendingArticles.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">ไม่มีบทความรออนุมัติ</div>
            ) : (
              <div className="space-y-3">
                {pendingArticles.map(a => (
                  <div key={a.id} className="bg-card rounded-lg border p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{a.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.summary || 'ไม่มีสรุป'}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">โดย {a.author_name} • {moment(a.updated_date).format('DD/MM/YY HH:mm')}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => { setEditingArticle(a); setShowForm(true); }}>
                        <Eye className="w-3.5 h-3.5" /> ดู
                      </Button>
                      <Button size="sm" className="gap-1 text-xs bg-green-600 hover:bg-green-700" onClick={() => handleApprove(a)}>
                        <Check className="w-3.5 h-3.5" /> อนุมัติ
                      </Button>
                      <Button variant="destructive" size="sm" className="gap-1 text-xs" onClick={() => setRejectTarget(a)}>
                        <XCircle className="w-3.5 h-3.5" /> ส่งกลับ
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Form Dialog */}
      <ArticleForm
        open={showForm}
        onOpenChange={setShowForm}
        article={editingArticle}
        categories={categories}
        currentUser={currentUser}
        isManager={isManager}
        onSave={handleSave}
        saving={saving}
      />

      {/* Reject Dialog */}
      <RejectDialog
        open={!!rejectTarget}
        onOpenChange={v => { if (!v) setRejectTarget(null); }}
        onReject={handleReject}
        saving={saving}
      />
    </div>
  );
}