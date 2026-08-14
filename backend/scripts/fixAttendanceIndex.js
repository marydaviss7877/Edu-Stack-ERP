/**
 * Fixes the Attendance unique-index bug documented in error.html: the compound unique
 * index was missing sectionId, so marking attendance for a 2nd/3rd section of the same
 * class on the same day collided. The old index (without sectionId) was already live on
 * the `attendances` collection — built by autoIndex at some point before this fix, most
 * likely by a previously-running server instance — so this drops it by name and creates
 * the corrected one instead of waiting on a server restart to reconcile it (Mongoose's
 * default autoIndex creates missing indexes but never drops stale ones on its own).
 *
 * NOTE: the collection is `attendances` (Mongoose pluralizes "Attendance" -> "attendances"),
 * not `attendance`. An earlier version of this script targeted the wrong (singular) name —
 * see error.html for how that was caught and corrected.
 *
 * Also normalizes the synthetic periodNo (1/2/3 per stream) that seedMphssOrg.js had to
 * assign to work around the bug — no longer needed now that sectionId is part of the key.
 *
 * Safe to re-run: drops/creates are idempotent (missing-index errors on drop are ignored).
 *
 * Run: node scripts/fixAttendanceIndex.js
 */

require('dotenv/config');
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

const ORG_ID = new ObjectId('6a7ecf85d2935356a31932e5');
const STALE_INDEX_NAME = 'orgId_1_branchId_1_classId_1_date_-1_periodNo_1';

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();
  console.log('Connected to MongoDB\n');

  const attendance = db.collection('attendances');

  const before = await attendance.indexes();
  console.log('Indexes before:', before.map((i) => i.name).join(', '));

  try {
    await attendance.dropIndex(STALE_INDEX_NAME);
    console.log(`✓ Dropped stale buggy index ${STALE_INDEX_NAME}`);
  } catch (err) {
    if (err.codeName === 'IndexNotFound') console.log(`  (stale index ${STALE_INDEX_NAME} already absent — nothing to drop)`);
    else throw err;
  }

  await attendance.createIndex({ orgId: 1, branchId: 1, date: -1 });
  await attendance.createIndex({ orgId: 1, branchId: 1, classId: 1, sectionId: 1, date: -1 });
  await attendance.createIndex(
    { orgId: 1, branchId: 1, classId: 1, sectionId: 1, date: -1, periodNo: 1 },
    { unique: true }
  );
  console.log('✓ Created all 3 schema indexes (2 query indexes + the corrected unique one).');

  const unsetResult = await attendance.updateMany(
    { orgId: ORG_ID, periodNo: { $in: [1, 2, 3] } },
    { $unset: { periodNo: '' } }
  );
  console.log(`✓ Normalized periodNo on ${unsetResult.modifiedCount} seeded attendance docs (unset — no longer needed).`);

  const after = await attendance.indexes();
  console.log('\nIndexes after:', after.map((i) => i.name).join(', '));

  // ── Verify: reproduce the exact repro from error.html ──────────────────────
  console.log('\n── Verification: mark attendance for FA then FSC, same class + date, periodNo omitted ──');

  const sample = await db.collection('sections').findOne({ orgId: ORG_ID, name: 'FA' });
  const classId = sample.classId;
  const branchId = sample.branchId;
  const faSection = sample;
  const fscSection = await db.collection('sections').findOne({ orgId: ORG_ID, branchId, classId, name: 'FSC' });

  const testDate = new Date();
  testDate.setHours(0, 0, 0, 0);
  const dayStart = new Date(testDate);
  const dayEnd = new Date(testDate);
  dayEnd.setHours(23, 59, 59, 999);

  const students = await db.collection('students').find({ orgId: ORG_ID, sectionId: faSection._id }).limit(2).toArray();
  const someUser = await db.collection('users').findOne({ orgId: ORG_ID, branchId, role: 'coordinator' });

  async function markLikeController(sectionId, roster) {
    const records = roster.map((s) => ({ studentId: s._id, status: 'present', note: '' }));
    return attendance.findOneAndUpdate(
      { orgId: ORG_ID, branchId, classId, sectionId, date: { $gte: dayStart, $lte: dayEnd }, periodNo: null },
      { $set: { orgId: ORG_ID, branchId, classId, sectionId, date: dayStart, markedById: someUser._id, records } },
      { upsert: true, returnDocument: 'after' }
    );
  }

  try {
    await markLikeController(faSection._id, students);
    console.log('  ✓ FA section marked OK');
    const fscStudents = await db.collection('students').find({ orgId: ORG_ID, sectionId: fscSection._id }).limit(2).toArray();
    await markLikeController(fscSection._id, fscStudents);
    console.log('  ✓ FSC section marked OK (this used to throw E11000 duplicate key before the fix)');

    // cleanup the verification-only docs so they don't pollute the seeded dataset
    await attendance.deleteOne({ orgId: ORG_ID, branchId, classId, sectionId: faSection._id, date: { $gte: dayStart, $lte: dayEnd }, periodNo: { $exists: false } });
    await attendance.deleteOne({ orgId: ORG_ID, branchId, classId, sectionId: fscSection._id, date: { $gte: dayStart, $lte: dayEnd }, periodNo: { $exists: false } });
    console.log('  (verification docs cleaned up)');
  } catch (err) {
    console.error('  ✗ FAILED — bug still reproduces:', err.message);
    process.exitCode = 1;
  }

  await client.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
