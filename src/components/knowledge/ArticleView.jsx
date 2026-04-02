import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, ThumbsUp, ThumbsDown, ExternalLink, Pencil } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import moment from 'moment';
import { base44 } from '@/api/base44Client';

const COLOR_MAP = {
  blue: 'bg-blue-100 text-blue-700',
  amber: 'bg-amber-100 text-amber-700',
  purple: 'bg-purple-100 text-purple-700',
  green: 'bg-green-100 text-green-700',
  orange: 'bg-orange-100 text-orange-700',
};

export default function ArticleView({ article, categories, onBack, onEdit, canEdit }) {
  const cat = categories.find(c => c.id === article.category_id || c.slug === article.category_slug);
  const colorClass = COLOR_MAP[cat?.color] || 'bg-muted text-muted-foreground';

  const [voted, setVoted] = useState(null);

  // Track view count (once per session per article)
  useEffect(() => {
    const key = `kb_viewed_${article.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    const timer = setTimeout(() => {
      base44.entities.KnowledgeArticle.update(article.id, {
        view_count: (article.view_count || 0) + 1,
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [article.id]);

  // Check localStorage for previous vote
  useEffect(() => {
    const prev = localStorage.getItem(`kb_vote_${article.id}`);
    if (prev) setVoted(prev);
  }, [article.id]);

  const handleVote = async (type) => {
    if (voted) return;
    const field = type === 'up' ? 'helpful_count' : 'not_helpful_count';
    const current = article[field] || 0;
    await base44.entities.KnowledgeArticle.update(article.id, { [field]: current + 1 });
    localStorage.setItem(`kb_vote_${article.id}`, type);
    setVoted(type);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-xs">
          <ArrowLeft className="w-4 h-4" /> กลับ
        </Button>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => onEdit(article)} className="gap-1 text-xs">
            <Pencil className="w-3.5 h-3.5" /> แก้ไข
          </Button>
        )}
      </div>

      <Badge className={`text-[10px] border-0 mb-3 ${colorClass}`}>
        {cat?.name || article.content_type}
      </Badge>

      <h1 className="text-xl md:text-2xl font-bold mb-2">{article.title}</h1>

      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-6">
        {article.author_name && <span>โดย {article.author_name}</span>}
        {article.published_at && <span>• {moment(article.published_at).format('D MMM YYYY')}</span>}
        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {article.view_count || 0}</span>
      </div>

      <div className="prose prose-sm max-w-none mb-8">
        <ReactMarkdown
          components={{
            h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2">{children}</h1>,
            h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-2">{children}</h2>,
            h3: ({ children }) => <h3 className="text-sm font-bold mt-3 mb-1">{children}</h3>,
            p: ({ children }) => <p className="text-sm mb-2 leading-relaxed">{children}</p>,
            ul: ({ children }) => <ul className="list-disc ml-4 mb-2 text-sm">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal ml-4 mb-2 text-sm">{children}</ol>,
            li: ({ children }) => <li className="mb-1">{children}</li>,
            code: ({ inline, children }) => inline
              ? <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>
              : <pre className="bg-muted rounded p-3 text-xs overflow-x-auto mb-2"><code>{children}</code></pre>,
            a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">{children}</a>,
          }}
        >
          {article.content || ''}
        </ReactMarkdown>
      </div>

      {article.content_type === 'template' && article.drive_url && (
        <a
          href={article.drive_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors mb-8"
        >
          <ExternalLink className="w-5 h-5" />
          เปิดไฟล์ใน Google Drive {article.drive_file_name ? `(${article.drive_file_name})` : ''}
        </a>
      )}

      <div className="border-t pt-4">
        <p className="text-xs text-muted-foreground mb-2">มีประโยชน์ไหม?</p>
        <div className="flex gap-3">
          <Button
            variant={voted === 'up' ? 'default' : 'outline'}
            size="sm"
            className="gap-1 text-xs"
            onClick={() => handleVote('up')}
            disabled={!!voted}
          >
            <ThumbsUp className="w-3.5 h-3.5" /> มีประโยชน์ {(article.helpful_count || 0) + (voted === 'up' ? 1 : 0)}
          </Button>
          <Button
            variant={voted === 'down' ? 'destructive' : 'outline'}
            size="sm"
            className="gap-1 text-xs"
            onClick={() => handleVote('down')}
            disabled={!!voted}
          >
            <ThumbsDown className="w-3.5 h-3.5" /> ไม่มีประโยชน์ {(article.not_helpful_count || 0) + (voted === 'down' ? 1 : 0)}
          </Button>
        </div>
      </div>
    </div>
  );
}