/**
 * Populates Houses, Labels, and Transport Routes for the "mphss" org
 * (Muslim Group of Schools & Colleges Science, owner: subhan@gmail.com),
 * across all its branches — plus assigns a realistic subset of students
 * to each so the studentCount/badges in the UI aren't all zero.
 *
 * Each branch gets one deliberately-retired transport route (isActive: false)
 * with a handful of stragglers still assigned, to exercise the active/inactive
 * filter being added to the Academic Setup > Transport tab.
 *
 * Run: node scripts/seedMphssHousesLabelsTransport.js
 */

require('dotenv/config');
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

const ORG_ID = new ObjectId('6a7ecf85d2935356a31932e5');
const now = new Date();
const oid = () => new ObjectId();
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const HOUSE_DEFS = [
  { name: 'Falcon', colorHex: '#DC2626', motto: 'Swift, Sharp, Fearless' },
  { name: 'Eagle', colorHex: '#2563EB', motto: 'Rise Above' },
  { name: 'Phoenix', colorHex: '#D97706', motto: 'Rise From Every Fall' },
  { name: 'Griffin', colorHex: '#16A34A', motto: 'Strength With Honour' },
];

const LABEL_DEFS = [
  { name: 'Merit Scholar', category: 'achievement', colorHex: '#CA8A04' },
  { name: 'Sports Captain', category: 'activity', colorHex: '#DC2626' },
  { name: 'Debate Club', category: 'activity', colorHex: '#7C3AED' },
  { name: 'Science Olympiad', category: 'achievement', colorHex: '#0891B2' },
  { name: 'Prefect', category: 'achievement', colorHex: '#059669' },
  { name: 'Financial Aid', category: 'custom', colorHex: '#6B7280' },
];

