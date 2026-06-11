import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { useUserList } from '@/hooks/useUserList';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Download, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import TaskForm from '../components/tasks/TaskForm';
import TaskStatsRow from '../components/tasks/TaskStatsRow';
import TaskDeptTabs from '../components/tasks/TaskDeptTabs';
import TaskFilters from '../components/tasks/TaskFilters';
import TaskTable from '../components/tasks/TaskTable';
import ApproveFindingsDialog from '../components/tasks/ApproveFindingsDialog';
import RejectDialog from '../components/tasks/RejectDialog';
import TablePagination, { paginateData } from '../components/shared/TablePagination';
import { useLanguage } from '../components/LanguageContext';
import { useAccessControl } from '../components/auth/useAccessControl';
import { buildApprovePayload, buildRejectPayload, buildSubmitForReviewPayload } from '../utils/taskWorkflow';
import DueDateReasonDialog from '../components/tasks/DueDateReasonDialog';

export default function Tasks() {
  const { t } = useLanguage();
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const ac = useAccessControl(currentUser);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selected, setSelected] = useState([]);
  const [sortField, setSortField] = useState('due_date');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  // Approve Dialog state
  const [approveDialog, setApproveDialog] = useState({ open: false, taskId: null, task: null, customer: null });
  const [rejectDialog, setRejectDialog] = useState({ open: false, taskId: null, task: null });
  // Due date reason dialog state
  const [dueDateReasonDialog, setDueDateReasonDialog] = useState({ open: false, data: null, editingTask: null });

  const [filters, setFilters] = useState({
    search: '', department: 'all', status: 'active', priority: 'all',
    owner: 'all', serviceType: 'all', client: 'all', taskType: 'all',
    dateFrom: '', dateTo: '', _count: 0, _total: 0,
  });
  const queryClient = useQueryClient();

  const { data: allTasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 1000),
  });
  // Apply department-based visibility
  const tasks = ac.filterByDepartment(allTasks);
  const { data: allCustomers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list('-created_date', 500), staleTime: 60_000 });
  const { data: allHolidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.HolidayMaster.filter({ status: 'active' }),
    staleTime: 5 * 60_000,
  });
  const customers = allCustomers.filter(c => c.status === 'active');
  const { data: users = [] } = useUserList();

  // ดึง LINE group ID สำหรับแจ้งเตือน
  const { data: lineConfigs = [] } = useQuery({
    queryKey: ['appConfig', 'line_accounting'],
    queryFn: () => base44.entities.AppConfig.list(),
    staleTime: 300_000,
  });
  const getLineConfig = (key) => lineConfigs.find(c => c.key === key)?.value || '';

  // ส่ง LINE ไปกลุ่มบัญชี (non-blocking)
  const sendLineToAccounting = (message) => {
    try {
      const groupId = getLineConfig('line_group_dept_accounting');
      if (!groupId) return;
      base44.functions.invoke('lineSendMessage', {
        line_user_id: groupId,
        message,
        display_name: 'ACC Precision Hub',
        chat_type: 'group',
      }).catch(e => console.warn('LINE send failed:', e.message));
    } catch (e) { console.warn('LINE config error:', e.message); }
  };

  // ── 📢 Tax Status LINE: ส่งแจ้งลูกค้าเมื่อติ๊ก checklist ที่มี 📢 ──
  const sendTaxStatusLine = async (task, oldChecklist, newChecklist) => {
    try {
      // หาข้อ 📢 ที่เพิ่งติ๊กใหม่ (เดิม unchecked → ใหม่ checked)
      const newlyChecked = [];
      (newChecklist || []).forEach((item, idx) => {
        if (!item.checked) return;
        if (!item.item?.startsWith('📢')) return;
        const oldItem = (oldChecklist || [])[idx];
        if (!oldItem || !oldItem.checked) {
          newlyChecked.push(item.item.replace('📢', '').trim());
        }
      });

      if (newlyChecked.length === 0) return;

      // ดึง LINE groups ของลูกค้าที่ receive_tax_status = true
      const customerId = task.customer_id;
      if (!customerId) return;

      const lineGroups = await base44.entities.LineGroup.filter({
        customer_id: customerId,
        receive_tax_status: true,
      });

      if (lineGroups.length === 0) return;

      // สร้างข้อความ
      const customerName = task.customer_name || '';
      const now = new Date();
      const monthNames = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
      const monthYear = `${monthNames[now.getMonth()]} ${now.getFullYear() + 543}`;
      const staffName = currentUser?.full_name || currentUser?.email || '';

      const statusLines = newlyChecked.map(s => `✅ ${s}`).join('\n');
      const message = `📢 อัพเดทสถานะงาน\n━━━━━━━━━━━━━━━━\n🏢 ${customerName}\n📅 ${monthYear}\n\n${statusLines}\n\n👤 ${staffName}\n━━━━━━━━━━━━━━━━\nACC Consulting Co., Ltd.`;

      // ส่งไปทุกกลุ่มที่เปิดรับ
      for (const group of lineGroups) {
        if (!group.group_id) continue;
        base44.functions.invoke('lineSendMessage', {
          line_user_id: group.group_id,
          message,
          display_name: 'ACC Precision Hub',
          chat_type: 'group',
        }).catch(e => console.warn('Tax Status LINE send failed:', e.message));
      }
    } catch (e) {
      console.warn('sendTaxStatusLine error:', e.message);
    }
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); setShowForm(false); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); setShowForm(false); setEditingTask(null); },
  });

  const isReviewer = ['admin', 'management', 'manager', 'super_supervisor'].includes(currentUser?.role);
  const isStaff = currentUser?.role === 'staff';

  const handleApprove = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // เช็ค checklist ครบ
    const checklist = task.checklist || [];
    const checkedCount = checklist.filter(item => item.checked).length;
    if (checklist.length > 0 && checkedCount !== checklist.length) {
      toast.error(`ไม่สามารถ Approve ได้ — checklist ยังไม่ครบ (${checkedCount}/${checklist.length}) กรุณาส่งกลับให้ staff ทำให้ครบก่อน`);
      return;
    }

    // ถ้ามี findings → เปิด dialog ให้เลือก email/LINE ก่อน
    const findings = task.findings || [];
    if (findings.length > 0) {
      const customer = allCustomers.find(c => c.id === task.customer_id);
      setApproveDialog({ open: true, taskId, task, customer });
      return;
    }

    // ไม่มี findings → approve ปกติ
    await doApprove(taskId);
  };

  // Approve จริง (ใช้ทั้งกรณีมี/ไม่มี findings)
  const doApprove = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    const payload = buildApprovePayload(task, currentUser);
    await base44.entities.Task.update(taskId, payload);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    toast.success('✅ Approve เรียบร้อย');

    try {
      const reviewerName = currentUser.full_name || currentUser.email;
      if (task?.assigned_to && task.assigned_to !== currentUser.email) {
        base44.entities.Notification.create({
          title: `✅ งาน Approved: ${task.title}`,
          message: `${reviewerName} approve งาน "${task.title}" เรียบร้อย`,
          type: 'task_completed',
          target_user: task.assigned_to,
          related_entity_type: 'Task',
          related_entity_id: taskId,
          customer_name: task.customer_name || '',
        }).catch(e => console.warn('Approve notification failed:', e.message));
      }
      sendLineToAccounting(
        `✅ งาน Approved\n━━━━━━━━━━━━━━━━\n📄 ${task?.title || ''}\n🏢 ${task?.customer_name || '-'}\n👤 ผู้รับผิดชอบ: ${task?.assigned_name || '-'}\n🔍 Approved โดย: ${reviewerName}\n━━━━━━━━━━━━━━━━`
      );
    } catch (e) { console.warn('Approve notification error:', e.message); }
  };

  // Approve + ส่ง Email/LINE ให้ลูกค้า
  const doApproveAndSend = async ({ selectedEmails, selectedLineGroup, approveNote }) => {
    const { taskId, task, customer } = approveDialog;

    await doApprove(taskId);

    const findings = task.findings || [];
    const reviewerName = currentUser.full_name || currentUser.email;
    const visitDate = task.start_date || task.due_date || format(new Date(), 'yyyy-MM-dd');

    // ส่ง Email
    if (selectedEmails.length > 0) {
      const SEVERITY_LABEL = { critical: '🔴 ร้ายแรง', medium: '🟡 ปานกลาง', low: '🟢 เล็กน้อย' };
      const findingsRows = findings.map((f, i) => `
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:8px 12px;text-align:center;font-size:13px;">${i + 1}</td>
          <td style="padding:8px 12px;font-size:13px;">${SEVERITY_LABEL[f.severity] || '🟡'}</td>
          <td style="padding:8px 12px;font-size:13px;font-weight:600;">${f.title}</td>
          <td style="padding:8px 12px;font-size:13px;">${f.description || '-'}</td>
          <td style="padding:8px 12px;font-size:13px;color:#1e40af;">${f.recommendation || '-'}</td>
        </tr>`).join('');

      const counts = { critical: 0, medium: 0, low: 0 };
      findings.forEach(f => { if (counts[f.severity] !== undefined) counts[f.severity]++; });

      const emailBody = `
        <div style="font-family:'Segoe UI',Tahoma,sans-serif;max-width:800px;margin:0 auto;padding:20px;">
          <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);color:white;padding:20px 24px;border-radius:12px 12px 0 0;">
            <h2 style="margin:0;font-size:18px;">📋 สรุปผลการตรวจสอบ</h2>
            <p style="margin:8px 0 0;font-size:13px;opacity:0.9;">${customer?.company_name || task.customer_name || ''}</p>
          </div>
          <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:20px 24px;">
            <table style="width:100%;font-size:13px;margin-bottom:16px;">
              <tr><td style="color:#6b7280;width:120px;">วันที่ตรวจ:</td><td style="font-weight:600;">${visitDate}</td></tr>
              <tr><td style="color:#6b7280;">ผู้ตรวจสอบ:</td><td>${task.assigned_name || ''}</td></tr>
              <tr><td style="color:#6b7280;">ผู้อนุมัติ:</td><td>${reviewerName}</td></tr>
              <tr><td style="color:#6b7280;">พบปัญหา:</td><td><b>${findings.length} รายการ</b> (${counts.critical > 0 ? `🔴 ${counts.critical} ร้ายแรง ` : ''}${counts.medium > 0 ? `🟡 ${counts.medium} ปานกลาง ` : ''}${counts.low > 0 ? `🟢 ${counts.low} เล็กน้อย` : ''})</td></tr>
            </table>
            <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
              <thead><tr style="background:#f9fafb;">
                <th style="padding:8px 12px;text-align:center;font-size:11px;color:#6b7280;width:40px;">#</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;width:80px;">ระดับ</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;">ปัญหา</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;">รายละเอียด</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;">คำแนะนำ</th>
              </tr></thead>
              <tbody>${findingsRows}</tbody>
            </table>
            ${approveNote ? `<div style="margin-top:16px;padding:12px;background:#f0f9ff;border-radius:8px;border:1px solid #bae6fd;"><p style="margin:0;font-size:13px;color:#0369a1;">💬 ${approveNote}</p></div>` : ''}
            <p style="font-size:13px;color:#6b7280;margin-top:16px;">หากมีข้อสงสัยหรือต้องการข้อมูลเพิ่มเติม กรุณาติดต่อทีม ACC Consulting<br>ขอบคุณที่ไว้วางใจใช้บริการค่ะ</p>
          </div>
          <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px;">ส่งจากระบบ ACC Precision Hub — ACC Consulting Co., Ltd.</p>
        </div>`;

      for (const email of selectedEmails) {
        base44.integrations.Core.SendEmail({
          from_name: 'ACC Consulting',
          to: email,
          subject: `📋 สรุปผลการตรวจสอบ — ${customer?.company_name || task.customer_name} — ${visitDate}`,
          body: emailBody,
        }).catch(e => console.warn('Email failed:', e.message));
      }
      toast.success(`📧 ส่ง email ${selectedEmails.length} ฉบับ`);
    }

    // ส่ง LINE group ลูกค้า
    if (selectedLineGroup) {
      const SEVERITY_EMOJI = { critical: '🔴', medium: '🟡', low: '🟢' };
      const findingsText = findings.map((f, i) =>
        `${i + 1}. ${SEVERITY_EMOJI[f.severity] || '🟡'} ${f.title}${f.recommendation ? `\n   💡 ${f.recommendation}` : ''}`
      ).join('\n');

      const lineMsg = `📋 สรุปผลการตรวจสอบ\n━━━━━━━━━━━━━━━━\n🏢 ${customer?.company_name || task.customer_name}\n📅 วันที่ตรวจ: ${visitDate}\n👤 ผู้ตรวจ: ${task.assigned_name || ''}\n\n📝 พบปัญหา ${findings.length} รายการ:\n${findingsText}${approveNote ? `\n\n💬 ${approveNote}` : ''}\n━━━━━━━━━━━━━━━━\nACC Consulting Co., Ltd.`;

      base44.functions.invoke('lineSendMessage', {
        line_user_id: selectedLineGroup,
        message: lineMsg,
        display_name: 'ACC Consulting',
        chat_type: 'group',
      }).catch(e => console.warn('LINE failed:', e.message));
      toast.success('💬 ส่ง LINE กลุ่มลูกค้าแล้ว');
    }

    setApproveDialog({ open: false, taskId: null, task: null, customer: null });
  };

  const handleReject = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    setRejectDialog({ open: true, taskId, task });
  };

  const doReject = async ({ note, newDueDate, severity = 'major', category = 'other' }) => {
    const { taskId, task } = rejectDialog;
    if (!taskId) return;

    const updateData = buildRejectPayload(task, currentUser, { note, newDueDate, severity, category });
    await base44.entities.Task.update(taskId, updateData);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    setRejectDialog({ open: false, taskId: null, task: null });
    toast.success('📤 ส่งกลับให้แก้ไขแล้ว');

    try {
      const reviewerName = currentUser.full_name || currentUser.email;
      const dueDateMsg = newDueDate ? `\n📅 กำหนดส่งใหม่: ${newDueDate}` : '';
      if (task?.assigned_to) {
        base44.entities.Notification.create({
          title: `⚠️ งานถูกส่งกลับ [${severity}]: ${task.title}`,
          message: `${reviewerName} ส่งกลับงาน "${task.title}"${note ? ` — เหตุผล: ${note}` : ''}${newDueDate ? ` — กำหนดส่งใหม่: ${newDueDate}` : ''} กรุณาแก้ไขแล้วส่งตรวจใหม่`,
          type: 'task_assigned',
          target_user: task.assigned_to,
          related_entity_type: 'Task',
          related_entity_id: taskId,
          customer_name: task.customer_name || '',
        }).catch(e => console.warn('Reject notification failed:', e.message));
      }
      sendLineToAccounting(
        `⚠️ งานถูกส่งกลับ\n━━━━━━━━━━━━━━━━\n📄 ${task?.title || ''}\n🏢 ${task?.customer_name || '-'}\n👤 ผู้รับผิดชอบ: ${task?.assigned_name || '-'}\n🔍 ส่งกลับโดย: ${reviewerName}\n📝 เหตุผล: ${note || '-'}${dueDateMsg}\n━━━━━━━━━━━━━━━━\n💡 กรุณาแก้ไขแล้วส่งตรวจใหม่`
      );
    } catch (e) { console.warn('Reject notification error:', e.message); }
  };

  // ── คำนวณ review_deadline = due_date + 2 วันทำการ (ข้ามเสาร์-อาทิตย์ + วันหยุด) ──
  const calcReviewDeadline = (dueDate) => {
    if (!dueDate) return '';
    const holidayDates = new Set(
      (allHolidays || [])
        .filter(h => h.status === 'active' && h.date)
        .map(h => h.date.split('T')[0])
    );
    let d = new Date(dueDate + 'T00:00:00');
    let added = 0;
    while (added < 2) {
      d.setDate(d.getDate() + 1);
      const day = d.getDay();
      const dateStr = d.toISOString().split('T')[0];
      if (day !== 0 && day !== 6 && !holidayDates.has(dateStr)) {
        added++;
      }
    }
    return d.toISOString().split('T')[0];
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (data) => {
    if (submitting) return;
    setSubmitting(true);

    // Staff ห้ามกด completed
    if (isStaff && data.status === 'completed') {
      toast.error('ไม่สามารถปิดงานเองได้ — ต้องส่งตรวจให้หัวหน้า approve');
      setSubmitting(false);
      return;
    }

    // เช็ค checklist ก่อนส่งตรวจ
    const statusChangedToReview = data.status === 'review' && editingTask?.status !== 'review';
    if (data.status === 'review') {
      const checklist = data.checklist || [];
      const checkedCount = checklist.filter(item => item.checked).length;
      if (checklist.length > 0 && checkedCount !== checklist.length) {
        toast.error(`กรุณา check checklist ให้ครบก่อนส่งตรวจ (${checkedCount}/${checklist.length})`);
        setSubmitting(false);
        return;
      }
      data.review_status = 'pending_review';

      // Auto คำนวณ review_deadline = due_date + 2 วันทำการ
      if (!data.review_deadline) {
        data.review_deadline = calcReviewDeadline(data.due_date || editingTask?.due_date);
      }

      // Track submission cycle
      if (statusChangedToReview) {
        const cyclePl = buildSubmitForReviewPayload(editingTask, currentUser);
        Object.assign(data, cyclePl);
      }

      // แจ้งเตือน reviewer เฉพาะเมื่อ status เปลี่ยนเป็น review ครั้งแรก
      if (statusChangedToReview) try {
        const taskDept = data.department || editingTask?.department || '';
        const reviewers = users.filter(u =>
          ['admin', 'management', 'manager', 'super_supervisor'].includes(u.role) &&
          u.email !== currentUser.email &&
          (!taskDept || u.department === taskDept || u.role === 'admin' || u.role === 'management')
        );
        const staffName = currentUser.full_name || currentUser.email;
        const taskTitle = data.title || editingTask?.title || '';
        const customerName = data.customer_name || editingTask?.customer_name || '';
        for (const reviewer of reviewers.slice(0, 5)) {
          base44.entities.Notification.create({
            title: `📋 งานรอตรวจ: ${taskTitle}`,
            message: `${staffName} ส่งตรวจงาน "${taskTitle}"${customerName ? ` (${customerName})` : ''} — กรุณาตรวจสอบและ Approve`,
            type: 'task_assigned',
            target_user: reviewer.email,
            related_entity_type: 'Task',
            related_entity_id: editingTask?.id || '',
            customer_name: customerName,
          }).catch(e => console.warn('Notification failed:', e.message));
        }
        sendLineToAccounting(
          `📋 งานรอตรวจ\n━━━━━━━━━━━━━━━━\n📄 ${taskTitle}${customerName ? `\n🏢 ${customerName}` : ''}\n👤 ส่งโดย: ${staffName}\n📌 สถานะ: รอตรวจสอบ\n━━━━━━━━━━━━━━━━`
        );
      } catch (e) { console.warn('Review notification error:', e.message); }
    }

    // ── Auto Review: ถ้า checklist ครบ + สถานะยังเป็น in_progress → auto เปลี่ยนเป็น review ──
    if (data.status === 'in_progress' && editingTask?.status === 'in_progress') {
      const checklist = data.checklist || [];
      const allChecked = checklist.length > 0 && checklist.every(item => item.checked);
      // เช็คว่า checklist เพิ่งครบ (เดิมยังไม่ครบ)
      const oldChecklist = editingTask?.checklist || [];
      const wasAllChecked = oldChecklist.length > 0 && oldChecklist.every(item => item.checked);
      if (allChecked && !wasAllChecked) {
        data.status = 'review';
        data.review_status = 'pending_review';
        data.review_deadline = calcReviewDeadline(data.due_date || editingTask?.due_date);
        toast.info('✅ Checklist ครบ — เปลี่ยนสถานะเป็น "รอตรวจสอบ" อัตโนมัติ');

        try {
          const taskDept = data.department || editingTask?.department || '';
          const reviewers = users.filter(u =>
            ['admin', 'management', 'manager', 'super_supervisor'].includes(u.role) &&
            u.email !== currentUser.email &&
            (!taskDept || u.department === taskDept || u.role === 'admin' || u.role === 'management')
          );
          const staffName = currentUser.full_name || currentUser.email;
          const taskTitle = data.title || editingTask?.title || '';
          const customerName = data.customer_name || editingTask?.customer_name || '';

          for (const reviewer of reviewers.slice(0, 5)) {
            base44.entities.Notification.create({
              title: `✅ Checklist ครบ — พร้อม Approve: ${taskTitle}`,
              message: `${staffName} ทำ checklist ครบทุกข้อ "${taskTitle}"${customerName ? ` (${customerName})` : ''} — พร้อม Approve`,
              type: 'task_assigned',
              target_user: reviewer.email,
              related_entity_type: 'Task',
              related_entity_id: editingTask?.id || '',
              customer_name: customerName,
            }).catch(e => console.warn('Notification failed:', e.message));
          }

          sendLineToAccounting(
            `✅ Checklist ครบ — พร้อม Approve\n━━━━━━━━━━━━━━━━\n📄 ${taskTitle}${customerName ? `\n🏢 ${customerName}` : ''}\n👤 ${staffName}\n📋 Checklist: ${checklist.length}/${checklist.length} ✅\n━━━━━━━━━━━━━━━━`
          );
        } catch (e) {
          console.warn('Auto-review notification error:', e.message);
        }
      }
    }

    // ถ้า reviewer ปิดงานตรง (ไม่ผ่าน review) → set reviewer info ด้วย
    if (data.status === 'completed' && isReviewer) {
      const checklist = data.checklist || editingTask?.checklist || [];
      const checkedCount = checklist.filter(item => item.checked).length;
      if (checklist.length > 0 && checkedCount !== checklist.length) {
        toast.error(`ไม่สามารถปิดงานได้ — checklist ยังไม่ครบ (${checkedCount}/${checklist.length})`);
        setSubmitting(false);
        return;
      }
      const today = format(new Date(), 'yyyy-MM-dd');
      data.completed_date = today;
      data.review_status = 'approved';
      data.reviewer_email = currentUser.email;
      data.reviewer_name = currentUser.full_name || currentUser.email;
      data.reviewed_date = today;
      if (!data.review_note) data.review_note = 'ปิดงานโดยหัวหน้างาน (ไม่ผ่าน review)';
    }

    // Auto set completed_date when status changes to completed
    if (data.status === 'completed' && !data.completed_date) {
      data.completed_date = format(new Date(), 'yyyy-MM-dd');
    }
    // Clear completed_date if status is no longer completed
    if (data.status !== 'completed') {
      data.completed_date = null;
    }

    // Auto time tracking on status change
    if (editingTask && currentUser && editingTask.status !== data.status) {
      autoTimeTrack(editingTask, data.status, currentUser);
    }

    // Track due date change history when editing (only if user has direct permission)
    const oldDueNorm = editingTask?.due_date?.split('T')[0] || '';
    const newDueNorm = data.due_date?.split('T')[0] || '';
    if (editingTask && newDueNorm && oldDueNorm && newDueNorm !== oldDueNorm) {
      // Check if user must request approval instead of direct change
      const duePerm = ac.canChangeDueDate(editingTask);
      if (duePerm === 'request') {
        toast.error('ไม่สามารถเลื่อน due date ได้โดยตรง — กรุณาใช้ปุ่ม "ขอเลื่อน Due Date"');
        data.due_date = oldDueNorm;
        setSubmitting(false);
        return;
      }
      // Open reason dialog — pause submission
      setDueDateReasonDialog({ open: true, data: { ...data }, editingTask });
      setSubmitting(false);
      return;
    }

    // Snapshot original_due_date on create
    if (!editingTask && data.due_date) {
      data.original_due_date = data.due_date;
    }

    if (editingTask) {
      // 📢 ตรวจ checklist ที่มี 📢 ที่เพิ่งติ๊กใหม่ → ส่ง LINE แจ้งลูกค้า
      sendTaxStatusLine(
        { ...editingTask, ...data },
        editingTask.checklist,
        data.checklist
      );
      updateMutation.mutate({ id: editingTask.id, data }, { onSettled: () => setSubmitting(false) });
    }
    else createMutation.mutate(data, { onSettled: () => setSubmitting(false) });
  };

  // ── Due Date Reason confirmed → continue saving ──
  const handleDueDateReasonConfirm = (reason) => {
    const { data, editingTask: et } = dueDateReasonDialog;
    if (!data || !et) return;
    setDueDateReasonDialog({ open: false, data: null, editingTask: null });

    const oldDueNorm = et.due_date?.split('T')[0] || '';
    const newDueNorm = data.due_date?.split('T')[0] || '';
    const currentHistory = Array.isArray(et.due_date_change_history) ? et.due_date_change_history : [];
    const currentCount = et.due_date_change_count || 0;
    data.due_date_change_count = currentCount + 1;
    data.due_date_change_history = [...currentHistory, {
      changed_at: new Date().toISOString(),
      changed_by: currentUser?.email || 'unknown',
      changed_by_name: currentUser?.full_name || currentUser?.email || 'unknown',
      changed_by_role: currentUser?.role || '',
      old_due_date: oldDueNorm,
      new_due_date: newDueNorm,
      reason,
    }];

    // Snapshot original_due_date on create
    if (!et && data.due_date) {
      data.original_due_date = data.due_date;
    }

    // Auto time tracking on status change
    if (et && currentUser && et.status !== data.status) {
      autoTimeTrack(et, data.status, currentUser);
    }

    sendTaxStatusLine({ ...et, ...data }, et.checklist, data.checklist);
    updateMutation.mutate({ id: et.id, data });
  };

  // ── 💾 Save Task as Template ──
  const handleSaveAsTemplate = async (taskData) => {
    try {
      const allTemplates = await base44.entities.TaskTemplate.list('-created_date', 500);
      const prefix = 'TPL';
      const existing = allTemplates.filter(t => t.template_code?.startsWith(prefix + '-')).map(t => parseInt(t.template_code.split('-')[1]) || 0);
      const max = existing.length > 0 ? Math.max(...existing) : 0;
      const templateCode = `${prefix}-${String(max + 1).padStart(4, '0')}`;

      const templateData = {
        template_code: templateCode,
        name: taskData.title || '',
        description: taskData.description || '',
        service_type: taskData.service_type || '',
        department: taskData.department || '',
        match_type: 'service',
        recurring_type: 'monthly',
        due_date_rule: 15,
        default_priority: taskData.priority || 'medium',
        default_status: 'pending',
        default_owner_type: 'from_customer',
        status: 'active',
        default_checklist: (taskData.checklist || []).map(c => ({
          item: c.item,
          checked: false,
        })),
      };

      await base44.entities.TaskTemplate.create(templateData);
      queryClient.invalidateQueries({ queryKey: ['taskTemplates'] });
      toast.success(`💾 บันทึกเป็น Template "${taskData.title}" (${templateCode}) สำเร็จ — ไปปรับแต่งได้ที่หน้า Task Templates`);
    } catch (err) {
      console.error('Save as template error:', err);
      toast.error('บันทึกเป็น Template ไม่สำเร็จ: ' + (err.message || ''));
    }
  };

  // Clamp a Date to working hours (09:00–18:00) on the same day
  const clampToWorkHours = (date) => {
    const d = new Date(date);
    const h = d.getHours();
    if (h < 9) { d.setHours(9, 0, 0, 0); }
    if (h >= 18) { d.setHours(18, 0, 0, 0); }
    return d;
  };

  // Auto start/stop timer when status changes
  const autoTimeTrack = async (task, newStatus, user) => {
    try {
      const entries = await base44.entities.TimeEntry.filter({ task_id: task.id, is_running: true }, '-created_date', 10);
      const myRunning = entries.find(e => e.user_email === user.email);

      if (newStatus === 'in_progress' && !myRunning) {
        // Auto-start timer — clamp to working hours
        const startTime = clampToWorkHours(new Date());
        await base44.entities.TimeEntry.create({
          task_id: task.id, task_title: task.title,
          customer_id: task.customer_id || '', customer_name: task.customer_name || '',
          service_type: task.service_type || '', department: task.department || '',
          user_email: user.email, user_name: user.full_name || user.email,
          start_time: startTime.toISOString(), is_running: true,
          description: 'เริ่มอัตโนมัติ (status → In Progress)',
        });
      } else if ((newStatus === 'completed' || newStatus === 'review') && myRunning) {
        // Auto-stop timer — clamp both start & end to working hours
        const rawStart = new Date(myRunning.start_time);
        const rawEnd = new Date();
        const clampedStart = clampToWorkHours(rawStart);
        const clampedEnd = clampToWorkHours(rawEnd);
        const duration = Math.max(0, (clampedEnd - clampedStart) / 60000);
        await base44.entities.TimeEntry.update(myRunning.id, {
          end_time: clampedEnd.toISOString(),
          duration_minutes: Math.round(duration * 100) / 100,
          is_running: false,
          description: (myRunning.description || '') + ` (หยุดอัตโนมัติ: status → ${newStatus})`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    } catch (e) {
      console.warn('Auto time track failed:', e.message);
    }
  };

  const filtered = useMemo(() => {
    let result = [...tasks];
    const f = filters;
    if (f.search) {
      const s = f.search.toLowerCase();
      result = result.filter(t => t.title?.toLowerCase().includes(s) || t.customer_name?.toLowerCase().includes(s) || String(t.id).includes(s));
    }
    if (f.department !== 'all') result = result.filter(t => t.department === f.department);
    if (f.status === 'active') {
      result = result.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
    } else if (f.status !== 'all') {
      result = result.filter(t => t.status === f.status);
    }
    if (f.priority !== 'all') result = result.filter(t => t.priority === f.priority);
    if (f.owner !== 'all') result = result.filter(t => t.assigned_to === f.owner);
    if (f.serviceType !== 'all') result = result.filter(t => t.service_type === f.serviceType);
    if (f.client !== 'all') result = result.filter(t => t.customer_id === f.client);
    if (f.taskType !== 'all') {
      if (f.taskType === 'recurring') result = result.filter(t => t.is_recurring);
      else result = result.filter(t => !t.is_recurring);
    }
    if (f.dateFrom) result = result.filter(t => t.due_date && t.due_date >= f.dateFrom);
    if (f.dateTo) result = result.filter(t => t.due_date && t.due_date <= f.dateTo);

    // Sort
    result.sort((a, b) => {
      let va = a[sortField] || '';
      let vb = b[sortField] || '';
      if (sortField === 'due_date' || sortField === 'updated_date') {
        va = va ? new Date(va).getTime() : 0;
        vb = vb ? new Date(vb).getTime() : 0;
      }
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [tasks, filters, sortField, sortDir]);

  // Reset page when filters change
  React.useEffect(() => { setPage(1); }, [filters, sortField, sortDir]);

  const paged = paginateData(filtered, page, pageSize);

  // Update counts in filters for display
  const statusCounts = {
    active: tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    review: tasks.filter(t => t.status === 'review').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    cancelled: tasks.filter(t => t.status === 'cancelled').length,
  };
  const filtersWithCounts = { ...filters, _count: filtered.length, _total: tasks.length, _statusCounts: statusCounts };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold">Task Control Center</h1>
            <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-medium">{tasks.length} tasks</span>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">Daily operational workspace — monitor, assign, and resolve tasks across departments</p>
        </div>
        <div className="flex gap-2 shrink-0 self-start sm:self-auto">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs hidden sm:flex"><Download className="w-3.5 h-3.5" /> Export</Button>
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => { setEditingTask(null); setShowForm(true); }}>
            <Plus className="w-3.5 h-3.5" /> New Task
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <TaskStatsRow tasks={tasks} />

      {/* Task Form passes permissions for field-level control */}

      {/* Dept Tabs */}
      <TaskDeptTabs tasks={tasks} />

      {/* Filters */}
      <TaskFilters filters={filtersWithCounts} setFilters={setFilters} customers={customers} users={users} />

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t('loading')}</div>
      ) : (
        <>
          <TaskTable
           tasks={paged}
           selected={selected}
           setSelected={setSelected}
           onRowClick={(task) => { setEditingTask(task); setShowForm(true); }}
           sortField={sortField}
           sortDir={sortDir}
           onSort={(field, dir) => { setSortField(field); setSortDir(dir); }}
           users={users}
           isReviewer={isReviewer}
           onApprove={handleApprove}
           onReject={handleReject}
          />
          <TablePagination totalItems={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </>
      )}

      {/* Task Form Dialog */}
      {/* Approve + Send Findings Dialog */}
      <ApproveFindingsDialog
        open={approveDialog.open}
        onOpenChange={(open) => { if (!open) setApproveDialog({ open: false, taskId: null, task: null, customer: null }); }}
        task={approveDialog.task}
        customer={approveDialog.customer}
        onApproveOnly={async () => { await doApprove(approveDialog.taskId); setApproveDialog({ open: false, taskId: null, task: null, customer: null }); }}
        onApproveAndSend={doApproveAndSend}
      />

      <RejectDialog
        open={rejectDialog.open}
        onOpenChange={(open) => { if (!open) setRejectDialog({ open: false, taskId: null, task: null }); }}
        task={rejectDialog.task}
        onConfirm={doReject}
      />

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingTask ? t('edit_task') : t('create_task')}</DialogTitle></DialogHeader>
          <TaskForm task={editingTask} onSubmit={handleSubmit} onSaveAsTemplate={editingTask ? handleSaveAsTemplate : undefined} isLoading={submitting || createMutation.isPending || updateMutation.isPending} permissions={ac} currentUser={currentUser} />
        </DialogContent>
      </Dialog>

      <DueDateReasonDialog
        open={dueDateReasonDialog.open}
        onOpenChange={(open) => { if (!open) setDueDateReasonDialog({ open: false, data: null, editingTask: null }); }}
        oldDate={dueDateReasonDialog.editingTask?.due_date?.split('T')[0] || ''}
        newDate={dueDateReasonDialog.data?.due_date?.split('T')[0] || ''}
        onConfirm={handleDueDateReasonConfirm}
      />
    </div>
  );
}