import api from './api';
import type { ApiResponse } from '../types';

export interface AttendanceRecord { studentId: string; status: 'present' | 'absent' | 'late' | 'excused'; note?: string; }
export interface AttendanceDoc { _id: string; classId: string; sectionId: string; date: string; periodNo?: number; records: AttendanceRecord[]; }
export interface StudentSummary { studentId: string; name: string; rollNo: string; present: number; absent: number; late: number; excused: number; total: number; percentage: number; isShortage: boolean; }

export type StaffStatus = 'present' | 'absent' | 'late' | 'on_leave';
export interface StaffRecord { staffId: string; status: StaffStatus; checkInTime?: string; checkOutTime?: string; note?: string; }
export interface StaffAttendanceDoc { _id: string; staffId: { _id: string; name: string; role: string } | string; date: string; status: StaffStatus; checkInTime?: string; checkOutTime?: string; }
export interface StaffSummary { staffId: string; name: string; role: string; present: number; absent: number; late: number; on_leave: number; total: number; }

export interface TodaySectionStatus {
  classId: string; className: string; sectionId: string; sectionName: string;
  totalStudents: number; marked: number; present: number; absent: number; late: number; excused: number;
  isMarked: boolean; percentage: number; markedByName: string | null; lastMarkedAt: string | null;
}
export interface TodayAttendanceStatus {
  date: string;
  sections: TodaySectionStatus[];
  summary: { totalSections: number; markedSections: number };
}

export type ProgressGroupBy = 'teacher' | 'class' | 'subject';
export interface ProgressReportRow {
  key: string; label: string; sublabel?: string;
  present: number; absent: number; late: number; excused: number; total: number;
  sessionsMarked: number; percentage: number; isShortage: boolean;
}

export const attendanceService = {
  mark: (data: { classId: string; sectionId: string; date: string; periodNo?: number; records: AttendanceRecord[] }) =>
    api.post<ApiResponse<AttendanceDoc>>('/attendance', data).then(r => r.data.data!),

  get: (params: Record<string, string>) =>
    api.get<ApiResponse<AttendanceDoc[]>>('/attendance', { params }).then(r => r.data.data ?? []),

  getStudentSummary: (params: { studentId: string; month: string; year: string }) =>
    api.get<ApiResponse<StudentSummary>>('/attendance/student-summary', { params }).then(r => r.data.data!),

  getSectionSummary: (params: { sectionId: string; month: string; year: string }) =>
    api.get<ApiResponse<StudentSummary[]>>('/attendance/section-summary', { params }).then(r => r.data.data ?? []),

  getTodayStatus: (params?: { date?: string }) =>
    api.get<ApiResponse<TodayAttendanceStatus>>('/attendance/today-status', { params }).then(r => r.data.data!),

  getProgressReport: (params: { groupBy: ProgressGroupBy; month: string; year: string; classId?: string; sectionId?: string; subjectId?: string; teacherId?: string }) =>
    api.get<ApiResponse<ProgressReportRow[]>>('/attendance/progress-report', { params }).then(r => r.data.data ?? []),

  getMyRecords: (params: { month: string; year: string }) =>
    api.get<ApiResponse<{ records: { date: string; status: string }[]; stats: { present: number; absent: number; late: number; excused: number; total: number; percentage: number; threshold: number; isShortage: boolean } }>>('/attendance/my-records', { params }).then(r => r.data.data!),

  markStaff: (data: { date: string; records: StaffRecord[] }) =>
    api.post<ApiResponse<{ message: string }>>('/attendance/staff', data).then(r => r.data),

  getStaff: (params: { date?: string; month?: string; year?: string }) =>
    api.get<ApiResponse<StaffAttendanceDoc[]>>('/attendance/staff', { params }).then(r => r.data.data ?? []),

  getStaffSummary: (params: { month: string; year: string }) =>
    api.get<ApiResponse<StaffSummary[]>>('/attendance/staff/summary', { params }).then(r => r.data.data ?? []),
};
