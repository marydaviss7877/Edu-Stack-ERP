import api from './api';
import type { ApiResponse } from '../types';
import type { GradeThreshold } from './examService';

export interface CombinedComponent { examId: string | { _id: string; name: string; startDate?: string; endDate?: string }; weight: number; }
export interface CombinedAssessmentDoc {
  _id: string;
  name: string;
  academicYearId: string;
  classId: string | { _id: string; name: string; level?: string };
  sectionId?: string | { _id: string; name: string };
  components: CombinedComponent[];
  gradingConfig: GradeThreshold[];
  isPublished: boolean;
}

export interface CombinedComponentResult { examId: string; percentage: number; weight: number; isPassed: boolean; }
export interface CombinedResultRow {
  studentId: string;
  name?: string;
  rollNo?: string;
  componentResults: CombinedComponentResult[];
  incompleteComponents: number;
  overallPercentage: number;
  grade: string;
  isPassed: boolean;
  classPosition: number;
}

export const combinedAssessmentService = {
  list: (params?: Record<string, string>) =>
    api.get<ApiResponse<CombinedAssessmentDoc[]>>('/combined-assessments', { params }).then(r => r.data.data ?? []),

  get: (id: string) =>
    api.get<ApiResponse<CombinedAssessmentDoc>>(`/combined-assessments/${id}`).then(r => r.data.data!),

  create: (data: Omit<CombinedAssessmentDoc, '_id' | 'isPublished'>) =>
    api.post<ApiResponse<CombinedAssessmentDoc>>('/combined-assessments', data).then(r => r.data.data!),

  update: (id: string, data: Partial<CombinedAssessmentDoc>) =>
    api.put<ApiResponse<CombinedAssessmentDoc>>(`/combined-assessments/${id}`, data).then(r => r.data.data!),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/combined-assessments/${id}`).then(r => r.data),

  publish: (id: string) =>
    api.post<ApiResponse<CombinedAssessmentDoc>>(`/combined-assessments/${id}/publish`).then(r => r.data.data!),

  getResults: (id: string) =>
    api.get<ApiResponse<CombinedResultRow[]>>(`/combined-assessments/${id}/results`).then(r => r.data.data ?? []),
};
