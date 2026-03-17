import React from 'react';
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
import Notifications from './pages/Notifications';
import LineChat from './pages/LineChat';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';
import RoleManagement from './pages/RoleManagement';
import AuditLog from './pages/AuditLog';
import AppSettings from './pages/AppSettings';
import DatabaseBackup from './pages/DatabaseBackup';
import ServiceMaster from './pages/ServiceMaster';
import HolidayMaster from './pages/HolidayMaster';
const TeamAnalytics = React.lazy(() => import('./pages/TeamAnalytics'));

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
        <Route path="/Notifications" element={<Notifications />} />
        <Route path="/LineChat" element={<LineChat />} />
        <Route path="/Reports" element={<Reports />} />
        <Route path="/UserManagement" element={<UserManagement />} />
        <Route path="/RoleManagement" element={<RoleManagement />} />
        <Route path="/AuditLog" element={<AuditLog />} />
        <Route path="/AppSettings" element={<AppSettings />} />
        <Route path="/ServiceMaster" element={<ServiceMaster />} />
        <Route path="/HolidayMaster" element={<HolidayMaster />} />
        <Route path="/TeamAnalytics" element={<React.Suspense fallback={<div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>}><TeamAnalytics /></React.Suspense>} />
        <Route path="/DatabaseBackup" element={<DatabaseBackup />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClientInstance}>
          <PermissionMatrixProvider>
            <Router>
              <AuthenticatedApp />
            </Router>
          </PermissionMatrixProvider>
          <Toaster />
        </QueryClientProvider>
      </LanguageProvider>
    </AuthProvider>
  )
}

export default App