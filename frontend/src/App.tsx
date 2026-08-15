import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Suspense, useEffect } from 'react';
import './i18n';
import { useThemeStore } from './stores/themeStore';
import { useAuthStore } from './stores/authStore';
import { getOrgSlug, isAdminDomain } from './utils/tenant';
import { getSchoolSite } from './services/authService';

import ProtectedRoute from './components/shared/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import LoginPage from './pages/auth/LoginPage';
import SuperAdminLoginPage from './pages/auth/SuperAdminLoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import NotFoundPage from './pages/errors/NotFoundPage';
import SuperAdminDashboard from './pages/dashboard/SuperAdminDashboard';
import OrganizationsPage from './pages/admin/OrganizationsPage';
import OrgDetailPage from './pages/admin/OrgDetailPage';
import BillingPage from './pages/admin/BillingPage';
import AdminUsersPage from './pages/admin/UsersPage';
import AdminSettingsPage from './pages/admin/SettingsPage';
import BranchDashboard from './pages/dashboard/BranchDashboard';
import GroupAdminDashboard from './pages/dashboard/GroupAdminDashboard';
import StudentDashboard from './pages/dashboard/StudentDashboard';
import TeacherDashboard from './pages/dashboard/TeacherDashboard';
import ClassFellowsPage from './pages/classFellows/ClassFellowsPage';
import AcademicSetupPage from './pages/settings/AcademicSetupPage';
import SettingsPage from './pages/settings/SettingsPage';
import StudentsPage from './pages/students/StudentsPage';
import StudentProfileDetailPage from './pages/students/StudentProfileDetailPage';
import PeerFeedbackPage from './pages/students/PeerFeedbackPage';
import AttendancePage from './pages/attendance/AttendancePage';
import TimetablePage from './pages/timetable/TimetablePage';
import TimetableEditPage from './pages/timetable/TimetableEditPage';
import ExamsPage from './pages/exams/ExamsPage';
import AssignmentsPage from './pages/assignments/AssignmentsPage';
import FeesPage from './pages/fees/FeesPage';
import PayrollPage from './pages/payroll/PayrollPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import SopsPage from './pages/sops/SopsPage';
import StaffPage from './pages/staff/StaffPage';
import GroupSettingsPage from './pages/settings/GroupSettingsPage';
import BranchesPage from './pages/branches/BranchesPage';
import ResourcesPage from './pages/resources/ResourcesPage';
import ExamPaperPage from './pages/examPaper/ExamPaperPage';
import WeeklyPapersPage from './pages/papers/WeeklyPapersPage';
import StudentPapersPage from './pages/papers/StudentPapersPage';
import RolesHierarchyPage from './pages/roles/RolesHierarchyPage';
import MobileDevicesPage from './pages/admin/MobileDevicesPage';
import StudentProfilePage from './pages/profile/StudentProfilePage';
import LandingPage from './pages/landing/LandingPage';
import PlanBuilderPage from './pages/landing/PlanBuilderPage';
import SchoolSitePage from './pages/public/SchoolSitePage';
import WebsiteEditorPage from './pages/settings/WebsiteEditorPage';
import AdmissionPortalPage from './pages/public/AdmissionPortalPage';
import AdmissionPage from './pages/admission/AdmissionPage';
import DeleteAccountPage from './pages/legal/DeleteAccountPage';
import PrivacyPolicyPage from './pages/legal/PrivacyPolicyPage';
import InventoryPage from './pages/inventory/InventoryPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-screen">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ── admin.edu.tws.enterprises ─────────────────────────────
function AdminRouter() {
  return (
    <Routes>
      <Route path="/login" element={<SuperAdminLoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <SuperAdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<SuperAdminDashboard />} />
        <Route path="organizations" element={<OrganizationsPage />} />
        <Route path="organizations/:id" element={<OrgDetailPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="mobile-devices" element={<MobileDevicesPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

// ── beaconhouse.edu.tws.enterprises (any school subdomain) ────
// Authenticated → dashboard. Unauthenticated → check for published site,
// fall back to /login if add-on is off or site is unpublished.
function TenantRoot() {
  const { isAuthenticated, user } = useAuthStore();
  const slug = getOrgSlug();

  const { data: siteData, isLoading } = useQuery({
    queryKey: ['school-site', slug],
    queryFn: () => getSchoolSite(slug!),
    enabled: !!slug && !isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (isAuthenticated && user) {
    if (user.role === 'group_admin')  return <Navigate to="/group" replace />;
    if (user.role === 'coordinator')  return <Navigate to="/coordinator" replace />;
    if (user.role === 'teacher')      return <Navigate to="/teacher" replace />;
    if (user.role === 'student')      return <Navigate to="/student" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  if (isLoading) return <PageLoader />;
  if (siteData?.published) return <SchoolSitePage site={siteData} />;
  return <Navigate to="/login" replace />;
}

function TenantRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Public admission portal — no auth */}
      <Route path="/admission" element={<AdmissionPortalPage />} />

      {/* Branch-level staff */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['branch_principal', 'accountant', 'it_admin']}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<BranchDashboard />} />
        <Route path="students"       element={<StudentsPage />} />
        <Route path="students/:id"   element={<StudentProfileDetailPage />} />
        <Route path="attendance"     element={<AttendancePage />} />
        <Route path="timetable"      element={<TimetablePage />} />
        <Route path="timetable/edit" element={<TimetableEditPage />} />
        <Route path="exams"          element={<ExamsPage />} />
        <Route path="assignments"    element={<AssignmentsPage />} />
        <Route path="academic"       element={<AcademicSetupPage />} />
        <Route path="fees"           element={<FeesPage />} />
        <Route path="payroll"        element={<PayrollPage />} />
        <Route path="inventory"      element={<InventoryPage />} />
        <Route path="notifications"  element={<NotificationsPage />} />
        <Route path="sops"           element={<SopsPage />} />
        <Route path="resources"      element={<ResourcesPage />} />
        <Route path="exam-paper"     element={<ExamPaperPage />} />
        <Route path="papers"         element={<WeeklyPapersPage />} />
        <Route path="papers/monthly-report" element={<WeeklyPapersPage />} />
        <Route path="settings"       element={<SettingsPage />} />
        <Route path="staff"          element={<StaffPage />} />
        <Route path="admission"      element={<AdmissionPage />} />
      </Route>

      {/* Coordinator */}
      <Route
        path="/coordinator"
        element={
          <ProtectedRoute allowedRoles={['coordinator']}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<BranchDashboard />} />
        <Route path="students"      element={<StudentsPage />} />
        <Route path="students/:id"  element={<StudentProfileDetailPage />} />
        <Route path="attendance"    element={<AttendancePage />} />
        <Route path="timetable"     element={<TimetablePage />} />
        <Route path="exams"         element={<ExamsPage />} />
        <Route path="exam-paper"    element={<ExamPaperPage />} />
        <Route path="papers"        element={<WeeklyPapersPage />} />
        <Route path="papers/monthly-report" element={<WeeklyPapersPage />} />
        <Route path="assignments"   element={<AssignmentsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="admission"     element={<AdmissionPage />} />
      </Route>

      {/* Teacher */}
      <Route
        path="/teacher"
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TeacherDashboard />} />
        <Route path="students"      element={<StudentsPage />} />
        <Route path="students/:id"  element={<StudentProfileDetailPage />} />
        <Route path="attendance"    element={<AttendancePage />} />
        <Route path="timetable"     element={<TimetablePage />} />
        <Route path="exams"         element={<ExamsPage />} />
        <Route path="assignments"   element={<AssignmentsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="exam-paper"    element={<ExamPaperPage />} />
        <Route path="papers"        element={<WeeklyPapersPage />} />
        <Route path="papers/monthly-report" element={<WeeklyPapersPage />} />
        <Route path="resources"     element={<ResourcesPage />} />
        <Route path="sops"          element={<SopsPage />} />
        <Route path="fees"          element={<FeesPage />} />
        <Route path="payroll"       element={<PayrollPage />} />
      </Route>

      {/* Student */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentDashboard />} />
        <Route path="class-fellows"  element={<ClassFellowsPage />} />
        <Route path="attendance"     element={<AttendancePage />} />
        <Route path="timetable"      element={<TimetablePage />} />
        <Route path="exams"          element={<ExamsPage />} />
        <Route path="papers"         element={<StudentPapersPage />} />
        <Route path="papers/monthly-report" element={<StudentPapersPage />} />
        <Route path="assignments"    element={<AssignmentsPage />} />
        <Route path="notifications"  element={<NotificationsPage />} />
        <Route path="fees"           element={<FeesPage />} />
        <Route path="resources"      element={<ResourcesPage />} />
        <Route path="sops"           element={<SopsPage />} />
        <Route path="profile"        element={<StudentProfilePage />} />
        <Route path="peer-feedback"  element={<PeerFeedbackPage />} />
      </Route>

      {/* Group admin — full-screen website editor (no AppLayout) */}
      <Route
        path="/group/website-editor"
        element={
          <ProtectedRoute allowedRoles={['group_admin']}>
            <WebsiteEditorPage />
          </ProtectedRoute>
        }
      />

      {/* Group admin */}
      <Route
        path="/group"
        element={
          <ProtectedRoute allowedRoles={['group_admin']}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<GroupAdminDashboard />} />
        <Route path="branches"       element={<BranchesPage />} />
        <Route path="staff"          element={<StaffPage />} />
        <Route path="students"       element={<StudentsPage />} />
        <Route path="students/:id"   element={<StudentProfileDetailPage />} />
        <Route path="attendance"     element={<AttendancePage />} />
        <Route path="timetable"      element={<TimetablePage />} />
        <Route path="timetable/edit" element={<TimetableEditPage />} />
        <Route path="exams"          element={<ExamsPage />} />
        <Route path="assignments"    element={<AssignmentsPage />} />
        <Route path="academic"       element={<AcademicSetupPage />} />
        <Route path="fees"           element={<FeesPage />} />
        <Route path="payroll"        element={<PayrollPage />} />
        <Route path="inventory"      element={<InventoryPage />} />
        <Route path="notifications"  element={<NotificationsPage />} />
        <Route path="sops"           element={<SopsPage />} />
        <Route path="resources"      element={<ResourcesPage />} />
        <Route path="exam-paper"     element={<ExamPaperPage />} />
        <Route path="papers"         element={<WeeklyPapersPage />} />
        <Route path="papers/monthly-report" element={<WeeklyPapersPage />} />
        <Route path="settings"       element={<GroupSettingsPage />} />
        <Route path="roles"          element={<RolesHierarchyPage />} />
        <Route path="admission"      element={<AdmissionPage />} />
      </Route>

      <Route path="/" element={<TenantRoot />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

// ── edu.tws.enterprises — EduStack PK landing + registration ──
function EduRouter() {
  return (
    <Routes>
      <Route path="/"                element={<LandingPage />} />
      <Route path="/plan"            element={<PlanBuilderPage />} />
      <Route path="/register"        element={<RegisterPage />} />
      <Route path="/delete-account"  element={<DeleteAccountPage />} />
      <Route path="/privacy"         element={<PrivacyPolicyPage />} />
      <Route path="*"                element={<NotFoundPage />} />
    </Routes>
  );
}


export default function App() {
  const isDark = useThemeStore((s) => s.isDark);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const admin = isAdminDomain();
  const slug  = getOrgSlug();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          {admin ? <AdminRouter /> : slug ? <TenantRouter /> : <EduRouter />}
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
