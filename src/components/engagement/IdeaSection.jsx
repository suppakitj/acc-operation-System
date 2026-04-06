import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lightbulb, ThumbsUp, MessageSquare } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open', color: 'bg-blue-100 text-blue-700' },
  { value: 'considering', label: 'Considering', color: 'bg-purple-100 text-purple-700' },
  { value: 'planned', label: 'Planned', color: 'bg-teal-100 text-teal-700' },
  { value: 'done', label: 'Done', color: 'bg-green-100 text-green-700' },
  { value: 'closed', label: 'Closed', color: 'bg-red-100 text-red-700' },
];

const CAT_OPTIONS = [
  { value: 'all', label: 'ทุกหมวด' },
  { value: 'process', label: 'กระบวนการ' },
  { value: 'tool', label: 'เครื่องมือ' },
  { value: 'culture', label: 'วัฒนธรรม' },
  { value: 'customer', label: 'ลูกค้า' },
  { value: 'other', label: 'อื่นๆ' },
];

const CAT_LABEL = { process: 'กระบวนการ', tool: 'เครื่องมือ', culture: 'วัฒนธรรม', customer: 'ลูกค้า', other: 'อื่นๆ' };

export default function IdeaSection({ ideas, deptFilter }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState('');

  const updateIdea = useMutation({
    mutationFn: ({ id, updates }) => base44.entities.Idea.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allIdeas'] });
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      toast.success('อัปเดตไอเดียแล้ว');
    },
  });

  const filtered = useMemo(() => {
    let list = deptFilter === 'all' ? ideas : ideas.filter(i => i.department === deptFilter);
    if (statusFilter !== 'all') list = list.filter(i => i.status === statusFilter);
    if (catFilter !== 'all') list = list.filter(i => i.category === catFilter);
    if (sortBy === 'votes') list = [...list].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
    return list;
  }, [ideas, deptFilter, statusFilter, catFilter, sortBy]);

  const stats = [
    { label: t('engagement_ideas_total'), value: ideas.length, color: 'text-blue-600' },
    { label: t('engagement_ideas_open'), value: ideas.filter(i => i.status === 'open').length, color: 'text-purple-600' },
    { label: t('engagement_ideas_in_progress'), value: ideas.filter(i => i.status === 'considering' || i.status === 'planned').length, color: 'text-teal-600' },
    { label: t('engagement_ideas_done'), value: ideas.filter(i => i.status === 'done').length, color: 'text-green-600' },
  ];

  const handleReply = (id) => {
    if (!replyText.trim()) return;
    updateIdea.mutate({ id, updates: { admin_comment: replyText.trim() } });
    setReplyingId(null);
    setReplyText('');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" /> {t('engagement_ideas_title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {stats.map((s, i) => (
            <div key={i} className="border rounded-lg p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกสถานะ</SelectItem>
              {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CAT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">ล่าสุด</SelectItem>
              <SelectItem value="votes">Votes สูงสุด</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Idea list */}
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">ไม่มีไอเดีย</p>}
          {filtered.map(idea => {
            const statusCfg = STATUS_OPTIONS.find(s => s.value === idea.status) || STATUS_OPTIONS[0];
            return (
              <div key={idea.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{idea.title}</p>
                    {idea.description && <p className="text-xs text-muted-foreground line-clamp-1">{idea.description}</p>}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[11px] text-muted-foreground">{idea.author_name || idea.author_email}</span>
                      {idea.department && <Badge variant="outline" className="text-[10px]">{idea.department}</Badge>}
                      <Badge variant="outline" className="text-[10px]">{CAT_LABEL[idea.category] || idea.category}</Badge>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" /> {idea.vote_count || 0}</span>
                    </div>
                  </div>
                  <Select value={idea.status} onValueChange={(val) => updateIdea.mutate({ id: idea.id, updates: { status: val } })}>
                    <SelectTrigger className="w-[120px] h-7 text-[11px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Admin comment */}
                {idea.admin_comment && (
                  <div className="bg-blue-50 rounded p-2 text-xs text-blue-700">
                    <span className="font-medium">Management:</span> {idea.admin_comment}
                  </div>
                )}

                {replyingId === idea.id ? (
                  <div className="flex gap-2">
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="ตอบกลับไอเดีย..."
                      className="text-xs h-16"
                    />
                    <div className="flex flex-col gap-1">
                      <Button size="sm" className="text-xs h-7" onClick={() => handleReply(idea.id)}>บันทึก</Button>
                      <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { setReplyingId(null); setReplyText(''); }}>ยกเลิก</Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7 gap-1"
                    onClick={() => { setReplyingId(idea.id); setReplyText(idea.admin_comment || ''); }}
                  >
                    <MessageSquare className="w-3 h-3" /> {t('engagement_ideas_reply')}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}