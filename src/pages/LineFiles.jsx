import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, HardDrive, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import FileBreadcrumb from '../components/line-files/FileBreadcrumb';
import FileListTable from '../components/line-files/FileListTable';
import LineFileStats from '../components/line-files/LineFileStats';

export default function LineFiles() {
  const [folderStack, setFolderStack] = useState([]); // [{id, name}, ...]
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [zipping, setZipping] = useState(null); // folder id being zipped
  const [selectedIds, setSelectedIds] = useState([]);
  const [zippingMulti, setZippingMulti] = useState(false);
  const [failedIds, setFailedIds] = useState(new Set());

  const currentKey = currentFolderId || 'root';

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['line-drive-files', currentKey],
    queryFn: async () => {
      const params = currentFolderId ? { action: 'list', folder_id: currentFolderId } : { action: 'list' };
      const res = await base44.functions.invoke('browseLineDrive', params);
      return res.data;
    },
  });

  const files = data?.files || [];

  const rootName = data?.root_name || 'LINE Files';
  const breadcrumb = [
    { id: null, name: rootName },
    ...folderStack,
  ];

  const handleFolderClick = (folderId, folderName) => {
    setFolderStack(prev => [...prev, { id: folderId, name: folderName }]);
    setCurrentFolderId(folderId);
    setSelectedIds([]);
  };

  const handleBreadcrumbNav = (folderId) => {
    if (!folderId) {
      // Go to root
      setFolderStack([]);
      setCurrentFolderId(null);
    } else {
      const idx = folderStack.findIndex(f => f.id === folderId);
      if (idx >= 0) {
        setFolderStack(prev => prev.slice(0, idx + 1));
        setCurrentFolderId(folderId);
      }
    }
  };

  const handleBack = () => {
    if (folderStack.length > 0) {
      const newStack = folderStack.slice(0, -1);
      setFolderStack(newStack);
      setCurrentFolderId(newStack.length > 0 ? newStack[newStack.length - 1].id : null);
    }
  };

  const handleDownload = async (file) => {
    setDownloadingId(file.id);
    // Clear previous fail status on retry
    setFailedIds(prev => { const next = new Set(prev); next.delete(file.id); return next; });

    const res = await base44.functions.invoke('browseLineDrive', { action: 'download', file_id: file.id });
    const info = res.data;

    if (info.error) {
      toast.error(`${file.name}: ${info.error}`);
      setFailedIds(prev => new Set(prev).add(file.id));
      setDownloadingId(null);
      return;
    }

    // Download file using access token
    const downloadRes = await fetch(info.downloadUrl, {
      headers: { Authorization: `Bearer ${info.accessToken}` },
    });

    if (!downloadRes.ok) {
      toast.error(`${file.name}: ไม่สามารถดาวน์โหลดได้ (${downloadRes.status})`);
      setFailedIds(prev => new Set(prev).add(file.id));
      setDownloadingId(null);
      return;
    }

    const blob = await downloadRes.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = info.name || file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadingId(null);
    toast.success(`ดาวน์โหลด ${file.name} สำเร็จ`);
  };

  const handleDownloadSelected = async () => {
    if (selectedIds.length === 0) return;
    // Single file → direct download
    if (selectedIds.length === 1) {
      const file = files.find(f => f.id === selectedIds[0]);
      if (file) { handleDownload(file); setSelectedIds([]); }
      return;
    }
    // Multiple files → zip
    setZippingMulti(true);
    toast.info(`กำลังรวม ${selectedIds.length} ไฟล์เป็น .zip...`);
    const res = await base44.functions.invoke('downloadMultipleFiles', { file_ids: selectedIds });
    setZippingMulti(false);
    if (res.data?.error) { toast.error(res.data.error); return; }
    if (res.data?.file_url) {
      const a = document.createElement('a');
      a.href = res.data.file_url;
      a.download = res.data.file_name || 'selected_files.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`ดาวน์โหลด ${res.data.file_count} ไฟล์สำเร็จ (${res.data.total_size_mb} MB)`);
      setSelectedIds([]);
    }
  };

  const handleDownloadFolder = async (folderId) => {
    if (!folderId) { toast.error('ไม่พบ folder ID'); return; }
    setZipping(folderId);
    toast.info('กำลังรวมไฟล์เป็น .zip — อาจใช้เวลาสักครู่...');
    const res = await base44.functions.invoke('downloadFolderZip', { folder_id: folderId });
    setZipping(null);
    if (res.data?.error) {
      toast.error(res.data.error);
      return;
    }
    if (res.data?.file_url) {
      const a = document.createElement('a');
      a.href = res.data.file_url;
      a.download = res.data.file_name || 'folder.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`ดาวน์โหลด ${res.data.file_name} สำเร็จ (${res.data.file_count} ไฟล์, ${res.data.total_size_mb} MB)`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <HardDrive className="w-6 h-6" /> LINE Files
          </h1>
          <p className="text-sm text-muted-foreground">ไฟล์ที่บันทึกจาก LINE Chat อัตโนมัติใน Google Drive</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-1" /> รีเฟรช
        </Button>
      </div>

      <LineFileStats />

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center gap-3">
            {folderStack.length > 0 && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <FileBreadcrumb path={breadcrumb} onNavigate={handleBreadcrumbNav} />
            {selectedIds.length > 0 && (
              <div className="ml-auto shrink-0">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleDownloadSelected}
                  disabled={zippingMulti}
                  className="text-xs gap-1.5"
                >
                  {zippingMulti ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  {zippingMulti ? 'กำลังสร้าง zip...' : `ดาวน์โหลด ${selectedIds.length} ไฟล์`}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">กำลังโหลด...</span>
            </div>
          ) : data?.error ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">{data.error}</p>
              <p className="text-xs mt-1">กรุณาตรวจสอบการเชื่อมต่อ Google Drive</p>
            </div>
          ) : (
            <FileListTable
              files={files}
              onFolderClick={handleFolderClick}
              onDownload={handleDownload}
              downloadingId={downloadingId}
              onDownloadFolder={handleDownloadFolder}
              zippingFolderId={zipping}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              failedIds={failedIds}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}