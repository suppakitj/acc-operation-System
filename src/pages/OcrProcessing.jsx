import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle2, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import OcrUploadForm from '../components/ocr/OcrUploadForm';
import OcrJobList from '../components/ocr/OcrJobList';
import OcrJobFilters from '../components/ocr/OcrJobFilters';

export default function OcrProcessing() {
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['ocr-jobs'],
    queryFn: () => base44.entities.OcrJob.list('-created_date', 50),
    refetchInterval: 15000,
  });

  // Real-time: auto-refresh when OcrJob is updated (e.g. via webhook)
  useEffect(() => {
    const unsubscribe = base44.entities.OcrJob.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['ocr-jobs'] });
    });
    return unsubscribe;
  }, [queryClient]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['ocr-jobs'] });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredJobs = useMemo(() => {
    let result = jobs;
    if (statusFilter !== 'all') {
      result = result.filter(j => j.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(j =>
        (j.filename || '').toLowerCase().includes(q) ||
        (j.customer_name || '').toLowerCase().includes(q) ||
        (j.notes || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [jobs, search, statusFilter]);

  const stats = {
    total: jobs.length,
    processing: jobs.filter(j => j.status === 'processing').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">OCR</h1>
          <p className="text-sm text-muted-foreground">อัปโหลดเอกสาร → แปลงเป็น Excel / Word อัตโนมัติ → บันทึกใน Google Drive</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="w-4 h-4 mr-1" /> รีเฟรช
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={FileText} label="ทั้งหมด" value={stats.total} color="blue" />
        <StatCard icon={Clock} label="กำลังประมวลผล" value={stats.processing} color="amber" />
        <StatCard icon={CheckCircle2} label="เสร็จสิ้น" value={stats.completed} color="green" />
        <StatCard icon={AlertTriangle} label="ล้มเหลว" value={stats.failed} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">อัปโหลดเอกสาร</CardTitle>
          </CardHeader>
          <CardContent>
            <OcrUploadForm onSubmitted={refresh} />
          </CardContent>
        </Card>

        {/* Job List */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 space-y-3">
            <CardTitle className="text-base">รายการ OCR ({filteredJobs.length}/{jobs.length})</CardTitle>
            <OcrJobFilters
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
            />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">กำลังโหลด...</p>
            ) : (
              <OcrJobList jobs={filteredJobs} onRefresh={refresh} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    green: 'bg-emerald-500',
    red: 'bg-red-500',
  };

  return (
    <div className="bg-white rounded-xl border p-4 flex items-center gap-3 shadow-sm">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}