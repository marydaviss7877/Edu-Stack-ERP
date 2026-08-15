import { Types } from 'mongoose';
import { Branch } from '../../models/Branch';
import { Organization } from '../../models/Organization';
import { Section } from '../../models/Section';
import { Class } from '../../models/Class';
import { Attendance } from '../../models/Attendance';
import { BehaviourRecord } from '../../models/BehaviourRecord';
import { PeerFeedbackCycle } from '../../models/PeerFeedbackCycle';
import { PeerFeedbackQuestion } from '../../models/PeerFeedbackQuestion';
import { generateQuestions } from '../../services/aiQuestionService';

const QUESTIONS_PER_CYCLE = 6;
const LOOKBACK_DAYS = 30;

/**
 * Opens this month's peer-feedback cycle for every section in every organization that has
 * turned the add-on on. Question text is regenerated per cycle (grade-level + recent
 * attendance/behaviour signals), with generateQuestions() handling the AI-vs-static fallback.
 * Orgs with the add-on off are skipped entirely — this job does nothing for them.
 */
export async function openMonthlyPeerFeedbackCycles(): Promise<void> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const since = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const enabledOrgs = await Organization.find({ peerFeedbackAddon: true }).select('_id').lean();
  if (!enabledOrgs.length) return;
  const enabledOrgIds = new Set(enabledOrgs.map((o) => o._id.toString()));

  const activeBranches = await Branch.find({ status: 'active' }).lean();

  for (const branch of activeBranches) {
    if (!enabledOrgIds.has(branch.orgId.toString())) continue;
    const orgId = branch.orgId as Types.ObjectId;
    const branchId = branch._id as Types.ObjectId;

    const sections = await Section.find({ orgId, branchId }).select('_id classId').lean();

    for (const section of sections) {
      const existing = await PeerFeedbackCycle.findOne({ orgId, branchId, classId: section.classId, sectionId: section._id, month, year }).lean();
      if (existing) continue;

      const [klass, latenessAgg, recentBehaviour] = await Promise.all([
        Class.findOne({ _id: section.classId, orgId }).select('level').lean(),
        Attendance.aggregate([
          { $match: { orgId, branchId, sectionId: section._id, date: { $gte: since } } },
          { $unwind: '$records' },
          { $group: { _id: null, total: { $sum: 1 }, late: { $sum: { $cond: [{ $eq: ['$records.status', 'late'] }, 1, 0] } } } },
        ]),
        BehaviourRecord.aggregate([
          { $match: { orgId, branchId, sectionId: section._id, status: 'active', createdAt: { $gte: since } } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 2 },
        ]),
      ]);

      const contextSignals: string[] = [];
      const latenessRate = latenessAgg[0] ? latenessAgg[0].late / Math.max(1, latenessAgg[0].total) : 0;
      if (latenessRate > 0.1) contextSignals.push('punctuality');
      for (const b of recentBehaviour) {
        if (b._id === 'discipline') contextSignals.push('respectfulness');
        if (b._id === 'social') contextSignals.push('kindness', 'teamwork');
      }

      const { questions, source } = await generateQuestions({
        gradeLevel: klass?.level,
        contextSignals,
        count: QUESTIONS_PER_CYCLE,
      });

      const created = await PeerFeedbackQuestion.insertMany(
        questions.map((q) => ({
          orgId, branchId, text: q.text, category: q.category, scaleType: 'likert5', source, gradeLevel: klass?.level, contextTags: contextSignals,
        }))
      );

      await PeerFeedbackCycle.create({
        orgId, branchId, classId: section.classId, sectionId: section._id, month, year,
        status: 'open',
        questionIds: created.map((q) => q._id),
        minResponsesForVisibility: 5,
      });
    }
  }
}
