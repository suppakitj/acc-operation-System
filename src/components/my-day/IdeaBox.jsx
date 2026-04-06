import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Lightbulb, ChevronUp, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../LanguageContext';

const CATEGORY_LABEL = {
  process: 'กระบวนการ',
  tool: 'เครื่องมือ',
  culture: 'วัฒนธรรม',
  customer: 'ลูกค้า',
  other: 'อื่นๆ',
};

const STATUS_LABEL = {
  open: 'เปิดรับ',
  considering: 'กำลังพิจารณา',
  planned: 'วางแผนทำ',
  done: 'ทำแล้ว',
  closed: 'ปิด',
};

const STATUS_BADGE = {
  considering: 'bg-amber-50 text-amber-700 border-amber-200',
  planned: 'bg-blue-50 text-blue-700 border-blue-200',
  done: 'bg-green-50 text-green-700 border-green-200',
  closed: 'bg-gray-50 text-gray-500 border-gray-200',
};

export default function IdeaBox({ currentUser }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: ideas = [] } = useQuery({
    queryKey: ['ideas'],
    queryFn: () => base44.entities.Idea.list('-vote_count', 20),
    staleTime: 60_000,
  });

  const voteMutation = useMutation({
    mutationFn: (idea) => {
      const currentVoters = idea.voters || [];
      return base44.entities.Idea.update(idea.id, {
        vote_count: (idea.vote_count || 0) + 1,
        voters: [...currentVoters, currentUser.email],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
    },
  });

  const handleVote = (idea) => {
    const hasVoted = idea.voters?.includes(currentUser?.email);
    const isAuthor = idea.author_email === currentUser?.email;
    if (hasVoted || isAuthor) return;
    voteMutation.mutate(idea);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <Lightbulb className="w-4 h-4 text-yellow-500" /> {t('my_day_ideas_title')}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => setShowForm(true)}
        >
          <Plus className="w-3 h-3" /> {t('my_day_ideas_add')}
        </Button>
      </div>

      {ideas.length === 0 ? (
        <Card className="shadow-sm border">
          <CardContent className="p-6 text-center">
            <Lightbulb className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">{t('my_day_ideas_empty')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {ideas.map(idea => {
            const hasVoted = idea.voters?.includes(currentUser?.email);
            const isAuthor = idea.author_email === currentUser?.email;
            return (
              <div key={idea.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <button
                  onClick={() => handleVote(idea)}
                  disabled={hasVoted || isAuthor || voteMutation.isPending}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all shrink-0
                    ${hasVoted
                      ? 'bg-primary/10 text-primary cursor-default'
                      : isAuthor
                        ? 'text-muted-foreground cursor-default'
                        : 'hover:bg-muted cursor-pointer'
                    }`}
                >
                  <ChevronUp className="w-4 h-4" />
                  <span className="text-xs font-bold">{idea.vote_count || 0}</span>
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{idea.title}</p>
                  {idea.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{idea.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {CATEGORY_LABEL[idea.category] || idea.category}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{idea.author_name}</span>
                    {idea.status !== 'open' && (
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${STATUS_BADGE[idea.status] || ''}`}>
                        {STATUS_LABEL[idea.status] || idea.status}
                      </Badge>
                    )}
                  </div>
                  {idea.admin_comment && (
                    <div className="mt-2 p-2 rounded bg-blue-50 border border-blue-100">
                      <p className="text-[11px] text-blue-700">💬 Management: {idea.admin_comment}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <IdeaFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        currentUser={currentUser}
      />
    </div>
  );
}

function IdeaFormDialog({ open, onOpenChange, currentUser }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('process');

  const createIdea = useMutation({
    mutationFn: (data) => base44.entities.Idea.create({
      ...data,
      author_email: currentUser.email,
      author_name: currentUser.full_name || currentUser.email,
      department: currentUser.department || '',
      status: 'open',
      vote_count: 0,
      voters: [],
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      toast.success(t('my_day_ideas_success') + ' 💡');
      onOpenChange(false);
      setTitle('');
      setDescription('');
      setCategory('process');
    },
  });

  const handleSubmit = () => {
    if (!title.trim()) return;
    createIdea.mutate({ title: title.trim(), description: description.trim(), category });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>💡 {t('my_day_ideas_add')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('my_day_ideas_title_field')} *</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="เช่น ใช้ระบบ auto-reminder ส่งงานลูกค้า"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('my_day_ideas_desc')}</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="อธิบายรายละเอียดเพิ่มเติม..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('my_day_ideas_category')}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || createIdea.isPending}
            className="w-full"
          >
            {createIdea.isPending ? 'กำลังส่ง...' : `💡 ${t('my_day_ideas_submit')}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}