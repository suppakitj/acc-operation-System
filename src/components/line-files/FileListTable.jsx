import React from 'react';
import { Folder, FileText, Image, Film, Music, File, Download, Loader2, FolderArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

function getFileIcon(file) {
  if (file.isFolder) return <Folder className="w-5 h-5 text-amber-500 fill-amber-100" />;
  const mime = file.mimeType || '';
  if (mime.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />;
  if (mime.startsWith('video/')) return <Film className="w-5 h-5 text-purple-500" />;
  if (mime.startsWith('audio/')) return <Music className="w-5 h-5 text-green-500" />;
  if (mime.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
  if (mime.includes('spreadsheet') || mime.includes('excel')) return <FileText className="w-5 h-5 text-emerald-500" />;
  if (mime.includes('document') || mime.includes('word')) return <FileText className="w-5 h-5 text-blue-600" />;
  return <File className="w-5 h-5 text-muted-foreground" />;
}

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileListTable({ files, onFolderClick, onDownload, downloadingId, onDownloadFolder, zippingFolderId }) {
  if (!files || files.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Folder className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm">โฟลเดอร์ว่าง</p>
      </div>
    );
  }

  // Sort: folders first, then files
  const sorted = [...files].sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground text-xs">
            <th className="text-left py-2.5 px-3 font-medium">ชื่อ</th>
            <th className="text-left py-2.5 px-3 font-medium hidden md:table-cell">แก้ไขล่าสุด</th>
            <th className="text-right py-2.5 px-3 font-medium hidden md:table-cell">ขนาด</th>
            <th className="text-right py-2.5 px-3 font-medium w-24"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(file => (
            <tr
              key={file.id}
              className={`border-b last:border-b-0 hover:bg-muted/50 transition-colors ${file.isFolder ? 'cursor-pointer' : ''}`}
              onClick={() => file.isFolder && onFolderClick(file.id, file.name)}
            >
              <td className="py-2.5 px-3">
                <div className="flex items-center gap-2.5">
                  {getFileIcon(file)}
                  <span className={`truncate max-w-[300px] ${file.isFolder ? 'font-medium' : ''}`}>
                    {file.name}
                  </span>
                </div>
              </td>
              <td className="py-2.5 px-3 text-muted-foreground text-xs hidden md:table-cell">
                {file.modifiedTime ? format(new Date(file.modifiedTime), 'dd/MM/yyyy HH:mm') : '—'}
              </td>
              <td className="py-2.5 px-3 text-right text-muted-foreground text-xs hidden md:table-cell">
                {file.isFolder ? '—' : formatSize(file.size)}
              </td>
              <td className="py-2.5 px-3 text-right">
                {file.isFolder ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onDownloadFolder?.(file.id); }}
                    disabled={zippingFolderId === file.id}
                    className="text-xs gap-1 h-7"
                    title="ดาวน์โหลด folder เป็น .zip"
                  >
                    {zippingFolderId === file.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FolderArchive className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">.zip</span>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onDownload(file); }}
                    disabled={downloadingId === file.id}
                    className="text-xs gap-1 h-7"
                  >
                    {downloadingId === file.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}