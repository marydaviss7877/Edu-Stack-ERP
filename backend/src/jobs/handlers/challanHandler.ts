import { Types } from 'mongoose';
import { Branch } from '../../models/Branch';
import { Student } from '../../models/Student';
import { FeeStructure } from '../../models/FeeStructure';
import { Challan } from '../../models/Challan';
import { Organization } from '../../models/Organization';
import { TransportRoute } from '../../models/TransportRoute';
import { DiscountPolicy } from '../../models/DiscountPolicy';
import { computeSiblingRanks, computeDiscounts, SiblingRankInput } from '../../services/discountEngine';

export async function generateMonthlyChallans(opts?: {
  orgId?: string;
  branchId?: string;
  month?: string;
  classId?: string;
}): Promise<{ created: number; skipped: number }> {
  const now = new Date();
  const targetDate = opts?.month
    ? new Date(`${opts.month}-01`)
    : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const month = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

  let created = 0;
  let skipped = 0;

  const orgFilter: Record<string, unknown> = { status: 'active' };
  if (opts?.orgId) orgFilter._id = new Types.ObjectId(opts.orgId);
  const orgs = await Organization.find(orgFilter).lean();

  for (const org of orgs) {
    const branchFilter: Record<string, unknown> = { orgId: org._id, status: 'active' };
    if (opts?.branchId) branchFilter._id = new Types.ObjectId(opts.branchId);
    const branches = await Branch.find(branchFilter).lean();

    for (const branch of branches) {
      const studentQuery: Record<string, unknown> = { orgId: org._id, branchId: branch._id, status: 'active' };
      if (opts?.classId) studentQuery.classId = new Types.ObjectId(opts.classId);

      const [students, structures, existingChallans, routes, policies, allActiveStudents] = await Promise.all([
        Student.find(studentQuery).lean(),
        FeeStructure.find({ orgId: org._id, branchId: branch._id, isActive: true }).lean(),
        Challan.find({ orgId: org._id, branchId: branch._id, month }).select('studentId').lean(),
        TransportRoute.find({ orgId: org._id, branchId: branch._id, isActive: true }).lean(),
        DiscountPolicy.find({ orgId: org._id, branchId: branch._id, isActive: true }).lean(),
        // Full active-student set (unfiltered by classId) — sibling ranking must consider
        // every sibling in the branch, not just the ones targeted by this generation run.
        Student.find({ orgId: org._id, branchId: branch._id, status: 'active' })
          .select('guardianInfo.fatherCnic guardianInfo.fatherPhone admissionDate')
          .lean(),
      ]);

      const existingSet = new Set(existingChallans.map(c => c.studentId.toString()));
      const structureMap = new Map(structures.map(s => [s.classId.toString(), s]));
      const routeMap = new Map(routes.map(r => [r._id.toString(), r]));

      const siblingInputs: SiblingRankInput[] = allActiveStudents.map(s => ({
        _id: s._id,
        fatherCnic: s.guardianInfo?.fatherCnic,
        fatherPhone: s.guardianInfo?.fatherPhone,
        admissionDate: s.admissionDate,
      }));
      const siblingRanks = computeSiblingRanks(siblingInputs);

      const dueDay = structures[0]?.dueDay ?? 10;
      const dueDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), dueDay);

      const toCreate = students
        .filter(s => !existingSet.has(s._id.toString()) && (structureMap.has(s.classId.toString()) || s.monthlyFee))
        .map(s => {
          const structure = structureMap.get(s.classId.toString());
          const challanNo = `${String(org._id).slice(-4).toUpperCase()}-${String(branch._id).slice(-4).toUpperCase()}-${month}-${String(s._id).slice(-6).toUpperCase()}`;

          // Per-student fee override: replace tuition item, keep other structure items
          let items: { name: string; amount: number }[];
          if (s.monthlyFee && s.monthlyFee > 0) {
            const otherItems = structure
              ? structure.items.filter(i => i.isOptional).map(i => ({ name: i.name, amount: i.amount }))
              : [];
            items = [{ name: 'Monthly Fee', amount: s.monthlyFee }, ...otherItems];
          } else {
            // Standard: use class fee structure
            const std = structure!;
            items = std.items.map(i => ({ name: i.name, amount: i.amount }));
          }

          // Transport fee — auto-added when the student is assigned to an active route
          if (s.transport?.routeId) {
            const route = routeMap.get(s.transport.routeId.toString());
            if (route) {
              const fee = s.transport.monthlyFee && s.transport.monthlyFee > 0 ? s.transport.monthlyFee : route.monthlyFee;
              if (fee > 0) items = [...items, { name: 'Transport Fee', amount: fee }];
            }
          }

          const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);

          const { total: policyDiscount, breakdown } = computeDiscounts({
            totalAmount,
            classId: s.classId,
            labelIds: s.labelIds ?? [],
            siblingRank: siblingRanks.get(s._id.toString()),
            policies,
          });

          const base = {
            orgId: org._id, branchId: branch._id, studentId: s._id, classId: s.classId,
            month, challanNo, items, totalAmount,
            discount: 0, waiver: 0,
            policyDiscount, appliedDiscounts: breakdown,
            netAmount: Math.max(0, totalAmount - policyDiscount),
            paidAmount: 0, dueDate, status: 'unpaid' as const, payments: [],
          };

          return structure ? { ...base, feeStructureId: structure._id } : base;
        });

      skipped += students.length - toCreate.length;

      if (toCreate.length > 0) {
        await Challan.insertMany(toCreate, { ordered: false });
        created += toCreate.length;
      }
    }
  }

  console.log(`[ChallanJob] Generated ${created} challans for ${month}, skipped ${skipped}`);
  return { created, skipped };
}