const STOPS_BY_CITY = {
  Lahore: ['Gulberg', 'Model Town', 'Johar Town', 'DHA Phase 5', 'Township', 'Wapda Town', 'Faisal Town', 'Iqbal Town', 'Allama Iqbal Town', 'Shadman'],
  Faisalabad: ['Susan Road', 'Jaranwala Road', 'Millat Town', 'Peoples Colony', 'D Ground', 'Madina Town'],
  Multan: ['Cantt', 'Gulgasht Colony', 'Shah Rukn-e-Alam', 'Bosan Road', 'Vehari Road'],
  Lodhran: ['Lodhran City', 'Kahror Pacca Road', 'Dunyapur Road', 'Chowk Azam Road'],
};
const DRIVER_FIRST = ['Nazir', 'Rashid', 'Aslam', 'Yousaf', 'Shafiq', 'Munir', 'Iqbal', 'Boota', 'Ghulam', 'Riaz'];
const DRIVER_LAST = ['Ahmed', 'Masih', 'Bhatti', 'Warraich', 'Cheema', 'Gujjar', 'Chaudhry', 'Sial'];
const randomDriver = () => `${rand(DRIVER_FIRST)} ${rand(DRIVER_LAST)}`;
const randomPhone = () => `03${randInt(0, 4)}${String(randInt(1000000, 9999999)).padStart(7, '0')}`;
const randomVehicleNo = (code) => `L${rand(['E', 'A', 'B'])}${rand(['A', 'B', 'C'])}-${randInt(1000, 9999)}`;

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();
  console.log('Connected to MongoDB\n');

  const org = await db.collection('organizations').findOne({ _id: ORG_ID });
  if (!org) throw new Error('Org not found');
  console.log(`Org: ${org.name}\n`);

  const branches = await db.collection('branches').find({ orgId: ORG_ID }).toArray();

  const housesToInsert = [];
  const labelsToInsert = [];
  const routesToInsert = [];
  let totalHouseAssignments = 0, totalLabelAssignments = 0, totalTransportAssignments = 0;

  for (const branch of branches) {
    const branchId = branch._id;
    console.log(`── Branch: ${branch.name} (${branch.city}) ──`);

    const teachers = await db.collection('users').find({ orgId: ORG_ID, branchId, role: 'teacher' }).project({ _id: 1 }).toArray();
    const students = await db.collection('students').find(
      { orgId: ORG_ID, branchId, status: { $nin: ['graduated', 'withdrawn', 'transferred'] } },
      { projection: { _id: 1 } }
    ).toArray();

    // ── Houses ────────────────────────────────────────────────────────────
    const houseIds = [];
    for (const h of HOUSE_DEFS) {
      const id = oid();
      houseIds.push(id);
      housesToInsert.push({
        _id: id, orgId: ORG_ID, branchId, name: h.name, colorHex: h.colorHex, motto: h.motto,
        headTeacherId: teachers.length ? rand(teachers)._id : undefined,
        createdAt: now, updatedAt: now,
      });
    }

    // ── Labels ────────────────────────────────────────────────────────────
    const labelIds = [];
    for (const l of LABEL_DEFS) {
      const id = oid();
      labelIds.push({ id, category: l.category });
      labelsToInsert.push({
        _id: id, orgId: ORG_ID, branchId, name: l.name, colorHex: l.colorHex, category: l.category,
        createdAt: now, updatedAt: now,
      });
    }

    // ── Transport routes (last one deliberately retired) ────────────────────
    const stops = STOPS_BY_CITY[branch.city] || STOPS_BY_CITY.Lahore;
    const routeAreas = shuffle(stops).slice(0, 5);
    const branchRoutes = routeAreas.map((area, i) => {
      const id = oid();
      const isActive = i < routeAreas.length - 1; // last route in each branch is retired
      const routeStops = shuffle(stops).slice(0, randInt(2, 4));
      const route = {
        _id: id, orgId: ORG_ID, branchId,
        name: `Route ${i + 1} — ${area}`,
        vehicleNo: randomVehicleNo(branch.code),
        driverName: randomDriver(),
        driverPhone: randomPhone(),
        capacity: randInt(35, 50),
        monthlyFee: randInt(20, 40) * 100,
        stops: routeStops,
        isActive,
        createdAt: now, updatedAt: now,
      };
      routesToInsert.push(route);
      return { ...route };
    });

    // ── Assign students: houses (~90%), labels (~20% get 1, ~5% get 2), transport (~35% active + a few stragglers on the retired route)
    const shuffledStudents = shuffle(students);
    const houseBulk = [];
    const labelBulk = [];
    const transportBulk = [];

    const activeRoutes = branchRoutes.filter((r) => r.isActive);
    const retiredRoute = branchRoutes.find((r) => !r.isActive);

    shuffledStudents.forEach((s, idx) => {
      if (Math.random() < 0.9) {
        houseBulk.push({ updateOne: { filter: { _id: s._id }, update: { $set: { houseId: rand(houseIds) } } } });
      }
      const labelRoll = Math.random();
      if (labelRoll < 0.20) {
        const count = labelRoll < 0.05 ? 2 : 1;
        const picked = shuffle(labelIds).slice(0, count).map((l) => l.id);
        labelBulk.push({ updateOne: { filter: { _id: s._id }, update: { $set: { labelIds: picked } } } });
      }
      if (activeRoutes.length && Math.random() < 0.35) {
        const route = rand(activeRoutes);
        transportBulk.push({ updateOne: { filter: { _id: s._id }, update: { $set: { transport: { routeId: route._id, stopName: rand(route.stops) } } } } });
      } else if (retiredRoute && idx < 10) {
        // a handful of stragglers still assigned to the now-retired route
        transportBulk.push({ updateOne: { filter: { _id: s._id }, update: { $set: { transport: { routeId: retiredRoute._id, stopName: rand(retiredRoute.stops) } } } } });
      }
    });

    async function runBulk(name, ops) {
      if (!ops.length) return 0;
      const BATCH = 1000;
      let modified = 0;
      for (let i = 0; i < ops.length; i += BATCH) {
        const r = await db.collection('students').bulkWrite(ops.slice(i, i + BATCH), { ordered: false });
        modified += r.modifiedCount || 0;
      }
      return modified;
    }

    const hCount = await runBulk('houses', houseBulk);
    const lCount = await runBulk('labels', labelBulk);
    const tCount = await runBulk('transport', transportBulk);
    totalHouseAssignments += hCount;
    totalLabelAssignments += lCount;
    totalTransportAssignments += tCount;

    console.log(`  houses=${houseIds.length} labels=${labelIds.length} routes=${branchRoutes.length} (1 retired) | students: house=${hCount} label=${lCount} transport=${tCount} (of ${students.length})`);
  }

  console.log('\nWriting houses/labels/routes to MongoDB...');
  async function insertAll(name, docs) {
    if (docs.length === 0) return;
    await db.collection(name).insertMany(docs, { ordered: false });
    console.log(`✓ ${name}: ${docs.length}`);
  }
  await insertAll('houses', housesToInsert);
  await insertAll('labels', labelsToInsert);
  await insertAll('transportroutes', routesToInsert);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  DONE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Houses              : ${housesToInsert.length}`);
  console.log(`  Labels              : ${labelsToInsert.length}`);
  console.log(`  Transport Routes    : ${routesToInsert.length}`);
  console.log(`  Student→House       : ${totalHouseAssignments}`);
  console.log(`  Student→Label       : ${totalLabelAssignments}`);
  console.log(`  Student→Transport   : ${totalTransportAssignments}`);

  await client.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
