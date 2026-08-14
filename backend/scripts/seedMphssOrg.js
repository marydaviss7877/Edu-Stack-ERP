/**
 * Populates real, rich data for the existing "Muslim Group of Schools & Colleges Science"
 * org (slug: mphss, owner: subhan@gmail.com).
 *
 * Builds: 5 branches, 5 principals + coordinators/accountants/IT admins + ~100 teachers,
 * 600+ students across Inter I / Inter II in FA / FSC / ICS streams, 4 academic years
 * (3 past + current) of exams + exam schedules + results, attendance, fees, payroll,
 * staff attendance, branch headers, timetables, and a few notifications.
 *
 * Run: node scripts/seedMphssOrg.js
 */

require('dotenv/config');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

const ORG_ID = new ObjectId('6a7ecf85d2935356a31932e5');
const EXISTING_BRANCH_IDS = {
  gardenTown: new ObjectId('6a7ecf85d2935356a31932e7'), // was "Main Branch" / MAIN
  modelTown: new ObjectId('6a7edf2087bc9ea006a294d2'),  // was "mn" / M
};

const now = new Date();
const oid = () => new ObjectId();
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pad = (n, len) => String(n).padStart(len, '0');

// ── name pools ───────────────────────────────────────────────────────────────
const MALE_FIRST = ['Ahmed','Ali','Hamza','Bilal','Usman','Umar','Zeeshan','Fahad','Hassan','Hussain','Talha','Asad','Shahzaib','Faizan','Waqas','Kashif','Imran','Adeel','Rehan','Salman','Danish','Junaid','Sami','Arslan','Farhan','Nouman','Tayyab','Zain','Haris','Abubakar','Saad','Moiz','Rayyan','Ibrahim','Yasir','Naveed','Tariq','Shoaib','Aamir','Sarmad'];
const FEMALE_FIRST = ['Ayesha','Fatima','Zainab','Sana','Amna','Hira','Mahnoor','Sadia','Kiran','Rabia','Nida','Sobia','Mariam','Iqra','Laiba','Anum','Bushra','Farah','Sidra','Uzma','Aiman','Noor','Rimsha','Warda','Komal','Saba','Shazia','Tehmina','Zoya','Areeba','Mehak','Alishba','Hafsa','Javeria','Khadija','Maryam','Nazia','Rukhsar','Sundas','Wajiha'];
const LAST_NAMES = ['Khan','Malik','Ali','Ahmed','Raza','Hussain','Sheikh','Butt','Chaudhry','Iqbal','Mirza','Baig','Qureshi','Farooq','Aziz','Javed','Siddiqui','Nawaz','Mehmood','Hashmi','Anwar','Tariq','Rashid','Saeed','Yousaf','Akhtar','Bhatti','Gondal','Warraich','Sial'];

let emailCounter = 1000;
function makeEmail(first, last) {
  emailCounter += 1;
  return `${first.toLowerCase()}.${last.toLowerCase()}${emailCounter}@mphss.pk`;
}
function randomName(gender) {
  const first = gender === 'male' ? rand(MALE_FIRST) : rand(FEMALE_FIRST);
  const last = rand(LAST_NAMES);
  return { first, last, full: `${first} ${last}` };
}

// ── shared password hashes (role-based, so the user can actually log in & test) ──
const PASSWORDS = {
  branch_principal: 'Principal@123',
  coordinator: 'Coordinator@123',
  accountant: 'Accountant@123',
  it_admin: 'ITAdmin@123',
  teacher: 'Teacher@123',
  student: 'Student@123',
};
let PASSWORD_HASHES = {};

// ── subject catalog ──────────────────────────────────────────────────────────
const SUBJECT_CATALOG = [
  { name: 'English', code: 'ENG' },
  { name: 'Urdu', code: 'URD' },
  { name: 'Islamiyat', code: 'ISL' },
  { name: 'Pakistan Studies', code: 'PST' },
  { name: 'Physics', code: 'PHY' },
  { name: 'Chemistry', code: 'CHEM' },
  { name: 'Biology', code: 'BIO' },
  { name: 'Mathematics', code: 'MATH' },
  { name: 'Computer Science', code: 'CS' },
  { name: 'Statistics', code: 'STAT' },
  { name: 'Economics', code: 'ECO' },
  { name: 'Education', code: 'EDU' },
  { name: 'Civics', code: 'CIV' },
];
const STREAM_SUBJECTS = {
  FA: ['ENG', 'URD', 'ISL', 'PST', 'ECO', 'EDU'],
  FSC: ['ENG', 'URD', 'ISL', 'PST', 'PHY', 'CHEM', 'BIO'],
  ICS: ['ENG', 'URD', 'ISL', 'PST', 'PHY', 'CS', 'MATH'],
};
const STREAMS = ['FA', 'FSC', 'ICS'];
const GRADES = ['inter_1', 'inter_2']; // 11th, 12th
const GRADE_LABEL = { inter_1: 'Inter I (11th)', inter_2: 'Inter II (12th)' };
// teacher pool per branch: one per subject + extras on high-demand subjects
const TEACHER_SUBJECT_PLAN = [...SUBJECT_CATALOG.map((s) => s.code), 'ENG', 'URD', 'ISL', 'PST', 'PHY', 'MATH', 'CS'];

