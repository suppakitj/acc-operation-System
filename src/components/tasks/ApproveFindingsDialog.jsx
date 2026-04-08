import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { toast } from 'sonner';

const SEVERITY_CONFIG = {
  critical: { label: 'ร้ายแรง', emoji: '🔴', color: 'text-red-700 bg-red-50' },
  medium: { label: 'ปานกลาง', emoji: '🟡', color: 'text-yellow-700 bg-yellow-50' },
  low: { label: 'เล็กน้อย', emoji: '🟢', color: 'text-green-700 bg-green-50' },
};

const ROLE_LABEL = { accounting: 'บัญชี', owner: 'เจ้าของกิจการ', manager: 'ผู้จัดการ', general: 'ทั่วไป' };

export default function ApproveFindingsDialog({ open, onOpenChange, task, customer, onApproveOnly, onApproveAndSend }) {
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [selectedLineGroup, setSelectedLineGroup] = useState('');
  const [approveNote, setApproveNote] = useState('');
  const [sending, setSending] = useState(false);

  // Fetch LINE groups for this customer
  const { data: lineGroups = [] } = useQuery({
    queryKey: ['lineGroups', customer?.id],
    queryFn: () => base44.entities.LineGroup.filter({ customer_id: customer?.id, status: 'active' }),
    enabled: !!customer?.id && open,
    staleTime: 60_000,
  });

  // Build contact email list
  const contactEmails = React.useMemo(() => {
    if (!customer) return [];
    const emails = [...(customer.contact_emails || [])];
    if (customer.contact_email && !emails.find(e => e.email === customer.contact_email)) {
      emails.unshift({ name: customer.contact_person || 'ผู้ติดต่อ', email: customer.contact_email, role: 'general' });
    }
    return emails;
  }, [customer]);

  // Build LINE group list with backward compat
  const allLineGroups = React.useMemo(() => {
    const groups = [...lineGroups];
    if (customer?.line_group_id && !groups.find(g => g.group_id === customer.line_group_id)) {
      groups.unshift({ group_name: (customer.company_name || '') + ' (เดิม)', group_id: customer.line_group_id });
    }
    return groups;
  }, [lineGroups, customer]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedEmails(contactEmails.map(e => e.email));
      setSelectedLineGroup('');
      setApproveNote('');
    }
  }, [open, contactEmails]);

  if (!task) return null;
  const findings = task.findings || [];

  const handleApproveAndSend = async () => {
    setSending(true);
    try {
      await onApproveAndSend({
        selectedEmails,
        selectedLineGroup: selectedLineGroup === '_none' ? '' : selectedLineGroup,
        approveNote,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">✅ Approve & ส่งสรุปผลตรวจสอบ</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Task info */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-semibold">{task.title}</p>
            <p className="text-xs text-muted-foreground">🏢 {task.customer_name} — 👤 {task.assigned_name}</p>
          </div>

          {/* Findings Preview */}
          <div>
            <Label className="text-xs font-semibold mb-2 block">📝 Findings ({findings.length} รายการ)</Label>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {findings.map((f, i) => {
                const sev = SEVERITY_CONFIG[f.severity] || SEVERITY_CONFIG.medium;
                return (
                  <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg bg-card border">
                    <Badge variant="outline" className={`text-[9px] px-1.5 shrink-0 ${sev.color}`}>
                      {sev.emoji} {sev.label}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{f.title}</span>
                      {f.recommendation && <span className="text-blue-600 ml-1">— 💡 {f.recommendation}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Select Emails */}
          <div>
            <Label className="text-xs font-semibold mb-2 block">📧 ส่ง Email ให้ (เลือกได้หลายคน)</Label>
            {contactEmails.length === 0 ? (
              <p className="text-xs text-muted-foreground">ไม่มี email ในข้อมูลลูกค้า — ข้ามได้</p>
            ) : (
              <div className="space-y-1.5">
                {contactEmails.map((ce, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50">
                    <Checkbox
                      checked={selectedEmails.includes(ce.email)}
                      onCheckedChange={(checked) => {
                        setSelectedEmails(prev => checked ? [...prev, ce.email] : prev.filter(e => e !== ce.email));
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium">{ce.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">{ce.email}</span>
                    </div>
                    <Badge variant="secondary" className="text-[9px]">{ROLE_LABEL[ce.role] || ce.role || 'ทั่วไป'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Select LINE Group */}
          <div>
            <Label className="text-xs font-semibold mb-2 block">💬 ส่ง LINE ไปกลุ่ม</Label>
            {allLineGroups.length === 0 ? (
              <p className="text-xs text-muted-foreground">ไม่มี LINE group ในข้อมูลลูกค้า — ข้ามได้</p>
            ) : (
              <Select value={selectedLineGroup} onValueChange={setSelectedLineGroup}>
                <SelectTrigger className="text-xs h-8"><SelectValue placeholder="เลือก LINE group (ไม่เลือก = ไม่ส่ง)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">ไม่ส่ง LINE</SelectItem>
                  {allLineGroups.map((lg, idx) => (
                    <SelectItem key={idx} value={lg.group_id} className="text-xs">{lg.group_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Additional note */}
          <div>
            <Label className="text-xs font-semibold mb-1 block">💬 ข้อความเพิ่มเติม (optional)</Label>
            <Textarea value={approveNote} onChange={e => setApproveNote(e.target.value)} placeholder="ข้อความเพิ่มเติมที่จะส่งให้ลูกค้า..." rows={2} className="text-xs" />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2 border-t">
            <Button className="flex-1 gap-1.5" onClick={handleApproveAndSend} disabled={sending}>
              {sending ? 'กำลังส่ง...' : '✅ Approve & ส่งสรุป'}
            </Button>
            <Button variant="outline" className="gap-1.5" onClick={onApproveOnly}>
              Approve ไม่ส่ง
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}