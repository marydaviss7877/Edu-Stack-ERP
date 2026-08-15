import api from './api';
import type { ApiResponse } from '../types';

export interface PeerFeedbackQuestionDoc {
  _id: string;
  text: string;
  category: string;
  scaleType: 'likert5';
}

export interface MyCycle {
  cycleId: string;
  month: number;
  year: number;
  questions: PeerFeedbackQuestionDoc[];
  pendingPeers: { _id: string; name: string; rollNo: string }[];
}

export interface PeerFeedbackSummary {
  visible: boolean;
  responseCount: number;
  threshold: number;
  byCategory: { category: string; avgValue: number; count: number }[];
}

export const peerFeedbackService = {
  // Returns null both when the add-on is off (403) and when there's simply no open
  // cycle — the UI treats both as "nothing to show right now", not an error.
  getMyCycle: async (): Promise<MyCycle | null> => {
    try {
      const { data } = await api.get<ApiResponse<MyCycle | null>>('/peer-feedback/my-cycle');
      return data.data ?? null;
    } catch {
      return null;
    }
  },

  submitResponse: (payload: { cycleId: string; targetStudentId: string; answers: { questionId: string; value: number }[] }) =>
    api.post<ApiResponse<{ message: string }>>('/peer-feedback/respond', payload).then(r => r.data),

  getSummary: async (studentId: string): Promise<PeerFeedbackSummary | null> => {
    try {
      const { data } = await api.get<ApiResponse<PeerFeedbackSummary>>('/peer-feedback/summary', { params: { studentId } });
      return data.data ?? null;
    } catch {
      return null;
    }
  },
};
