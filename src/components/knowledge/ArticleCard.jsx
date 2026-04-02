import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Eye, ExternalLink } from 'lucide-react';
import moment from 'moment';

const COLOR_MAP = {
  blue: 'bg-blue-100 text-blue-700',
  amber: 'bg-amber-100 text-amber-700',
  purple: 'bg-purple-100 text-purple-700',
  green: 'bg-green-100 text-green-700',
  orange: 'bg-orange-100 text-orange-700',
};

export default function ArticleCard({ article, categories, onClick }) {
  const cat = categories.find(c => c.id === article.category_id || c.slug === article.category_slug);
  const colorClass = COLOR_MAP[cat?.color] || 'bg-muted text-muted-foreground';

  return (
    <div
      onClick={() => onClick(article)}
      className="bg-card rounded-lg border p-4 hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <Badge className={`text-[10px] border-0 ${colorClass}`}>
          {cat?.name || article.content_type}
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

      <h3 className="text-sm font-semibold mb-1 group-hover:text-primary transition-colors line-clamp-2">
        {article.title}
      </h3>

      {article.summary && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{article.summary}</p>
      )}

      {article.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {article.tags.slice(0, 4).map(tag => (
            <span key={tag} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Eye className="w-3 h-3" /> {article.view_count || 0}
        </span>
        {article.published_at && (
          <span>อัปเดต {moment(article.published_at).format('D MMM YY')}</span>
        )}
      </div>
    </div>
  );
}