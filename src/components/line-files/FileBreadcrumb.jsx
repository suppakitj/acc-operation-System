import React from 'react';
import { ChevronRight, FolderOpen } from 'lucide-react';

export default function FileBreadcrumb({ path, onNavigate }) {
  return (
    <div className="flex items-center gap-1 text-sm flex-wrap">
      <FolderOpen className="w-4 h-4 text-muted-foreground shrink-0" />
      {path.map((item, i) => (
        <React.Fragment key={item.id || 'root'}>
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
          <button
            onClick={() => onNavigate(item.id)}
            className={`hover:text-primary hover:underline transition-colors ${
              i === path.length - 1 ? 'font-semibold text-foreground' : 'text-muted-foreground'
            }`}
          >
            {item.name}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}