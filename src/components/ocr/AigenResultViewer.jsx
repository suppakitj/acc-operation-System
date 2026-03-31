import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Download } from 'lucide-react';
import { toast } from 'sonner';

function flattenValue(obj) {
  if (obj === null || obj === undefined) return '';
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
  if (obj.value !== undefined) return String(obj.value);
  return JSON.stringify(obj);
}

function renderKeyValue(data, excludeKeys = ['bboxes', 'bboxes_norm', 'bbox_norm', 'char_pos_norm', 'confidence', 'status', 'request_id', 'error', 'response_id']) {
  if (!data || typeof data !== 'object') return null;
  const entries = Object.entries(data).filter(([k]) => !excludeKeys.includes(k));
  if (entries.length === 0) return null;

  return (
    <div className="space-y-1">
      {entries.map(([key, val]) => {
        if (val && typeof val === 'object' && !Array.isArray(val) && val.value !== undefined) {
          return (
            <div key={key} className="flex items-baseline gap-2">
              <span className="text-[11px] text-muted-foreground font-medium min-w-[120px] shrink-0">{key}:</span>
              <span className="text-sm font-medium">{flattenValue(val)}</span>
              {val.confidence !== undefined && (
                <Badge variant="outline" className="text-[8px] ml-1">{(val.confidence * 100).toFixed(1)}%</Badge>
              )}
            </div>
          );
        }
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
          return null; // Handled as table below
        }
        const display = flattenValue(val);
        if (!display || display === '{}' || display === '[]') return null;
        return (
          <div key={key} className="flex items-baseline gap-2">
            <span className="text-[11px] text-muted-foreground font-medium min-w-[120px] shrink-0">{key}:</span>
            <span className="text-sm">{display}</span>
          </div>
        );
      })}
    </div>
  );
}

