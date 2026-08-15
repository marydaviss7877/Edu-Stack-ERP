/**
 * Idempotent 24-month finance history top-up for the org owned by subhan@gmail.com:
 * a one-time 10 crore (100,000,000 PKR) capital/equity injection, plus monthly recurring
 * building rent, electricity, and water expenses per branch, plus extended recurring
 * income categories — all on top of what seedMphssInventory.js already seeded (which
 * only has one-off, non-recurring records).
 *
 * The capital entry is deliberately dated BEFORE the 24-month trend window (at org
 * founding) so it doesn't appear as a distorting one-month spike in monthly revenue
 * charts, while still being present in the all-time financial total.
 *
 * Usage:
 *   node scripts/seedMphssFinanceHistory.js            preview only (no writes)
 *   node scripts/seedMphssFinanceHistory.js --apply     writes everything
 *   node scripts/seedMphssFinanceHistory.js --report    post-hoc verification counts
 */

require('dotenv/config');
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI;
const TARGET_EMAIL = 'subhan@gmail.com';
const APPLY = process.argv.includes('--apply');
const REPORT = process.argv.includes('--report');
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

const now = new Date();
const pad = (n, len) => String(n).padStart(len, '0');
const money = (value, branchIndex) => Math.round(value * (1 + branchIndex * 0.06));
const codePart = (value) => String(value).replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8);

const HISTORY_MONTHS = 24;
const RENT_PER_MONTH = 200000; // flat, per the user's exact figure — not branch-scaled
const CAPITAL_AMOUNT = 100000000; // 10 crore PKR
const CAPITAL_DATE = new Date('2023-01-15T10:00:00Z'); // pre-dates the 24-month trend window

// seasonal multiplier by calendar month (0=Jan..11=Dec) — Pakistani summer AC load
const ELEC_SEASONAL = [0.85, 0.85, 0.90, 1.00, 1.15, 1.30, 1.35, 1.30, 1.15, 1.00, 0.90, 0.85];
const WATER_SEASONAL_BUMP = (monthIdx) => (monthIdx >= 3 && monthIdx <= 8 ? 1.10 : 1.0); // Apr-Sep

function last24Months(from) {
  const months = [];
  for (let i = HISTORY_MONTHS - 1; i >= 0; i--) {
    const d = new Date(from.getFullYear(), from.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), key: `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}` });
  }
  return months;
}

