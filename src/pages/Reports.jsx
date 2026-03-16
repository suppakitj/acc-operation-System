import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useLanguage } from '../components/LanguageContext';

const COLORS = ['#1e3a5f', '#f59e0b', '#22c55e', '#8b5cf6', '#ef4444'];

export default function Reports() {
  const { t } = useLanguage();
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: () => base44.entities.Task.list('-created_date', 500) });
  const { data: billings = [] } = useQuery({ queryKey: ['billings'], queryFn: () => base44.entities.Billing.list('-created_date', 500) });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list() });

  const svcKeys = { accounting: 'service_accounting', payroll: 'service_payroll', tax_consulting: 'service_tax', audit: 'service_audit', peak_licensing: 'service_peak' };
  const tasksByService = {};
  tasks.forEach(task => { const k = task.service_type || 'other'; tasksByService[k] = (tasksByService[k] || 0) + 1; });
  const taskServiceData = Object.entries(tasksByService).map(([k, v]) => ({ name: t(svcKeys[k]) || k, value: v }));

  const revenueByService = {};
  billings.filter(b => b.status === 'paid').forEach(b => { const k = b.service_type || 'other'; revenueByService[k] = (revenueByService[k] || 0) + (b.total_amount || b.amount || 0); });
  const revenueData = Object.entries(revenueByService).map(([k, v]) => ({ name: t(svcKeys[k]) || k, value: v }));
  const totalRevenue = billings.filter(b => b.status === 'paid').reduce((s, b) => s + (b.total_amount || b.amount || 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">{t('reports_title')}</h1>
        <p className="text-sm text-muted-foreground">{t('reports_subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 text-center"><p className="text-xl md:text-2xl font-bold">{tasks.length}</p><p className="text-xs text-muted-foreground">{t('total_tasks')}</p></Card>
        <Card className="p-4 text-center"><p className="text-xl md:text-2xl font-bold">{customers.length}</p><p className="text-xs text-muted-foreground">{t('customers')}</p></Card>
        <Card className="p-4 text-center"><p className="text-xl md:text-2xl font-bold text-green-600">฿{totalRevenue.toLocaleString()}</p><p className="text-xs text-muted-foreground">{t('total_revenue')}</p></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t('tasks_by_service')}</CardTitle></CardHeader>
          <CardContent>
            {taskServiceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={taskServiceData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Bar dataKey="value" fill="#1e3a5f" radius={[4, 4, 0, 0]} /></BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">{t('no_data')}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t('revenue_by_service')}</CardTitle></CardHeader>
          <CardContent>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart><Pie data={revenueData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value">{revenueData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={v => `฿${v.toLocaleString()}`} /><Legend wrapperStyle={{ fontSize: '12px' }} /></PieChart>
              </ResponsiveContainer>
            ) : <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">{t('no_data')}</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}