import { Types } from 'mongoose';
import { Challan } from '../../models/Challan';
import { pushNotification } from '../../controllers/notificationController';

interface PopulatedStudent {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  profile: { name: string };
}

/**
 * Flips past-due unpaid/partial challans to 'overdue', then sends a 'fee_due' notification
 * to students whose challan is due within `daysBeforeDue` or already overdue — throttled so
 * the same challan isn't reminded more than once in a ~20h window (the job runs daily).
 */
export async function sendFeeReminders(opts?: {
  orgId?: string;
  branchId?: string;
  daysBeforeDue?: number;
}): Promise<{ markedOverdue: number; reminded: number }> {
  const now = new Date();
  const daysBeforeDue = opts?.daysBeforeDue ?? 3;

  const scope: Record<string, unknown> = {};
  if (opts?.orgId) scope['orgId'] = new Types.ObjectId(opts.orgId);
  if (opts?.branchId) scope['branchId'] = new Types.ObjectId(opts.branchId);

  const overdueResult = await Challan.updateMany(
    { ...scope, status: { $in: ['unpaid', 'partial'] }, dueDate: { $lt: now } },
    { $set: { status: 'overdue' } }
  );

  const upcomingCutoff = new Date(now.getTime() + daysBeforeDue * 24 * 60 * 60 * 1000);
  const reminderThrottle = new Date(now.getTime() - 20 * 60 * 60 * 1000);

  const candidates = await Challan.find({
    ...scope,
    status: { $in: ['unpaid', 'partial', 'overdue'] },
    dueDate: { $lte: upcomingCutoff },
    $or: [{ lastReminderAt: { $exists: false } }, { lastReminderAt: { $lt: reminderThrottle } }],
  })
    .populate<{ studentId: PopulatedStudent }>('studentId', 'userId profile.name')
    .lean();

  let reminded = 0;
  for (const challan of candidates) {
    const student = challan.studentId as unknown as PopulatedStudent | null;
    if (!student?.userId) continue;

    const balance = challan.netAmount - challan.paidAmount;
    if (balance <= 0) continue;

    const isOverdue = challan.status === 'overdue';
    const dueLabel = new Date(challan.dueDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });

    await pushNotification({
      orgId: challan.orgId,
      branchId: challan.branchId,
      recipientId: student.userId,
      type: 'fee_due',
      title: isOverdue ? 'Fee Payment Overdue' : 'Fee Payment Due Soon',
      message: isOverdue
        ? `Challan ${challan.challanNo} (PKR ${balance.toLocaleString()}) was due on ${dueLabel} and is now overdue. Please pay at your earliest convenience.`
        : `Challan ${challan.challanNo} (PKR ${balance.toLocaleString()}) is due on ${dueLabel}.`,
      link: '/fees',
    });

    await Challan.updateOne({ _id: challan._id }, { $set: { lastReminderAt: now }, $inc: { remindersSent: 1 } });
    reminded++;
  }

  console.log(`[FeeReminderJob] Marked ${overdueResult.modifiedCount} overdue, sent ${reminded} reminder(s)`);
  return { markedOverdue: overdueResult.modifiedCount, reminded };
}
