import jsPDF from 'jspdf';
import type { ProgressGroupBy, ProgressReportRow, StudentSummary } from '../services/attendanceService';

const PRIMARY: [number, number, number] = [30, 58, 95];
const GREEN:   [number, number, number] = [16, 120, 70];
const RED:     [number, number, number] = [185, 40, 40];

function monthLabel(month: string, year: string): string {
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  return d.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });
}

export function downloadAttendancePdf(opts: {
  records: StudentSummary[];
  className: string;
  sectionName: string;
  month: string;
  year: string;
  orgName: string;
}): void {
  const { records, className, sectionName, month, year, orgName } = opts;

  const doc = new jsPDF('landscape', 'mm', 'a4');
  const W  = doc.internal.pageSize.getWidth();
  const H  = doc.internal.pageSize.getHeight();
  const m  = 15;
  const cw = W - m * 2;
  let y    = 12;

  // ── Header ─────────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(m, y, cw, 24, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(orgName, m + 8, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(200, 215, 240);
  doc.text('MONTHLY ATTENDANCE REGISTER', m + 8, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`${className} — Section ${sectionName}`, W - m - 8, y + 10, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(monthLabel(month, year), W - m - 8, y + 18, { align: 'right' });
  y += 28;

  // ── Summary stats bar ─────────────────────────────────
  const totalPresent  = records.reduce((s, r) => s + r.present,  0);
  const totalAbsent   = records.reduce((s, r) => s + r.absent,   0);
  const totalLate     = records.reduce((s, r) => s + r.late,     0);
  const totalExcused  = records.reduce((s, r) => s + r.excused,  0);
  const shortageCount = records.filter(r => r.isShortage).length;
  const avgPct        = records.length
    ? Math.round(records.reduce((s, r) => s + r.percentage, 0) / records.length)
    : 0;

  const statBoxes = [
    { label: 'Total Students', value: String(records.length) },
    { label: 'Avg Attendance', value: `${avgPct}%` },
    { label: 'Total Present Days', value: String(totalPresent) },
    { label: 'Total Absent Days', value: String(totalAbsent) },
    { label: 'Late', value: String(totalLate) },
    { label: 'Excused', value: String(totalExcused) },
    { label: 'Shortage Alerts', value: String(shortageCount) },
  ];

  const bw = cw / statBoxes.length;
  statBoxes.forEach((b, i) => {
    const bx = m + i * bw;
    doc.setFillColor(i === 6 && shortageCount > 0 ? 255 : 248, i === 6 && shortageCount > 0 ? 245 : 250, i === 6 && shortageCount > 0 ? 245 : 252);
    doc.rect(bx, y, bw, 14, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.rect(bx, y, bw, 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(i === 6 && shortageCount > 0 ? 185 : 30, i === 6 && shortageCount > 0 ? 40 : 58, i === 6 && shortageCount > 0 ? 40 : 95);
    doc.text(b.value, bx + bw / 2, y + 7.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(120, 120, 120);
    doc.text(b.label, bx + bw / 2, y + 12, { align: 'center' });
  });
  y += 18;

  // ── Table header ─────────────────────────────────────
  const col = {
    roll: m + 4,
    name: m + 22,
    pre:  m + cw * 0.55,
    abs:  m + cw * 0.63,
    late: m + cw * 0.71,
    exc:  m + cw * 0.79,
    tot:  m + cw * 0.87,
    pct:  m + cw * 0.93,
    sts:  W - m - 4,
  };

  doc.setFillColor(...PRIMARY);
  doc.rect(m, y, cw, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Roll', col.roll, y + 5.5);
  doc.text('Student Name', col.name, y + 5.5);
  doc.text('Present', col.pre, y + 5.5, { align: 'center' });
  doc.text('Absent', col.abs, y + 5.5, { align: 'center' });
  doc.text('Late', col.late, y + 5.5, { align: 'center' });
  doc.text('Excused', col.exc, y + 5.5, { align: 'center' });
  doc.text('Total', col.tot, y + 5.5, { align: 'center' });
  doc.text('%', col.pct, y + 5.5, { align: 'center' });
  doc.text('Status', col.sts, y + 5.5, { align: 'right' });
  y += 8;

  // ── Table rows ────────────────────────────────────────
  const ROW_H = 7;
  records.forEach((r, i) => {
    if (y + ROW_H > H - 14) {
      doc.addPage('a4', 'landscape');
      y = 14;
    }

    const bg: [number, number, number] = r.isShortage
      ? [255, 245, 245]
      : i % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(...bg);
    doc.rect(m, y, cw, ROW_H, 'F');
    doc.setDrawColor(235, 235, 235);
    doc.line(m, y + ROW_H, m + cw, y + ROW_H);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(40, 40, 40);
    doc.text(r.rollNo ?? '—', col.roll, y + 5);
    doc.text(r.name ?? '—', col.name, y + 5);
    doc.text(String(r.present), col.pre,  y + 5, { align: 'center' });
    doc.setTextColor(...(r.absent > 0 ? RED : [40, 40, 40] as [number, number, number]));
    doc.text(String(r.absent),  col.abs,  y + 5, { align: 'center' });
    doc.setTextColor(40, 40, 40);
    doc.text(String(r.late),    col.late, y + 5, { align: 'center' });
    doc.text(String(r.excused), col.exc,  y + 5, { align: 'center' });
    doc.text(String(r.total),   col.tot,  y + 5, { align: 'center' });

    const pctColor: [number, number, number] = r.percentage >= 75 ? GREEN : RED;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...pctColor);
    doc.text(`${r.percentage}%`, col.pct, y + 5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...(r.isShortage ? RED : GREEN));
    doc.text(r.isShortage ? '⚠ SHORTAGE' : 'OK', col.sts, y + 5, { align: 'right' });
    y += ROW_H;
  });

  if (records.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text('No attendance records for this period.', W / 2, y + 10, { align: 'center' });
    y += 20;
  }

  // ── Footer ──────────────────────────────────────────────
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(190, 190, 190);
  doc.text('Generated by EduStack PK — WolfStack', W / 2, H - 9, { align: 'center' });
  doc.text('This is a computer-generated document.', W / 2, H - 5, { align: 'center' });

  const safeName = `${className}-${sectionName}-${month}-${year}`.replace(/\s+/g, '_');
  doc.save(`attendance_register_${safeName}.pdf`);
}

export function downloadAttendanceCsv(opts: {
  records: StudentSummary[];
  className: string;
  sectionName: string;
  month: string;
  year: string;
}): void {
  const { records, className, sectionName, month, year } = opts;

  const headers = ['Roll No', 'Name', 'Present', 'Absent', 'Late', 'Excused', 'Total Days', 'Percentage', 'Shortage'];
  const rows = records.map(r => [
    r.rollNo,
    r.name,
    r.present,
    r.absent,
    r.late,
    r.excused,
    r.total,
    `${r.percentage}%`,
    r.isShortage ? 'Yes' : 'No',
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `attendance_${className}-${sectionName}-${month}-${year}.csv`.replace(/\s+/g, '_');
  link.click();
  URL.revokeObjectURL(url);
}

const GROUP_LABEL: Record<ProgressGroupBy, string> = {
  teacher: 'TEACHER-WISE ATTENDANCE PROGRESS',
  class: 'CLASS-WISE ATTENDANCE PROGRESS',
  subject: 'SUBJECT-WISE ATTENDANCE PROGRESS',
};

const GROUP_COLUMN_LABEL: Record<ProgressGroupBy, string> = {
  teacher: 'Teacher',
  class: 'Class',
  subject: 'Subject',
};

export function downloadProgressReportPdf(opts: {
  rows: ProgressReportRow[];
  groupBy: ProgressGroupBy;
  month: string;
  year: string;
  orgName: string;
}): void {
  const { rows, groupBy, month, year, orgName } = opts;

  const doc = new jsPDF('landscape', 'mm', 'a4');
  const W  = doc.internal.pageSize.getWidth();
  const H  = doc.internal.pageSize.getHeight();
  const m  = 15;
  const cw = W - m * 2;
  let y    = 12;

  doc.setFillColor(...PRIMARY);
  doc.rect(m, y, cw, 24, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(orgName, m + 8, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(200, 215, 240);
  doc.text(GROUP_LABEL[groupBy], m + 8, y + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(monthLabel(month, year), W - m - 8, y + 14, { align: 'right' });
  y += 28;

  const shortageCount = rows.filter(r => r.isShortage).length;
  const avgPct = rows.length ? Math.round(rows.reduce((s, r) => s + r.percentage, 0) / rows.length) : 0;

  const statBoxes = [
    { label: GROUP_COLUMN_LABEL[groupBy] + 's', value: String(rows.length) },
    { label: 'Avg Attendance', value: `${avgPct}%` },
    { label: 'Sessions Marked', value: String(rows.reduce((s, r) => s + r.sessionsMarked, 0)) },
    { label: 'Below Threshold', value: String(shortageCount) },
  ];

  const bw = cw / statBoxes.length;
  statBoxes.forEach((b, i) => {
    const bx = m + i * bw;
    const flag = i === statBoxes.length - 1 && shortageCount > 0;
    doc.setFillColor(flag ? 255 : 248, flag ? 245 : 250, flag ? 245 : 252);
    doc.rect(bx, y, bw, 14, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.rect(bx, y, bw, 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(flag ? 185 : 30, flag ? 40 : 58, flag ? 40 : 95);
    doc.text(b.value, bx + bw / 2, y + 7.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(120, 120, 120);
    doc.text(b.label, bx + bw / 2, y + 12, { align: 'center' });
  });
  y += 18;

  const col = {
    label: m + 4,
    sessions: m + cw * 0.48,
    pre:  m + cw * 0.58,
    abs:  m + cw * 0.66,
    late: m + cw * 0.74,
    exc:  m + cw * 0.81,
    pct:  m + cw * 0.89,
    sts:  W - m - 4,
  };

  doc.setFillColor(...PRIMARY);
  doc.rect(m, y, cw, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(GROUP_COLUMN_LABEL[groupBy], col.label, y + 5.5);
  doc.text('Sessions', col.sessions, y + 5.5, { align: 'center' });
  doc.text('Present', col.pre, y + 5.5, { align: 'center' });
  doc.text('Absent', col.abs, y + 5.5, { align: 'center' });
  doc.text('Late', col.late, y + 5.5, { align: 'center' });
  doc.text('Excused', col.exc, y + 5.5, { align: 'center' });
  doc.text('%', col.pct, y + 5.5, { align: 'center' });
  doc.text('Status', col.sts, y + 5.5, { align: 'right' });
  y += 8;

  const ROW_H = 7;
  rows.forEach((r, i) => {
    if (y + ROW_H > H - 14) {
      doc.addPage('a4', 'landscape');
      y = 14;
    }

    const bg: [number, number, number] = r.isShortage
      ? [255, 245, 245]
      : i % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(...bg);
    doc.rect(m, y, cw, ROW_H, 'F');
    doc.setDrawColor(235, 235, 235);
    doc.line(m, y + ROW_H, m + cw, y + ROW_H);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(40, 40, 40);
    doc.text(r.sublabel ? `${r.label} — ${r.sublabel}` : r.label, col.label, y + 5);
    doc.text(String(r.sessionsMarked), col.sessions, y + 5, { align: 'center' });
    doc.text(String(r.present), col.pre,  y + 5, { align: 'center' });
    doc.setTextColor(...(r.absent > 0 ? RED : [40, 40, 40] as [number, number, number]));
    doc.text(String(r.absent),  col.abs,  y + 5, { align: 'center' });
    doc.setTextColor(40, 40, 40);
    doc.text(String(r.late),    col.late, y + 5, { align: 'center' });
    doc.text(String(r.excused), col.exc,  y + 5, { align: 'center' });

    const pctColor: [number, number, number] = r.percentage >= 75 ? GREEN : RED;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...pctColor);
    doc.text(`${r.percentage}%`, col.pct, y + 5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...(r.isShortage ? RED : GREEN));
    doc.text(r.isShortage ? '⚠ BELOW TARGET' : 'OK', col.sts, y + 5, { align: 'right' });
    y += ROW_H;
  });

  if (rows.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text('No attendance records for this period.', W / 2, y + 10, { align: 'center' });
    y += 20;
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(190, 190, 190);
  doc.text('Generated by EduStack PK — WolfStack', W / 2, H - 9, { align: 'center' });
  doc.text('This is a computer-generated document.', W / 2, H - 5, { align: 'center' });

  doc.save(`attendance_progress_${groupBy}_${month}_${year}.pdf`.replace(/\s+/g, '_'));
}

export function downloadProgressReportCsv(opts: {
  rows: ProgressReportRow[];
  groupBy: ProgressGroupBy;
  month: string;
  year: string;
}): void {
  const { rows, groupBy, month, year } = opts;

  const headers = [GROUP_COLUMN_LABEL[groupBy], 'Sessions Marked', 'Present', 'Absent', 'Late', 'Excused', 'Total', 'Percentage', 'Below Threshold'];
  const csvRows = rows.map(r => [
    r.sublabel ? `${r.label} — ${r.sublabel}` : r.label,
    r.sessionsMarked,
    r.present,
    r.absent,
    r.late,
    r.excused,
    r.total,
    `${r.percentage}%`,
    r.isShortage ? 'Yes' : 'No',
  ]);

  const csv = [headers, ...csvRows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `attendance_progress_${groupBy}_${month}_${year}.csv`.replace(/\s+/g, '_');
  link.click();
  URL.revokeObjectURL(url);
}
