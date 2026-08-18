import api from './api';
import type { ApiResponse } from '../types';

export interface NotificationDoc {
  _id: string;
  type: 'fee_due' | 'result_published' | 'assignment_graded' | 'assignment_created' | 'broadcast' | 'resource_uploaded' | 'attendance_absent' | 'system';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export const notificationService = {
  list: (params?: Record<string, string>) =>
    api.get<ApiResponse<NotificationDoc[]>>('/notifications', { params }).then(r => r.data),

  getUnreadCount: () =>
    api.get<ApiResponse<{ count: number }>>('/notifications/unread-count').then(r => r.data.data?.count ?? 0),

  markRead: (id: string) =>
    api.post(`/notifications/${id}/read`),

  markAllRead: () =>
    api.post('/notifications/mark-all-read'),

  broadcast: (data: { title: string; message: string; targetRole?: string; targetStudents?: string[] }) =>
    api.post<ApiResponse<{ recipientCount: number }>>('/notifications/broadcast', data).then(r => r.data),
};