const GRADING_CONFIG = [
  { grade: 'A1', minPercentage: 80, maxPercentage: 100, remark: 'Excellent' },
  { grade: 'A', minPercentage: 70, maxPercentage: 79.99, remark: 'Very Good' },
  { grade: 'B', minPercentage: 60, maxPercentage: 69.99, remark: 'Good' },
  { grade: 'C', minPercentage: 50, maxPercentage: 59.99, remark: 'Satisfactory' },
  { grade: 'D', minPercentage: 33, maxPercentage: 49.99, remark: 'Pass' },
  { grade: 'F', minPercentage: 0, maxPercentage: 32.99, remark: 'Fail' },
];
function gradeForPct(pct) {
  return GRADING_CONFIG.find((g) => pct >= g.minPercentage && pct <= g.maxPercentage)?.grade ?? 'F';
}

// ── branch definitions ───────────────────────────────────────────────────────
const BRANCH_DEFS = [
  { key: 'gardenTown', _id: EXISTING_BRANCH_IDS.gardenTown, name: 'Garden Town Campus', code: 'GT-LHR', city: 'Lahore', address: 'Main Boulevard, Garden Town, Lahore' },
  { key: 'modelTown', _id: EXISTING_BRANCH_IDS.modelTown, name: 'Model Town Campus', code: 'MT-LHR', city: 'Lahore', address: 'C-Block, Model Town, Lahore' },
  { key: 'gulberg', _id: oid(), name: 'Gulberg Campus', code: 'GB-LHR', city: 'Lahore', address: 'Main Market, Gulberg III, Lahore' },
  { key: 'faisalabad', _id: oid(), name: 'Faisalabad Campus', code: 'FSD-01', city: 'Faisalabad', address: 'Susan Road, Faisalabad' },
  { key: 'multan', _id: oid(), name: 'Multan Campus', code: 'MUL-01', city: 'Multan', address: 'Bosan Road, Multan' },
];

// academic years: 3 past + current. Today = 2026-08-14, AY starts April → current AY = 2026-27.
const AY_DEFS = [
  { label: '2023-24', start: '2023-04-01', end: '2024-03-31', isCurrent: false },
  { label: '2024-25', start: '2024-04-01', end: '2025-03-31', isCurrent: false },
  { label: '2025-26', start: '2025-04-01', end: '2026-03-31', isCurrent: false },
  { label: '2026-27', start: '2026-04-01', end: '2027-03-31', isCurrent: true },
];

