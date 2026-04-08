import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Plus, Search, Clock, TrendingUp, ThumbsUp, Eye, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useAccessControl } from '@/components/auth/useAccessControl';
import { cn } from '@/lib/utils';
import moment from 'moment';

import ArticleView from '@/components/knowledge/ArticleView';
import ArticleForm from '@/components/knowledge/ArticleForm';

function getCategoryEmoji(slug) {
  const map = { sop: '🗒️', tax_law: '📋', program_guide: '💻', faq: '❓', template: '📄' };
  return map[slug] || '📝';
}

export default function KnowledgeBase() {
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);

  const { data: categories = [] } = useQuery({
    queryKey: ['knowledgeCategories'],
    queryFn: () => base44.entities.KnowledgeCategory.list('sort_order', 50),
    staleTime: 30 * 60_000,
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['knowledgeArticles'],
    queryFn: () => base44.entities.KnowledgeArticle.list('-updated_date', 500),
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [saving, setSaving] = useState(false);

  const published = useMemo(() => articles.filter(a => a.status === 'published'), [articles]);

  const filtered = useMemo(() => {
    let result = published;
    if (activeCategory !== 'all') {
      result = result.filter(a => a.category_slug === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.title?.toLowerCase().includes(q) ||
        a.summary?.toLowerCase().includes(q) ||
        a.content?.toLowerCase().includes(q) ||
        (a.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    // Sort
    if (sortBy === 'popular') {
      result = [...result].sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    } else if (sortBy === 'helpful') {
      result = [...result].sort((a, b) => (b.helpful_count || 0) - (a.helpful_count || 0));
    } else {
      result = [...result].sort((a, b) => new Date(b.published_at || b.updated_date || 0) - new Date(a.published_at || a.updated_date || 0));
    }
    return result;
  }, [published, activeCategory, searchQuery, sortBy]);

  const isManager = ['admin', 'management', 'manager', 'super_supervisor'].includes(ac.role);
  const queryClient = useQueryClient();

  const handleSave = async (data, articleId) => {
    setSaving(true);
    try {
      if (articleId) {
        await base44.entities.KnowledgeArticle.update(articleId, data);
      } else {
        await base44.entities.KnowledgeArticle.create(data);
      }
      queryClient.invalidateQueries({ queryKey: ['knowledgeArticles'] });
      queryClient.invalidateQueries({ queryKey: ['knowledgeArticlesAll'] });
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async (data, articleId) => {
    setSaving(true);
    try {
      if (articleId) {
        await base44.entities.KnowledgeArticle.update(articleId, data);
        toast.success('อัปเดตบทความเรียบร้อย');
      }
      queryClient.invalidateQueries({ queryKey: ['knowledgeArticles'] });
      queryClient.invalidateQueries({ queryKey: ['knowledgeArticlesAll'] });
      setShowEditForm(false);
      setEditingArticle(null);
      if (selectedArticle?.id === articleId) {
        const updated = await base44.entities.KnowledgeArticle.filter({ id: articleId });
        if (updated.length) setSelectedArticle(updated[0]);
      }
    } catch (e) {
      toast.error('บันทึกล้มเหลว: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // Article detail view
  if (selectedArticle) {
    return (
      <ArticleView
        article={selectedArticle}
        categories={categories}
        onBack={() => setSelectedArticle(null)}
        onEdit={(article) => { setEditingArticle(article); setShowEditForm(true); }}
        canEdit={isManager || selectedArticle?.author_email === currentUser?.email}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            📚 Knowledge Base
          </h1>
          <p className="text-sm text-muted-foreground">คลังความรู้องค์กร</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> เขียนบทความใหม่
        </Button>
      </div>

      {/* Main layout: sidebar + content */}
      <div className="flex gap-5">
        {/* Sidebar categories — hidden on mobile */}
        <div className="hidden lg:block w-64 shrink-0">
          <div className="bg-card border rounded-xl p-4 sticky top-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">หมวดหมู่</p>

            <div className="space-y-1">
              <button
                onClick={() => setActiveCategory('all')}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all",
                  activeCategory === 'all'
                    ? "bg-primary text-primary-foreground font-medium shadow-sm"
                    : "hover:bg-muted/60 text-foreground"
                )}
              >
                <span className="text-base leading-none">📚</span>
                <span className="flex-1 text-left">ทั้งหมด</span>
                <span className={cn(
                  "text-[10px] font-semibold min-w-[22px] h-[22px] flex items-center justify-center rounded-full",
                  activeCategory === 'all' ? "bg-white/20" : "bg-muted text-muted-foreground"
                )}>{published.length}</span>
              </button>

              {categories.filter(c => c.status === 'active').map(cat => {
                const count = published.filter(a => a.category_slug === cat.slug).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.slug)}
                    title={cat.name}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all",
                      activeCategory === cat.slug
                        ? "bg-primary text-primary-foreground font-medium shadow-sm"
                        : "hover:bg-muted/60 text-foreground"
                    )}
                  >
                    <span className="text-base leading-none shrink-0">{getCategoryEmoji(cat.slug)}</span>
                    <span className="flex-1 text-left leading-snug line-clamp-2">{cat.name}</span>
                    <span className={cn(
                      "text-[10px] font-semibold min-w-[22px] h-[22px] flex items-center justify-center rounded-full shrink-0",
                      activeCategory === cat.slug ? "bg-white/20" : "bg-muted text-muted-foreground"
                    )}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Mobile category select */}
          <div className="lg:hidden flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory('all')}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                activeCategory === 'all'
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-border"
              )}
            >
              📚 ทั้งหมด ({published.length})
            </button>
            {categories.filter(c => c.status === 'active').map(cat => {
              const count = published.filter(a => a.category_slug === cat.slug).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.slug)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                    activeCategory === cat.slug
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border"
                  )}
                >
                  {getCategoryEmoji(cat.slug)} {cat.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาบทความ..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Sort tabs */}
          <div className="flex items-center gap-2">
            {[
              { key: 'latest', label: 'ล่าสุด', icon: Clock },
              { key: 'popular', label: 'ยอดนิยม', icon: TrendingUp },
              { key: 'helpful', label: 'ถูกใจมากสุด', icon: ThumbsUp },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setSortBy(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
                  sortBy === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Articles grid or empty state */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <BookOpen className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">ไม่พบบทความ</p>
              {searchQuery && <p className="text-xs mt-1">ลองค้นหาด้วยคำอื่น</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(article => (
                <div
                  key={article.id}
                  onClick={() => setSelectedArticle(article)}
                  className="bg-card border rounded-xl p-4 hover:shadow-md cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {getCategoryEmoji(article.category_slug)} {article.category_name}
                    </Badge>
                    {article.content_type === 'template' && article.drive_url && (
                      <a
                        href={article.drive_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-green-600 hover:text-green-700"
                        title="เปิด Google Drive"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  <h3 className="font-semibold text-sm leading-snug mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                    {article.title}
                  </h3>

                  {article.summary && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{article.summary}</p>
                  )}

                  {article.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {article.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{tag}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {article.view_count || 0} ครั้ง
                    </span>
                    <span>{article.published_at ? moment(article.published_at).format('D MMM YY') : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Article form dialog */}
      <ArticleForm
        open={showForm}
        onOpenChange={setShowForm}
        article={null}
        categories={categories}
        currentUser={currentUser}
        isManager={isManager}
        onSave={handleSave}
        saving={saving}
      />

      {/* Edit form dialog */}
      <ArticleForm
        open={showEditForm}
        onOpenChange={(open) => { if (!open) { setShowEditForm(false); setEditingArticle(null); } }}
        article={editingArticle}
        categories={categories}
        currentUser={currentUser}
        isManager={isManager}
        onSave={handleEditSave}
        saving={saving}
      />
    </div>
  );
}