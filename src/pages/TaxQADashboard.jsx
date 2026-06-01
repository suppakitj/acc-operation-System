import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, AlertTriangle, CheckCircle2, Clock, ShieldCheck, XCircle, Send, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import TaxQAWipCards from '@/components/tax-qa-dashboard/TaxQAWipCards';
import TaxQAAgingTable from '@/components/tax-qa-dashboard/TaxQAAgingTable';
import TaxQAErrorFrequency from '@/components/tax-qa-dashboard/TaxQAErrorFrequency';
import TaxQAErrorRate from '@/components/tax-qa-dashboard/TaxQAErrorRate';
import TaxQAAutoClearTrend from '@/components/tax-qa-dashboard/TaxQAAutoClearTrend';

export default function TaxQADashboard() {
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [period, setPeriod] = useState(currentPeriod);
  const [formFilter, setFormFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerSearch, setCustomerSearch] = useState('');
  const [preparedBySearch, setPreparedBySearch] = useState('');

  // Generate period options (last 12 months)
  const periodOptions = useMemo(() => {
    const opts = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return opts;
  }, []);

  const filters = { period, formFilter, statusFilter, customerSearch, preparedBySearch };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tax QA Dashboard</h1>
          <p className="text-sm text-muted-foreground">ภาพรวมการตรวจสอบแบบภาษี</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {periodOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={formFilter} onValueChange={setFormFilter}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกแบบ</SelectItem>
              {['PND1','PND3','PND53','PND54','PP30','PP36'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกสถานะ</SelectItem>
              {['draft','validating','flagged','clean','under_review','approved','rejected','filed'].map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="ค้นลูกค้า..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} className="w-[140px]" />
          <Input placeholder="ผู้จัดทำ..." value={preparedBySearch} onChange={e => setPreparedBySearch(e.target.value)} className="w-[130px]" />
        </div>
      </div>

      <TaxQAWipCards period={period} />

      <Tabs defaultValue="aging" className="space-y-4">
        <TabsList>
          <TabsTrigger value="aging">Aging & คิวงาน</TabsTrigger>
          <TabsTrigger value="error_freq">Error Frequency</TabsTrigger>
          <TabsTrigger value="error_rate">Error Rate</TabsTrigger>
          <TabsTrigger value="auto_clear">Auto-clear Trend</TabsTrigger>
        </TabsList>
        <TabsContent value="aging">
          <TaxQAAgingTable filters={filters} />
        </TabsContent>
        <TabsContent value="error_freq">
          <TaxQAErrorFrequency period={period} />
        </TabsContent>
        <TabsContent value="error_rate">
          <TaxQAErrorRate period={period} />
        </TabsContent>
        <TabsContent value="auto_clear">
          <TaxQAAutoClearTrend />
        </TabsContent>
      </Tabs>
    </div>
  );
}