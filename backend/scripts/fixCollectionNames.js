/**
 * Corrects a real bug found during verification: seedMphssOrg.js and seedMphssExtras.js
 * used raw-driver hardcoded collection names guessing Mongoose's pluralization, but got
 * two wrong:
 *   - Attendance model -> actual collection 'attendances' (I used 'attendance')
 *   - Paper model      -> actual collection 'paper'       (I used 'papers')
 * Every document these scripts wrote is sitting in a collection the real app's Mongoose
 * models never touch. This migrates the data to the correct collections, rebuilds the
 * indexes there (the earlier fixAttendanceIndex.js run built the corrected index on the
 * WRONG 'attendance' collection), and drops the incorrectly-named collections.
 */
require('dotenv/config');
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI;
const ORG_ID = new ObjectId('6a7ecf85d2935356a31932e5');

async function migrate(db, wrongName, rightName) {
  const wrong = db.collection(wrongName);
  const right = db.collection(rightName);

  const wrongCount = await wrong.countDocuments({});
  const rightCountBefore = await right.countDocuments({});
  console.log(`${wrongName} (wrong): ${wrongCount} docs · ${rightName} (correct, real app collection): ${rightCountBefore} docs before migration`);

  if (wrongCount === 0) { console.log(`  nothing to migrate for ${wrongName}`); return; }

  const docs = await wrong.find({}).toArray();
  const BATCH = 1000;
  for (let i = 0; i < docs.length; i += BATCH) {
    await right.insertMany(docs.slice(i, i + BATCH), { ordered: false });
  }
  const rightCountAfter = await right.countDocuments({});
  console.log(`  ✓ migrated ${docs.length} docs → ${rightName} (now ${rightCountAfter} total)`);

  await db.collection(wrongName).drop();
  console.log(`  ✓ dropped the incorrectly-named '${wrongName}' collection`);
}

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();
  console.log('Connected to MongoDB\n');

  console.log('── Paper ──');
  await migrate(db, 'papers', 'paper');

  console.log('\n── Attendance ──');
  await migrate(db, 'attendance', 'attendances');

  // Rebuild Attendance's indexes on the CORRECT collection (the earlier fix script built
  // them on 'attendance', which is now gone).
  console.log('\n── Rebuilding indexes on the correct collections ──');
  const attendances = db.collection('attendances');
  await attendances.createIndex({ orgId: 1, branchId: 1, date: -1 });
  await attendances.createIndex({ orgId: 1, branchId: 1, classId: 1, sectionId: 1, date: -1 });
  await attendances.createIndex(
    { orgId: 1, branchId: 1, classId: 1, sectionId: 1, date: -1, periodNo: 1 },
    { unique: true }
  );
  console.log('✓ attendances: 3 indexes built (matching Attendance.ts exactly)');

  const paper = db.collection('paper');
  await paper.createIndex({ orgId: 1, branchId: 1, classId: 1, sectionId: 1, subjectId: 1 });
  await paper.createIndex({ orgId: 1, branchId: 1, month: 1, year: 1 });
  await paper.createIndex({ orgId: 1, branchId: 1, teacherId: 1, month: 1, year: 1 });
  await paper.createIndex({ orgId: 1, branchId: 1, paperType: 1, status: 1 });
  console.log('✓ paper: 4 indexes built (matching Paper.ts exactly)');

  // Sanity: confirm the exact clearance -> paper link that failed verification now resolves.
  console.log('\n── Sanity check ──');
  const clearance = await db.collection('clearanceexams').findOne({ _id: new ObjectId('6a7f050bd7933505131a3e45') });
  const linkedPaper = await db.collection('paper').findOne({ _id: clearance.clearancePaperId });
  console.log('Previously-failing clearance -> paper link now resolves in the correct collection:', !!linkedPaper);

  const attCount = await db.collection('attendances').countDocuments({ orgId: ORG_ID });
  console.log(`Attendance docs now in the collection the real app reads from: ${attCount}`);

  await client.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