function renderTable(tableData) {
  if (!Array.isArray(tableData) || tableData.length === 0) return null;
  
  // Detect columns from first row
  const allKeys = new Set();
  tableData.forEach(row => {
    if (row && typeof row === 'object') {
      Object.keys(row).forEach(k => {
        if (!['bboxes', 'bboxes_norm', 'bbox_norm', 'row_conf'].includes(k)) allKeys.add(k);
      });
    }
  });
  const cols = Array.from(allKeys);
  if (cols.length === 0) return null;

  return (
    <div className="overflow-x-auto mt-2">
      <table className="w-full text-xs border">
        <thead>
          <tr className="bg-muted/50">
            <th className="px-2 py-1.5 text-left font-semibold border-r">#</th>
            {cols.map(c => (
              <th key={c} className="px-2 py-1.5 text-left font-semibold border-r">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.map((row, i) => (
            <tr key={i} className="border-t hover:bg-muted/30">
              <td className="px-2 py-1 border-r text-muted-foreground">{i + 1}</td>
              {cols.map(c => (
                <td key={c} className="px-2 py-1 border-r">{flattenValue(row[c])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AigenResultViewer({ open, onOpenChange, job }) {
  const result = job?.aigen_result;
  if (!result) return null;

  const dataArray = result.data || [];
  const docType = job.aigen_doc_type || 'general-ocr';

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    toast.success('คัดลอก JSON แล้ว');
  };

  const handleExportCsv = () => {
    const excludeMeta = ['bboxes', 'bboxes_norm', 'row_conf', 'bbox_norm', 'char_pos_norm', 'confidence', 'status', 'request_id', 'error', 'response_id'];

    // 1. Try table data (bank-statement, invoice, etc.) — merge all pages
    let allTableRows = [];
    for (const page of dataArray) {
      if (page?.table && Array.isArray(page.table) && page.table.length > 0) {
        allTableRows.push(...page.table);
      }
    }

    // 2. For table-extraction format
    if (allTableRows.length === 0 && result.result) {
      for (const pageResult of (result.result || [])) {
        if (!Array.isArray(pageResult)) continue;
        for (const table of pageResult) {
          if (!table?.cells) continue;
          const rows = {};
          table.cells.forEach(c => {
            if (!rows[c.row]) rows[c.row] = {};
            rows[c.row][`Col ${c.column}`] = c.text;
          });
          allTableRows.push(...Object.values(rows));
        }
      }
    }

    if (allTableRows.length > 0) {
      // Export table-style CSV
      const allKeys = new Set();
      allTableRows.forEach(row => Object.keys(row).forEach(k => {
        if (!excludeMeta.includes(k)) allKeys.add(k);
      }));
      const cols = Array.from(allKeys);
      const bom = '\uFEFF';
      const header = cols.join(',');
      const csvRows = allTableRows.map(row => cols.map(c => `"${flattenValue(row[c]).replace(/"/g, '""')}"`).join(','));
      downloadCsv(bom + header + '\n' + csvRows.join('\n'), `${job.filename}_aigen_result.csv`);
      return;
    }

    // 3. For general-ocr / text-based results — export key-value + text per page
    const textPages = dataArray.filter(p => p?.text_page || p?.text);
    if (textPages.length > 0) {
      const bom = '\uFEFF';
      const header = 'page,text';
      const csvRows = textPages.map((p, i) => {
        const pageNum = p._page || p.page || i + 1;
        const text = (p.text_page || p.text || '').replace(/"/g, '""');
        return `${pageNum},"${text}"`;
      });
      downloadCsv(bom + header + '\n' + csvRows.join('\n'), `${job.filename}_aigen_result.csv`);
      return;
    }

    // 4. Fallback: export all key-value fields per page
    if (dataArray.length > 0) {
      const allKeys = new Set(['page']);
      dataArray.forEach(page => {
        Object.keys(page).forEach(k => {
          if (!excludeMeta.includes(k) && !Array.isArray(page[k])) allKeys.add(k);
        });
      });
      const cols = Array.from(allKeys);
      const bom = '\uFEFF';
      const header = cols.join(',');
      const csvRows = dataArray.map((page, i) => {
        return cols.map(c => {
          if (c === 'page') return page._page || page.page || i + 1;
          return `"${flattenValue(page[c]).replace(/"/g, '""')}"`;
        }).join(',');
      });
      downloadCsv(bom + header + '\n' + csvRows.join('\n'), `${job.filename}_aigen_result.csv`);
      return;
    }

    toast.error('ไม่พบข้อมูลสำหรับ export');
  };

  const downloadCsv = (csvContent, filename) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV สำเร็จ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            ผลลัพธ์ AiGen — {job.filename}
            <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-300">{docType}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" className="text-xs gap-1" onClick={handleCopyJson}>
            <Copy className="w-3 h-3" /> Copy JSON
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1" onClick={handleExportCsv}>
            <Download className="w-3 h-3" /> Export CSV
          </Button>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-4 pr-2">
            {dataArray.map((page, idx) => (
              <div key={idx}>
                {dataArray.length > 1 && (
                  <p className="text-xs font-semibold text-muted-foreground mb-1">หน้า {page.page || idx + 1}</p>
                )}

                {/* Key-value fields */}
                {renderKeyValue(page)}

                {/* Text content for general OCR */}
                {page.text_page && (
                  <div className="mt-2 bg-muted/30 rounded-lg p-3 text-sm whitespace-pre-wrap font-mono">
                    {page.text_page}
                  </div>
                )}

                {/* Table data (bank statement, invoice, etc.) */}
                {page.table && renderTable(page.table)}
              </div>
            ))}

            {/* Table extraction format */}
            {result.result && Array.isArray(result.result) && result.result.map((pageResult, pi) => (
              <div key={`te-${pi}`}>
                {Array.isArray(pageResult) && pageResult.map((table, ti) => {
                  if (!table?.cells) return null;
                  // Convert cells to table format
                  const rows = {};
                  table.cells.forEach(c => {
                    if (!rows[c.row]) rows[c.row] = {};
                    rows[c.row][`Col ${c.column}`] = c.text;
                  });
                  return (
                    <div key={ti}>
                      <p className="text-xs text-muted-foreground mb-1">ตาราง {ti + 1} ({table.n_row}×{table.n_column})</p>
                      {renderTable(Object.values(rows))}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Fallback: show raw JSON if nothing rendered */}
            {dataArray.length === 0 && !result.result && (
              <pre className="text-xs bg-muted/30 rounded-lg p-3 whitespace-pre-wrap overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}