import api from './api';
import type { ApiResponse } from '../types';

export interface PaperDoc {
  _id: string;
  classId: string | { _id: string; name: string; level: string };
  sectionId: string | { _id: string; name: string };
  subjectId: string | { _id: string; name: string; code: string };
  teacherId: string;
  topicId?: string | { _id: string; topicName: string; chapterNumber: number };
  paperType: 'weekly' | 'clearance';
  weekNumber: number;
  month: number;
  year: number;
  totalMarks: number;
  scheduledDate: string;
  status: 'draft' | 'active' | 'graded';
  createdAt: string;
}

export interface PaperResultDoc {
  _id: string;
  paperId: string;
  studentId: string | { _id: string; profile: { name: string }; rollNo: string };
  subjectId: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  isWeak: boolean;
  isAbsent: boolean;
}

export interface WeakTopicRow {
  percentage: number;
  marksObtained: number;
  totalMarks: number;
  isAbsent: boolean;
  paper: { month: number; year: number; weekNumber: number; scheduledDate: string };
  topic?: { topicName: string; chapterNumber: number };
  subject?: { name: string; code: string };
}

export interface ProgressWeeklyRow {
  paperId: string;
  subjectId: string;
  subjectName?: string;
  subjectCode?: string;
  topicName?: string;
  chapterNumber?: number;
  weekNumber: number;
  month: number;
  year: number;
  scheduledDate: string;
  percentage: number;
  marksObtained: number;
  totalMarks: number;
  isWeak: boolean;
  isAbsent: boolean;
}

export interface SubjectMasteryRow {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  totalTopics: number;
  topicsTested: number;
  topicsWeak: number;
  topicsMastered: number;
  masteryPct: number;
}

export interface StudentProgressDoc {
  weekly: ProgressWeeklyRow[];
  subjects: SubjectMasteryRow[];
  overall: { totalTopics: number; topicsTested: number; topicsMastered: number; masteryPct: number };
}

export interface MonthlyWeakReportRow {
  studentId: string;
  subjectId: string;
  studentName: string;
  rollNo: string;
  photoUrl?: string | null;
  className?: string;
  sectionName?: string;
  subjectName: string;
  subjectCode: string;
  avgPercentage: number;
  weakCount: number;
  totalPapers: number;
  absentCount: number;
  weakTopics: string[];
  isWeak: boolean;
}

export const weeklyPaperService = {
  list: (params?: { subjectId?: string; classId?: string; sectionId?: string; month?: string; year?: string; status?: string }) =>
    api.get<ApiResponse<PaperDoc[]>>('/papers', { params }).then(r => r.data.data ?? []),

  get: (id: string) =>
    api.get<ApiResponse<PaperDoc>>(`/papers/${id}`).then(r => r.data.data!),

  create: (data: { classId: string; sectionId: string; subjectId: string; academicYearId: string; topicId: string; weekNumber: number; month: number; year: number; totalMarks: number; scheduledDate: string }) =>
    api.post<ApiResponse<PaperDoc>>('/papers', data).then(r => r.data.data!),

  getResults: (id: string) =>
    api.get<ApiResponse<PaperResultDoc[]>>(`/papers/${id}/results`).then(r => r.data.data ?? []),

  enterMarks: (id: string, results: { studentId: string; marksObtained: number; isAbsent?: boolean }[]) =>
    api.post<ApiResponse<null>>(`/papers/${id}/marks`, { results }).then(r => r.data),

  getWeakTopics: (params: { studentId?: string; month?: string; year?: string; subjectId?: string }) =>
    api.get<ApiResponse<WeakTopicRow[]>>('/papers/weak-topics', { params }).then(r => r.data.data ?? []),

  getMonthlyReport: (params: { month: string; year: string; subjectId?: string; classId?: string; sectionId?: string }) =>
    api.get<ApiResponse<MonthlyWeakReportRow[]>>('/papers/monthly-report', { params }).then(r => r.data),

  getMyProgress: (params?: { studentId?: string; subjectId?: string }) =>
    api.get<ApiResponse<StudentProgressDoc>>('/papers/my-progress', { params }).then(r => r.data.data),
};
