import { Types } from 'mongoose';
import { IDiscountPolicy } from '../models/DiscountPolicy';

export interface SiblingRankInput {
  _id: Types.ObjectId;
  fatherCnic?: string;
  fatherPhone?: string;
  admissionDate: Date;
}

/**
 * Groups students by father CNIC (fallback: father phone) and ranks each group by
 * admission date. Only students in a group of 2+ get a rank (1 = eldest/first admitted).
 * Used to match "sibling" discount policies (e.g. discount from the 2nd child onward).
 */
export function computeSiblingRanks(students: SiblingRankInput[]): Map<string, number> {
  const groups = new Map<string, SiblingRankInput[]>();
  for (const s of students) {
    const key = s.fatherCnic?.trim() || s.fatherPhone?.trim();
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }

  const rankMap = new Map<string, number>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => a.admissionDate.getTime() - b.admissionDate.getTime());
    group.forEach((s, idx) => rankMap.set(String(s._id), idx + 1));
  }
  return rankMap;
}

export type PolicyForMatching = Pick<
  IDiscountPolicy,
  '_id' | 'name' | 'type' | 'labelId' | 'siblingMinRank' | 'valueType' | 'value' | 'classIds' | 'isActive'
>;

export interface DiscountMatch {
  policyId: Types.ObjectId;
  name: string;
  amount: number;
}

/** Evaluates all active policies against a student's context and sums the matching discounts (capped at totalAmount). */
export function computeDiscounts(opts: {
  totalAmount: number;
  classId: Types.ObjectId;
  labelIds: Types.ObjectId[];
  siblingRank?: number;
  policies: PolicyForMatching[];
}): { total: number; breakdown: DiscountMatch[] } {
  const { totalAmount, classId, labelIds, siblingRank, policies } = opts;
  const breakdown: DiscountMatch[] = [];
  let total = 0;

  for (const p of policies) {
    if (!p.isActive) continue;
    if (p.classIds?.length && !p.classIds.some((c) => String(c) === String(classId))) continue;

    let matches = false;
    if (p.type === 'label' && p.labelId) {
      matches = labelIds.some((l) => String(l) === String(p.labelId));
    } else if (p.type === 'sibling' && p.siblingMinRank) {
      matches = !!siblingRank && siblingRank >= p.siblingMinRank;
    }
    if (!matches) continue;

    const amount = p.valueType === 'percent' ? Math.round((totalAmount * p.value) / 100) : p.value;
    if (amount <= 0) continue;

    breakdown.push({ policyId: p._id as Types.ObjectId, name: p.name, amount });
    total += amount;
  }

  total = Math.min(total, totalAmount);
  return { total, breakdown };
}
