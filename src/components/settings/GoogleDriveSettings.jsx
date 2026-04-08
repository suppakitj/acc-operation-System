import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HardDrive, Save, FolderOpen, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function GoogleDriveOAuthStatus() {
  const { data, isLoading } = useQuery({
    queryKey: ['gdrive-connection'],
    queryFn: async () => {
      const res = await base44.functions.invoke('checkGdriveConnection', {});
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">กำลังตรวจสอบการเชื่อมต่อ...</span>
      </div>
    );
  }

  if (data?.connected) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
        <CheckCircle2 className="w-4 h-4 text-green-600" />
        <div className="flex-1">
          <span className="text-sm font-medium text-green-700">เชื่อมต่อ Google Drive แล้ว</span>
          <p className="text-xs text-green-600">{data.displayName} ({data.email})</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
      <XCircle className="w-4 h-4 text-red-500" />
      <div className="flex-1">
        <span className="text-sm font-medium text-red-700">ยังไม่ได้เชื่อมต่อ Google Drive</span>
        <p className="text-xs text-red-500">กรุณาติดต่อ Admin เพื่อเชื่อมต่อ OAuth</p>
      </div>
    </div>
  );
}

export default function GoogleDriveSettings() {
  const queryClient = useQueryClient();
  const { data: configs = [] } = useQuery({
    queryKey: ['appConfig', 'gdrive'],
    queryFn: () => base44.entities.AppConfig.list(),
  });

  const getVal = (key) => configs.find(c => c.key === key)?.value || '';
  const getId = (key) => configs.find(c => c.key === key)?.id || null;

  const [uploadFolderId, setUploadFolderId] = useState('');
  const [outputFolderId, setOutputFolderId] = useState('');
  const [lineFilesRootId, setLineFilesRootId] = useState('');
  const [kbFolderId, setKbFolderId] = useState('');
  const [auditLogFolderId, setAuditLogFolderId] = useState('');
  const [consultingVisitFolderId, setConsultingVisitFolderId] = useState('');

  useEffect(() => {
    setUploadFolderId(getVal('gdrive_upload_folder_id'));
    setOutputFolderId(getVal('gdrive_output_folder_id'));
    setLineFilesRootId(getVal('gdrive_line_files_root_id'));
    setKbFolderId(getVal('gdrive_kb_folder_id'));
    setAuditLogFolderId(getVal('gdrive_audit_log_folder_id'));
    setConsultingVisitFolderId(getVal('gdrive_consulting_visit_folder_id'));
  }, [configs]);

  // Auto-extract folder ID from full Google Drive URL
  const extractFolderId = (val) => {
    if (!val) return '';
    if (val.includes('drive.google.com')) {
      const match = val.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      return match ? match[1] : val;
    }
    return val.trim();
  };

  const saveMutation = useMutation({
  mutationFn: async () => {
    const items = [
      { key: 'gdrive_upload_folder_id', value: extractFolderId(uploadFolderId), description: 'Google Drive Folder ID สำหรับรับไฟล์ที่ upload' },
      { key: 'gdrive_output_folder_id', value: extractFolderId(outputFolderId), description: 'Google Drive Folder ID สำหรับเก็บผลลัพธ์จาก Manus' },
      { key: 'gdrive_line_files_root_id', value: extractFolderId(lineFilesRootId), description: 'Google Drive Folder ID สำหรับ LINE Files Browser (root folder)' },
      { key: 'gdrive_kb_folder_id', value: extractFolderId(kbFolderId), description: 'Google Drive Folder ID สำหรับ Knowledge Base attachments' },
      { key: 'gdrive_audit_log_folder_id', value: extractFolderId(auditLogFolderId), description: 'Google Drive Folder ID สำหรับ export Audit Log (PDPA)' },
      { key: 'gdrive_consulting_visit_folder_id', value: extractFolderId(consultingVisitFolderId), description: 'Google Drive Folder ID สำหรับ Consulting Visit (โครงสร้าง: ชื่อบริษัท/ปี/เดือน)' },
    ];
      for (const item of items) {
        const existingId = getId(item.key);
        if (existingId) {
          await base44.entities.AppConfig.update(existingId, { value: item.value });
        } else {
          await base44.entities.AppConfig.create(item);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appConfig'] });
      toast.success('บันทึกการตั้งค่า Google Drive แล้ว');
    },
  });

  return (
    <Card className="border-blue-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-blue-500" /> Google Drive Settings (Admin)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <GoogleDriveOAuthStatus />

        <p className="text-xs text-muted-foreground">
          ตั้งค่า Folder ID ของ Google Drive สำหรับรับไฟล์ที่ upload และเก็บผลลัพธ์จาก Manus
        </p>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5" /> Upload Folder ID (Folder A — รับไฟล์)
          </Label>
          <Input
            value={uploadFolderId}
            onChange={e => setUploadFolderId(e.target.value)}
            placeholder="เช่น 1aBcDeFgHiJkLmNoPqRsTuVwXyZ"
            className="font-mono text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            เปิด Google Drive → คลิกขวาที่ Folder → รับลิงก์ → คัดลอก ID จาก URL
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5" /> Output Folder ID (Folder B — เก็บผลลัพธ์)
          </Label>
          <Input
            value={outputFolderId}
            onChange={e => setOutputFolderId(e.target.value)}
            placeholder="เช่น 1zYxWvUtSrQpOnMlKjIhGfEdCbA"
            className="font-mono text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5" /> LINE Files Root Folder ID
          </Label>
          <Input
            value={lineFilesRootId}
            onChange={e => setLineFilesRootId(e.target.value)}
            placeholder="เช่น 1aBcDeFgHiJkLmNoPqRsTuVwXyZ"
            className="font-mono text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            Folder ที่จะใช้เป็น root ของหน้า LINE Files — ถ้าไม่กรอกจะใช้ folder ชื่อ "LINE Files" อัตโนมัติ
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5" /> Knowledge Base Folder ID
          </Label>
          <Input
            value={kbFolderId}
            onChange={e => setKbFolderId(e.target.value)}
            placeholder="เช่น 1aBcDeFgHiJkLmNoPqRsTuVwXyZ"
            className="font-mono text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            Folder สำหรับเก็บไฟล์แนบจาก Knowledge Base — ถ้าไม่กรอกจะอัปโหลดไป root ของ Drive
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5" /> Consulting Visit Folder ID (ออกตรวจลูกค้า)
          </Label>
          <Input
            value={consultingVisitFolderId}
            onChange={e => setConsultingVisitFolderId(e.target.value)}
            placeholder="เช่น 1aBcDeFgHiJkLmNoPqRsTuVwXyZ"
            className="font-mono text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            Root Folder สำหรับ Consulting Visit — ระบบจะสร้าง sub-folder อัตโนมัติเป็น: ชื่อบริษัท → ปี → เดือน
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5" /> Audit Log Export Folder ID (PDPA)
          </Label>
          <Input
            value={auditLogFolderId}
            onChange={e => setAuditLogFolderId(e.target.value)}
            placeholder="เช่น 1aBcDeFgHiJkLmNoPqRsTuVwXyZ"
            className="font-mono text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            Folder สำหรับ export Audit Log อัตโนมัติ (ข้อมูลเก่า 30 วัน) — แนะนำให้สร้าง Folder แยกเพื่อความปลอดภัย
          </p>
        </div>

        <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="w-4 h-4 mr-1" />
          {saveMutation.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
        </Button>
      </CardContent>
    </Card>
  );
}