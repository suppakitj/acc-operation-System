import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { BarChart3, Shield } from 'lucide-react';
import { startOfQuarter, format } from 'date-fns';
import StaffScorecardComponent from '@/components/analytics/StaffScorecard';
import { Link } from 'react-router-dom';
import { useUserList } from '@/hooks/useUserList';

export default function StaffScorecard() {
  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get('email');

  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: allUsers = [] } = useUserList();
  const role = currentUser?.role || '';
  const isAdmin = role === 'admin' || role === 'management';
  const isManager = role === 'manager' || role === 'super_supervisor';

  // Default email
  const email = emailParam || currentUser?.email || '';

  // Permission check
  const canView = useMemo(() => {
    if (!currentUser) return false;
    if (isAdmin) return true;
    if (email === currentUser.email) return true;
    if (isManager) {
      const target = allUsers.find(u => u.email === email);
      const myDepts = currentUser.departments?.length ? currentUser.departments : currentUser.department ? [currentUser.department] : [];
      const targetDept = target?.department || '';
      return myDepts.includes(targetDept);
    }
    return false;
  }, [currentUser, email, isAdmin, isManager, allUsers]);

  // Target user
  const targetUser = useMemo(() => allUsers.find(u => u.email === email) || currentUser, [allUsers, email, currentUser]);

  // Date range
  const today = new Date();
  const [from, setFrom] = useState(format(startOfQuarter(today), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(today, 'yyyy-MM-dd'));

  // Staff list for admin/manager to browse
  const browseUsers = useMemo(() => {
    if (isAdmin) return allUsers;
    if (isManager) {
      const myDepts = currentUser?.departments?.length ? currentUser.departments : currentUser?.department ? [currentUser.department] : [];
      return allUsers.filter(u => myDepts.includes(u.department));
    }
    return [];
  }, [allUsers, isAdmin, isManager, currentUser]);

  if (!currentUser) return null;

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-2">
          <Shield className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">ไม่มีสิทธิ์ดู scorecard ของบุคคลนี้</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            Performance Scorecard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{targetUser?.full_name || email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-8 text-xs w-[140px]" />
          <span className="text-xs text-muted-foreground">ถึง</span>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-8 text-xs w-[140px]" />
        </div>
      </div>

      {/* Browse staff list */}
      {browseUsers.length > 1 && !emailParam && (
        <Card className="p-3">
          <p className="text-xs font-semibold mb-2">เลือกดู Scorecard</p>
          <div className="flex flex-wrap gap-1.5">
            {browseUsers.map(u => (
              <Link key={u.email} to={`/StaffScorecard?email=${encodeURIComponent(u.email)}`}>
                <span className={`inline-block text-[11px] px-2.5 py-1 rounded-full cursor-pointer transition-colors ${u.email === email ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>
                  {u.full_name || u.email}
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <StaffScorecardComponent
        email={email}
        role={targetUser?.role || 'staff'}
        from={from}
        to={to}
        user={targetUser}
      />
    </div>
  );
}