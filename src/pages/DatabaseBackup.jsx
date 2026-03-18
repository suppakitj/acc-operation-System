import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAccessControl } from '../components/auth/useAccessControl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, Download, Loader2, CheckCircle2, FileSpreadsheet, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';

const ENTITIES = [
  { key: 'Customer', label: 'Customer', icon: '🏢' },
  { key: 'Task', label: 'Task', icon: '✅' },
  { key: 'TaskTemplate', label: 'Task Template', icon: '📋' },
  { key: 'Billing', label: 'Billing', icon: '💰' },
  { key: 'PeakLicense', label: 'Peak License', icon: '🔑' },
  { key: 'Schedule', label: 'Schedule', icon: '📅' },
  { key: 'Notification', label: 'Notification', icon: '🔔' },
  { key: 'LineMessage', label: 'Line Message', icon: '💬' },
  { key: 'AuditLog', label: 'Audit Log', icon: '📝' },
  { key: 'AppConfig', label: 'App Config', icon: '⚙️' },
];

function objectToCSV(data) {
  if (!data || data.length === 0) return '';
  const allKeys = new Set();
  data.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));
  const headers = [...allKeys];
  const BOM = '\uFEFF';
  const lines = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        let val = row[h];
        if (val === null || val === undefined) return '""';
        if (typeof val === 'object') val = JSON.stringify(val);
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    )
  ];
  return BOM + lines.join('\n');
}

function downloadFile(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DatabaseBackup() {
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);

  const [downloading, setDownloading] = useState({}); // { entityKey: true }
  const [completed, setCompleted] = useState({}); // { entityKey: count }
  const [isBackingUp, setIsBackingUp] = useState(false);

  if (!ac.canViewDbBackup && currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <ShieldAlert className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">เฉพาะ Admin เท่านั้นที่สามารถ Backup ข้อมูลได้</p>
      </div>
    );
  }

  const handleExportSingle = async (entityKey) => {
    setDownloading(p => ({ ...p, [entityKey]: true }));
    const data = await base44.entities[entityKey].list('-created_date', 10000);
    if (data.length === 0) {
      setDownloading(p => ({ ...p, [entityKey]: false }));
      setCompleted(p => ({ ...p, [entityKey]: 0 }));
      return;
    }
    const csv = objectToCSV(data);
    const dateStr = format(new Date(), 'yyyy-MM-dd_HHmm');
    downloadFile(csv, `${entityKey}_backup_${dateStr}.csv`);
    setDownloading(p => ({ ...p, [entityKey]: false }));
    setCompleted(p => ({ ...p, [entityKey]: data.length }));
  };

  const handleFullBackup = async () => {
    setIsBackingUp(true);
    setCompleted({});
    for (const entity of ENTITIES) {
      await handleExportSingle(entity.key);
      // Small delay between downloads so browser doesn't block
      await new Promise(r => setTimeout(r, 500));
    }
    setIsBackingUp(false);
  };

  const dateStr = format(new Date(), 'dd MMM yyyy, HH:mm');

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Database className="w-5 h-5" /> Full Backup Database
          </h1>
          <p className="text-xs text-muted-foreground">Export ข้อมูลทั้งหมดออกเป็น CSV file แยกตาม Table — เฉพาะ Admin</p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 text-xs shrink-0 self-start sm:self-auto"
          onClick={handleFullBackup}
          disabled={isBackingUp}
        >
          {isBackingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          {isBackingUp ? 'กำลัง Backup...' : 'Backup ทั้งหมด'}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Database Tables ({ENTITIES.length} tables)</span>
            <span className="text-xs font-normal text-muted-foreground">{dateStr}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {ENTITIES.map(entity => {
              const isDl = downloading[entity.key];
              const count = completed[entity.key];
              return (
                <div key={entity.key} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{entity.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{entity.label}</p>
                      <p className="text-[11px] text-muted-foreground">Entity: {entity.key}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {count !== undefined && (
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                        {count === 0 ? 'ไม่มีข้อมูล' : `${count} records`}
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs h-7"
                      onClick={() => handleExportSingle(entity.key)}
                      disabled={isDl || isBackingUp}
                    >
                      {isDl ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3" />}
                      CSV
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}