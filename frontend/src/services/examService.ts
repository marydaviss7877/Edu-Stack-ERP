import api from './api';
import type { ApiResponse } from '../types';

export interface ExamSubject { subjectId: string; totalMarks: number; passingMarks: number; examDate?: string; }
export interface GradeThreshold { grade: string; minPercentage: number; maxPercentage: number; }
export interface ExamDoc { _id: string; name: string; academicYearId: string; classId?: string; sectionId?: string; subjects: ExamSubject[]; gradingConfig: GradeThreshold[]; startDate: string; endDate: string; isPublished: boolean; }
export interface ResultDoc { _id: string; examId: string; studentId: { _id: string; profile: { name: string }; rollNo: string } | string; percentage: number; grade: string; totalMarksObtained: number; totalMarks: number; isPassed: boolean; classPosition?: number; remarks?: string; subjectMarks: { subjectId: string | { _id: string; name: string; code: string }; marksObtained: number; totalMarks: number; isPassed: boolean; isAbsent: boolean }[]; }

export interface StudentSummary { studentId: string; name?: string; rollNo?: string; percentage: number; grade: string; isPassed: boolean; }
export interface SubjectStat { subjectId: string; subjectName: string; average: number; passRate: number; highest: number; lowest: number; attempted: number; }
export interface ExamAnalytics {
  totalStudents: number; absentCount: number; classAverage: number; passRate: number;
  gradeDistribution: { grade: string; count: number }[];
  subjectStats: SubjectStat[];
  topPerformers: StudentSummary[]; bottomPerformers: StudentSummary[];
}
export interface ExamProgressPoint { examId: string; examName: string; startDate: string; totalStudents: number; classAverage: number; passRate: number; }

export const examService = {
  list: (params?: Record<string, string>) =>
    api.get<ApiResponse<ExamDoc[]>>('/exams', { params }).then(r => r.data.data ?? []),

  get: (id: string) => api.get<ApiResponse<ExamDoc>>(`/exams/${id}`).then(r => r.data.data!),

  create: (data: Omit<ExamDoc, '_id' | 'isPublished'>) =>
    api.post<ApiResponse<ExamDoc>>('/exams', data).then(r => r.data.data!),

  update: (id: string, data: Partial<ExamDoc>) =>
    api.put<ApiResponse<ExamDoc>>(`/exams/${id}`, data).then(r => r.data.data!),

  enterMarks: (examId: string, studentId: string, subjectMarks: { subjectId: string; marksObtained: number; isAbsent?: boolean }[], remarks?: string) =>
    api.post<ApiResponse<ResultDoc>>(`/exams/${examId}/marks`, { studentId, subjectMarks, remarks }).then(r => r.data.data!),

  setRemarks: (examId: string, studentId: string, remarks: string) =>
    api.patch<ApiResponse<ResultDoc>>(`/exams/${examId}/results/${studentId}/remarks`, { remarks }).then(r => r.data.data!),

  publish: (id: string) =>
    api.post<ApiResponse<ExamDoc>>(`/exams/${id}/publish`).then(r => r.data),

  getResults: (params?: Record<string, string>) =>
    api.get<ApiResponse<ResultDoc[]>>('/exams/results', { params }).then(r => r.data.data ?? []),

  getAnalytics: (examId: string, params?: Record<string, string>) =>
    api.get<ApiResponse<ExamAnalytics>>(`/exams/${examId}/analytics`, { params }).then(r => r.data.data!),

  getProgress: (params: Record<string, string>) =>
    api.get<ApiResponse<ExamProgressPoint[]>>('/exams/progress', { params }).then(r => r.data.data ?? []),
};
