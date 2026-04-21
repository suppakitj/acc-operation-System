import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format, addDays } from 'date-fns';
import { AlertTriangle, Calendar } from 'lucide-react';

const SEVERITY_OPTIONS = [
  { value: 'minor', label: 'Minor', weight: 0.5, hint: 'Typo / Format — แก้ไม่เกิน 30 นาที', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'major', label: 'Major', weight: 1.0, hint: 'Calculation / Missing doc — ทำใหม่บางส่วน', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 'critical', label: 'Critical', weight: 2.0, hint: 'Wrong entry / Tax position — กระทบ opinion', color: 'bg-red-100 text-red-700 border-red-300' },
];

const CATEGORY_OPTIONS = [
  { value: 'typo_format', label: 'Typo / Format / Reference', defaultSeverity: 'minor' },
  { value: 'missing_document', label: 'Missing document', defaultSeverity: 'major' },
  { value: 'calculation_error', label: 'Calculation error', defaultSeverity: 'major' },
  { value: 'wrong_entry', label: 'Wrong entry', defaultSeverity: 'critical' },
  { value: 'wrong_standard', label: 'Wrong standard', defaultSeverity: 'critical' },
  { value: 'missing_disclosure', label: 'Missing disclosure', defaultSeverity: 'critical' },
  { value: 'tax_position_error', label: 'Tax position error', defaultSeverity: 'critical' },
  { value: 'client_data_issue', label: 'Client data issue', defaultSeverity: 'major' },
  { value: 'other', label: 'อื่นๆ', defaultSeverity: 'major' },
];

export default function RejectDialog({ open, onOpenChange, task, onConfirm }) {
  const [note, setNote] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [severity, setSeverity] = useState('major');
  const [category, setCategory] = useState('other');

  useEffect(() => {
    if (open && task) {
      setNote('');
      setNewDueDate(format(addDays(new Date(), 2), 'yyyy-MM-dd'));
      // Auto-suggest severity from findings
      const findings = task.findings || [];
      const hasCritical = findings.some(f => f.severity === 'critical');
      const hasMedium = findings.some(f => f.severity === 'medium');
      setSeverity(hasCritical ? 'critical' : hasMedium ? 'major' : 'major');
      setCategory('other');
    }
  }, [open, task]);

  if (!task) return null;

  const handleCategoryChange = (val) => {
    setCategory(val);
    const cat = CATEGORY_OPTIONS.find(c => c.value === val);
    if (cat) setSeverity(cat.defaultSeverity);
  };

  const currentWeight = SEVERITY_OPTIONS.find(s => s.value === severity)?.weight || 1.0;
  const priorRejects = (task.submission_cycles || []).filter(c => c.decision === 'rejected').length;
  const currentCycle = (task.submission_cycles || []).filter(c => c.decision !== 'pending').length + 1;

  const handleConfirm = () => {
    onConfirm({ note, newDueDate, severity, category });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700 text-base">
            <AlertTriangle className="w-5 h-5" /> ส่งกลับให้แก้ไข
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Task info */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-sm font-semibold">{task.title}</p>
            <p className="text-xs text-muted-foreground">
              🏢 {task.customer_name || '-'} · 👤 {task.assigned_name || '-'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {task.due_date && (
                <span className="text-[10px] text-muted-foreground">
                  📅 กำหนดเดิม: {format(new Date(task.due_date + 'T00:00:00'), 'd MMM yyyy')}
                </span>
              )}
              <Badge variant="outline" className="text-[9px]">Cycle #{currentCycle}</Badge>
              {priorRejects > 0 && (
                <Badge variant="outline" className="text-[9px] bg-red-50 text-red-700 border-red-200">
                  ส่งกลับ {priorRejects} ครั้ง
                </Badge>
              )}
            </div>
          </div>

          {/* Severity */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">ระดับความรุนแรง</Label>
            <div className="grid grid-cols-3 gap-2">
              {SEVERITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSeverity(opt.value)}
                  className={`rounded-lg border-2 px-2 py-2 text-center transition-all ${
                    severity === opt.value
                      ? opt.color + ' border-current ring-1 ring-current/30'
                      : 'border-muted bg-muted/30 text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <span className="text-xs font-bold block">{opt.label}</span>
                  <span className="text-[10px] block">{opt.weight} pt</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {SEVERITY_OPTIONS.find(s => s.value === severity)?.hint}
            </p>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">ประเภทปัญหา</Label>
            <Select value={category} onValueChange={handleCategoryChange}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map(c => (
                  <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">เหตุผลที่ส่งกลับ *</Label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="เช่น ตัวเลข VAT ยังไม่ตรง กรุณาตรวจสอบใหม่..."
              rows={3}
              className="text-xs"
            />
          </div>

          {/* New due date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> กำหนดส่งใหม่
            </Label>
            <Input
              type="date"
              value={newDueDate}
              onChange={e => setNewDueDate(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-3 border-t mt-2 shrink-0">
          <Button
            className="flex-1 bg-red-600 hover:bg-red-700 gap-1.5"
            onClick={handleConfirm}
            disabled={!note.trim() || !newDueDate}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> ส่งกลับ ({currentWeight} pt)
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}