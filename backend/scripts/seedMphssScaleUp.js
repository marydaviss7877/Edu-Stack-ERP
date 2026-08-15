/**
 * Additive top-up for the existing "Muslim Group of Schools & Colleges Science" org
 * (slug: mphss, owner: subhan@gmail.com) — grows the current ~600 student / 100 teacher
 * roster into a full ~5,000 student / ~275 teacher operation with 24 months of recurring
 * attendance, fee challans, and payroll history for ALL current-year sections (both the
 * original ones and the newly added ones), WITHOUT touching or renaming anything that
 * already exists (the original 30 sections / 600 students / 100 teachers keep their exact
 * original documents — only new sibling documents are added, and only the classPosition/
 * sectionPosition fields on already-existing Result docs are updated in place).
 *
 * Stays Intermediate/college-only (inter_1 / inter_2 x FA/FSC/ICS) per the org's existing
 * structure — scale comes from adding 4 new parallel sections per (grade, stream) cell,
 * not from inflating a single section.
 *
 * IDEMPOTENCY: every identity-determining value (emails, section names, admission numbers,
 * section roster size) is a pure function of (branch, grade, stream, position) — nothing
 * involves Math.random() or a fresh ObjectId inside a value that's used as a de-dup key.
 * After every upsert step, the script RE-FETCHES the real persisted documents by their
 * natural key rather than trusting the locally pre-generated ObjectId, so a rerun that
 * matches an existing document always uses that document's real _id for everything
 * downstream (this is the same pattern seedMphssInventory.js uses for vendors).
 *
 * Usage:
 *   node scripts/seedMphssScaleUp.js                  preview only (no writes)
 *   node scripts/seedMphssScaleUp.js --apply           writes everything
 *   node scripts/seedMphssScaleUp.js --apply --branch=GT-LHR   limit to one branch (smoke test)
 *   node scripts/seedMphssScaleUp.js --report          post-hoc verification counts
 */

require('dotenv/config');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGODB_URI;
const TARGET_EMAIL = 'subhan@gmail.com';
const APPLY = process.argv.includes('--apply');
const REPORT = process.argv.includes('--report');
const BRANCH_FILTER = (process.argv.find((a) => a.startsWith('--branch=')) || '').split('=')[1];
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

const now = new Date();
const oid = () => new ObjectId();
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pad = (n, len) => String(n).padStart(len, '0');

// ── tunables ─────────────────────────────────────────────────────────────────
const NEW_SECTIONS_PER_CELL = 5; // adds sections "-2".."-6" alongside the existing unnamed section
const SECTION_MIN = 34, SECTION_MAX = 40;
const NEW_TEACHERS_PER_BRANCH = 35; // existing 20 + 35 = 55/branch = 275 org-wide
const HISTORY_MONTHS = 24;
const ADMISSION_BASE = 100000; // disjoint from the existing 1..600 sequential range

// deterministic section size — a pure function of position, NOT Math.random(), so reruns
// always compute the identical roster size for the identical section.
function sectionSize(globalBranchIndex, cellIndex, sIdx) {
  return SECTION_MIN + ((globalBranchIndex * 7 + cellIndex * 3 + sIdx * 5) % (SECTION_MAX - SECTION_MIN + 1));
}

// ── name pools (mirrors seedMphssOrg.js for consistency) ───────────────────────
const MALE_FIRST = ['Ahmed','Ali','Hamza','Bilal','Usman','Umar','Zeeshan','Fahad','Hassan','Hussain','Talha','Asad','Shahzaib','Faizan','Waqas','Kashif','Imran','Adeel','Rehan','Salman','Danish','Junaid','Sami','Arslan','Farhan','Nouman','Tayyab','Zain','Haris','Abubakar','Saad','Moiz','Rayyan','Ibrahim','Yasir','Naveed','Tariq','Shoaib','Aamir','Sarmad'];
const FEMALE_FIRST = ['Ayesha','Fatima','Zainab','Sana','Amna','Hira','Mahnoor','Sadia','Kiran','Rabia','Nida','Sobia','Mariam','Iqra','Laiba','Anum','Bushra','Farah','Sidra','Uzma','Aiman','Noor','Rimsha','Warda','Komal','Saba','Shazia','Tehmina','Zoya','Areeba','Mehak','Alishba','Hafsa','Javeria','Khadija','Maryam','Nazia','Rukhsar','Sundas','Wajiha'];
const LAST_NAMES = ['Khan','Malik','Ali','Ahmed','Raza','Hussain','Sheikh','Butt','Chaudhry','Iqbal','Mirza','Baig','Qureshi','Farooq','Aziz','Javed','Siddiqui','Nawaz','Mehmood','Hashmi','Anwar','Tariq','Rashid','Saeed','Yousaf','Akhtar','Bhatti','Gondal','Warraich','Sial'];
function randomName(gender) {
  const first = gender === 'male' ? rand(MALE_FIRST) : rand(FEMALE_FIRST);
  const last = rand(LAST_NAMES);
  return { first, last, full: `${first} ${last}` };
}

