import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, History } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '../components/LanguageContext';
import TablePagination, { paginateData } from '../components/shared/TablePagination';

const ACTION_COLORS = { create: 'bg-green-100 text-green-700', update: 'bg-blue-100 text-blue-700', delete: 'bg-red-100 text-red-700' };

export default function AuditLog() {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { data: logs = [], isLoading } = useQuery({ queryKey: ['auditLogs'], queryFn: () => base44.entities.AuditLog.list('-created_date', 200) });

  const filtered = logs.filter(l => !search || l.entity_name?.toLowerCase().includes(search.toLowerCase()) || l.user_name?.toLowerCase().includes(search.toLowerCase()) || l.action?.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => { setPage(1); }, [search]);

  const paged = paginateData(filtered, page, pageSize);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">{t('audit_title')}</h1>
        <p className="text-sm text-muted-foreground">{t('audit_subtitle')}</p>
      </div>

      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>

      <div className="space-y-2">
        {isLoading ? <div className="text-center py-12 text-muted-foreground">{t('loading')}</div> :
         filtered.length === 0 ? <Card className="p-8 text-center text-muted-foreground">{t('no_logs')}</Card> :
         paged.map(log => (
           <Card key={log.id}>
             <CardContent className="p-3 md:p-4 flex items-center gap-3 md:gap-4">
               <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><History className="w-4 h-4 text-muted-foreground" /></div>
               <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-2 flex-wrap">
                   <Badge variant="secondary" className={ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}>{log.action}</Badge>
                   <span className="text-sm font-medium">{log.entity_type}</span>
                   {log.entity_name && <span className="text-sm text-muted-foreground hidden sm:inline">— {log.entity_name}</span>}
                 </div>
                 <p className="text-xs text-muted-foreground mt-0.5">{log.user_name || log.user_email} · {log.created_date && format(new Date(log.created_date), 'dd/MM/yyyy HH:mm')}</p>
               </div>
             </CardContent>
           </Card>
         ))}
         </div>
         {filtered.length > 0 && (
         <TablePagination totalItems={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
         )}
         </div>
  );
}