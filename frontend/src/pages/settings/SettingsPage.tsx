import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { Branch, ApiResponse } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import PageHeader from '../../components/ui/PageHeader';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SettingsPage() {
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);
  const { isDark, toggle: toggleDark } = useThemeStore();

  const { data, isLoading } = useQuery({
    queryKey: ['branch', user?.branchId],
    queryFn: () => api.get<ApiResponse<Branch>>(`/branches/${user!.branchId}`).then(r => r.data.data!),
    enabled: !!user?.branchId,
  });

  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    principalName: '',
    settings: {
      attendanceThreshold: 75,
      periodsPerDay: 8,
      workingDays: [1, 2, 3, 4, 5],
    },
    academicThresholds: {
      weakThreshold: 50,
      failingThreshold: 40,
      clearancePassMark: 40,
    },
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name,
        address: data.address ?? '',
        city: data.city ?? '',
        phone: (data as any).phone ?? '',
        email: (data as any).email ?? '',
        principalName: (data as any).principalName ?? '',
        settings: {
          attendanceThreshold: data.settings?.attendanceThreshold ?? 75,
          periodsPerDay: data.settings?.periodsPerDay ?? 8,
          workingDays: data.settings?.workingDays ?? [1, 2, 3, 4, 5],
        },
        academicThresholds: {
          weakThreshold: data.academicThresholds?.weakThreshold ?? 50,
          failingThreshold: data.academicThresholds?.failingThreshold ?? 40,
          clearancePassMark: data.academicThresholds?.clearancePassMark ?? 40,
        },
      });
    }
  }, [data]);

  const update = useMutation({
    mutationFn: (body: typeof form) => api.put(`/branches/${user!.branchId}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branch'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const toggleDay = (day: number) => {
    setForm(f => ({
      ...f,
      settings: {
        ...f.settings,
        workingDays: f.settings.workingDays.includes(day)
          ? f.settings.workingDays.filter(d => d !== day)
          : [...f.settings.workingDays, day].sort((a, b) => a - b),
      },
    }));
  };

  const inputCls = 'w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors';
  const labelCls = 'block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1';
  const cardCls = 'bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5';
  const headingCls = 'font-semibold text-gray-900 dark:text-slate-100 mb-4';

  if (!user?.branchId) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <PageHeader title="Settings" />
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 px-5 py-12 text-center text-gray-400 dark:text-slate-500 text-sm">
          Settings are available for branch-level users only.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader title="Branch Settings" subtitle="Configure your branch's operational parameters" />

      {isLoading ? (
        <div className="text-center py-12 text-gray-400 dark:text-slate-500 text-sm">Loading settings...</div>
      ) : (
        <form onSubmit={e => { e.preventDefault(); update.mutate(form); }} className="space-y-6">
          {saved && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-xl p-3 text-sm text-green-700 dark:text-green-400">
              ✓ Settings saved successfully.
            </div>
          )}

          {/* Branch Info */}
          <div className={cardCls}>
            <h2 className={headingCls}>Branch Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelCls}>Branch Name</label>
                <input className={inputCls} value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Principal Name</label>
                <input className={inputCls} value={form.principalName}
                  onChange={e => setForm(f => ({ ...f, principalName: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input className={inputCls} value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" className={inputCls} value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>City</label>
                <input className={inputCls} value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Address</label>
                <input className={inputCls} value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Academic Settings */}
          <div className={cardCls}>
            <h2 className={headingCls}>Academic Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Attendance Threshold</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">Minimum attendance % before shortage alert</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={0} max={100}
                    className="w-20 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm text-center bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.settings.attendanceThreshold}
                    onChange={e => setForm(f => ({ ...f, settings: { ...f.settings, attendanceThreshold: Number(e.target.value) } }))}
                  />
                  <span className="text-sm text-gray-500 dark:text-slate-400">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Periods Per Day</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">Number of class periods in a school day</p>
                </div>
                <input
                  type="number" min={1} max={16}
                  className="w-20 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm text-center bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.settings.periodsPerDay}
                  onChange={e => setForm(f => ({ ...f, settings: { ...f.settings, periodsPerDay: Number(e.target.value) } }))}
                />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-2">Working Days</p>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((day, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        form.settings.workingDays.includes(i)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">0 = Sunday, 6 = Saturday</p>
              </div>
            </div>
          </div>

          {/* Weak-Topic & Clearance Thresholds */}
          <div className={cardCls}>
            <h2 className={headingCls}>Weak-Topic &amp; Clearance Thresholds</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Weak Threshold</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">Below this % on a weekly test flags the topic as weak</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={0} max={100}
                    className="w-20 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm text-center bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.academicThresholds.weakThreshold}
                    onChange={e => setForm(f => ({ ...f, academicThresholds: { ...f.academicThresholds, weakThreshold: Number(e.target.value) } }))}
                  />
                  <span className="text-sm text-gray-500 dark:text-slate-400">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Failing Threshold</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">Below this monthly average triggers an automatic clearance exam</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={0} max={100}
                    className="w-20 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm text-center bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.academicThresholds.failingThreshold}
                    onChange={e => setForm(f => ({ ...f, academicThresholds: { ...f.academicThresholds, failingThreshold: Number(e.target.value) } }))}
                  />
                  <span className="text-sm text-gray-500 dark:text-slate-400">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Clearance Pass Mark</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">Minimum % to pass a clearance exam and clear the weak flag</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={0} max={100}
                    className="w-20 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm text-center bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.academicThresholds.clearancePassMark}
                    onChange={e => setForm(f => ({ ...f, academicThresholds: { ...f.academicThresholds, clearancePassMark: Number(e.target.value) } }))}
                  />
                  <span className="text-sm text-gray-500 dark:text-slate-400">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className={cardCls}>
            <h2 className={headingCls}>Appearance</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Dark Mode</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">Switch to a darker color scheme</p>
              </div>
              <button
                type="button"
                onClick={toggleDark}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${
                  isDark ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  isDark ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={update.isPending}
            className="w-full py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {update.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      )}
    </div>
  );
}