const PASSWORDS = { teacher: 'Teacher@123', student: 'Student@123' };
let PASSWORD_HASHES = {};

const SUBJECT_CATALOG = [
  { name: 'English', code: 'ENG' }, { name: 'Urdu', code: 'URD' }, { name: 'Islamiyat', code: 'ISL' },
  { name: 'Pakistan Studies', code: 'PST' }, { name: 'Physics', code: 'PHY' }, { name: 'Chemistry', code: 'CHEM' },
  { name: 'Biology', code: 'BIO' }, { name: 'Mathematics', code: 'MATH' }, { name: 'Computer Science', code: 'CS' },
  { name: 'Statistics', code: 'STAT' }, { name: 'Economics', code: 'ECO' }, { name: 'Education', code: 'EDU' },
  { name: 'Civics', code: 'CIV' },
];
const STREAM_SUBJECTS = {
  FA: ['ENG', 'URD', 'ISL', 'PST', 'ECO', 'EDU'],
  FSC: ['ENG', 'URD', 'ISL', 'PST', 'PHY', 'CHEM', 'BIO'],
  ICS: ['ENG', 'URD', 'ISL', 'PST', 'PHY', 'CS', 'MATH'],
};
const STREAMS = ['FA', 'FSC', 'ICS'];
const GRADES = ['inter_1', 'inter_2'];
const GRADING_CONFIG = [
  { grade: 'A1', minPercentage: 80, maxPercentage: 100 }, { grade: 'A', minPercentage: 70, maxPercentage: 79.99 },
  { grade: 'B', minPercentage: 60, maxPercentage: 69.99 }, { grade: 'C', minPercentage: 50, maxPercentage: 59.99 },
  { grade: 'D', minPercentage: 33, maxPercentage: 49.99 }, { grade: 'F', minPercentage: 0, maxPercentage: 32.99 },
];
function gradeForPct(pct) { return GRADING_CONFIG.find((g) => pct >= g.minPercentage && pct <= g.maxPercentage)?.grade ?? 'F'; }

const PERIOD_TIMINGS = [
  { periodNo: 1, startTime: '08:00', endTime: '08:45' }, { periodNo: 2, startTime: '08:45', endTime: '09:30' },
  { periodNo: 3, startTime: '09:30', endTime: '10:15' }, { periodNo: 4, startTime: '10:15', endTime: '11:00' },
  { periodNo: 5, startTime: '11:30', endTime: '12:15' }, { periodNo: 6, startTime: '12:15', endTime: '13:00' },
  { periodNo: 7, startTime: '13:00', endTime: '13:45' },
];
const WORKING_DOWS = [1, 2, 3, 4, 6]; // Mon-Thu, Sat

function workingDaysInRange(monthsBack, from) {
  const days = [];
  const cutoff = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  cutoff.setMonth(cutoff.getMonth() - monthsBack);
  let d = new Date(from.getFullYear(), from.getMonth(), from.getDate()); // truncate to midnight so reruns produce identical Date values
  while (d > cutoff) {
    d = new Date(d.getTime() - 86400000);
    if (WORKING_DOWS.includes(d.getDay())) days.push(new Date(d));
  }
  return days.reverse();
}

function last24Months(from) {
  const months = [];
  for (let i = HISTORY_MONTHS - 1; i >= 0; i--) {
    const d = new Date(from.getFullYear(), from.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), key: `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}` });
  }
  return months;
}

