import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HardDrive, Save, FolderOpen, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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

  useEffect(() => {
    setUploadFolderId(getVal('gdrive_upload_folder_id'));
    setOutputFolderId(getVal('gdrive_output_folder_id'));
  }, [configs]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const items = [
        { key: 'gdrive_upload_folder_id', value: uploadFolderId, description: 'Google Drive Folder ID สำหรับรับไฟล์ที่ upload' },
        { key: 'gdrive_output_folder_id', value: outputFolderId, description: 'Google Drive Folder ID สำหรับเก็บผลลัพธ์จาก Manus' },
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

        <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="w-4 h-4 mr-1" />
          {saveMutation.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
        </Button>
      </CardContent>
    </Card>
  );
}