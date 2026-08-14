import api from './api';
import type { ApiResponse } from '../types';

export interface TopicDoc {
  _id: string;
  classId: string | { _id: string; name: string; level: string };
  subjectId: string | { _id: string; name: string; code: string };
  chapterNumber: number;
  topicName: string;
  orderIndex: number;
}

export const topicService = {
  list: (params?: { subjectId?: string; classId?: string }) =>
    api.get<ApiResponse<TopicDoc[]>>('/topics', { params }).then(r => r.data.data ?? []),

  create: (data: { classId: string; subjectId: string; chapterNumber: number; topicName: string; orderIndex?: number }) =>
    api.post<ApiResponse<TopicDoc>>('/topics', data).then(r => r.data.data!),
};
