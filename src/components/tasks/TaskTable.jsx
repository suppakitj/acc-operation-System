import React, { useState, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { format, differenceInDays } from 'date-fns';
import { Check, X } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { parseUTCDate } from '@/lib/dateUtils';

const PRIORITY_DOT = { low: 'bg-gray-400', medium: 'bg-blue-500', high: 'bg-orange-500', urgent: 'bg-red-500' };
const PRIORITY_LABEL = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
const STATUS_STYLES = {
  pending: 'bg-gray-100 text-gray-600 border-gray-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  review: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
};
const STATUS_LABELS = { pending: 'Pending', in_progress: 'In Progress', review: 'Waiting', completed: 'Completed', cancelled: 'Cancelled' };
const SVC_STYLES = {
  accounting: 'bg-green-100 text-green-700', payroll: 'bg-blue-100 text-blue-700',
  tax_consulting: 'bg-purple-100 text-purple-700', audit: 'bg-orange-100 text-orange-700',
  peak_licensing: 'bg-yellow-100 text-yellow-700',
};
const SVC_LABELS = { accounting: 'Accounting', payroll: 'Payroll', tax_consulting: 'Tax', audit: 'Audit', peak_licensing: 'Peak' };

export default function TaskTable({ tasks, selected, setSelected, onRowClick, sortField, sortDir, onSort, users = [], isReviewer = false, onApprove, onReject }) {
  const { t } = useLanguage();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const allSelected = tasks.length > 0 && selected.length === tasks.length;

  const [colWidths, setColWidths] = useState({});
  const resizing = useRef(null);

  const onMouseDown = useCallback((e, colKey) => {
    e.preventDefault();
    e.stopPropagation();
    const th = e.target.closest('th');
    const startX = e.clientX;
    const startW = th.offsetWidth;
    resizing.current = { colKey, startX, startW };

    const onMouseMove = (ev) => {
      const diff = ev.clientX - resizing.current.startX;
      const newW = Math.max(60, resizing.current.startW + diff);
      setColWidths(prev => ({ ...prev, [resizing.current.colKey]: newW }));
    };
    const onMouseUp = () => {
      resizing.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  const toggleAll = () => setSelected(allSelected ? [] : tasks.map(t => t.id));
  const toggleOne = (id) => setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleSort = (field) => {
    if (sortField === field) onSort(field, sortDir === 'asc' ? 'desc' : 'asc');
    else onSort(field, 'asc');
  };

  const ResizeHandle = ({ colKey }) => (
    <div
      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 z-10"
      onMouseDown={(e) => onMouseDown(e, colKey)}
    />
  );

  const SortHeader = ({ field, children, className = '', colKey }) => (
    <th className={`px-2 py-2 text-[10px] md:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground select-none relative ${className}`}
      style={colWidths[colKey || field] ? { width: colWidths[colKey || field], minWidth: colWidths[colKey || field] } : undefined}
      onClick={() => handleSort(field)}>
      {children} {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}
      <ResizeHandle colKey={colKey || field} />
    </th>
  );

  return (
    <div className="overflow-x-auto border rounded-lg bg-card">
      <table className="w-full text-left" style={{ tableLayout: Object.keys(colWidths).length > 0 ? 'fixed' : 'auto' }}>
        <thead className="border-b bg-muted/30">
          <tr>
            <th className="w-10 px-2 py-2"><Checkbox checked={allSelected} onCheckedChange={toggleAll} /></th>
            <SortHeader field="title" colKey="task" className="min-w-[120px]">TASK</SortHeader>
            <SortHeader field="customer_name" colKey="client" className="min-w-[130px] hidden md:table-cell">CLIENT</SortHeader>

            <SortHeader field="assigned_name" colKey="owner" className="hidden lg:table-cell">OWNER</SortHeader>
            <SortHeader field="due_date" colKey="due" className="min-w-[90px]">DUE</SortHeader>
            <SortHeader field="due_date_change_count" colKey="dueChanges" className="hidden lg:table-cell min-w-[50px]">เลื่อน</SortHeader>
            <th className="px-2 py-2 text-[10px] md:text-[11px] font-semibold text-muted-foreground uppercase hidden sm:table-cell relative"
              style={colWidths['priority'] ? { width: colWidths['priority'], minWidth: colWidths['priority'] } : undefined}>
              PRIORITY
              <ResizeHandle colKey="priority" />
            </th>
            <SortHeader field="status" colKey="status" className="min-w-[90px]">STATUS</SortHeader>
            <th className="px-2 py-2 text-[10px] md:text-[11px] font-semibold text-muted-foreground uppercase hidden xl:table-cell relative"
              style={colWidths['period'] ? { width: colWidths['period'], minWidth: colWidths['period'] } : undefined}>
              PERIOD
              <ResizeHandle colKey="period" />
            </th>
            <th className="px-2 py-2 text-[10px] md:text-[11px] font-semibold text-muted-foreground uppercase hidden xl:table-cell relative"
              style={colWidths['type'] ? { width: colWidths['type'], minWidth: colWidths['type'] } : undefined}>
              TYPE
              <ResizeHandle colKey="type" />
            </th>
            <SortHeader field="updated_date" colKey="updated" className="hidden lg:table-cell">UPDATED</SortHeader>
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 ? (
            <tr><td colSpan={11} className="text-center py-12 text-sm text-muted-foreground">{t('no_data')}</td></tr>
          ) : tasks.map(task => {
            // งาน review → ใช้ review_deadline แทน due_date สำหรับ overdue
            const effectiveDue = task.status === 'review'
              ? (task.review_deadline || null)
              : task.due_date;
            const isOverdue = effectiveDue && task.status !== 'completed' && task.status !== 'cancelled' && new Date(effectiveDue) < todayStart;
            const daysLate = isOverdue ? differenceInDays(todayStart, new Date(effectiveDue)) : 0;
            return (
              <tr key={task.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer group"
                onClick={() => onRowClick(task)}>
                <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
                  <Checkbox checked={selected.includes(task.id)} onCheckedChange={() => toggleOne(task.id)} />
                </td>
                <td className="px-2 py-2.5">
                  <div className="flex items-start gap-2">
                    {isOverdue && <div className="w-1 h-8 bg-red-400 rounded-full shrink-0 mt-0.5" />}
                    <div className="min-w-0">
                      <p className="text-xs md:text-sm font-semibold text-primary truncate">{task.title}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">TSK-{String(task.id).slice(-4).toUpperCase()}</span>
                        {isOverdue && <span className="text-[10px] font-medium text-red-600">{daysLate}d LATE</span>}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-2.5 hidden md:table-cell">
                  <p className="text-xs truncate max-w-[140px]">{task.customer_name || '-'}</p>
                </td>

                <td className="px-2 py-2.5 hidden lg:table-cell">
                  <p className="text-xs">{(() => {
                    const u = users.find(u => u.email === task.assigned_to);
                    return u?.initials || u?.nickname || task.assigned_name || '-';
                  })()}</p>
                </td>
                <td className="px-2 py-2.5">
                  <p className={`text-xs font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                    {task.due_date ? format(new Date(task.due_date), 'dd MMM yy') : '-'}

                  </p>
                </td>
                <td className="px-2 py-2.5 hidden lg:table-cell">
                  {(task.due_date_change_count || 0) > 0 ? (
                    <Badge variant="outline" className={`text-[10px] ${task.due_date_change_count >= 3 ? 'bg-red-50 text-red-700 border-red-300' : 'bg-amber-50 text-amber-700 border-amber-300'}`}>
                      {task.due_date_change_count}x
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-2 py-2.5 hidden sm:table-cell">
                  {task.priority && (
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority] || ''}`} />
                      <span className="text-xs">{PRIORITY_LABEL[task.priority]}</span>
                    </div>
                  )}
                </td>
                <td className="px-2 py-2.5" onClick={e => { if (task.status === 'review' && isReviewer) e.stopPropagation(); }}>
                  <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[task.status] || ''}`}>
                    {STATUS_LABELS[task.status] || task.status}
                  </Badge>
                  {/* Reviewer approve/reject buttons */}
                  {task.status === 'review' && isReviewer && onApprove && (
                    <div className="flex gap-1 mt-1.5">
                      <Button size="sm" className="h-6 px-2 text-[10px] gap-1 bg-green-600 hover:bg-green-700"
                        onClick={(e) => { e.stopPropagation(); onApprove(task.id); }}>
                        <Check className="w-3 h-3" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] gap-1 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={(e) => { e.stopPropagation(); onReject(task.id); }}>
                        <X className="w-3 h-3" /> ส่งกลับ
                      </Button>
                    </div>
                  )}
                  {/* Review deadline badge for reviewer */}
                  {task.status === 'review' && isReviewer && task.review_deadline && (
                    <p className="text-[9px] text-purple-600 mt-1">
                      ⏰ กำหนดตรวจ: {format(new Date(task.review_deadline + 'T00:00:00'), 'd MMM yy')}
                    </p>
                  )}
                  {/* Staff sees waiting badge */}
                  {task.status === 'review' && !isReviewer && (
                    <Badge variant="outline" className="text-[9px] mt-1 bg-purple-50 text-purple-700 border-purple-200">
                      🔍 รอหัวหน้าตรวจ{task.review_deadline ? ` (ภายใน ${format(new Date(task.review_deadline + 'T00:00:00'), 'd MMM')})` : ''}
                    </Badge>
                  )}
                  {/* Reject note */}
                  {task.review_status === 'rejected' && task.review_note && (
                    <div className="mt-1 p-1 bg-red-50 border border-red-200 rounded">
                      <p className="text-[9px] text-red-700 leading-tight">⚠️ {task.reviewer_name}: {task.review_note}</p>
                    </div>
                  )}
                  {/* Checklist progress */}
                  {task.checklist && task.checklist.length > 0 && (() => {
                    const checked = task.checklist.filter(c => c.checked).length;
                    return (
                      <div className="flex items-center gap-1 mt-1">
                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${checked === task.checklist.length ? 'bg-green-500' : 'bg-amber-500'}`}
                            style={{ width: `${(checked / task.checklist.length) * 100}%` }} />
                        </div>
                        <span className="text-[9px] text-muted-foreground">{checked}/{task.checklist.length}</span>
                      </div>
                    );
                  })()}
                </td>
                <td className="px-2 py-2.5 hidden xl:table-cell">
                  <span className="text-[11px] text-muted-foreground">
                    {task.due_date ? format(new Date(task.due_date), 'yyyy-MM') : '-'}
                  </span>
                </td>
                <td className="px-2 py-2.5 hidden xl:table-cell">
                  {task.is_recurring ? (
                    <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-600 border-orange-200">Recurring</Badge>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Manual</span>
                  )}
                </td>
                <td className="px-2 py-2.5 hidden lg:table-cell">
                  <span className="text-[11px] text-muted-foreground">
                    {task.updated_date ? format(parseUTCDate(task.updated_date), 'dd MMM HH:mm') : '-'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}