/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AppSettings from './pages/AppSettings';
import AuditLog from './pages/AuditLog';
import Billing from './pages/Billing';
import Customers from './pages/Customers';
import Dashboard from './pages/Dashboard';
import DatabaseBackup from './pages/DatabaseBackup';
import HolidayMaster from './pages/HolidayMaster';
import LineChat from './pages/LineChat';
import Notifications from './pages/Notifications';
import PeakAccount from './pages/PeakAccount';
import Reports from './pages/Reports';
import RoleManagement from './pages/RoleManagement';
import Schedule from './pages/Schedule';
import ServiceMaster from './pages/ServiceMaster';
import StaffDashboard from './pages/StaffDashboard';
import TaskCalendar from './pages/TaskCalendar';
import TaskTemplates from './pages/TaskTemplates';
import Tasks from './pages/Tasks';
import TeamAnalytics from './pages/TeamAnalytics';
import UserManagement from './pages/UserManagement';


export const PAGES = {
    "AppSettings": AppSettings,
    "AuditLog": AuditLog,
    "Billing": Billing,
    "Customers": Customers,
    "Dashboard": Dashboard,
    "DatabaseBackup": DatabaseBackup,
    "HolidayMaster": HolidayMaster,
    "LineChat": LineChat,
    "Notifications": Notifications,
    "PeakAccount": PeakAccount,
    "Reports": Reports,
    "RoleManagement": RoleManagement,
    "Schedule": Schedule,
    "ServiceMaster": ServiceMaster,
    "StaffDashboard": StaffDashboard,
    "TaskCalendar": TaskCalendar,
    "TaskTemplates": TaskTemplates,
    "Tasks": Tasks,
    "TeamAnalytics": TeamAnalytics,
    "UserManagement": UserManagement,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
};