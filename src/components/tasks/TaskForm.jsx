import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useUserList } from '@/hooks/useUserList';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ClipboardList, AlertTriangle, Camera, Paperclip, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import TaskTimeTracker from '../time-tracking/TaskTimeTracker';
import DueDateChangeHistory from './DueDateChangeHistory';
import { toast } from 'sonner';

export default function TaskForm({ task, onSubmit, isLoading, permissions, currentUser }) {
  const canEditAssignee = permissions?.canEditAssignee !== false;
  const canEditDueDate = permissions ? permissions.canChangeDueDate(task) : true;
  const canEditStatus = permissions ? permissions.canChangeStatus(task) : true;
  const { t } = useLanguage();
  const [form, setForm] = useState({
    title: '', description: '', customer_id: '', customer_name: '',
    service_type: '', assigned_to: '', assigned_name: '', department: '',
    priority: 'medium', status: 'pending', due_date: '', start_date: '',
    checklist: [], findings: [], is_recurring: false, recurring_type: '', template_id: '', ...task,
  });

  const { data: allCustomers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list() });
  const customers = allCustomers.filter(c => c.status === 'active');
  const { data: users = [] } = useUserList();
  const { data: templates = [] } = useQuery({ queryKey: ['taskTemplates'], queryFn: () => base44.entities.TaskTemplate.list() });
  const activeTemplates = templates.filter(t => t.status !== 'inactive');
  const [newCheckItem, setNewCheckItem] = useState('');
  const [showFindingForm, setShowFindingForm] = useState(false);
  const [newFinding, setNewFinding] = useState({ title: '', description: '', severity: 'medium', recommendation: '' });
  const [uploadingFindingIdx, setUploadingFindingIdx] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const addFinding = () => {
    if (!newFinding.title.trim()) return;
    update('findings', [...(form.findings || []), { ...newFinding, id: Date.now(), photos: [] }]);
    setNewFinding({ title: '', description: '', severity: 'medium', recommendation: '' });
    setShowFindingForm(false);
  };

  const removeFinding = (idx) => {
    update('findings', (form.findings || []).filter((_, i) => i !== idx));
  };

  // ── Photo Upload for Findings ──
  const handleFindingFileUpload = async (findingIdx, files) => {
    if (!files || files.length === 0) return;
    setUploadingFindingIdx(findingIdx);
    try {
      const updatedFindings = [...(form.findings || [])];
      const finding = { ...updatedFindings[findingIdx] };
      if (!finding.photos) finding.photos = [];

      for (const file of Array.from(files)) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const res = await base44.functions.invoke('uploadFindingFile', {
          file_url, file_name: file.name, file_size: file.size,
          customer_name: form.customer_name || 'ไม่ระบุลูกค้า',
        });
        if (res.data?.success) {
          finding.photos.push({
            name: res.data.name, drive_url: res.data.drive_url,
            drive_file_id: res.data.drive_file_id, thumbnail_url: res.data.thumbnail_url,
            base44_url: file_url, size: res.data.size || file.size,
          });
          toast.success(`อัปโหลด "${file.name}" สำเร็จ`);
        } else {
          toast.error(res.data?.error || 'อัปโหลดไม่สำเร็จ');
        }
      }
      updatedFindings[findingIdx] = finding;
      update('findings', updatedFindings);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('เกิดข้อผิดพลาดในการอัปโหลด');
    } finally {
      setUploadingFindingIdx(null);
    }
  };

  const removeFindingPhoto = (findingIdx, photoIdx) => {
    const updatedFindings = [...(form.findings || [])];
    const finding = { ...updatedFindings[findingIdx] };
    finding.photos = (finding.photos || []).filter((_, i) => i !== photoIdx);
    updatedFindings[findingIdx] = finding;
    update('findings', updatedFindings);
  };

  const SEVERITY_CONFIG = {
    critical: { label: 'ร้ายแรง', emoji: '🔴', color: 'bg-red-100 text-red-700 border-red-200' },
    medium: { label: 'ปานกลาง', emoji: '🟡', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    low: { label: 'เล็กน้อย', emoji: '🟢', color: 'bg-green-100 text-green-700 border-green-200' },
  };

  const applyTemplate = (templateId) => {
    if (!templateId || templateId === '_none') {
      update('template_id', '');
      return;
    }
    const tmpl = templates.find(t => t.id === templateId);
    if (!tmpl) return;
    // Calculate due date from rule
    const now = new Date();
    const dueDay = tmpl.due_date_rule || 15;
    const dueDate = new Date(now.getFullYear(), now.getMonth(), Math.min(dueDay, 28));
    if (dueDate < now) dueDate.setMonth(dueDate.getMonth() + 1);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    setForm(prev => ({
      ...prev,
      template_id: templateId,
      title: tmpl.name || prev.title,
      service_type: tmpl.service_type || prev.service_type,
      department: tmpl.department || prev.department,
      priority: tmpl.default_priority || prev.priority,
      status: tmpl.default_status || prev.status,
      due_date: dueDateStr,
      is_recurring: true,
      recurring_type: tmpl.recurring_type || prev.recurring_type,
      checklist: tmpl.default_checklist?.map(c => ({ ...c, checked: false })) || prev.checklist,
      description: tmpl.description || prev.description,
    }));
  };

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const addChecklistItem = () => { if (!newCheckItem.trim()) return; update('checklist', [...(form.checklist || []), { item: newCheckItem, checked: false }]); setNewCheckItem(''); };
  const removeChecklistItem = (idx) => update('checklist', form.checklist.filter((_, i) => i !== idx));
  const toggleChecklistItem = (idx) => { const u = [...form.checklist]; u[idx] = { ...u[idx], checked: !u[idx].checked }; update('checklist', u); };

  const services = [
    { value: 'accounting', label: t('service_accounting') }, { value: 'payroll', label: t('service_payroll') },
    { value: 'tax_consulting', label: t('service_tax') }, { value: 'audit', label: t('service_audit') },
    { value: 'peak_licensing', label: t('service_peak') },
  ];

  const departments = [
    { value: 'management', label: t('dept_management') }, { value: 'accounting', label: t('dept_accounting') },
    { value: 'consulting', label: t('dept_consulting') }, { value: 'audit', label: t('dept_audit') },
    { value: 'billing', label: t('dept_billing') }, { value: 'it', label: t('dept_it') },
  ];

  return (
    <div className="space-y-4">
      {/* Template Selector - only for new tasks */}
      {!task && activeTemplates.length > 0 && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-1.5">
          <Label className="flex items-center gap-1.5 text-primary"><ClipboardList className="w-3.5 h-3.5" /> เลือก Task Template (สำหรับงานซ้ำประจำ)</Label>
          <Select value={form.template_id || '_none'} onValueChange={v => applyTemplate(v)}>
            <SelectTrigger className="bg-card"><SelectValue placeholder="เลือก Template..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">— ไม่ใช้ Template —</SelectItem>
              {activeTemplates.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.template_code} — {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.template_id && form.template_id !== '_none' && (
            <p className="text-[10px] text-muted-foreground">Template จะตั้งค่าชื่อ, บริการ, due date, checklist ให้อัตโนมัติ</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 space-y-1.5"><Label>{t('task_name')} *</Label><Input value={form.title} onChange={e => update('title', e.target.value)} /></div>

        <div className="space-y-1.5"><Label>{t('customer')}</Label>
          <SearchableSelect
            value={form.customer_id}
            onValueChange={v => { const c = customers.find(c => c.id === v); setForm(p => ({ ...p, customer_id: v, customer_name: c?.company_name || '' })); }}
            options={customers.map(c => ({ value: c.id, label: c.company_name }))}
            placeholder={t('select_customer')}
          />
        </div>

        <div className="space-y-1.5"><Label>{t('service_type')}</Label>
          <Select value={form.service_type} onValueChange={v => update('service_type', v)}>
            <SelectTrigger><SelectValue placeholder={t('select_service')} /></SelectTrigger>
            <SelectContent>{services.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5"><Label>{t('assigned_to')}</Label>
          <SearchableSelect
            value={form.assigned_to}
            onValueChange={v => { const u = users.find(u => u.email === v); setForm(p => ({ ...p, assigned_to: v, assigned_name: u?.full_name || '' })); }}
            options={users.map(u => ({ value: u.email, label: u.full_name || u.email }))}
            placeholder={t('select_assignee')}
            disabled={!canEditAssignee && !!task}
          />
        </div>

        <div className="space-y-1.5"><Label>{t('department')}</Label>
          <Select value={form.department} onValueChange={v => update('department', v)}>
            <SelectTrigger><SelectValue placeholder={t('select_department')} /></SelectTrigger>
            <SelectContent>{departments.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5"><Label>{t('priority')}</Label>
          <Select value={form.priority} onValueChange={v => update('priority', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">{t('priority_low')}</SelectItem>
              <SelectItem value="medium">{t('priority_medium')}</SelectItem>
              <SelectItem value="high">{t('priority_high')}</SelectItem>
              <SelectItem value="urgent">{t('priority_urgent')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5"><Label>{t('status')}</Label>
          <Select value={form.status} onValueChange={v => update('status', v)} disabled={!canEditStatus && !!task}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">{t('status_pending')}</SelectItem>
              <SelectItem value="in_progress">{t('status_in_progress')}</SelectItem>
              <SelectItem value="review">{t('status_review')}</SelectItem>
              {currentUser?.role !== 'staff' && (
                <SelectItem value="completed">{t('status_completed')}</SelectItem>
              )}
              <SelectItem value="cancelled">{t('status_cancelled')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5"><Label>{t('start_date')}</Label><Input type="date" value={form.start_date} onChange={e => update('start_date', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>{t('due_date')}</Label><Input type="date" value={form.due_date} onChange={e => update('due_date', e.target.value)} disabled={!canEditDueDate && !!task} /></div>
        <div className="md:col-span-2 space-y-1.5"><Label>{t('description')}</Label><Textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} /></div>
      </div>

      <div className="space-y-3">
        <Label>{t('checklist')}</Label>
        <div className="space-y-2">
          {form.checklist?.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <Checkbox checked={item.checked} onCheckedChange={() => toggleChecklistItem(i)} />
              <span className={`text-sm flex-1 ${item.checked ? 'line-through text-muted-foreground' : ''}`}>{item.item}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeChecklistItem(i)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input placeholder={t('add_item')} value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addChecklistItem()} />
            <Button variant="outline" size="icon" onClick={addChecklistItem}><Plus className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>

      {/* ═══ Findings — ปัญหาที่เจอ ═══ */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
            ปัญหาที่เจอ (Findings)
            {(form.findings || []).length > 0 && (
              <span className="text-[10px] text-muted-foreground ml-1">({(form.findings || []).length} รายการ)</span>
            )}
          </Label>
          {!showFindingForm && (
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => setShowFindingForm(true)}>
              <Plus className="w-3 h-3" /> เพิ่มปัญหา
            </Button>
          )}
        </div>

        {(form.findings || []).length > 0 && (() => {
          const counts = { critical: 0, medium: 0, low: 0 };
          (form.findings || []).forEach(f => { if (counts[f.severity] !== undefined) counts[f.severity]++; });
          return (
            <div className="flex gap-2">
              {counts.critical > 0 && <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">🔴 {counts.critical} ร้ายแรง</Badge>}
              {counts.medium > 0 && <Badge variant="outline" className="text-[10px] bg-yellow-50 text-yellow-700 border-yellow-200">🟡 {counts.medium} ปานกลาง</Badge>}
              {counts.low > 0 && <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">🟢 {counts.low} เล็กน้อย</Badge>}
            </div>
          );
        })()}

        {(form.findings || []).map((f, idx) => {
          const sev = SEVERITY_CONFIG[f.severity] || SEVERITY_CONFIG.medium;
          const isUploading = uploadingFindingIdx === idx;
          const photos = f.photos || [];
          return (
            <div key={f.id || idx} className={`rounded-lg border p-3 ${sev.color.split(' ')[0]} border-l-4`}
              style={{ borderLeftColor: f.severity === 'critical' ? '#dc2626' : f.severity === 'medium' ? '#d97706' : '#16a34a' }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${sev.color}`}>{sev.emoji} {sev.label}</Badge>
                    <span className="text-xs font-semibold">{f.title}</span>
                  </div>
                  {f.description && <p className="text-[11px] text-muted-foreground mb-1">{f.description}</p>}
                  {f.recommendation && (
                    <p className="text-[11px] text-blue-700 bg-blue-50 rounded px-2 py-1 mt-1">💡 แนะนำ: {f.recommendation}</p>
                  )}

                  {/* Photo Thumbnails */}
                  {photos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {photos.map((photo, pIdx) => (
                        <div key={pIdx} className="relative group">
                          <a href={photo.drive_url} target="_blank" rel="noopener noreferrer" className="block">
                            <div className="w-16 h-16 rounded-lg border bg-white overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-primary transition-all">
                              {(photo.base44_url || photo.thumbnail_url) ? (
                                <img src={photo.base44_url || photo.thumbnail_url} alt={photo.name} className="w-full h-full object-cover"
                                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                              ) : null}
                              <div className="flex-col items-center justify-center text-muted-foreground" style={{ display: (photo.base44_url || photo.thumbnail_url) ? 'none' : 'flex' }}>
                                <ImageIcon className="w-5 h-5" /><span className="text-[8px] mt-0.5 truncate max-w-[56px]">{photo.name}</span>
                              </div>
                            </div>
                          </a>
                          <button onClick={(e) => { e.preventDefault(); removeFindingPhoto(idx, pIdx); }}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload Buttons */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <Button variant="outline" size="sm" className="text-[10px] h-6 gap-1 px-2" disabled={isUploading}
                      onClick={() => { cameraInputRef.current.dataset.findingIdx = idx; cameraInputRef.current.click(); }}>
                      {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />} ถ่ายรูป
                    </Button>
                    <Button variant="outline" size="sm" className="text-[10px] h-6 gap-1 px-2" disabled={isUploading}
                      onClick={() => { fileInputRef.current.dataset.findingIdx = idx; fileInputRef.current.click(); }}>
                      {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />} แนบไฟล์
                    </Button>
                    {photos.length > 0 && <span className="text-[9px] text-muted-foreground ml-1">📎 {photos.length} ไฟล์</span>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeFinding(idx)}>
                  <Trash2 className="w-3 h-3 text-muted-foreground" />
                </Button>
              </div>
            </div>
          );
        })}

        {/* Hidden file inputs */}
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => { handleFindingFileUpload(parseInt(e.target.dataset.findingIdx), e.target.files); e.target.value = ''; }} />
        <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" multiple className="hidden"
          onChange={(e) => { handleFindingFileUpload(parseInt(e.target.dataset.findingIdx), e.target.files); e.target.value = ''; }} />

        {showFindingForm && (
          <div className="rounded-lg border border-dashed border-orange-300 bg-orange-50/50 p-3 space-y-2">
            <p className="text-xs font-semibold text-orange-700">เพิ่มปัญหาที่เจอ</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="sm:col-span-2">
                <Input value={newFinding.title} onChange={e => setNewFinding(p => ({ ...p, title: e.target.value }))} placeholder="หัวข้อปัญหา เช่น ภาษีซื้อบันทึกผิดงวด" className="text-xs h-8" />
              </div>
              <div className="sm:col-span-2">
                <Textarea value={newFinding.description} onChange={e => setNewFinding(p => ({ ...p, description: e.target.value }))} placeholder="รายละเอียด..." rows={2} className="text-xs" />
              </div>
              <Select value={newFinding.severity} onValueChange={v => setNewFinding(p => ({ ...p, severity: v }))}>
                <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">🔴 ร้ายแรง</SelectItem>
                  <SelectItem value="medium">🟡 ปานกลาง</SelectItem>
                  <SelectItem value="low">🟢 เล็กน้อย</SelectItem>
                </SelectContent>
              </Select>
              <Input value={newFinding.recommendation} onChange={e => setNewFinding(p => ({ ...p, recommendation: e.target.value }))} placeholder="คำแนะนำ เช่น ควรบันทึกในเดือนที่ออกใบกำกับ" className="text-xs h-8" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="text-xs h-7 gap-1" onClick={addFinding} disabled={!newFinding.title.trim()}>
                <Plus className="w-3 h-3" /> เพิ่ม
              </Button>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setShowFindingForm(false); setNewFinding({ title: '', description: '', severity: 'medium', recommendation: '' }); }}>
                ยกเลิก
              </Button>
            </div>
          </div>
        )}

        {(form.findings || []).length === 0 && !showFindingForm && (
          <p className="text-[10px] text-muted-foreground">ยังไม่มี — กด "เพิ่มปัญหา" เมื่อเจอปัญหาระหว่างตรวจ</p>
        )}
      </div>

      {/* Due Date Change History */}
      {task?.id && <DueDateChangeHistory task={task} />}

      {/* Time Tracking — only for existing tasks */}
      {task?.id && currentUser && (
        <TaskTimeTracker task={task} currentUser={currentUser} />
      )}

      <Button onClick={() => onSubmit(form)} disabled={isLoading || !form.title} className="w-full">
        {isLoading ? t('saving') : (task ? t('update') : t('create'))}
      </Button>
    </div>
  );
}