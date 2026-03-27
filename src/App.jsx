import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { LanguageProvider } from './components/LanguageContext';
import { PermissionMatrixProvider } from './hooks/usePermissionMatrix';

import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Schedule from './pages/Schedule';
import Customers from './pages/Customers';
import TaskTemplates from './pages/TaskTemplates';
import PeakAccount from './pages/PeakAccount';
import Billing from './pages/Billing';

import LineChat from './pages/LineChat';

import UserManagement from './pages/UserManagement';
import RoleManagement from './pages/RoleManagement';
import AuditLog from './pages/AuditLog';
import AppSettings from './pages/AppSettings';
import DatabaseBackup from './pages/DatabaseBackup';
import ServiceMaster from './pages/ServiceMaster';
import HolidayMaster from './pages/HolidayMaster';
import TeamAnalytics from './pages/TeamAnalytics';
import StaffDashboard from './pages/StaffDashboard';
import TaskCalendar from './pages/TaskCalendar';
import OcrProcessing from './pages/OcrProcessing';
import LineFiles from './pages/LineFiles';
import ReferralCommission from './pages/ReferralCommission';
import TaskGeneration from './pages/TaskGeneration';
import TimeTracking from './pages/TimeTracking';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">กำลังโหลด ACC Consulting...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/Dashboard" replace />} />
      <Route element={<AppLayout />}>
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/Tasks" element={<Tasks />} />
        <Route path="/Schedule" element={<Schedule />} />
        <Route path="/Customers" element={<Customers />} />
        <Route path="/TaskTemplates" element={<TaskTemplates />} />
        <Route path="/PeakAccount" element={<PeakAccount />} />
        <Route path="/Billing" element={<Billing />} />

        <Route path="/LineChat" element={<LineChat />} />

        <Route path="/UserManagement" element={<UserManagement />} />
        <Route path="/RoleManagement" element={<RoleManagement />} />
        <Route path="/AuditLog" element={<AuditLog />} />
        <Route path="/AppSettings" element={<AppSettings />} />
        <Route path="/ServiceMaster" element={<ServiceMaster />} />
        <Route path="/HolidayMaster" element={<HolidayMaster />} />
        <Route path="/TeamAnalytics" element={<TeamAnalytics />} />
        <Route path="/StaffDashboard" element={<StaffDashboard />} />
        <Route path="/TaskCalendar" element={<TaskCalendar />} />
        <Route path="/DatabaseBackup" element={<DatabaseBackup />} />
        <Route path="/OcrProcessing" element={<OcrProcessing />} />
        <Route path="/LineFiles" element={<LineFiles />} />
        <Route path="/ReferralCommission" element={<ReferralCommission />} />
        <Route path="/TaskGeneration" element={<TaskGeneration />} />
        <Route path="/TimeTracking" element={<TimeTracking />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <LanguageProvider>
          <PermissionMatrixProvider>
            <Router>
              <AuthenticatedApp />
            </Router>
          </PermissionMatrixProvider>
          <Toaster />
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App