import api from './api';
import type { ApiResponse } from '../types';

export interface ExamScheduleSlot {
  subjectId: string | { _id: string; name: string; code?: string };
  date: string;
  startTime: string;
  endTime: string;
  syllabus: string;
  topicIds: (string | { _id: string; topicName: string; chapterNumber: number })[];
}

export interface ExamScheduleDoc {
  _id: string;
  orgId: string;
  branchId: string;
  examId: string | { _id: string; name: string };
  classId: string | { _id: string; name: string; section?: string };
  slots: ExamScheduleSlot[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export const examScheduleService = {
  list: (params?: { examId?: string; classId?: string }) =>
    api.get<ApiResponse<ExamScheduleDoc[]>>('/exam-schedules', { params })
      .then(r => r.data.data ?? []),

  get: (id: string) =>
    api.get<ApiResponse<ExamScheduleDoc>>(`/exam-schedules/${id}`)
      .then(r => r.data.data!),

  upsert: (data: { examId: string; classId: string; slots: Omit<ExamScheduleSlot, never>[] }) =>
    api.post<ApiResponse<ExamScheduleDoc>>('/exam-schedules', data)
      .then(r => r.data.data!),

  update: (id: string, slots: ExamScheduleSlot[]) =>
    api.put<ApiResponse<ExamScheduleDoc>>(`/exam-schedules/${id}`, { slots })
      .then(r => r.data.data!),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/exam-schedules/${id}`)
      .then(r => r.data),
};
