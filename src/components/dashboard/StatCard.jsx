import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function StatCard({ title, value, icon: Icon, className }) {
  return (
    <Card className={cn("p-4 md:p-6 relative overflow-hidden group hover:shadow-lg transition-all duration-300", className)}>
      <div className="flex justify-between items-start">
        <div className="space-y-1 md:space-y-2 min-w-0">
          <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="text-2xl md:text-3xl font-bold tracking-tight">{value}</p>
        </div>
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity" />
    </Card>
  );
}