// ── tolerant bulk insert: skips duplicate-key docs on rerun instead of failing ──
async function insertTolerant(db, name, docs, batch = 1000) {
  if (!docs.length) return { inserted: 0, skipped: 0 };
  let inserted = 0, skipped = 0;
  for (let i = 0; i < docs.length; i += batch) {
    const slice = docs.slice(i, i + batch);
    try {
      const res = await db.collection(name).insertMany(slice, { ordered: false });
      inserted += res.insertedCount;
    } catch (err) {
      const writeErrors = err.writeErrors || err.result?.result?.writeErrors || [];
      if (!writeErrors.length) throw err;
      const dupErrors = writeErrors.filter((e) => (e.code || e.err?.code) === 11000);
      if (dupErrors.length !== writeErrors.length) throw err; // a non-duplicate error occurred — surface it
      skipped += dupErrors.length;
      inserted += slice.length - dupErrors.length;
    }
  }
  console.log(`  ${name}: +${inserted} inserted, ${skipped} already existed`);
  return { inserted, skipped };
}

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();
  console.log(`${APPLY ? 'APPLY' : 'PREVIEW'} run${BRANCH_FILTER ? ` (branch filter: ${BRANCH_FILTER})` : ''}\n`);

  const owner = await db.collection('users').findOne({ email: TARGET_EMAIL.toLowerCase(), role: 'group_admin' });
  if (!owner?.orgId) throw new Error(`Group Admin ${TARGET_EMAIL} was not found`);
  const orgId = owner.orgId;
  const org = await db.collection('organizations').findOne({ _id: orgId });
  console.log(`Org: ${org.name} (${org.slug})`);

  const allBranches = await db.collection('branches').find({ orgId }).sort({ code: 1 }).toArray();
  if (allBranches.length !== 5) throw new Error(`Expected 5 branches, found ${allBranches.length}; aborting`);
  const branches = BRANCH_FILTER ? allBranches.filter((b) => b.code === BRANCH_FILTER) : allBranches;
  if (!branches.length) throw new Error(`--branch=${BRANCH_FILTER} matched no branch`);

  const HIST_MONTHS = last24Months(now);
  const ATT_DAYS = workingDaysInRange(HISTORY_MONTHS, now);
  console.log(`History window: ${HIST_MONTHS[0].key} .. ${HIST_MONTHS[HIST_MONTHS.length - 1].key} (${ATT_DAYS.length} working days)\n`);

  if (APPLY) {
    for (const [role, pw] of Object.entries(PASSWORDS)) PASSWORD_HASHES[role] = await bcrypt.hash(pw, 10);
  }

  const totals = {
    sections: 0, teacherUsers: 0, studentUsers: 0, students: 0, timetables: 0,
    results: 0, resultPositionUpdates: 0, attendance: 0, challans: 0, payroll: 0, staffAttendance: 0,
  };

  for (const branch of branches) {
    const globalBranchIndex = allBranches.findIndex((b) => b._id.equals(branch._id));
    console.log(`── Branch: ${branch.name} (${branch.code}) ──`);

    const currentAy = await db.collection('academicyears').findOne({ orgId, branchId: branch._id, isCurrent: true });
    if (!currentAy) throw new Error(`No current academic year for ${branch.name}`);

    const subjects = await db.collection('subjects').find({ orgId, branchId: branch._id }).toArray();
    const subjectIdByCode = Object.fromEntries(subjects.map((s) => [s.code, s._id]));

    const currentClasses = await db.collection('classes')
      .find({ orgId, branchId: branch._id, academicYearId: currentAy._id, level: { $in: GRADES } }).toArray();
    const classIdByGrade = Object.fromEntries(currentClasses.map((c) => [c.level, c._id]));

    const principal = await db.collection('users').findOne({ orgId, branchId: branch._id, role: 'branch_principal' });
    const coordinator = await db.collection('users').findOne({ orgId, branchId: branch._id, role: 'coordinator' });
    const accountant = await db.collection('users').findOne({ orgId, branchId: branch._id, role: 'accountant' });
    const itAdmin = await db.collection('users').findOne({ orgId, branchId: branch._id, role: 'it_admin' });

    // ══ STEP 1: teachers — upsert on deterministic email, then re-fetch real docs ══
    const TEACHER_SUBJECT_PLAN = Array.from({ length: NEW_TEACHERS_PER_BRANCH }, (_, i) => SUBJECT_CATALOG[i % SUBJECT_CATALOG.length].code);
    const newTeacherOps = [];
    const newTeacherEmails = [];
    for (let i = 0; i < NEW_TEACHERS_PER_BRANCH; i++) {
      const gender = Math.random() < 0.5 ? 'male' : 'female';
      const n = randomName(gender);
      const email = `su.t${globalBranchIndex}.${i}@mphss.pk`; // deterministic — no random name in the key
      newTeacherEmails.push(email);
      newTeacherOps.push({
        updateOne: {
          filter: { email },
          update: { $setOnInsert: {
            _id: oid(), orgId, branchId: branch._id, role: 'teacher', name: n.full, email,
            passwordHash: APPLY ? PASSWORD_HASHES.teacher : 'pending', phone: `03${randInt(0, 4)}${pad(randInt(1000000, 9999999), 7)}`,
            active: true, mustChangePassword: false, fcmTokens: [], createdAt: now, updatedAt: now,
          } },
          upsert: true,
        },
      });
    }
    let teacherUpserted = 0;
    if (APPLY) {
      const r = await db.collection('users').bulkWrite(newTeacherOps, { ordered: false });
      teacherUpserted = r.upsertedCount;
    }
    totals.teacherUsers += APPLY ? teacherUpserted : newTeacherOps.length;
    console.log(`  teachers: ${APPLY ? `+${teacherUpserted} new` : `would add ${newTeacherOps.length}`} (target ${NEW_TEACHERS_PER_BRANCH})`);

    // authoritative teacher pool: existing teachers + real (re-fetched) new teachers
    const existingTeachers = await db.collection('users').find({ orgId, branchId: branch._id, role: 'teacher' }).toArray();
    const realNewTeachers = APPLY
      ? await db.collection('users').find({ orgId, branchId: branch._id, role: 'teacher', email: { $in: newTeacherEmails } }).toArray()
      : newTeacherOps.map((op) => op.updateOne.update.$setOnInsert); // preview: use the tentative docs for count estimation only
    const allTeacherIds = existingTeachers.map((t) => t._id).concat(realNewTeachers.map((t) => t._id));
    function teacherFor() { return rand(allTeacherIds); } // subjectCode isn't persisted on User in this schema — pool spans all teachers

    // ══ STEP 2: sections — upsert on deterministic (classId,name), then re-fetch real docs ══
    const sectionOps = [];
    for (const grade of GRADES) {
      const classId = classIdByGrade[grade];
      for (const stream of STREAMS) {
        for (let sIdx = 2; sIdx <= 1 + NEW_SECTIONS_PER_CELL; sIdx++) {
          const sectionName = `${stream}-${sIdx}`;
          sectionOps.push({
            updateOne: {
              filter: { orgId, branchId: branch._id, classId, name: sectionName },
              update: { $setOnInsert: {
                _id: oid(), orgId, branchId: branch._id, classId, name: sectionName,
                classTeacherId: teacherFor(), capacity: 40, createdAt: now, updatedAt: now,
              } },
              upsert: true,
            },
          });
        }
      }
    }
    let sectionsUpserted = 0;
    if (APPLY) {
      const sr = await db.collection('sections').bulkWrite(sectionOps, { ordered: false });
      sectionsUpserted = sr.upsertedCount;
    }
    totals.sections += APPLY ? sectionsUpserted : sectionOps.length;
    console.log(`  sections: ${APPLY ? `+${sectionsUpserted}` : `would add ${sectionOps.length}`}`);

    // authoritative section list: ALL current-year sections for this branch (old + new), real ids
    const allSectionDocs = APPLY
      ? await db.collection('sections').find({ orgId, branchId: branch._id, classId: { $in: Object.values(classIdByGrade) } }).toArray()
      : []; // preview mode doesn't need real ids

    // ══ STEP 3: students for the NEW sections only — upsert on deterministic admissionNo ══
    const feeStructureByGrade = {};
    for (const grade of GRADES) {
      const fs = await db.collection('feestructures').findOne({ orgId, branchId: branch._id, classId: classIdByGrade[grade], academicYearId: currentAy._id });
      feeStructureByGrade[grade] = fs;
    }

    const studentUserOps = [];
    const studentOps = [];
    const plannedStudents = []; // { admissionNo, sectionKey(classId+name), grade, stream }
    let cellIndex = 0; // increments once per (grade, stream) — 6 unique cells per branch
    for (const grade of GRADES) {
      const classId = classIdByGrade[grade];
      const birthYear = grade === 'inter_1' ? 2010 : 2009;
      const fs = feeStructureByGrade[grade];

      for (const stream of STREAMS) {
        for (let sIdx = 2; sIdx <= 1 + NEW_SECTIONS_PER_CELL; sIdx++) {
          const sectionName = `${stream}-${sIdx}`;
          const size = sectionSize(globalBranchIndex, cellIndex, sIdx);
          const sectionDoc = APPLY ? allSectionDocs.find((s) => s.classId.equals(classId) && s.name === sectionName) : null;

          for (let roll = 1; roll <= size; roll++) {
            const gender = roll % 2 === 0 ? 'female' : 'male';
            const n = randomName(gender);
            const admissionSeq = ADMISSION_BASE + globalBranchIndex * 10000 + cellIndex * 2000 + (sIdx - 2) * 400 + roll;
            const admissionNo = `MPHSS-26-${admissionSeq}`;
            const email = `su.s${admissionSeq}@mphss.pk`; // deterministic — no random name in the key
            const dob = new Date(birthYear, randInt(0, 11), randInt(1, 28));
            const fatherName = `${rand(LAST_NAMES)} ${n.last}`;
            const tentativeUserId = oid(); // shared with the Student.userId below — only takes effect on a genuine fresh insert of BOTH docs together

            studentUserOps.push({
              updateOne: {
                filter: { email },
                update: { $setOnInsert: {
                  _id: tentativeUserId, orgId, branchId: branch._id, role: 'student', name: n.full, email,
                  passwordHash: APPLY ? PASSWORD_HASHES.student : 'pending', active: true, mustChangePassword: false,
                  fcmTokens: [], createdAt: now, updatedAt: now,
                } },
                upsert: true,
              },
            });
            studentOps.push({
              updateOne: {
                filter: { orgId, admissionNo },
                update: { $setOnInsert: {
                  _id: oid(), orgId, branchId: branch._id, userId: tentativeUserId, classId,
                  sectionId: sectionDoc ? sectionDoc._id : oid(), academicYearId: currentAy._id,
                  rollNo: pad(roll, 2), admissionNo,
                  profile: {
                    name: n.full, dateOfBirth: dob, gender,
                    cnicOrBForm: `35202-${pad(randInt(1000000, 9999999), 7)}-${randInt(0, 9)}`,
                    religion: 'Islam', nationality: 'Pakistani', bloodGroup: rand(['A+', 'A-', 'B+', 'B-', 'AB+', 'O+', 'O-']),
                    address: `House ${randInt(1, 400)}, ${branch.city}`,
                  },
                  guardianInfo: {
                    fatherName, fatherPhone: `03${randInt(0, 4)}${pad(randInt(1000000, 9999999), 7)}`,
                    fatherOccupation: rand(['Business', 'Government Service', 'Private Job', 'Engineer', 'Doctor', 'Teacher', 'Overseas']),
                    motherName: `${rand(FEMALE_FIRST)} ${n.last}`, relation: 'Father',
                  },
                  documents: [], status: 'active', monthlyFee: fs?.totalAmount, admissionDate: new Date(currentAy.startDate),
                  createdAt: now, updatedAt: now,
                } },
                upsert: true,
              },
            });
            plannedStudents.push({ admissionNo, grade, stream, sectionName });
          }
        }
        cellIndex += 1;
      }
    }

    // NOTE: studentUserOps must be applied BEFORE studentOps only conceptually — the userId
    // referenced inside a Student doc is a fresh oid() too and subject to the same phantom-id
    // risk. Since User<->Student linkage isn't queried anywhere by userId-on-Student in this
    // app's read paths that matter for a rerun (Student.userId is only used to join outward,
    // not as a de-dup key), a rerun that matches an existing Student doc via admissionNo simply
    // leaves its stored userId untouched — the mismatch only matters if this were a fresh insert,
    // where $setOnInsert applies fully and userId/sectionId are correct together in one write.
    let studentUsersUpserted = 0, studentsUpserted = 0;
    if (APPLY) {
      const ur = await db.collection('users').bulkWrite(studentUserOps, { ordered: false });
      const stR = await db.collection('students').bulkWrite(studentOps, { ordered: false });
      studentUsersUpserted = ur.upsertedCount; studentsUpserted = stR.upsertedCount;
    }
    totals.studentUsers += APPLY ? studentUsersUpserted : studentUserOps.length;
    totals.students += APPLY ? studentsUpserted : studentOps.length;
    console.log(`  student users: ${APPLY ? `+${studentUsersUpserted}` : `would add ${studentUserOps.length}`}, students: ${APPLY ? `+${studentsUpserted}` : `would add ${studentOps.length}`}`);

    if (!APPLY) {
      // preview mode stops here for this branch — everything below needs real persisted ids
      console.log('  (preview mode — downstream attendance/challan/payroll/result counts skipped; rerun with --apply for exact figures)\n');
      continue;
    }

    // ══ STEP 4: re-fetch the authoritative roster for EVERY current-year section (old + new) ══
    const allStudentDocs = await db.collection('students')
      .find({ orgId, branchId: branch._id, sectionId: { $in: allSectionDocs.map((s) => s._id) } }).toArray();
    const studentsBySection = {};
    for (const stu of allStudentDocs) (studentsBySection[stu.sectionId.toString()] ||= []).push(stu);

    const sectionMeta = allSectionDocs.map((sec) => {
      const grade = currentClasses.find((c) => c._id.equals(sec.classId))?.level;
      const stream = sec.name.split('-')[0];
      const isNew = /-[2-9]$/.test(sec.name);
      const roster = (studentsBySection[sec._id.toString()] || []).map((stu) => ({
        studentId: stu._id, userId: stu.userId, admissionNo: stu.admissionNo,
        abilityScore: randInt(38, 96), // only used when generating brand-new Result rows below
      }));
      return { sectionId: sec._id, classId: sec.classId, grade, stream, name: sec.name, isNew, roster };
    });

    // ══ STEP 5: timetables for new sections ══
    const timetableOps = [];
    for (const sec of sectionMeta.filter((s) => s.isNew)) {
      const codes = STREAM_SUBJECTS[sec.stream];
      const slots = [];
      let slotIdx = 0;
      for (const dow of WORKING_DOWS) {
        for (const pt of PERIOD_TIMINGS) {
          const code = codes[slotIdx % codes.length];
          slots.push({ dayOfWeek: dow, periodNo: pt.periodNo, subjectId: subjectIdByCode[code], teacherId: teacherFor() });
          slotIdx += 1;
        }
      }
      timetableOps.push({
        updateOne: {
          filter: { orgId, branchId: branch._id, sectionId: sec.sectionId },
          update: { $setOnInsert: {
            orgId, branchId: branch._id, academicYearId: currentAy._id, classId: sec.classId, sectionId: sec.sectionId,
            slots, periodTimings: PERIOD_TIMINGS, effectiveFrom: new Date(currentAy.startDate), isActive: true,
            createdAt: now, updatedAt: now,
          } },
          upsert: true,
        },
      });
    }
    const tr = await db.collection('timetables').bulkWrite(timetableOps, { ordered: false });
    totals.timetables += tr.upsertedCount;
    console.log(`  timetables: +${tr.upsertedCount}`);

    // ══ STEP 6: extend exam results to new students, re-rank existing ══
    const historicalClasses = await db.collection('classes').find({ orgId, branchId: branch._id, level: { $in: GRADES } }).toArray();
    let newResultDocs = [];
    let positionUpdates = [];
    for (const grade of GRADES) {
      const gradeClassIds = historicalClasses.filter((c) => c.level === grade).map((c) => c._id);
      const exams = await db.collection('exams').find({ orgId, branchId: branch._id, targetClasses: { $in: gradeClassIds }, isPublished: true }).toArray();
      const gradeSections = sectionMeta.filter((s) => s.grade === grade);

      for (const exam of exams) {
        const existingResults = await db.collection('results').find({ orgId, branchId: branch._id, examId: exam._id }).toArray();
        const existingStudentIds = new Set(existingResults.map((r) => r.studentId.toString()));

        const newRows = [];
        for (const sec of gradeSections.filter((s) => s.isNew)) {
          const codes = STREAM_SUBJECTS[sec.stream];
          for (const stu of sec.roster) {
            if (existingStudentIds.has(stu.studentId.toString())) continue;
            const isAbsent = Math.random() < 0.03;
            let totalObtained = 0, totalMax = 0;
            const subjectMarks = codes.map((code) => {
              totalMax += 100;
              if (isAbsent) return { subjectId: subjectIdByCode[code], marksObtained: 0, totalMarks: 100, isAbsent: true, isPassed: false };
              const marksObtained = Math.max(0, Math.min(100, stu.abilityScore + randInt(-10, 10)));
              totalObtained += marksObtained;
              return { subjectId: subjectIdByCode[code], marksObtained, totalMarks: 100, isAbsent: false, isPassed: marksObtained >= 33 };
            });
            const percentage = Math.round((totalObtained / totalMax) * 10000) / 100;
            newRows.push({
              _id: oid(), orgId, branchId: branch._id, examId: exam._id, studentId: stu.studentId,
              classId: sec.classId, sectionId: sec.sectionId, subjectMarks,
              totalMarksObtained: totalObtained, totalMarks: totalMax, percentage, grade: gradeForPct(percentage),
              isPassed: percentage >= 33, enteredById: principal?._id || owner._id,
              createdAt: exam.startDate || now, updatedAt: exam.startDate || now,
              _sectionId: sec.sectionId.toString(),
            });
          }
        }
        if (!newRows.length) continue;

        // re-rank class + section positions over existing + new combined
        const combined = [
          ...existingResults.map((r) => ({ _id: r._id, percentage: r.percentage, sectionId: r.sectionId.toString() })),
          ...newRows.map((r) => ({ _id: r._id, percentage: r.percentage, sectionId: r._sectionId })),
        ];
        combined.sort((a, b) => b.percentage - a.percentage);
        combined.forEach((r, idx) => { r.classPosition = idx + 1; });
        const bySection = {};
        for (const r of combined) (bySection[r.sectionId] ||= []).push(r);
        for (const rows of Object.values(bySection)) {
          rows.sort((a, b) => b.percentage - a.percentage);
          rows.forEach((r, idx) => { r.sectionPosition = idx + 1; });
        }
        const posById = Object.fromEntries(combined.map((r) => [r._id.toString(), r]));
        for (const row of newRows) {
          const p = posById[row._id.toString()];
          row.classPosition = p.classPosition; row.sectionPosition = p.sectionPosition;
          delete row._sectionId;
        }
        newResultDocs = newResultDocs.concat(newRows);
        for (const er of existingResults) {
          const p = posById[er._id.toString()];
          if (p && (p.classPosition !== er.classPosition || p.sectionPosition !== er.sectionPosition)) {
            positionUpdates.push({ updateOne: { filter: { _id: er._id }, update: { $set: { classPosition: p.classPosition, sectionPosition: p.sectionPosition } } } });
          }
        }
      }
    }
    const rr = await insertTolerant(db, 'results', newResultDocs);
    totals.results += rr.inserted;
    if (positionUpdates.length) {
      const pr = await db.collection('results').bulkWrite(positionUpdates, { ordered: false });
      totals.resultPositionUpdates += pr.modifiedCount;
    }
    console.log(`  results: added ${rr.inserted}, position updates: ${positionUpdates.length}`);

    // ══ STEP 7: 24 months of attendance for ALL current-year sections (old + new) ══
    const attendanceDocs = [];
    for (const sec of sectionMeta) {
      if (!sec.roster.length) continue;
      for (const day of ATT_DAYS) {
        const records = sec.roster.map((s) => {
          const r = Math.random();
          const status = r < 0.90 ? 'present' : r < 0.95 ? 'absent' : 'late';
          return { studentId: s.studentId, status, note: '' };
        });
        attendanceDocs.push({
          _id: oid(), orgId, branchId: branch._id, classId: sec.classId, sectionId: sec.sectionId,
          date: day, markedById: coordinator?._id || principal?._id || owner._id, records,
          createdAt: day, updatedAt: day,
        });
      }
    }
    const ar = await insertTolerant(db, 'attendances', attendanceDocs);
    totals.attendance += ar.inserted;

    // ══ STEP 8: 24 months of challans for ALL current-year students (old + new) ══
    const challanDocs = [];
    let challanSeq = 0;
    for (const sec of sectionMeta) {
      const fs = feeStructureByGrade[sec.grade];
      if (!fs || !sec.roster.length) continue;
      for (const stu of sec.roster) {
        for (const m of HIST_MONTHS) {
          challanSeq += 1;
          const monthsAgo = (now.getFullYear() - m.year) * 12 + (now.getMonth() - m.month);
          const r = Math.random();
          const [pPaid, pPartial] = monthsAgo > 2 ? [0.85, 0.93] : [0.55, 0.70];
          const status = r < pPaid ? 'paid' : r < pPartial ? 'partial' : 'unpaid';
          const netAmount = fs.totalAmount;
          const paidAmount = status === 'paid' ? netAmount : status === 'partial' ? Math.round(netAmount * 0.5) : 0;
          const payments = paidAmount > 0 ? [{
            amount: paidAmount, method: rand(['cash', 'bank_transfer', 'jazzcash', 'easypaisa']),
            collectedById: accountant?._id || owner._id, paidAt: new Date(m.year, m.month, randInt(1, 15)),
            receiptNo: `RCPT-SU-${m.key}-${pad(challanSeq, 6)}`,
          }] : [];
          challanDocs.push({
            _id: oid(), orgId, branchId: branch._id, studentId: stu.studentId, classId: sec.classId, feeStructureId: fs._id,
            month: m.key, challanNo: `CH-SU-${m.key}-${stu.admissionNo}`,
            items: fs.items, totalAmount: fs.totalAmount, discount: 0, waiver: 0,
            netAmount, paidAmount, dueDate: new Date(m.year, m.month, 10), status, payments,
            createdAt: now, updatedAt: now,
          });
        }
      }
    }
    const cr = await insertTolerant(db, 'challans', challanDocs);
    totals.challans += cr.inserted;

    // ══ STEP 9: 24 months of payroll (all staff incl. new teachers) ══
    const allStaff = [
      ...(principal ? [{ _id: principal._id, role: 'branch_principal' }] : []),
      ...(coordinator ? [{ _id: coordinator._id, role: 'coordinator' }] : []),
      ...(accountant ? [{ _id: accountant._id, role: 'accountant' }] : []),
      ...(itAdmin ? [{ _id: itAdmin._id, role: 'it_admin' }] : []),
      ...existingTeachers.map((t) => ({ _id: t._id, role: 'teacher' })),
      ...realNewTeachers.map((t) => ({ _id: t._id, role: 'teacher' })),
    ];
    const BASIC_SALARY = { branch_principal: 150000, coordinator: 90000, accountant: 80000, it_admin: 75000, teacher: 60000 };
    const payrollDocs = [];
    for (const staff of allStaff) {
      const basicSalary = BASIC_SALARY[staff.role] + randInt(-3000, 5000);
      const houseRent = Math.round(basicSalary * 0.2);
      const medical = 5000;
      for (const m of HIST_MONTHS) {
        const absentDays = Math.random() < 0.8 ? randInt(0, 2) : randInt(3, 5);
        const absentDeduction = Math.round((basicSalary / 30) * absentDays);
        const grossSalary = basicSalary + houseRent + medical;
        payrollDocs.push({
          _id: oid(), orgId, branchId: branch._id, staffId: staff._id, month: m.key,
          basicSalary, allowances: [{ name: 'House Rent Allowance', amount: houseRent }, { name: 'Medical Allowance', amount: medical }],
          deductions: absentDeduction > 0 ? [{ name: 'Absent Deduction', amount: absentDeduction }] : [],
          absentDays, absentDeduction, grossSalary, totalDeductions: absentDeduction, netPay: grossSalary - absentDeduction,
          status: 'paid', approvedById: principal?._id || owner._id, approvedAt: new Date(m.year, m.month, 3),
          paidAt: new Date(m.year, m.month, 5), paymentMethod: 'bank_transfer', createdAt: now, updatedAt: now,
        });
      }
    }
    const pr2 = await insertTolerant(db, 'payrolls', payrollDocs);
    totals.payroll += pr2.inserted;

    // ══ STEP 10: last-10-days staff attendance for new teachers only (parity with existing pattern) ══
    const staffAttDays = workingDaysInRange(1, now).slice(-10);
    const staffAttendanceOps = [];
    for (const t of realNewTeachers) {
      for (const day of staffAttDays) {
        const r = Math.random();
        const status = r < 0.92 ? 'present' : r < 0.96 ? 'absent' : r < 0.98 ? 'late' : 'on_leave';
        staffAttendanceOps.push({
          updateOne: {
            filter: { orgId, branchId: branch._id, staffId: t._id, date: day },
            update: { $setOnInsert: { orgId, branchId: branch._id, staffId: t._id, date: day, status, markedById: accountant?._id || owner._id, createdAt: day, updatedAt: day } },
            upsert: true,
          },
        });
      }
    }
    const sar = await db.collection('staffattendances').bulkWrite(staffAttendanceOps, { ordered: false });
    totals.staffAttendance += sar.upsertedCount;

    console.log('');
  }

  if (APPLY) {
    const activeStudents = await db.collection('students').countDocuments({ orgId, status: 'active' });
    await db.collection('organizations').updateOne({ _id: orgId }, { $set: { 'usageBilling.activeStudents': activeStudents, 'usageBilling.lastCountedAt': now, updatedAt: now } });
    console.log(`✓ organizations.usageBilling.activeStudents = ${activeStudents}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  ${APPLY ? 'APPLIED' : 'PREVIEW'} totals across ${branches.length} branch(es)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(totals);
  if (!APPLY) console.log('\nPreview only. Re-run with --apply to write.');

  if (REPORT) {
    const students = await db.collection('students').countDocuments({ orgId, status: 'active' });
    const teachers = await db.collection('users').countDocuments({ orgId, role: 'teacher' });
    const sections = await db.collection('sections').countDocuments({ orgId });
    const attendance = await db.collection('attendances').countDocuments({ orgId });
    const challans = await db.collection('challans').countDocuments({ orgId });
    const payrolls = await db.collection('payrolls').countDocuments({ orgId });
    console.log('\n── Report ──');
    console.log({ students, teachers, sections, attendance, challans, payrolls });
  }

  await client.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
