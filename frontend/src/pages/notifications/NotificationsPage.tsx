import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../../services/notificationService';
import type { NotificationDoc } from '../../services/notificationService';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';
import { useAuthStore } from '../../stores/authStore';
import { cn } from '../../lib/utils';

const TYPE_COLORS: Record<string, string> = {
  fee_due: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  result_published: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  assignment_graded: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  assignment_created: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  broadcast: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  resource_uploaded: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
  attendance_absent: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  system: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400',
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsPage() {
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();
  const canBroadcast = ['branch_principal', 'group_admin', 'super_admin', 'teacher'].includes(user?.role ?? '');

  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [bcTitle, setBcTitle] = useState('');
  const [bcMessage, setBcMessage] = useState('');
  const [bcRole, setBcRole] = useState('all');
  const [apiError, setApiError] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data: resp, isLoading } = useQuery({
    queryKey: ['notifications', unreadOnly],
    queryFn: () => notificationService.list(unreadOnly ? { unreadOnly: 'true' } : undefined),
  });

  const notifications = resp?.data ?? [];
  const unreadCount = resp?.meta?.unreadCount ?? 0;

  const markReadMutation = useMutation({
    mutationFn: notificationService.markRead,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['notif-count'] }); },
  });

  const markAllMutation = useMutation({
    mutationFn: notificationService.markAllRead,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['notif-count'] }); },
  });

  const broadcastMutation = useMutation({
    mutationFn: notificationService.broadcast,
    onSuccess: () => { setBroadcastOpen(false); setBcTitle(''); setBcMessage(''); setBcRole('all'); },
    onError: (e: { response?: { data?: { message?: string } } }) => setApiError(e?.response?.data?.message ?? 'Error'),
  });

  const handleNotifClick = (n: NotificationDoc) => {
    if (!n.isRead) markReadMutation.mutate(n._id);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader
        title="Notifications"
        actions={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={() => markAllMutation.mutate()} className="btn-secondary text-xs">
                Mark all read
              </button>
            )}
            {canBroadcast && (
              <button onClick={() => { setBcTitle(''); setBcMessage(''); setBcRole('all'); setApiError(''); setBroadcastOpen(true); }} className="btn-primary text-sm">
                Send Message
              </button>
            )}
          </div>
        }
      />

      {/* Filter */}
      <div className="flex items-center gap-4 mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400 cursor-pointer">
          <input type="checkbox" checked={unreadOnly} onChange={e => setUnreadOnly(e.target.checked)} className="w-4 h-4 rounded" />
          Unread only
        </label>
        {unreadCount > 0 && (
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full dark:bg-blue-900/30 dark:text-blue-400">{unreadCount} unread</span>
        )}
      </div>

      <div className="card divide-y divide-gray-100 dark:divide-slate-700">
        {isLoading && <div className="px-5 py-10 text-center text-gray-400 dark:text-slate-500 text-sm">Loading...</div>}
        {!isLoading && notifications.length === 0 && (
          <div className="px-5 py-12 text-center text-gray-400 dark:text-slate-500">
            <div className="text-4xl mb-2">🔔</div>
            <p className="text-sm">{unreadOnly ? 'No unread notifications.' : 'No notifications yet.'}</p>
          </div>
        )}
        {notifications.map(n => (
          <div
            key={n._id}
            onClick={() => handleNotifClick(n)}
            className={cn(
              'flex items-start gap-4 px-4 py-4 cursor-pointer transition-colors',
              n.isRead ? 'hover:bg-gray-50 dark:hover:bg-slate-700/40' : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30'
            )}
          >
            <div className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0 mt-0.5', TYPE_COLORS[n.type] ?? 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400')}>
              {n.type.replace('_', ' ')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={cn('text-sm', n.isRead ? 'text-gray-700 dark:text-slate-300' : 'font-semibold text-gray-900 dark:text-slate-100')}>{n.title}</p>
                <span className="text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap shrink-0">{timeAgo(n.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{n.message}</p>
            </div>
            {!n.isRead && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />}
          </div>
        ))}
      </div>

      {/* Broadcast Modal */}
      <Modal open={broadcastOpen} onClose={() => setBroadcastOpen(false)} title="Send Broadcast Message">
        <div className="space-y-4">
          {apiError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{apiError}</div>}
          <div>
            <label className="label">Send To</label>
            <select className="input" value={bcRole} onChange={e => setBcRole(e.target.value)}>
              <option value="all">All staff & students</option>
              <option value="teacher">All teachers</option>
              <option value="student">All students</option>
              <option value="accountant">Accountants</option>
            </select>
          </div>
          <div>
            <label className="label">Title</label>
            <input className="input" value={bcTitle} onChange={e => setBcTitle(e.target.value)} placeholder="Notification title" />
          </div>
          <div>
            <label className="label">Message</label>
            <textarea className="input resize-none" rows={4} value={bcMessage} onChange={e => setBcMessage(e.target.value)} placeholder="Write your message..." />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setBroadcastOpen(false)} className="btn-secondary">Cancel</button>
            <button
              onClick={() => broadcastMutation.mutate({ title: bcTitle, message: bcMessage, targetRole: bcRole })}
              disabled={broadcastMutation.isPending || !bcTitle || !bcMessage}
              className="btn-primary"
            >
              {broadcastMutation.isPending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
