import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { peerFeedbackService } from '../../services/peerFeedbackService';
import PageHeader from '../../components/ui/PageHeader';

const SCALE_LABELS = ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'];

export default function PeerFeedbackPage() {
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const { data: cycle, isLoading } = useQuery({
    queryKey: ['peer-feedback-my-cycle'],
    queryFn: peerFeedbackService.getMyCycle,
  });

  const currentPeer = cycle?.pendingPeers[0];
  const allAnswered = !!cycle && cycle.questions.every(q => answers[q._id] !== undefined);

  const submit = useMutation({
    mutationFn: () => peerFeedbackService.submitResponse({
      cycleId: cycle!.cycleId,
      targetStudentId: currentPeer!._id,
      answers: cycle!.questions.map(q => ({ questionId: q._id, value: answers[q._id] })),
    }),
    onSuccess: () => {
      setAnswers({});
      queryClient.invalidateQueries({ queryKey: ['peer-feedback-my-cycle'] });
    },
  });

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4 pb-8">
      <PageHeader
        title="Peer Feedback"
        subtitle="Rate a few classmates honestly — they will never see who answered."
      />

      {isLoading && (
        <div className="card p-8 text-center text-sm text-gray-400 dark:text-slate-500">Loading...</div>
      )}

      {!isLoading && !cycle && (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-slate-400">Peer feedback isn't available right now.</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Check back later — your school opens this each month.</p>
        </div>
      )}

      {!isLoading && cycle && !currentPeer && (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-700 dark:text-slate-300 font-medium">You're all caught up!</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">No classmates left to rate this cycle.</p>
        </div>
      )}

      {!isLoading && cycle && currentPeer && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide">Rating</p>
              <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{currentPeer.name}</p>
            </div>
            <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold px-2.5 py-1 rounded-full shrink-0">
              {cycle.pendingPeers.length} left
            </span>
          </div>

          <div className="space-y-5">
            {cycle.questions.map(q => (
              <div key={q._id}>
                <p className="text-sm font-medium text-gray-800 dark:text-slate-200 mb-2">{q.text}</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {SCALE_LABELS.map((label, i) => {
                    const value = i + 1;
                    const selected = answers[q._id] === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setAnswers(a => ({ ...a, [q._id]: value }))}
                        className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-center transition-colors ${
                          selected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span className="text-sm font-bold">{value}</span>
                        <span className="text-[9px] leading-tight">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => submit.mutate()}
            disabled={!allAnswered || submit.isPending}
            className="btn-primary w-full mt-5 disabled:opacity-50"
          >
            {submit.isPending ? 'Submitting...' : 'Submit & Next'}
          </button>
        </div>
      )}
    </div>
  );
}
