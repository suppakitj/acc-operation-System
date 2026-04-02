import React from 'react';
import { TrendingUp, Clock } from 'lucide-react';
import moment from 'moment';

export default function PopularSidebar({ articles, onSelect }) {
  const popular = [...articles]
    .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
    .slice(0, 5);

  const recent = [...articles]
    .sort((a, b) => new Date(b.published_at || b.updated_date || 0) - new Date(a.published_at || a.updated_date || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-3">
          <TrendingUp className="w-3.5 h-3.5" /> ยอดนิยม
        </h3>
        <div className="space-y-1">
          {popular.map((a, i) => (
            <button
              key={a.id}
              onClick={() => onSelect(a)}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-muted/50 transition-colors"
            >
              <p className="text-xs font-medium truncate">
                <span className="text-muted-foreground mr-1">{i + 1}.</span>
                {a.title}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-3">
          <Clock className="w-3.5 h-3.5" /> อัปเดตล่าสุด
        </h3>
        <div className="space-y-1">
          {recent.map(a => (
            <button
              key={a.id}
              onClick={() => onSelect(a)}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-muted/50 transition-colors"
            >
              <p className="text-xs font-medium truncate">{a.title}</p>
              <p className="text-[10px] text-muted-foreground">
                {moment(a.published_at || a.updated_date).format('D MMM YY')}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}