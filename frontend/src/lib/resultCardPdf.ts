import jsPDF from 'jspdf';
import type { ResultDoc } from '../services/examService';
import type { CombinedResultRow } from '../services/combinedAssessmentService';

interface ResultCardOptions {
  result: ResultDoc;
  examName: string;
  orgName: string;
  studentName?: string;
  rollNo?: string;
  className?: string;
  remarks?: string;
}

function subjectName(sm: ResultDoc['subjectMarks'][0]): string {
  return typeof sm.subjectId === 'object' ? sm.subjectId.name : 'Subject';
}

function pkr(n: number) {
  return n.toFixed(0);
}

const PRIMARY: [number, number, number] = [30, 58, 95];

export function downloadResultCardPdf(opts: ResultCardOptions): void {
  const { result, examName, orgName, studentName, rollNo, className, remarks } = opts;
  const effectiveRemarks = remarks ?? result.remarks;
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const W   = doc.internal.pageSize.getWidth();
  const H   = doc.internal.pageSize.getHeight();
  const m   = 18;
  const cw  = W - m * 2;
  const c1  = m + 5;
  const c2  = m + cw / 2;
  let y = 14;

  const resultColor: [number, number, number] = result.isPassed ? [16, 120, 70] : [200, 40, 40];

  // ── Header ─────────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(m, y, cw, 26, 'F');

  // Org initial badge
  doc.setFillColor(255, 255, 255, 0.15);
  doc.rect(m + 4, y + 3, 20, 20, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(orgName.charAt(0).toUpperCase(), m + 14, y + 16, { align: 'center' });

  doc.setFontSize(14);
  doc.text(orgName, m + 30, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(200, 215, 240);
  doc.text('RESULT CARD', m + 30, y + 19);

  // Exam name right-aligned
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(examName, W - m - 5, y + 11, { align: 'right' });
  y += 30;

  // ── Student info box ────────────────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.rect(m, y, cw, 20, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.rect(m, y, cw, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(110, 110, 110);
  doc.text('Student Name', c1, y + 6);
  doc.text('Roll No.', c2, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text(studentName ?? '—', c1, y + 14);
  doc.setFontSize(9);
  doc.text(rollNo ?? '—', c2, y + 14);
  y += 22;

  if (className) {
    doc.setFillColor(248, 250, 252);
    doc.rect(m, y, cw, 12, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.rect(m, y, cw, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(110, 110, 110);
    doc.text('Class', c1, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);
    doc.text(className, c1, y + 10.5);
    y += 14;
  }
  y += 4;

  // ── Subject table ───────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(m, y, cw, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  const col = {
    sub: c1,
    obt: m + cw * 0.52,
    tot: m + cw * 0.66,
    pct: m + cw * 0.8,
    sts: W - m - 5,
  };
  doc.text('Subject',   col.sub, y + 5.5);
  doc.text('Obtained',  col.obt, y + 5.5);
  doc.text('Total',     col.tot, y + 5.5);
  doc.text('%',         col.pct, y + 5.5);
  doc.text('Status',    col.sts, y + 5.5, { align: 'right' });
  y += 8;

  result.subjectMarks.forEach((sm, i) => {
    const bg: [number, number, number] = i % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(...bg);
    doc.rect(m, y, cw, 7.5, 'F');
    doc.setDrawColor(235, 235, 235);
    doc.line(m, y + 7.5, m + cw, y + 7.5);

    const pct = sm.totalMarks > 0 ? ((sm.marksObtained / sm.totalMarks) * 100).toFixed(1) : '—';
    const statusStr = sm.isAbsent ? 'Absent' : sm.isPassed ? 'Pass' : 'Fail';
    const statusColor: [number, number, number] = sm.isAbsent
      ? [120, 120, 120]
      : sm.isPassed ? [16, 120, 70] : [200, 40, 40];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 30, 30);
    doc.text(subjectName(sm), col.sub, y + 5);
    doc.text(sm.isAbsent ? '—' : pkr(sm.marksObtained), col.obt, y + 5);
    doc.text(pkr(sm.totalMarks), col.tot, y + 5);
    doc.text(sm.isAbsent ? '—' : `${pct}%`, col.pct, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...statusColor);
    doc.text(statusStr, col.sts, y + 5, { align: 'right' });
    y += 7.5;
  });
  y += 5;

  // ── Summary row ─────────────────────────────────────────
  const boxW = (cw - 12) / 3;
  const summaryBoxes = [
    { label: 'Total Marks', value: `${pkr(result.totalMarksObtained)} / ${pkr(result.totalMarks)}` },
    { label: 'Percentage',  value: `${result.percentage.toFixed(1)}%` },
    { label: 'Grade',       value: result.grade },
  ];

  summaryBoxes.forEach((box, i) => {
    const bx = m + i * (boxW + 6);
    doc.setFillColor(248, 250, 252);
    doc.rect(bx, y, boxW, 18, 'F');
    doc.setDrawColor(...PRIMARY);
    doc.rect(bx, y, boxW, 18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...PRIMARY);
    doc.text(box.value, bx + boxW / 2, y + 11, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(110, 110, 110);
    doc.text(box.label, bx + boxW / 2, y + 16, { align: 'center' });
  });

  // PASS / FAIL badge
  const badgeX = m + 3 * (boxW + 6);
  const badgeW = W - m - 5 - badgeX;
  doc.setFillColor(...resultColor);
  doc.rect(badgeX, y, badgeW, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(result.isPassed ? 'PASSED' : 'FAILED', badgeX + badgeW / 2, y + 11, { align: 'center' });
  y += 24;

  if (result.classPosition) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 58, 95);
    doc.text(`Class Position: ${result.classPosition}`, c1, y);
    y += 8;
  }

  if (effectiveRemarks) {
    const lines = doc.splitTextToSize(effectiveRemarks, cw - 10);
    const boxH = 12 + lines.length * 4.5;
    doc.setFillColor(248, 250, 252);
    doc.rect(m, y, cw, boxH, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.rect(m, y, cw, boxH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(110, 110, 110);
    doc.text('Remarks', c1, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text(lines, c1, y + 12);
    y += boxH + 6;
  }

  // ── Footer ──────────────────────────────────────────────
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(190, 190, 190);
  doc.text('Generated by EduStack PK — WolfStack', W / 2, H - 9, { align: 'center' });
  doc.text('This is a computer-generated document.', W / 2, H - 5, { align: 'center' });

  const fileName = `result_${(studentName ?? 'student').replace(/\s+/g, '_')}_${examName.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}

interface CombinedResultCardOptions {
  row: CombinedResultRow;
  assessmentName: string;
  orgName: string;
  componentNames: Record<string, string>;
  className?: string;
}

export function downloadCombinedResultCardPdf(opts: CombinedResultCardOptions): void {
  const { row, assessmentName, orgName, componentNames, className } = opts;
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const m = 18;
  const cw = W - m * 2;
  const c1 = m + 5;
  const c2 = m + cw / 2;
  let y = 14;

  const resultColor: [number, number, number] = row.isPassed ? [16, 120, 70] : [200, 40, 40];

  // ── Header ─────────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(m, y, cw, 26, 'F');
  doc.setFillColor(255, 255, 255, 0.15);
  doc.rect(m + 4, y + 3, 20, 20, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(orgName.charAt(0).toUpperCase(), m + 14, y + 16, { align: 'center' });
  doc.setFontSize(14);
  doc.text(orgName, m + 30, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(200, 215, 240);
  doc.text('COMBINED RESULT CARD', m + 30, y + 19);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(assessmentName, W - m - 5, y + 11, { align: 'right' });
  y += 30;

  // ── Student info box ────────────────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.rect(m, y, cw, 20, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.rect(m, y, cw, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(110, 110, 110);
  doc.text('Student Name', c1, y + 6);
  doc.text('Roll No.', c2, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text(row.name ?? '—', c1, y + 14);
  doc.setFontSize(9);
  doc.text(row.rollNo ?? '—', c2, y + 14);
  y += 22;

  if (className) {
    doc.setFillColor(248, 250, 252);
    doc.rect(m, y, cw, 12, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.rect(m, y, cw, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(110, 110, 110);
    doc.text('Class', c1, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);
    doc.text(className, c1, y + 10.5);
    y += 14;
  }
  y += 4;

  // ── Component breakdown table ───────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(m, y, cw, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  const col = { comp: c1, weight: m + cw * 0.5, pct: m + cw * 0.68, sts: W - m - 5 };
  doc.text('Component', col.comp, y + 5.5);
  doc.text('Weight', col.weight, y + 5.5);
  doc.text('Score %', col.pct, y + 5.5);
  doc.text('Status', col.sts, y + 5.5, { align: 'right' });
  y += 8;

  row.componentResults.forEach((cr, i) => {
    const bg: [number, number, number] = i % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(...bg);
    doc.rect(m, y, cw, 7.5, 'F');
    doc.setDrawColor(235, 235, 235);
    doc.line(m, y + 7.5, m + cw, y + 7.5);
    const statusStr = cr.isPassed ? 'Pass' : 'Fail';
    const statusColor: [number, number, number] = cr.isPassed ? [16, 120, 70] : [200, 40, 40];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 30, 30);
    doc.text(componentNames[cr.examId] ?? 'Exam', col.comp, y + 5);
    doc.text(String(cr.weight), col.weight, y + 5);
    doc.text(`${cr.percentage}%`, col.pct, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...statusColor);
    doc.text(statusStr, col.sts, y + 5, { align: 'right' });
    y += 7.5;
  });
  if (row.incompleteComponents > 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(200, 120, 20);
    doc.text(`${row.incompleteComponents} component(s) missing — overall % renormalized over available weight.`, c1, y + 5);
    y += 8;
  }
  y += 5;

  // ── Summary row ─────────────────────────────────────────
  const boxW = (cw - 12) / 3;
  const summaryBoxes = [
    { label: 'Overall %', value: `${row.overallPercentage.toFixed(1)}%` },
    { label: 'Grade', value: row.grade },
    { label: 'Class Position', value: row.classPosition ? `#${row.classPosition}` : '—' },
  ];
  summaryBoxes.forEach((box, i) => {
    const bx = m + i * (boxW + 6);
    doc.setFillColor(248, 250, 252);
    doc.rect(bx, y, boxW, 18, 'F');
    doc.setDrawColor(...PRIMARY);
    doc.rect(bx, y, boxW, 18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...PRIMARY);
    doc.text(box.value, bx + boxW / 2, y + 11, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(110, 110, 110);
    doc.text(box.label, bx + boxW / 2, y + 16, { align: 'center' });
  });

  const badgeX = m + 3 * (boxW + 6);
  const badgeW = W - m - 5 - badgeX;
  doc.setFillColor(...resultColor);
  doc.rect(badgeX, y, badgeW, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(row.isPassed ? 'PASSED' : 'FAILED', badgeX + badgeW / 2, y + 11, { align: 'center' });
  y += 24;

  // ── Footer ──────────────────────────────────────────────
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(190, 190, 190);
  doc.text('Generated by EduStack PK — WolfStack', W / 2, H - 9, { align: 'center' });
  doc.text('This is a computer-generated document.', W / 2, H - 5, { align: 'center' });

  const fileName = `combined_result_${(row.name ?? 'student').replace(/\s+/g, '_')}_${assessmentName.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}