const RECURRING_INCOME = [
  ['TRANS', 'Transport', 'Monthly student transport receipts', 285000, 'bank_transfer', 1.0],
  ['CANTEEN', 'Canteen', 'Campus canteen concession income', 82000, 'bank_transfer', 1.0],
];
const SPORADIC_INCOME = [
  ['FACILITY', 'Rent & Facility Hire', 'Auditorium and ground facility hire', 65000, 'cheque'],
  ['DONATION', 'Donations', 'Alumni-supported student welfare contribution', 150000, 'bank_transfer'],
  ['ACTIVITY', 'Events & Activities', 'Student activity and event receipts', 48000, 'cash'],
];

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();

  try {
    const owner = await db.collection('users').findOne({ email: TARGET_EMAIL.toLowerCase(), role: 'group_admin' });
    if (!owner?.orgId) throw new Error(`Group Admin ${TARGET_EMAIL} was not found`);
    const org = await db.collection('organizations').findOne({ _id: owner.orgId });
    const branches = await db.collection('branches').find({ orgId: owner.orgId }).sort({ code: 1 }).toArray();
    if (branches.length !== 5) throw new Error(`Expected 5 branches for ${TARGET_EMAIL}, found ${branches.length}; no data changed`);

    const months = last24Months(now);
    console.log(`${APPLY ? 'APPLY' : 'PREVIEW'}: ${org?.name || owner.orgId} · ${branches.length} branches`);
    console.log(`History window: ${months[0].key} .. ${months[months.length - 1].key}`);
    const plannedExpenses = 3 * months.length * branches.length; // rent + electricity + water
    const plannedIncome = (RECURRING_INCOME.length * months.length + SPORADIC_INCOME.length * Math.ceil(months.length / 2)) * branches.length;
    console.log(`Planned: 1 capital entry, ${plannedExpenses} expense records, ~${plannedIncome} income records\n`);

    if (!APPLY && !REPORT) {
      console.log('Preview only. Re-run with --apply to insert missing seeded records.');
      await client.close();
      return;
    }

    const hqBranch = branches.find((b) => b.code === 'GT-LHR') || branches[0]; // Garden Town Campus — org HQ
    const totals = { capital: 0, expenses: 0, income: 0 };

    if (APPLY) {
      const hqPrincipal = await db.collection('users').findOne({ orgId: owner.orgId, branchId: hqBranch._id, role: 'branch_principal' });
      const capitalOp = {
        updateOne: {
          filter: { orgId: owner.orgId, branchId: hqBranch._id, receiptNo: 'INC-CAPITAL-FOUNDING' },
          update: { $setOnInsert: {
            orgId: owner.orgId, branchId: hqBranch._id, receiptNo: 'INC-CAPITAL-FOUNDING',
            receivedAt: CAPITAL_DATE, category: 'Capital & Investment',
            description: "Owner's equity injection at organization founding",
            amount: CAPITAL_AMOUNT, paymentMethod: 'bank_transfer', paymentReference: 'SEED-CAPITAL-FOUNDING',
            payerName: 'Group Owner (Subhan)', restrictedFund: false, fundingSource: "Owner's Equity",
            attachmentUrls: [], status: 'received', createdById: hqPrincipal?._id || owner._id,
            createdAt: CAPITAL_DATE, updatedAt: CAPITAL_DATE,
          } },
          upsert: true,
        },
      };
      const capResult = await db.collection('incomeentries').bulkWrite([capitalOp], { ordered: false });
      totals.capital = capResult.upsertedCount;
      console.log(`✓ Capital injection at ${hqBranch.name}: ${capResult.upsertedCount ? 'inserted' : 'already existed'} (${CAPITAL_AMOUNT.toLocaleString()} PKR, dated ${CAPITAL_DATE.toISOString().slice(0, 10)})`);
    }

    for (let branchIndex = 0; branchIndex < branches.length; branchIndex++) {
      const branch = branches[branchIndex];
      const branchCode = codePart(branch.code || `B${branchIndex + 1}`);
      const principal = await db.collection('users').findOne({ orgId: owner.orgId, branchId: branch._id, role: 'branch_principal' });
      const accountant = await db.collection('users').findOne({ orgId: owner.orgId, branchId: branch._id, role: 'accountant' });
      const makerId = accountant?._id || principal?._id || owner._id;
      const approverId = principal?._id || owner._id;

      const expenseOps = [];
      for (const m of months) {
        const expenseDate = new Date(m.year, m.month, 5, 10);
        const isRecent = (now.getFullYear() - m.year) * 12 + (now.getMonth() - m.month) <= 1;
        const status = isRecent ? 'approved' : 'paid';

        // rent — flat, no branch scaling
        expenseOps.push({
          updateOne: {
            filter: { orgId: owner.orgId, branchId: branch._id, voucherNo: `EXP-${branchCode}-${m.key}-RENT` },
            update: { $setOnInsert: {
              orgId: owner.orgId, branchId: branch._id, voucherNo: `EXP-${branchCode}-${m.key}-RENT`,
              expenseDate, category: 'Rent & Rates', costCenter: 'Rent & Rates', description: `Monthly building rent — ${branch.name}`,
              grossAmount: RENT_PER_MONTH, salesTax: 0, withholdingTax: 0, otherDeductions: 0, netPaid: RENT_PER_MONTH,
              paymentMethod: 'bank_transfer', status, recurring: true, attachmentUrls: [],
              submittedById: makerId, approvedById: approverId, paidById: status === 'paid' ? makerId : undefined,
              approvedAt: expenseDate, paidAt: status === 'paid' ? expenseDate : undefined,
              createdById: makerId, createdAt: expenseDate, updatedAt: expenseDate,
            } },
            upsert: true,
          },
        });

        // electricity — branch-scaled base, seasonal multiplier, small noise
        const elecBase = money(245000, branchIndex) * ELEC_SEASONAL[m.month] * (0.95 + Math.random() * 0.10);
        const elecAmount = Math.round(elecBase / 500) * 500;
        expenseOps.push({
          updateOne: {
            filter: { orgId: owner.orgId, branchId: branch._id, voucherNo: `EXP-${branchCode}-${m.key}-ELEC` },
            update: { $setOnInsert: {
              orgId: owner.orgId, branchId: branch._id, voucherNo: `EXP-${branchCode}-${m.key}-ELEC`,
              expenseDate, category: 'Utilities', costCenter: 'Utilities', description: 'Monthly electricity bill',
              grossAmount: elecAmount, salesTax: 0, withholdingTax: 0, otherDeductions: 0, netPaid: elecAmount,
              paymentMethod: 'bank_transfer', status, recurring: true, attachmentUrls: [],
              submittedById: makerId, approvedById: approverId, paidById: status === 'paid' ? makerId : undefined,
              approvedAt: expenseDate, paidAt: status === 'paid' ? expenseDate : undefined,
              createdById: makerId, createdAt: expenseDate, updatedAt: expenseDate,
            } },
            upsert: true,
          },
        });

        // water — smaller base, mild summer bump
        const waterBase = money(45000, branchIndex) * WATER_SEASONAL_BUMP(m.month) * (0.95 + Math.random() * 0.10);
        const waterAmount = Math.round(waterBase / 500) * 500;
        expenseOps.push({
          updateOne: {
            filter: { orgId: owner.orgId, branchId: branch._id, voucherNo: `EXP-${branchCode}-${m.key}-WATER` },
            update: { $setOnInsert: {
              orgId: owner.orgId, branchId: branch._id, voucherNo: `EXP-${branchCode}-${m.key}-WATER`,
              expenseDate, category: 'Utilities', costCenter: 'Utilities', description: 'Monthly water supply & tanker charges',
              grossAmount: waterAmount, salesTax: 0, withholdingTax: 0, otherDeductions: 0, netPaid: waterAmount,
              paymentMethod: 'bank_transfer', status, recurring: true, attachmentUrls: [],
              submittedById: makerId, approvedById: approverId, paidById: status === 'paid' ? makerId : undefined,
              approvedAt: expenseDate, paidAt: status === 'paid' ? expenseDate : undefined,
              createdById: makerId, createdAt: expenseDate, updatedAt: expenseDate,
            } },
            upsert: true,
          },
        });
      }

      const incomeOps = [];
      for (const m of months) {
        const receivedAt = new Date(m.year, m.month, 20, 11);
        for (const [key, category, description, baseAmount, paymentMethod] of RECURRING_INCOME) {
          const amount = Math.round(money(baseAmount, branchIndex) * (0.92 + Math.random() * 0.16) / 500) * 500;
          incomeOps.push({
            updateOne: {
              filter: { orgId: owner.orgId, branchId: branch._id, receiptNo: `INC-${branchCode}-${m.key}-${key}` },
              update: { $setOnInsert: {
                orgId: owner.orgId, branchId: branch._id, receiptNo: `INC-${branchCode}-${m.key}-${key}`,
                receivedAt, category, description, amount, paymentMethod, paymentReference: `SEED-${branchCode}-${m.key}-${key}`,
                restrictedFund: false, fundingSource: 'Campus Operations', attachmentUrls: [], status: 'received',
                createdById: makerId, createdAt: receivedAt, updatedAt: receivedAt,
              } },
              upsert: true,
            },
          });
        }
        if (Math.random() < 0.5) {
          for (const [key, category, description, baseAmount, paymentMethod] of SPORADIC_INCOME) {
            if (Math.random() < 0.5) continue; // ~50% x ~50% ≈ sporadic across months
            const amount = Math.round(money(baseAmount, branchIndex) * (0.85 + Math.random() * 0.30) / 500) * 500;
            incomeOps.push({
              updateOne: {
                filter: { orgId: owner.orgId, branchId: branch._id, receiptNo: `INC-${branchCode}-${m.key}-${key}` },
                update: { $setOnInsert: {
                  orgId: owner.orgId, branchId: branch._id, receiptNo: `INC-${branchCode}-${m.key}-${key}`,
                  receivedAt, category, description, amount, paymentMethod, paymentReference: `SEED-${branchCode}-${m.key}-${key}`,
                  restrictedFund: key === 'DONATION', fundingSource: key === 'DONATION' ? 'Student Welfare Fund' : 'Campus Operations',
                  attachmentUrls: [], status: 'received', createdById: makerId, createdAt: receivedAt, updatedAt: receivedAt,
                } },
                upsert: true,
              },
            });
          }
        }
      }

      if (APPLY) {
        const er = await db.collection('expenses').bulkWrite(expenseOps, { ordered: false });
        const ir = await db.collection('incomeentries').bulkWrite(incomeOps, { ordered: false });
        totals.expenses += er.upsertedCount;
        totals.income += ir.upsertedCount;
        console.log(`✓ ${branch.name}: +${er.upsertedCount} expenses, +${ir.upsertedCount} income`);
      }
    }

    if (APPLY) console.log('\nInserted:', totals);

    if (REPORT) {
      console.log('\n── Report ──');
      const capital = await db.collection('incomeentries').findOne({ orgId: owner.orgId, receiptNo: 'INC-CAPITAL-FOUNDING' });
      console.log('Capital entry:', capital ? { amount: capital.amount, receivedAt: capital.receivedAt, branchId: String(capital.branchId) } : 'NOT FOUND');
      for (const branch of branches) {
        const rentCount = await db.collection('expenses').countDocuments({ orgId: owner.orgId, branchId: branch._id, category: 'Rent & Rates' });
        const utilCount = await db.collection('expenses').countDocuments({ orgId: owner.orgId, branchId: branch._id, category: 'Utilities' });
        const incomeCount = await db.collection('incomeentries').countDocuments({ orgId: owner.orgId, branchId: branch._id });
        console.log(`  ${branch.name}: rent=${rentCount}, utilities(elec+water)=${utilCount}, income=${incomeCount}`);
      }
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => { console.error(error.message || error); process.exit(1); });
