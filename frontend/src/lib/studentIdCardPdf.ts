import jsPDF from 'jspdf';

export interface IdCardStudent {
  profile?: {
    name: string;
    bloodGroup?: string;
    photoUrl?: string;
    gender?: string;
  };
  personal?: {
    name: string;
    fatherName: string;
    bloodGroup?: string;
    emergencyContact?: string;
    photoUrl?: string;
  };
  documents?: { photo?: { url?: string } };
  guardianInfo?: { fatherName: string; emergencyContact?: string };
  admissionNo?: string;
  rollNo?: string;
  grNo?: string;
  allocatedProgramName?: string;
  refNo?: string;
  classId?: { name: string } | string;
}

const PRIMARY: [number, number, number] = [30, 58, 95];
const ACCENT: [number, number, number] = [245, 158, 11];

async function loadPhoto(photoUrl?: string): Promise<string | null> {
  if (!photoUrl) return null;
  try {
    const response = await fetch(photoUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function downloadStudentIdCardPdf(student: IdCardStudent, orgName: string): Promise<void> {
  // Credit-card size: 85.6 mm × 54 mm — print 2 per A4 row
  const cardW = 85.6;
  const cardH = 54;

  // A4 landscape to fit 2 cards side by side
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const name = student.profile?.name ?? student.personal?.name ?? 'Student';
  const fatherName = student.guardianInfo?.fatherName ?? student.personal?.fatherName ?? '—';
  const program = student.allocatedProgramName ?? (typeof student.classId === 'object' ? student.classId?.name : '') ?? '—';
  const grNo = student.admissionNo ?? student.grNo ?? '—';
  const rollNo = student.rollNo ?? '—';
  const bloodGroup = student.profile?.bloodGroup ?? student.personal?.bloodGroup ?? '—';
  const emergency = student.guardianInfo?.emergencyContact ?? student.personal?.emergencyContact ?? '—';
  const photoUrl = student.profile?.photoUrl ?? student.personal?.photoUrl ?? student.documents?.photo?.url;
  const photo = await loadPhoto(photoUrl);
  const qrText = `${window?.location?.origin ?? ''}/verify/${grNo}`;

  function drawCard(doc: jsPDF, startX: number, startY: number) {
    const x = startX;
    const y = startY;

    // Background
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, cardW, cardH, 3, 3, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(x, y, cardW, cardH, 3, 3);

    // Header band
    doc.setFillColor(...PRIMARY);
    doc.roundedRect(x, y, cardW, 14, 3, 3, 'F');
    doc.setFillColor(...PRIMARY);
    doc.rect(x, y + 8, cardW, 6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(orgName.toUpperCase(), x + cardW / 2, y + 6, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(200, 215, 255);
    doc.text('STUDENT IDENTITY CARD', x + cardW / 2, y + 11, { align: 'center' });

    // Photo placeholder area (left)
    const photoX = x + 4;
    const photoY = y + 17;
    const photoW = 20;
    const photoH = 25;
    doc.setFillColor(240, 244, 252);
    doc.setDrawColor(200, 210, 230);
    doc.rect(photoX, photoY, photoW, photoH, 'FD');
    if (photo) {
      const format = photo.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(photo, format, photoX, photoY, photoW, photoH);
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(5);
      doc.setTextColor(180, 190, 210);
      doc.text('PHOTO', photoX + photoW / 2, photoY + photoH / 2 + 1, { align: 'center' });
    }

    // Info area (right of photo)
    const infoX = photoX + photoW + 4;
    const infoY = y + 18;
    const lineH = 5.2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(20, 20, 20);
    const splitName = doc.splitTextToSize(name, cardW - infoX - x - 4);
    doc.text(splitName[0], infoX, infoY);

    const fields: [string, string][] = [
      ['Father', fatherName],
      ['Program', program],
      ['GR No', grNo],
      ['Roll No', rollNo],
    ];

    let iy = infoY + lineH + 1;
    for (const [label, value] of fields) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.2);
      doc.setTextColor(100, 110, 130);
      doc.text(label + ':', infoX, iy);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.8);
      doc.setTextColor(20, 20, 20);
      const splitVal = doc.splitTextToSize(value, cardW - infoX - x - 4 - 14);
      doc.text(splitVal[0], infoX + 14, iy);
      iy += lineH;
    }

    // Blood group + emergency (bottom left)
    const bottomY = y + 45;
    doc.setFillColor(245, 248, 255);
    doc.rect(x, bottomY, cardW, cardH - 45, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(180, 30, 30);
    doc.text(`Blood: ${bloodGroup}`, x + 5, bottomY + 5);
    doc.setTextColor(80, 80, 80);
    doc.text(`Emrg: ${emergency}`, x + 5, bottomY + 9.5);

    // QR placeholder (bottom right)
    const qrSize = 12;
    const qrX = x + cardW - qrSize - 4;
    const qrY = bottomY + 1;
    doc.setFillColor(230, 235, 245);
    doc.rect(qrX, qrY, qrSize, qrSize, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4);
    doc.setTextColor(160, 160, 180);
    doc.text('QR', qrX + qrSize / 2, qrY + qrSize / 2 + 1, { align: 'center' });
    // Note: Real QR code requires a QR library. This placeholder shows the area.
    doc.setFontSize(3.5);
    doc.setTextColor(160, 160, 180);
    doc.text('Scan to verify', qrX + qrSize / 2, qrY + qrSize + 2.5, { align: 'center' });

    // Accent bottom border
    doc.setFillColor(...ACCENT);
    doc.rect(x, y + cardH - 2.5, cardW, 2.5, 'F');
    doc.setFillColor(...ACCENT);
    doc.roundedRect(x, y + cardH - 2.5, cardW, 2.5, 0, 3, 'F');
  }

  // Draw 2 cards side by side on page
  const startX = (pageW - cardW * 2 - 10) / 2;
  const startY = (pageH - cardH) / 2;
  drawCard(doc, startX, startY);
  drawCard(doc, startX + cardW + 10, startY);

  // Cut guides
  doc.setDrawColor(180, 180, 180);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(startX + cardW + 5, startY - 5, startX + cardW + 5, startY + cardH + 5);
  doc.setLineDashPattern([], 0);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(200, 200, 200);
  doc.text('Generated by EduStack PK — WolfStack', pageW / 2, pageH - 5, { align: 'center' });

  void qrText;

  doc.save(`IDCard_${name.replace(/\s+/g, '_')}_${grNo}.pdf`);
}
