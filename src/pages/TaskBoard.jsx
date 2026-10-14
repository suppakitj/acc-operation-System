import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useAccessControl } from '@/components/auth/useAccessControl';
import { useToast } from '@/components/ui/use-toast';
import { LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';
import { reasonToText } from '@/utils/taskActionMessages';
import BoardColumn from '@/components/taskboard/BoardColumn';
import BoardTaskCard from '@/components/taskboard/BoardTaskCard';
import MentionCard from '@/components/taskboard/MentionCard';
import CreateTaskFromChat from '@/components/chat/CreateTaskFromChat';

const todayStr = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
const REFRESH = { refetchInterval: 30000 };

export default function TaskBoard() {
  const { user } = useAuth();
  const ac = useAccessControl(user);
  const { toast } = useToast();
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState(null);
  const [chatMsg, setChatMsg] = useState(null);
  const email = user?.email;
  const today = todayStr();

  const { data: mentions = [] } = useQuery({
    queryKey: ['board-mentions'], ...REFRESH,
    queryFn: () => base44.entities.LineMessage.filter({ direction: 'incoming', mentions_us: true, triage_status: 'new' }, '-created_date', 50),
  });
  const { data: pending = [] } = useQuery({
    queryKey: ['board-pending'], ...REFRESH,
    queryFn: () => base44.entities.Task.filter({ status: 'pending' }, 'due_date', 500),
  });
  const { data: mine = [] } = useQuery({
    queryKey: ['board-mine', email], enabled: !!email, ...REFRESH,
    queryFn: () => base44.entities.Task.filter({ assigned_to: email, status: 'in_progress' }, 'due_date', 200),
  });

  const pool = ac.filterByDepartment(pending.filter(t => !t.assigned_to || t.is_open_pool === true));
  const overdueMine = mine.filter(t => t.due_date && t.due_date < today).length;
  const mentionsToday = mentions.filter(m => (m.created_date || '').slice(0, 10) === today).length;

  const refetchAll = () => ['board-mentions', 'board-pending', 'board-mine'].forEach(k => qc.invalidateQueries({ queryKey: [k] }));

  const run = async (task, action) => {
    setBusyId(task.id);
    const { data } = await base44.functions.invoke('taskClaim', { task_id: task.id, action });
    setBusyId(null);
    if (data?.ok) {
      toast({ title: 'สำเร็จ', description: data.warning || undefined });
    } else {
      toast({ title: reasonToText(data), variant: 'destructive' });
    }
    refetchAll();
  };

  const stats = [
    ['งานรอรับ', pool.length], ['งานของฉัน', mine.length], ['เลยกำหนด', overdueMine], ['ถูกพูดถึงวันนี้', mentionsToday],
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <LayoutGrid className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold">กระดานงาน</h1>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {stats.map(([l, v]) => (
          <div key={l} className="bg-card border rounded-lg p-3">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="text-2xl font-bold">{v}</p>
          </div>
        ))}
      </div>
      <div className="flex md:grid md:grid-cols-3 gap-3 overflow-x-auto snap-x pb-2">
        <BoardColumn title="💬 ถูกพูดถึง" count={mentions.length} empty="ไม่มีข้อความ">
          {mentions.map(m => <MentionCard key={m.id} msg={m} onCreate={setChatMsg} />)}
        </BoardColumn>
        <BoardColumn title="🆕 งานรอรับ" count={pool.length} empty="ไม่มีงานรอรับ" link={<Link to="/Tasks" className="text-xs text-primary hover:underline">ดูงานทั้งหมด →</Link>}>
          {pool.map(t => (
            <BoardTaskCard key={t.id} task={t} today={today} busy={busyId === t.id}
              actions={[{ key: 'claim', label: 'รับงาน', onClick: () => run(t, 'claim') }]} />
          ))}
        </BoardColumn>
        <BoardColumn title="🔧 งานของฉัน" count={mine.length} empty="ยังไม่มีงาน" link={<Link to="/MyDay" className="text-xs text-primary hover:underline">ดูสรุปวันของฉัน →</Link>}>
          {mine.map(t => (
            <BoardTaskCard key={t.id} task={t} today={today} busy={busyId === t.id}
              actions={[
                t.reviewer_email
                  ? { key: 'review', label: 'ส่งตรวจ', onClick: () => run(t, 'submit_review') }
                  : { key: 'done', label: 'ปิดงาน', onClick: () => run(t, 'complete') },
                { key: 'release', label: 'คืนงาน', variant: 'outline', onClick: () => run(t, 'release') },
              ]} />
          ))}
        </BoardColumn>
      </div>
      {chatMsg && (
        <CreateTaskFromChat
          open={!!chatMsg}
          onOpenChange={(o) => { if (!o) { setChatMsg(null); refetchAll(); } }}
          message={chatMsg}
          chatDisplayName={chatMsg.display_name || chatMsg.customer_name || ''}
        />
      )}
    </div>
  );
}