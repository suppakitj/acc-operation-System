import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, AlertTriangle, CheckCircle2, Clock, ShieldCheck, XCircle, Send, Search } from 'lucide-react';

const STATUS_CONFIG = [
  { key: 'validating', label: 'Validating', icon: Search, color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'flagged', label: 'Flagged', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  { key: 'clean', label: 'Clean', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
  { key: 'under_review', label: 'Under Review', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  { key: 'approved', label: 'Approved', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { key: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  { key: 'filed', label: 'Filed', icon: Send, color: 'text-purple-600', bg: 'bg-purple-50' },
];

export default function TaxQAWipCards({ period }) {
  const { data: filings = [] } = useQuery({
    queryKey: ['taxqa_wip', period],
    queryFn: () => base44.entities.TaxQA_Filing.filter({ tax_period: period }, '-created_date', 500),
  });

  const counts = {};
  STATUS_CONFIG.forEach(s => counts[s.key] = 0);
  filings.forEach(f => { if (counts[f.status] !== undefined) counts[f.status]++; });

  const todayQueue = counts.flagged + counts.clean;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {STATUS_CONFIG.map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.key} className={`${s.bg} border-0`}>
              <CardContent className="p-3 text-center">
                <Icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
                <div className={`text-xl font-bold ${s.color}`}>{counts[s.key]}</div>
                <div className="text-[11px] text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          );
        })}
        <Card className="bg-orange-50 border-0">
          <CardContent className="p-3 text-center">
            <FileText className="w-5 h-5 mx-auto mb-1 text-orange-600" />
            <div className="text-xl font-bold text-orange-600">{todayQueue}</div>
            <div className="text-[11px] text-muted-foreground">คิววันนี้</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}