function workingDaysBack(count, fromDate) {
  // Mon,Tue,Wed,Thu,Sat are school days (Fri & Sun off), matching branch.settings.workingDays
  const days = [];
  let d = new Date(fromDate);
  while (days.length < count) {
    d = new Date(d.getTime() - 86400000);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 5) days.push(new Date(d));
  }
  return days.reverse();
}

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();
  console.log('Connected to MongoDB\n');

  // pre-hash shared role passwords
  for (const [role, pw] of Object.entries(PASSWORDS)) {
    PASSWORD_HASHES[role] = await bcrypt.hash(pw, 10);
  }

  const org = await db.collection('organizations').findOne({ _id: ORG_ID });
  if (!org) throw new Error('Org not found — expected mphss org to already exist');
  console.log(`Org: ${org.name} (${org.slug})`);

  // accumulators for bulk insert
  const branchOps = [];
  const usersToInsert = [];
  const subjectsToInsert = [];
  const academicYearsToInsert = [];
  const classesToInsert = [];
  const sectionUpdates = []; // { _id, classTeacherId } deferred set after teachers exist
  const sectionsToInsert = [];
  const studentsToInsert = [];
  const examsToInsert = [];
  const examSchedulesToInsert = [];
  const resultsToInsert = [];
  const attendanceToInsert = [];
  const feeStructuresToInsert = [];
  const challansToInsert = [];
  const staffAttendanceToInsert = [];
  const payrollToInsert = [];
  const branchHeadersToInsert = [];
  const timetablesToInsert = [];
  const notificationsToInsert = [];

  let admissionSeq = 1;
  let challanSeq = 1;
  let totalActiveStudents = 0;

  for (const bdef of BRANCH_DEFS) {
    console.log(`\n── Branch: ${bdef.name} ──`);
    const branchId = bdef._id;

    // 1. principal (create early so branch.principalName can reference it)
    const principalGender = Math.random() < 0.7 ? 'male' : 'female';
    const principalName = randomName(principalGender);
    const principalUserId = oid();
    usersToInsert.push({
      _id: principalUserId, orgId: ORG_ID, branchId,
      role: 'branch_principal', name: `Dr. ${principalName.full}`,
      email: makeEmail(principalName.first, principalName.last),
      passwordHash: PASSWORD_HASHES.branch_principal,
      phone: `0300-${pad(randInt(1000000, 9999999), 7)}`,
      active: true, mustChangePassword: false, fcmTokens: [],
      createdAt: now, updatedAt: now,
    });

    // 2. branch doc (insert new or update existing placeholder)
    const branchDoc = {
      orgId: ORG_ID,
      name: bdef.name,
      code: bdef.code,
      address: bdef.address,
      city: bdef.city,
      phone: `042-${pad(randInt(30000000, 39999999), 8)}`,
      email: `${bdef.key}@mphss.pk`,
      principalName: `Dr. ${principalName.full}`,
      status: 'active',
      settings: {
        attendanceThreshold: 75,
        periodsPerDay: 7,
        workingDays: [1, 2, 3, 4, 6],
        periodDurationMinutes: 45,
        breakTimings: [{ name: 'Lunch & Prayer Break', afterPeriod: 4, durationMinutes: 30 }],
        gradingSystem: 'percentage',
      },
      academicThresholds: { weakThreshold: 50, failingThreshold: 40, clearancePassMark: 40 },
      createdAt: now, updatedAt: now,
    };
    branchOps.push({
      updateOne: {
        filter: { _id: branchId },
        update: { $set: branchDoc, $setOnInsert: { _id: branchId } },
        upsert: true,
      },
    });

    // 3. coordinator, accountant, it_admin
    function makeStaff(role, titlePrefix = '') {
      const gender = Math.random() < 0.55 ? 'male' : 'female';
      const n = randomName(gender);
      const id = oid();
      usersToInsert.push({
        _id: id, orgId: ORG_ID, branchId,
        role, name: `${titlePrefix}${n.full}`,
        email: makeEmail(n.first, n.last),
        passwordHash: PASSWORD_HASHES[role],
        phone: `03${randInt(0, 4)}${pad(randInt(1000000, 9999999), 7)}`,
        active: true, mustChangePassword: false, fcmTokens: [],
        createdAt: now, updatedAt: now,
      });
      return { _id: id, name: `${titlePrefix}${n.full}` };
    }
    const coordinator = makeStaff('coordinator');
    const accountant = makeStaff('accountant');
    const itAdmin = makeStaff('it_admin');

    // 4. subjects for this branch
    const subjectIdByCode = {};
    for (const s of SUBJECT_CATALOG) {
      const id = oid();
      subjectIdByCode[s.code] = id;
      subjectsToInsert.push({ _id: id, orgId: ORG_ID, branchId, name: s.name, code: s.code, isElective: false, createdAt: now, updatedAt: now });
    }

    // 5. teachers (20), each with 1 subject specialty
    const teachers = [];
    const teachersBySubject = {};
    for (const code of TEACHER_SUBJECT_PLAN) {
      const gender = Math.random() < 0.5 ? 'male' : 'female';
      const n = randomName(gender);
      const id = oid();
      const teacher = { _id: id, name: n.full, subjectCode: code };
      teachers.push(teacher);
      (teachersBySubject[code] ||= []).push(teacher);
      usersToInsert.push({
        _id: id, orgId: ORG_ID, branchId,
        role: 'teacher', name: n.full,
        email: makeEmail(n.first, n.last),
        passwordHash: PASSWORD_HASHES.teacher,
        phone: `03${randInt(0, 4)}${pad(randInt(1000000, 9999999), 7)}`,
        active: true, mustChangePassword: false, fcmTokens: [],
        createdAt: now, updatedAt: now,
      });
    }
    function teacherFor(code) {
      const pool = teachersBySubject[code] || teachers;
      return rand(pool)._id;
    }

    // 6. academic years, classes, sections (per year)
    const yearIdByLabel = {};
    const classIdByYearGrade = {}; // `${yearLabel}|${grade}` -> classId
    const sectionIdByYearGradeStream = {}; // `${yearLabel}|${grade}|${stream}` -> sectionId
    let currentYearId = null;

    for (const ay of AY_DEFS) {
      const yearId = oid();
      yearIdByLabel[ay.label] = yearId;
      if (ay.isCurrent) currentYearId = yearId;
      academicYearsToInsert.push({
        _id: yearId, orgId: ORG_ID, branchId,
        label: ay.label, startDate: new Date(ay.start), endDate: new Date(ay.end),
        isCurrent: ay.isCurrent, createdAt: now, updatedAt: now,
      });

      for (let gi = 0; gi < GRADES.length; gi++) {
        const grade = GRADES[gi];
        const classId = oid();
        classIdByYearGrade[`${ay.label}|${grade}`] = classId;
        classesToInsert.push({
          _id: classId, orgId: ORG_ID, branchId, academicYearId: yearId,
          name: grade === 'inter_1' ? '11th Grade (Inter I)' : '12th Grade (Inter II)',
          level: grade, displayOrder: gi + 1, createdAt: now, updatedAt: now,
        });

        for (const stream of STREAMS) {
          const sectionId = oid();
          sectionIdByYearGradeStream[`${ay.label}|${grade}|${stream}`] = sectionId;
          sectionsToInsert.push({
            _id: sectionId, orgId: ORG_ID, branchId, classId,
            name: stream,
            classTeacherId: teacherFor(STREAM_SUBJECTS[stream][0]),
            capacity: 25,
            createdAt: now, updatedAt: now,
          });
        }
      }
    }

    // 7. students — current year only, 20 per (grade, stream) section = 120/branch
    const studentsByGradeStream = {}; // `${grade}|${stream}` -> [{ studentId, userId, sectionId, classId, name, gender, abilityScore }]
    const currentAy = AY_DEFS.find((a) => a.isCurrent);

    for (const grade of GRADES) {
      const classId = classIdByYearGrade[`${currentAy.label}|${grade}`];
      const birthYear = grade === 'inter_1' ? 2010 : 2009;

      for (const stream of STREAMS) {
        const sectionId = sectionIdByYearGradeStream[`${currentAy.label}|${grade}|${stream}`];
        const list = [];
        studentsByGradeStream[`${grade}|${stream}`] = list;

        for (let i = 1; i <= 20; i++) {
          const gender = i % 2 === 0 ? 'female' : 'male';
          const n = randomName(gender);
          const userId = oid();
          const studentId = oid();
          const rollNo = pad(i, 2);
          const admissionNo = `MPHSS-26-${pad(admissionSeq++, 5)}`;
          const dob = new Date(birthYear, randInt(0, 11), randInt(1, 28));
          const fatherName = `${rand(LAST_NAMES)} ${n.last}`;
          const abilityScore = randInt(38, 96);

          usersToInsert.push({
            _id: userId, orgId: ORG_ID, branchId,
            role: 'student', name: n.full,
            email: makeEmail(n.first, n.last),
            passwordHash: PASSWORD_HASHES.student,
            active: true, mustChangePassword: false, fcmTokens: [],
            createdAt: now, updatedAt: now,
          });

          studentsToInsert.push({
            _id: studentId, orgId: ORG_ID, branchId,
            userId, classId, sectionId, academicYearId: currentYearId,
            rollNo, admissionNo,
            profile: {
              name: n.full, dateOfBirth: dob, gender,
              cnicOrBForm: `35202-${pad(randInt(1000000, 9999999), 7)}-${randInt(0, 9)}`,
              religion: 'Islam', nationality: 'Pakistani',
              bloodGroup: rand(['A+', 'A-', 'B+', 'B-', 'AB+', 'O+', 'O-']),
              address: `House ${randInt(1, 400)}, ${bdef.city}`,
            },
            guardianInfo: {
              fatherName, fatherPhone: `03${randInt(0, 4)}${pad(randInt(1000000, 9999999), 7)}`,
              fatherOccupation: rand(['Business', 'Government Service', 'Private Job', 'Engineer', 'Doctor', 'Teacher', 'Overseas']),
              motherName: `${rand(FEMALE_FIRST)} ${n.last}`,
              relation: 'Father',
            },
            documents: [],
            status: 'active',
            monthlyFee: grade === 'inter_1' ? 6500 : 7000,
            admissionDate: new Date(currentAy.start),
            createdAt: now, updatedAt: now,
          });

          list.push({ studentId, userId, name: n.full, gender, abilityScore, stream, grade });
          totalActiveStudents += 1;
        }
      }
    }

    // 8. exams + exam schedules + results (all 4 years)
    for (const ay of AY_DEFS) {
      const yearId = yearIdByLabel[ay.label];
      const yearStart = new Date(ay.start);

      for (const grade of GRADES) {
        const classId = classIdByYearGrade[`${ay.label}|${grade}`];
        const terms = ay.isCurrent
          ? [{ name: 'Mid Term', monthsIn: 4, hasResults: true }, { name: 'Final Term', monthsIn: 10, hasResults: false }]
          : [{ name: 'Mid Term', monthsIn: 4, hasResults: true }, { name: 'Final Term', monthsIn: 10, hasResults: true }];

        for (const term of terms) {
          const examId = oid();
          const subjectEntries = SUBJECT_CATALOG.map((s) => ({
            subjectId: subjectIdByCode[s.code], totalMarks: 100, passingMarks: 33,
          }));
          const startDate = new Date(yearStart.getFullYear(), yearStart.getMonth() + term.monthsIn, 1);
          const endDate = new Date(startDate.getTime() + (subjectEntries.length - 1) * 86400000);

          examsToInsert.push({
            _id: examId, orgId: ORG_ID, branchId, academicYearId: yearId,
            name: `${term.name} Examination ${ay.label} — ${GRADE_LABEL[grade]}`,
            targetClasses: [classId],
            subjects: subjectEntries,
            gradingConfig: GRADING_CONFIG,
            startDate, endDate,
            isPublished: term.hasResults,
            createdById: principalUserId,
            createdAt: now, updatedAt: now,
          });

          examSchedulesToInsert.push({
            _id: oid(), orgId: ORG_ID, branchId, examId, classId,
            slots: subjectEntries.map((se, idx) => ({
              subjectId: se.subjectId,
              date: new Date(startDate.getTime() + idx * 86400000),
              startTime: '09:00', endTime: '12:00',
              syllabus: 'Full Book',
            })),
            createdById: principalUserId,
            createdAt: now, updatedAt: now,
          });

          if (!term.hasResults) continue;

          // gather all 60 students of this grade (3 streams) for class-wide ranking
          const cohort = STREAMS.flatMap((stream) => studentsByGradeStream[`${grade}|${stream}`]);
          const scored = cohort.map((stu) => {
            const codes = STREAM_SUBJECTS[stu.stream];
            const isAbsent = Math.random() < 0.03;
            let totalObtained = 0, totalMax = 0;
            const subjectMarks = codes.map((code) => {
              const totalMarks = 100;
              totalMax += totalMarks;
              if (isAbsent) return { subjectId: subjectIdByCode[code], marksObtained: 0, totalMarks, isAbsent: true, isPassed: false };
              const noise = randInt(-10, 10);
              const marksObtained = Math.max(0, Math.min(100, stu.abilityScore + noise));
              totalObtained += marksObtained;
              return { subjectId: subjectIdByCode[code], marksObtained, totalMarks, isAbsent: false, isPassed: marksObtained >= 33 };
            });
            const percentage = Math.round((totalObtained / totalMax) * 10000) / 100;
            return {
              stu, subjectMarks, totalObtained, totalMax, percentage,
              sectionId: sectionIdByYearGradeStream[`${ay.label}|${grade}|${stu.stream}`],
            };
          });

          scored.sort((a, b) => b.percentage - a.percentage);
          scored.forEach((s, idx) => { s.classPosition = idx + 1; });
          for (const stream of STREAMS) {
            const streamRows = scored.filter((s) => s.stu.stream === stream).sort((a, b) => b.percentage - a.percentage);
            streamRows.forEach((s, idx) => { s.sectionPosition = idx + 1; });
          }

          for (const s of scored) {
            resultsToInsert.push({
              _id: oid(), orgId: ORG_ID, branchId, examId,
              studentId: s.stu.studentId, classId, sectionId: s.sectionId,
              subjectMarks: s.subjectMarks,
              totalMarksObtained: s.totalObtained, totalMarks: s.totalMax,
              percentage: s.percentage, grade: gradeForPct(s.percentage),
              classPosition: s.classPosition, sectionPosition: s.sectionPosition,
              isPassed: s.percentage >= 33,
              enteredById: principalUserId,
              createdAt: startDate, updatedAt: startDate,
            });
          }
        }
      }
    }

    // 9. attendance — last 10 school days, current-year sections only.
    // NOTE: Attendance's unique index is {orgId,branchId,classId,date,periodNo} — it does NOT
    // include sectionId, yet one Class (grade) here has 3 sections (FA/FSC/ICS). Two sections of
    // the same class/day/periodNo collide on that index (see error.html finding "attendance-index").
    // We assign a distinct periodNo per stream purely to make this seed insert succeed; the
    // underlying app-level markAttendance() call for a real second section would still 500.
    const attDays = workingDaysBack(10, now);
    for (const grade of GRADES) {
      const classId = classIdByYearGrade[`${currentAy.label}|${grade}`];
      for (let si = 0; si < STREAMS.length; si++) {
        const stream = STREAMS[si];
        const sectionId = sectionIdByYearGradeStream[`${currentAy.label}|${grade}|${stream}`];
        const roster = studentsByGradeStream[`${grade}|${stream}`];
        for (const day of attDays) {
          const dateStr = day.toISOString().split('T')[0];
          const records = roster.map((s) => {
            const r = Math.random();
            const status = r < 0.90 ? 'present' : r < 0.95 ? 'absent' : 'late';
            return { studentId: s.studentId, status, note: '' };
          });
          attendanceToInsert.push({
            _id: oid(), orgId: ORG_ID, branchId, classId, sectionId,
            academicYearId: currentYearId, date: day, dateStr, periodNo: si + 1,
            markedById: coordinator._id, records,
            createdAt: day, updatedAt: day,
          });
        }
      }
    }

    // 10. fee structures (current year, per grade) + challans (current month, per student)
    const feeStructIdByGrade = {};
    for (const grade of GRADES) {
      const classId = classIdByYearGrade[`${currentAy.label}|${grade}`];
      const id = oid();
      feeStructIdByGrade[grade] = id;
      const tuition = grade === 'inter_1' ? 6500 : 7000;
      const items = [
        { name: 'Tuition Fee', amount: tuition, isOptional: false },
        { name: 'Science Lab Fee', amount: 800, isOptional: false },
        { name: 'Library Fee', amount: 300, isOptional: false },
        { name: 'Sports Fee', amount: 200, isOptional: false },
      ];
      feeStructuresToInsert.push({
        _id: id, orgId: ORG_ID, branchId, classId, academicYearId: currentYearId,
        name: `${GRADE_LABEL[grade]} Monthly Fee`, items,
        totalAmount: items.reduce((s, i) => s + i.amount, 0),
        dueDay: 10, isActive: true, createdAt: now, updatedAt: now,
      });
    }

    const challanMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1, 2)}`;
    for (const grade of GRADES) {
      const classId = classIdByYearGrade[`${currentAy.label}|${grade}`];
      const feeStructureId = feeStructIdByGrade[grade];
      const fs = feeStructuresToInsert.find((f) => f._id.equals(feeStructureId));
      for (const stream of STREAMS) {
        for (const s of studentsByGradeStream[`${grade}|${stream}`]) {
          const r = Math.random();
          const status = r < 0.55 ? 'paid' : r < 0.70 ? 'partial' : 'unpaid';
          const netAmount = fs.totalAmount;
          const paidAmount = status === 'paid' ? netAmount : status === 'partial' ? Math.round(netAmount * 0.5) : 0;
          const payments = paidAmount > 0 ? [{
            amount: paidAmount, method: rand(['cash', 'bank_transfer', 'jazzcash', 'easypaisa']),
            collectedById: accountant._id, paidAt: new Date(now.getFullYear(), now.getMonth(), randInt(1, 13)),
            receiptNo: `RCPT-${pad(challanSeq, 5)}`,
          }] : [];
          challansToInsert.push({
            _id: oid(), orgId: ORG_ID, branchId,
            studentId: s.studentId, classId, feeStructureId,
            month: challanMonth, challanNo: `CH-26-${pad(challanSeq++, 5)}`,
            items: fs.items, totalAmount: fs.totalAmount, discount: 0, waiver: 0,
            netAmount, paidAmount, dueDate: new Date(now.getFullYear(), now.getMonth(), 10),
            status, payments, createdAt: now, updatedAt: now,
          });
        }
      }
    }

    // 11. staff attendance (last 10 days) + payroll (current month) for all staff
    const allStaff = [
      { ...principalName, _id: principalUserId, role: 'branch_principal', name: `Dr. ${principalName.full}` },
      { _id: coordinator._id, role: 'coordinator', name: coordinator.name },
      { _id: accountant._id, role: 'accountant', name: accountant.name },
      { _id: itAdmin._id, role: 'it_admin', name: itAdmin.name },
      ...teachers.map((t) => ({ _id: t._id, role: 'teacher', name: t.name })),
    ];
    const staffAttDays = workingDaysBack(10, now);
    const absentCountByStaff = {};
    for (const staff of allStaff) {
      let absentDays = 0;
      for (const day of staffAttDays) {
        const r = Math.random();
        const status = r < 0.92 ? 'present' : r < 0.96 ? 'absent' : r < 0.98 ? 'late' : 'on_leave';
        if (status === 'absent') absentDays += 1;
        staffAttendanceToInsert.push({
          _id: oid(), orgId: ORG_ID, branchId, staffId: staff._id, date: day, status,
          markedById: itAdmin._id, createdAt: day, updatedAt: day,
        });
      }
      absentCountByStaff[staff._id.toString()] = absentDays;
    }

    const BASIC_SALARY = { branch_principal: 150000, coordinator: 90000, accountant: 80000, it_admin: 75000, teacher: 60000 };
    const payrollMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1, 2)}`;
    for (const staff of allStaff) {
      const basicSalary = BASIC_SALARY[staff.role] + randInt(-3000, 5000);
      const houseRent = Math.round(basicSalary * 0.2);
      const medical = 5000;
      const allowances = [{ name: 'House Rent Allowance', amount: houseRent }, { name: 'Medical Allowance', amount: medical }];
      const absentDays = absentCountByStaff[staff._id.toString()] || 0;
      const absentDeduction = Math.round((basicSalary / 30) * absentDays);
      const deductions = absentDeduction > 0 ? [{ name: 'Absent Deduction', amount: absentDeduction }] : [];
      const grossSalary = basicSalary + houseRent + medical;
      const totalDeductions = absentDeduction;
      payrollToInsert.push({
        _id: oid(), orgId: ORG_ID, branchId, staffId: staff._id, month: payrollMonth,
        basicSalary, allowances, deductions, absentDays, absentDeduction,
        grossSalary, totalDeductions, netPay: grossSalary - totalDeductions,
        status: 'paid', approvedById: principalUserId, approvedAt: now,
        paidAt: new Date(now.getFullYear(), now.getMonth(), 5), paymentMethod: 'bank_transfer',
        createdAt: now, updatedAt: now,
      });
    }

    // 12. branch header (letterhead)
    branchHeadersToInsert.push({
      _id: oid(), orgId: ORG_ID, branchId,
      schoolName: org.name, tagline: 'Excellence in Education Since 1998',
      address: bdef.address, logoBase64: '',
      showStudentName: true, showRollNo: true, showSection: true,
      createdAt: now, updatedAt: now,
    });

    // 13. timetable — current-year sections only
    const PERIOD_TIMINGS = [
      { periodNo: 1, startTime: '08:00', endTime: '08:45' },
      { periodNo: 2, startTime: '08:45', endTime: '09:30' },
      { periodNo: 3, startTime: '09:30', endTime: '10:15' },
      { periodNo: 4, startTime: '10:15', endTime: '11:00' },
      { periodNo: 5, startTime: '11:30', endTime: '12:15' },
      { periodNo: 6, startTime: '12:15', endTime: '13:00' },
      { periodNo: 7, startTime: '13:00', endTime: '13:45' },
    ];
    const WORKING_DOWS = [1, 2, 3, 4, 6];
    for (const grade of GRADES) {
      const classId = classIdByYearGrade[`${currentAy.label}|${grade}`];
      for (const stream of STREAMS) {
        const sectionId = sectionIdByYearGradeStream[`${currentAy.label}|${grade}|${stream}`];
        const codes = STREAM_SUBJECTS[stream];
        const slots = [];
        let slotIdx = 0;
        for (const dow of WORKING_DOWS) {
          for (const pt of PERIOD_TIMINGS) {
            const code = codes[slotIdx % codes.length];
            slots.push({ dayOfWeek: dow, periodNo: pt.periodNo, subjectId: subjectIdByCode[code], teacherId: teacherFor(code) });
            slotIdx += 1;
          }
        }
        timetablesToInsert.push({
          _id: oid(), orgId: ORG_ID, branchId, academicYearId: currentYearId, classId, sectionId,
          slots, periodTimings: PERIOD_TIMINGS,
          effectiveFrom: new Date(currentAy.start), isActive: true,
          createdAt: now, updatedAt: now,
        });
      }
    }

    // 14. a few notifications
    const sampleTeacher = rand(teachers);
    const sampleStudent = rand(studentsByGradeStream[`inter_1|FSC`]);
    notificationsToInsert.push(
      { _id: oid(), orgId: ORG_ID, branchId, recipientId: principalUserId, senderId: itAdmin._id, type: 'system', title: 'Attendance Sync Complete', message: 'Last 10 days of attendance have been recorded for all sections.', isRead: false, createdAt: now },
      { _id: oid(), orgId: ORG_ID, branchId, recipientId: sampleTeacher._id, senderId: principalUserId, type: 'broadcast', title: 'Mid Term Datesheet Announced', message: 'The Mid Term examination schedule has been published. Please review your invigilation duties.', isRead: false, createdAt: now },
      { _id: oid(), orgId: ORG_ID, branchId, recipientId: sampleStudent.userId, senderId: principalUserId, type: 'result_published', title: 'Mid Term Result Published', message: 'Your Mid Term examination result is now available.', isRead: false, createdAt: now },
      { _id: oid(), orgId: ORG_ID, branchId, recipientId: sampleStudent.userId, senderId: accountant._id, type: 'fee_due', title: 'Fee Due Reminder', message: `Your fee challan for ${challanMonth} is due on the 10th.`, isRead: false, createdAt: now },
    );

    console.log(`  ${teachers.length} teachers, ${totalActiveStudents} cumulative students, 4 academic years wired`);
  }

  // ── bulk writes ──────────────────────────────────────────────────────────
  console.log('\nWriting to MongoDB...');
  await db.collection('branches').bulkWrite(branchOps);
  console.log(`✓ branches: ${branchOps.length}`);

  async function insertAll(name, docs) {
    if (docs.length === 0) return;
    const BATCH = 1000;
    for (let i = 0; i < docs.length; i += BATCH) {
      await db.collection(name).insertMany(docs.slice(i, i + BATCH), { ordered: false });
    }
    console.log(`✓ ${name}: ${docs.length}`);
  }

  await insertAll('users', usersToInsert);
  await insertAll('subjects', subjectsToInsert);
  await insertAll('academicyears', academicYearsToInsert);
  await insertAll('classes', classesToInsert);
  await insertAll('sections', sectionsToInsert);
  await insertAll('students', studentsToInsert);
  await insertAll('exams', examsToInsert);
  await insertAll('examschedules', examSchedulesToInsert);
  await insertAll('results', resultsToInsert);
  await insertAll('attendances', attendanceToInsert);
  await insertAll('feestructures', feeStructuresToInsert);
  await insertAll('challans', challansToInsert);
  await insertAll('staffattendances', staffAttendanceToInsert);
  await insertAll('payrolls', payrollToInsert);
  await insertAll('branchheaders', branchHeadersToInsert);
  await insertAll('timetables', timetablesToInsert);
  await insertAll('notifications', notificationsToInsert);

  await db.collection('organizations').updateOne(
    { _id: ORG_ID },
    { $set: { 'usageBilling.activeStudents': totalActiveStudents, 'usageBilling.lastCountedAt': now, status: 'active', updatedAt: now } }
  );
  console.log(`✓ organizations: activeStudents=${totalActiveStudents}, status=active`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  DONE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Branches           : ${BRANCH_DEFS.length}`);
  console.log(`  Staff users        : ${usersToInsert.filter(u => u.role !== 'student').length}`);
  console.log(`  Student users      : ${usersToInsert.filter(u => u.role === 'student').length}`);
  console.log(`  Exams              : ${examsToInsert.length}  (results on ${resultsToInsert.length ? new Set(resultsToInsert.map(r=>r.examId.toString())).size : 0})`);
  console.log(`  Results            : ${resultsToInsert.length}`);
  console.log(`  Login (shared)     :`);
  for (const [role, pw] of Object.entries(PASSWORDS)) console.log(`    ${role.padEnd(18)} password: ${pw}`);
  console.log(`  (emails are unique per user — see users collection; group_admin subhan@gmail.com unchanged)`);

  await client.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
