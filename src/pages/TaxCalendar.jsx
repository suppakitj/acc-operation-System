import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAccessControl } from '../components/auth/useAccessControl';
import { useLanguage } from '../components/LanguageContext';
import { format, differenceInDays } from 'date-fns';
import { th } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CalendarDays, Zap, Eye, Loader2, CheckCircle2, AlertTriangle,
  Clock, CalendarClock, ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';

import TaxCalendarStats from '../components/tax-calendar/TaxCalendarStats';
import TaxCalendarMonth from '../components/tax-calendar/TaxCalendarMonth';
import TaxCalendarInfo from '../components/tax-calendar/TaxCalendarInfo';
import TaxCalendarAnnual from '../components/tax-calendar/TaxCalendarAnnual';

const MONTH_FULL = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                     'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

export default function TaxCalendar() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [generating, setGenerating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'], queryFn: () => base44.auth.me(),
  });
  const ac = useAccessControl(currentUser);
  const canGenerate = ac.role === 'admin' || ac.role === 'management';

  const { data: deadlines = [], isLoading } = useQuery({
    queryKey: ['taxDeadlines', selectedYear],
    queryFn: () => base44.entities.TaxDeadline.filter({ for_year: selectedYear }, 'for_month', 500),
    staleTime: 120_000,
  });

  const handlePreview = async () => {
    setPreviewing(true); setPreviewResult(null);
    try {
      const res = await base44.functions.invoke('generateTaxDeadlines', { target_year: selectedYear, dry_run: true });
      setPreviewResult(res.data);
      if (res.data.total_generated === 0) toast.info('ปีนี้สร้างไปแล้ว ไม่มีรายการใหม่');
    } catch (err) { toast.error('Preview ล้มเหลว: ' + (err.response?.data?.error || err.message)); }
    finally { setPreviewing(false); }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('generateTaxDeadlines', { target_year: selectedYear, dry_run: false });
      toast.success(`สร้างปฏิทินภาษี ${res.data.total_generated} รายการสำเร็จ!`);
      setPreviewResult(null);
      queryClient.invalidateQueries({ queryKey: ['taxDeadlines'] });
    } catch (err) { toast.error('Generate ล้มเหลว: ' + (err.response?.data?.error || err.message)); }
    finally { setGenerating(false); }
  };

  // Group by month
  const byMonth = useMemo(() => {
    const map = {};
    for (let m = 1; m <= 12; m++) map[m] = [];
    deadlines.forEach(d => { if (d.for_month > 0 && map[d.for_month]) map[d.for_month].push(d); });
    return map;
  }, [deadlines]);

  // Stats
  const stats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const shifted = deadlines.filter(d => d.was_shifted).length;
    const upcoming = deadlines.filter(d => {
      const diff = differenceInDays(new Date(d.deadline), new Date());
      return diff >= 0 && diff <= 7;
    }).length;
    const pastDue = deadlines.filter(d => d.deadline < today).length;
    return { total: deadlines.length, shifted, upcoming, pastDue };
  }, [deadlines]);

  const years = [now.getFullYear(), now.getFullYear() + 1, now.getFullYear() + 2];

  if (!currentUser) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <CalendarClock className="w-6 h-6 text-blue-600" />
          {t('tax_cal_title')}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">{t('tax_cal_subtitle')}</p>
      </div>

      {/* Stats */}
      {deadlines.length > 0 && <TaxCalendarStats stats={stats} t={t} />}

      {/* Generate Section */}
      {canGenerate && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('tax_cal_generate')}</CardTitle>
            <CardDescription className="text-xs">{t('tax_cal_generate_desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">ปี</label>
                <Select value={String(selectedYear)} onValueChange={v => { setSelectedYear(Number(v)); setPreviewResult(null); }}>
                  <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map(y => (
                      <SelectItem key={y} value={String(y)}>{y} ({y + 543})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePreview} disabled={previewing} className="gap-1.5">
                  {previewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                  Preview
                </Button>
                <Button size="sm" onClick={handleGenerate} disabled={generating} className="gap-1.5">
                  {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  สร้างปฏิทิน {selectedYear + 543}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Year selector for non-admin */}
      {!canGenerate && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">ปี:</label>
          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={String(y)}>{y} ({y + 543})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Preview result */}
      {previewResult && previewResult.total_generated > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
          <Eye className="w-4 h-4 shrink-0" />
          <span>Preview: จะสร้าง {previewResult.total_generated} รายการ (ข้าม {previewResult.skipped_duplicate} รายการที่มีแล้ว)</span>
        </div>
      )}

      {/* Loading */}
      {isLoading && <div className="text-center py-12 text-muted-foreground text-sm">กำลังโหลด...</div>}

      {/* Monthly cards */}
      {!isLoading && deadlines.length > 0 && (
        <div className="space-y-4">
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(month => {
            const items = byMonth[month];
            if (!items || items.length === 0) return null;
            return (
              <TaxCalendarMonth
                key={month}
                month={month}
                year={selectedYear}
                items={items}
                monthLabel={MONTH_FULL[month - 1]}
              />
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && deadlines.length === 0 && !previewResult && (
        <Card className="shadow-sm border">
          <CardContent className="p-8 text-center">
            <CalendarDays className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">{t('tax_cal_empty')} {selectedYear + 543}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('tax_cal_empty_hint')}</p>
          </CardContent>
        </Card>
      )}

      {/* Annual deadlines */}
      {!isLoading && deadlines.length > 0 && (
        <TaxCalendarAnnual
          items={deadlines.filter(d => d.for_month === 0)}
          selectedYear={selectedYear}
        />
      )}

      {/* Info */}
      <TaxCalendarInfo />
    </div>
  );
}