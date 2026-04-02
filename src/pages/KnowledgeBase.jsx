import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookOpen, Plus, Search } from 'lucide-react';
import { useAccessControl } from '@/components/auth/useAccessControl';
import { Link } from 'react-router-dom';

import CategoryPills from '@/components/knowledge/CategoryPills';
import ArticleCard from '@/components/knowledge/ArticleCard';
import ArticleView from '@/components/knowledge/ArticleView';
import PopularSidebar from '@/components/knowledge/PopularSidebar';

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
    queryFn: () => base44.entities.KnowledgeArticle.list('-published_at', 500),
    staleTime: 5 * 60_000,
  });

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState(null);

  const published = useMemo(() => articles.filter(a => a.status === 'published'), [articles]);

  const filtered = useMemo(() => {
    let result = published;
    if (activeCategory !== 'all') {
      result = result.filter(a => a.category_slug === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        a.title?.toLowerCase().includes(q) ||
        a.summary?.toLowerCase().includes(q) ||
        a.content?.toLowerCase().includes(q) ||
        (a.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [published, activeCategory, search]);

  const isManager = ['admin', 'management', 'manager', 'super_supervisor'].includes(ac.role);
  const canEditArticle = (article) => isManager || article?.author_email === currentUser?.email;

  // Article detail view
  if (selectedArticle) {
    return (
      <div className="space-y-4">
        <ArticleView
          article={selectedArticle}
          categories={categories}
          onBack={() => setSelectedArticle(null)}
          onEdit={() => {}}
          canEdit={canEditArticle(selectedArticle)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5" /> Knowledge Base
          </h1>
          <p className="text-sm text-muted-foreground">ค้นหาขั้นตอน กฎหมาย คู่มือโปรแกรม และ FAQ</p>
        </div>
        <Link to="/KnowledgeManage">
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> เพิ่มบทความ
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="ค้นหาบทความ, คำสำคัญ, tags..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-11 h-11 text-sm"
        />
      </div>

      {/* Category pills */}
      <CategoryPills categories={categories} active={activeCategory} onSelect={setActiveCategory} />

      {/* Main content */}
      <div className="flex gap-6">
        {/* Sidebar — hidden on mobile */}
        <div className="hidden lg:block w-56 shrink-0">
          <PopularSidebar articles={published} onSelect={setSelectedArticle} />
        </div>

        {/* Article grid */}
        <div className="flex-1 min-w-0">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {search || activeCategory !== 'all' ? 'ไม่พบบทความที่ตรงกับการค้นหา' : 'ยังไม่มีบทความ'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(article => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  categories={categories}
                  onClick={setSelectedArticle}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}