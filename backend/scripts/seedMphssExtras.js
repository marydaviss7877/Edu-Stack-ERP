/**
 * Second pass for the mphss org (subhan@gmail.com): populates everything flagged as
 * "not populated" in error.html — Assignments/Submissions, Learning Resources, SOPs,
 * Question Bank + Exam Paper Drafts, Admission Programs/Applications, Payment Gateway
 * config, and the weekly Paper / weak-topic / Clearance Exam subsystem.
 *
 * Reads the branches/classes/sections/subjects/teachers/students/timetables that
 * seedMphssOrg.js already wrote, and builds on top of them.
 *
 * Run: node scripts/seedMphssExtras.js
 */

require('dotenv/config');
const { MongoClient, ObjectId } = require('mongodb');
const crypto = require('crypto');

const MONGO_URI = process.env.MONGODB_URI;
const GATEWAY_KEY = process.env.GATEWAY_ENCRYPTION_KEY;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

const ORG_ID = new ObjectId('6a7ecf85d2935356a31932e5');
const now = new Date();
const oid = () => new ObjectId();
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pad = (n, len) => String(n).padStart(len, '0');
const daysAgo = (n) => new Date(now.getTime() - n * 86400000);

const STREAMS = ['FA', 'FSC', 'ICS'];
const GRADES = ['inter_1', 'inter_2'];
const STREAM_SUBJECTS = {
  FA: ['ENG', 'URD', 'ISL', 'PST', 'ECO', 'EDU'],
  FSC: ['ENG', 'URD', 'ISL', 'PST', 'PHY', 'CHEM', 'BIO'],
  ICS: ['ENG', 'URD', 'ISL', 'PST', 'PHY', 'CS', 'MATH'],
};
// codes actually taught anywhere (STAT & CIV are catalog-only, never assigned to a stream — see cleanup pass)
const TAUGHT_CODES = [...new Set(Object.values(STREAM_SUBJECTS).flat())];

const TOPICS_BY_SUBJECT = {
  ENG: ['Prose Comprehension', 'Poetry Appreciation', 'Grammar & Syntax', 'Essay Writing', 'Précis & Composition'],
  URD: ['Nasar Shanasi', 'Ghazal Aur Uska Fun', 'Ibarat Aur Khat', 'Mazmoon Nigari', 'Khat o Kitabat'],
  ISL: ['Seerat-un-Nabi (SAW)', 'Fiqh & Ibadat', "Qur'anic Studies", 'Hadith Sciences', 'Islamic History'],
  PST: ['Ideology of Pakistan', 'Freedom Movement', 'Constitutional History', 'Land & Environment', 'Economic Development'],
  PHY: ['Vectors & Equilibrium', 'Motion & Force', 'Work, Energy & Power', 'Waves & Oscillations', 'Electrostatics'],
  CHEM: ['Stoichiometry', 'Atomic Structure', 'Chemical Bonding', 'Gases & Liquids', 'Thermochemistry'],
  BIO: ['Cell Structure & Function', 'Biological Molecules', 'Enzymes', 'Kingdom Classification', 'Bioenergetics'],
  MATH: ['Functions & Limits', 'Differentiation', 'Integration', 'Vectors', 'Quadratic Equations'],
  CS: ['Number Systems', 'Programming Fundamentals', 'Data Structures Basics', 'Database Concepts', 'Computer Networks'],
  ECO: ['Basic Concepts of Economics', 'Demand & Supply', 'Market Structures', 'National Income', 'Money & Banking'],
  EDU: ['Aims of Education', 'Educational Psychology', 'Teaching Methods', 'Curriculum Development', 'Islamic Education'],
};

function makeCipherCreds(obj) {
  if (!GATEWAY_KEY) return null;
  const key = Buffer.from(GATEWAY_KEY, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()]);
  return { encrypted: encrypted.toString('hex'), iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex') };
}

const MALE_FIRST = ['Ahmed','Ali','Hamza','Bilal','Usman','Umar','Zeeshan','Fahad','Hassan','Hussain','Talha','Asad','Shahzaib','Faizan','Waqas','Kashif','Imran','Adeel','Rehan','Salman'];
const FEMALE_FIRST = ['Ayesha','Fatima','Zainab','Sana','Amna','Hira','Mahnoor','Sadia','Kiran','Rabia','Nida','Sobia','Mariam','Iqra','Laiba','Anum','Bushra','Farah','Sidra','Uzma'];
const LAST_NAMES = ['Khan','Malik','Ali','Ahmed','Raza','Hussain','Sheikh','Butt','Chaudhry','Iqbal','Mirza','Baig','Qureshi','Farooq','Aziz','Javed','Siddiqui','Nawaz','Mehmood','Hashmi'];
function randomName(gender) {
  const first = gender === 'male' ? rand(MALE_FIRST) : rand(FEMALE_FIRST);
  const last = rand(LAST_NAMES);
  return { first, last, full: `${first} ${last}` };
}

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();
  console.log('Connected to MongoDB\n');

  const org = await db.collection('organizations').findOne({ _id: ORG_ID });
  if (!org) throw new Error('Org not found');
  console.log(`Org: ${org.name}\n`);

  const branches = await db.collection('branches').find({ orgId: ORG_ID }).toArray();

  // accumulators
  const subjectTopicsToInsert = [];
  const papersToInsert = [];
  const paperResultsToInsert = [];
  const clearanceExamsToInsert = [];
  const assignmentsToInsert = [];
  const submissionsToInsert = [];
  const learningResourcesToInsert = [];
  const sopsToInsert = [];
  const questionBankToInsert = [];
  const examTypesToInsert = [];
  const examPaperDraftsToInsert = [];
  const admissionProgramsToInsert = [];
  const applicationsToInsert = [];

  let refSeq = 1;
  let cleanupPulled = 0;

  for (const branch of branches) {
    const branchId = branch._id;
    console.log(`── Branch: ${branch.name} ──`);

    const subjects = await db.collection('subjects').find({ orgId: ORG_ID, branchId }).toArray();
    const subjectIdByCode = Object.fromEntries(subjects.map((s) => [s.code, s._id]));
    const subjectCodeById = Object.fromEntries(subjects.map((s) => [s._id.toString(), s.code]));

    // ── step 0: cleanup — strip the 2 catalog-only subjects (STAT, CIV) that are never
    // actually taught in any stream out of exams/exam-schedules, so they don't show phantom papers.
    const untaughtIds = subjects.filter((s) => !TAUGHT_CODES.includes(s.code)).map((s) => s._id);
    if (untaughtIds.length) {
      const r1 = await db.collection('exams').updateMany(
        { orgId: ORG_ID, branchId },
        { $pull: { subjects: { subjectId: { $in: untaughtIds } } } }
      );
      const r2 = await db.collection('examschedules').updateMany(
        { orgId: ORG_ID, branchId },
        { $pull: { slots: { subjectId: { $in: untaughtIds } } } }
      );
      cleanupPulled += (r1.modifiedCount || 0) + (r2.modifiedCount || 0);
    }

    const currentYear = await db.collection('academicyears').findOne({ orgId: ORG_ID, branchId, isCurrent: true });
    const classes = await db.collection('classes').find({ orgId: ORG_ID, branchId, academicYearId: currentYear._id }).toArray();
    const classIdByGrade = Object.fromEntries(classes.map((c) => [c.level, c._id]));
    const sections = await db.collection('sections').find({ orgId: ORG_ID, branchId, classId: { $in: classes.map((c) => c._id) } }).toArray();

    const principal = await db.collection('users').findOne({ orgId: ORG_ID, branchId, role: 'branch_principal' });
    const coordinator = await db.collection('users').findOne({ orgId: ORG_ID, branchId, role: 'coordinator' });
    const teachers = await db.collection('users').find({ orgId: ORG_ID, branchId, role: 'teacher' }).toArray();

    const timetables = await db.collection('timetables').find({ orgId: ORG_ID, branchId, isActive: true }).toArray();
    function teacherFor(sectionId, subjectCode) {
      const tt = timetables.find((t) => t.sectionId.equals(sectionId));
      const slot = tt?.slots.find((s) => s.subjectId.equals(subjectIdByCode[subjectCode]));
      return slot ? slot.teacherId : rand(teachers)._id;
    }
    function anyTeacherFor(subjectCode) {
      for (const tt of timetables) {
        const slot = tt.slots.find((s) => s.subjectId.equals(subjectIdByCode[subjectCode]));
        if (slot) return slot.teacherId;
      }
      return rand(teachers)._id;
    }

    const midTermExamByGrade = {};
    for (const grade of GRADES) {
      midTermExamByGrade[grade] = await db.collection('exams').findOne({
        orgId: ORG_ID, branchId, academicYearId: currentYear._id,
        targetClasses: classIdByGrade[grade], name: /Mid Term/,
      });
    }

    // ── 1. SubjectTopics — 5 chapters per taught subject, per current class ─────
    const topicIdsByClassSubject = {}; // `${classId}|${code}` -> [topicIds]
    for (const grade of GRADES) {
      const classId = classIdByGrade[grade];
      for (const code of TAUGHT_CODES) {
        const chapters = TOPICS_BY_SUBJECT[code] || ['Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4', 'Chapter 5'];
        const ids = [];
        chapters.forEach((topicName, idx) => {
          const id = oid();
          ids.push(id);
          subjectTopicsToInsert.push({
            _id: id, orgId: ORG_ID, branchId, classId, subjectId: subjectIdByCode[code],
            chapterNumber: idx + 1, topicName, orderIndex: idx,
            createdById: principal._id, createdAt: now, updatedAt: now,
          });
        });
        topicIdsByClassSubject[`${classId}|${code}`] = ids;
      }
    }

    // ── 2. Weekly Papers + PaperResults (last 4 weeks, 1 subject per section) ──
    // + Assignments + Submissions (2 subjects per section)
    const currentAy = currentYear;
    for (const grade of GRADES) {
      const classId = classIdByGrade[grade];
      for (const stream of STREAMS) {
        const section = sections.find((s) => s.classId.equals(classId) && s.name === stream);
        const roster = await db.collection('students').find({ orgId: ORG_ID, branchId, sectionId: section._id }).toArray();
        const codes = STREAM_SUBJECTS[stream];
        // rotate through the streams' shared core subjects (ENG/URD/ISL/PST) instead of always ENG
        const weeklyCode = codes[(GRADES.indexOf(grade) + STREAMS.indexOf(stream)) % 4];
        const teacherId = teacherFor(section._id, weeklyCode);
        const topicIds = topicIdsByClassSubject[`${classId}|${weeklyCode}`];

        // per-student synthetic ability, reused across the 4 weekly papers
        const ability = new Map(roster.map((s) => [s._id.toString(), randInt(30, 96)]));
        const studentTotals = new Map(roster.map((s) => [s._id.toString(), { obtained: 0, count: 0 }]));

        for (let week = 0; week < 4; week++) {
          const paperId = oid();
          const scheduledDate = daysAgo(7 * (4 - week));
          const totalMarks = 20;
          papersToInsert.push({
            _id: paperId, orgId: ORG_ID, branchId, classId, sectionId: section._id,
            subjectId: subjectIdByCode[weeklyCode], teacherId, academicYearId: currentAy._id,
            topicId: topicIds[week % topicIds.length],
            paperType: 'weekly', weekNumber: week + 1, month: scheduledDate.getMonth() + 1, year: scheduledDate.getFullYear(),
            totalMarks, scheduledDate, status: 'graded', createdById: teacherId,
            createdAt: scheduledDate, updatedAt: scheduledDate,
          });

          for (const stu of roster) {
            const a = ability.get(stu._id.toString());
            const isAbsent = Math.random() < 0.04;
            const marksObtained = isAbsent ? 0 : Math.max(0, Math.min(totalMarks, Math.round((a + randInt(-15, 15)) / 5)));
            const percentage = Math.round((marksObtained / totalMarks) * 10000) / 100;
            const isWeak = !isAbsent && percentage < (branch.academicThresholds?.weakThreshold ?? 50);
            paperResultsToInsert.push({
              _id: oid(), orgId: ORG_ID, branchId, paperId, studentId: stu._id, classId, sectionId: section._id,
              subjectId: subjectIdByCode[weeklyCode], marksObtained, totalMarks, percentage, isWeak, isAbsent,
              gradedAt: scheduledDate, gradedById: teacherId, createdAt: scheduledDate, updatedAt: scheduledDate,
            });
            if (!isAbsent) {
              const t = studentTotals.get(stu._id.toString());
              t.obtained += percentage; t.count += 1;
            }
          }
        }

        // ── ClearanceExam for students averaging below the failing threshold ──
        const failingThreshold = branch.academicThresholds?.failingThreshold ?? 40;
        const triggerMonth = now.getMonth() + 1, triggerYear = now.getFullYear();
        for (const stu of roster) {
          const t = studentTotals.get(stu._id.toString());
          if (t.count === 0) continue;
          const avg = Math.round((t.obtained / t.count) * 100) / 100;
          if (avg >= failingThreshold) continue;

          const clearanceId = oid();
          const r = Math.random();
          const status = r < 0.15 ? 'pending_approval' : r < 0.25 ? 'waived' : r < 0.5 ? 'scheduled' : 'completed';
          const doc = {
            _id: clearanceId, orgId: ORG_ID, branchId, studentId: stu._id, subjectId: subjectIdByCode[weeklyCode],
            classId, sectionId: section._id, triggerMonth, triggerYear, averagePercentage: avg,
            status, createdAt: now, updatedAt: now,
          };

          if (status !== 'pending_approval' && status !== 'waived') {
            const clearancePaperId = oid();
            const clearanceTotalMarks = 25;
            const scheduledDate = daysAgo(randInt(1, 5));
            papersToInsert.push({
              _id: clearancePaperId, orgId: ORG_ID, branchId, classId, sectionId: section._id,
              subjectId: subjectIdByCode[weeklyCode], teacherId, academicYearId: currentAy._id,
              topicId: topicIds[0], paperType: 'clearance', weekNumber: 0,
              month: triggerMonth, year: triggerYear, totalMarks: clearanceTotalMarks,
              scheduledDate, status: status === 'completed' ? 'graded' : 'active', createdById: principal._id,
              createdAt: scheduledDate, updatedAt: scheduledDate,
            });
            doc.approvedById = principal._id;
            doc.approvedAt = scheduledDate;
            doc.scheduledDate = scheduledDate;
            doc.clearancePaperId = clearancePaperId;

            if (status === 'completed') {
              const marks = randInt(8, 24);
              const pct = Math.round((marks / clearanceTotalMarks) * 10000) / 100;
              const clearancePassMark = branch.academicThresholds?.clearancePassMark ?? 40;
              doc.clearanceMarksObtained = marks;
              doc.clearanceTotalMarks = clearanceTotalMarks;
              doc.clearancePercentage = pct;
              doc.clearancePassed = pct >= clearancePassMark;
              doc.gradedById = teacherId;
              doc.gradedAt = daysAgo(randInt(0, 2));
              if (doc.clearancePassed) {
                for (const pr of paperResultsToInsert) {
                  if (pr.studentId.equals(stu._id) && pr.subjectId.equals(subjectIdByCode[weeklyCode]) && pr.isWeak) {
                    pr.isWeak = false;
                    pr.clearedByClearanceId = clearanceId;
                  }
                }
              }
            }
          }
          clearanceExamsToInsert.push(doc);
        }

        // ── Assignments + Submissions — weekly subject + 1 more from the stream ──
        const assignSubjects = [weeklyCode, codes[1]];
        for (const code of assignSubjects) {
          const assignId = oid();
          const dueDate = daysAgo(randInt(2, 6));
          const assignTeacher = teacherFor(section._id, code);
          assignmentsToInsert.push({
            _id: assignId, orgId: ORG_ID, branchId, classId, sectionId: section._id,
            subjectId: subjectIdByCode[code], createdById: assignTeacher,
            title: `${(TOPICS_BY_SUBJECT[code] || ['Assignment'])[0]} — Homework`,
            description: `Complete the exercise questions from "${(TOPICS_BY_SUBJECT[code] || ['this chapter'])[0]}" and submit before the due date.`,
            dueDate, totalMarks: 10, isActive: true, createdAt: daysAgo(randInt(7, 10)), updatedAt: now,
          });
          for (const stu of roster) {
            if (Math.random() < 0.08) continue; // ~8% never submitted
            const late = Math.random() < 0.1;
            const submittedAt = late ? new Date(dueDate.getTime() + randInt(1, 3) * 86400000) : new Date(dueDate.getTime() - randInt(0, 3) * 86400000);
            const graded = Math.random() < 0.8;
            submissionsToInsert.push({
              _id: oid(), orgId: ORG_ID, branchId, assignmentId: assignId, studentId: stu._id,
              textResponse: 'Completed as per instructions.', submittedAt,
              status: late ? 'late' : graded ? 'graded' : 'submitted',
              ...(graded ? { marksAwarded: randInt(5, 10), feedback: rand(['Good work.', 'Well done.', 'Needs more detail.', 'Excellent.']), gradedById: assignTeacher, gradedAt: new Date(submittedAt.getTime() + 86400000) } : {}),
              createdAt: submittedAt, updatedAt: submittedAt,
            });
          }
        }
      }
    }

    // ── 3. Learning Resources ────────────────────────────────────────────────
    const inter1ClassId = classIdByGrade['inter_1'];
    const inter2ClassId = classIdByGrade['inter_2'];
    const s3Base = `https://${process.env.AWS_S3_BUCKET || 'edustack-uploads'}.s3.${process.env.AWS_REGION || 'eu-north-1'}.amazonaws.com`;
    const resourceDefs = [
      { title: 'FSC Physics Past Papers (2023–2025)', type: 'past_paper', classId: inter1ClassId, code: 'PHY' },
      { title: 'ICS Computer Science — Programming Fundamentals Notes', type: 'notes', classId: inter1ClassId, code: 'CS' },
      { title: 'FA Economics Complete Notes', type: 'notes', classId: inter2ClassId, code: 'ECO' },
      { title: 'Board Exam Guide — English Précis Writing', type: 'video_link', classId: inter2ClassId, code: 'ENG' },
    ];
    for (const r of resourceDefs) {
      const key = `resources/${branch.code}/${r.type}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`;
      learningResourcesToInsert.push({
        _id: oid(), orgId: ORG_ID, branchId, classId: r.classId, subjectId: subjectIdByCode[r.code],
        uploadedBy: anyTeacherFor(r.code), title: r.title, description: `${r.title} shared for exam preparation.`,
        type: r.type,
        ...(r.type === 'video_link'
          ? { externalUrl: 'https://youtube.com/watch?v=demo-placeholder' }
          : { fileKey: key, fileUrl: `${s3Base}/${key}`, fileName: `${r.title.replace(/\s+/g, '_')}.pdf`, fileSize: randInt(200_000, 3_000_000), mimeType: 'application/pdf' }),
        tags: [r.code, GRADE_TAG(r.classId, inter1ClassId)], isPublished: true, bookmarkedBy: [], downloadCount: randInt(3, 80),
        createdAt: daysAgo(randInt(5, 60)), updatedAt: now,
      });
    }
    function GRADE_TAG(classId, i1) { return classId.equals(i1) ? '11th' : '12th'; }

    // ── 4. SOPs ───────────────────────────────────────────────────────────────
    const sopDefs = [
      { title: 'Daily Attendance Marking Procedure', category: 'Academics', roles: ['teacher', 'branch_principal'], content: 'Attendance must be marked for every section by 9:15 AM daily. Use the Attendance module, select the section, and mark each student present/absent/late before the first period ends.' },
      { title: 'Fee Collection & Challan Procedure', category: 'Finance', roles: ['accountant', 'branch_principal'], content: 'Monthly challans are generated on the 1st of every month. Payments received in cash must be receipted same-day and reconciled against the Challans module by end of day.' },
      { title: 'Admission Processing Guidelines', category: 'Admissions', roles: ['coordinator', 'branch_principal'], content: 'All applications must be reviewed within 3 working days. Verify B-Form, result card and photo before moving an application to docs_verified.' },
      { title: 'Emergency Evacuation Plan', category: 'Safety', roles: ['branch_principal', 'teacher', 'it_admin', 'accountant', 'student'], content: 'On the fire alarm, teachers escort their section to the designated assembly point via the nearest marked exit. Do not use elevators. Coordinators take a headcount against the attendance register.' },
      { title: 'Staff Leave Application Process', category: 'HR', roles: ['teacher', 'accountant', 'it_admin', 'coordinator'], content: 'Leave requests must be submitted to the branch principal at least 2 working days in advance except for medical emergencies. Approved leave is reflected in the Staff Attendance module as on_leave.' },
      { title: 'Examination Conduct Guidelines', category: 'Examinations', roles: ['teacher', 'branch_principal', 'student'], content: 'Invigilators must report 15 minutes before the exam start time. No electronic devices are permitted in the exam hall. Any misconduct must be reported to the branch principal immediately in writing.' },
    ];
    sopDefs.forEach((s, idx) => {
      sopsToInsert.push({
        _id: oid(), orgId: ORG_ID, branchId, title: s.title, category: s.category, content: s.content,
        targetRoles: s.roles, order: idx, isPublished: true, createdBy: principal._id,
        createdAt: daysAgo(randInt(10, 90)), updatedAt: now,
      });
    });

    // ── 5. Question Bank + Exam Type + Exam Paper Drafts ────────────────────
    const examType = {
      _id: oid(), orgId: ORG_ID, branchId,
      name: 'Standard Term Paper Format', totalMarks: 100,
      sections: [
        { name: 'Multiple Choice Questions', type: 'MCQ', totalMarks: 10, questionCount: 2 },
        { name: 'Short Questions', type: 'SQ', totalMarks: 40, questionCount: 2 },
        { name: 'Long Questions', type: 'LQ', totalMarks: 50, questionCount: 2 },
      ],
      isActive: true, createdById: principal._id, createdAt: now, updatedAt: now,
    };
    examTypesToInsert.push(examType);

    const questionIdsByClassSubjectType = {}; // `${classId}|${code}|${type}` -> [ids]
    for (const grade of GRADES) {
      const classId = classIdByGrade[grade];
      for (const code of TAUGHT_CODES) {
        const topics = TOPICS_BY_SUBJECT[code] || ['General'];
        const teacherId = anyTeacherFor(code);
        for (const type of ['MCQ', 'SQ', 'LQ']) {
          const ids = [];
          for (let i = 0; i < 2; i++) {
            const topicName = topics[(i + (type === 'MCQ' ? 0 : type === 'SQ' ? 1 : 2)) % topics.length];
            const id = oid();
            ids.push(id);
            const base = {
              _id: id, orgId: ORG_ID, branchId, subjectId: subjectIdByCode[code], classId,
              type, chapter: `Chapter ${topics.indexOf(topicName) + 1}: ${topicName}`,
              difficulty: rand(['easy', 'medium', 'hard']), language: 'en',
              createdById: teacherId, createdAt: daysAgo(randInt(20, 120)), updatedAt: now,
            };
            if (type === 'MCQ') {
              base.text = `Which of the following best relates to "${topicName}"?`;
              base.options = [`${topicName} — correct concept`, 'Unrelated distractor A', 'Unrelated distractor B', 'Unrelated distractor C'];
              base.correctAnswer = 'A';
            } else if (type === 'SQ') {
              base.text = `Briefly explain the concept of "${topicName}".`;
            } else {
              base.text = `Describe in detail: "${topicName}". Support your answer with relevant examples.`;
            }
            questionBankToInsert.push(base);
          }
          questionIdsByClassSubjectType[`${classId}|${code}|${type}`] = ids;
        }
      }
    }

    for (const grade of GRADES) {
      const midTermExam = midTermExamByGrade[grade];
      if (midTermExam) {
        const classId = classIdByGrade[grade];
        for (const code of TAUGHT_CODES) {
          const teacherId = anyTeacherFor(code);
          const r = Math.random();
          const status = r < 0.15 ? 'draft' : r < 0.35 ? 'pending_approval' : r < 0.75 ? 'approved' : r < 0.9 ? 'printed' : 'rejected';

          const buildSections = () => examType.sections.map((sec) => {
            const ids = questionIdsByClassSubjectType[`${classId}|${code}|${sec.type}`];
            const perQ = sec.totalMarks / sec.questionCount;
            return {
              name: sec.name, type: sec.type, totalMarks: sec.totalMarks,
              questions: ids.map((qId) => ({ questionId: qId, marks: perQ, isOverridden: false })),
            };
          });

          const doc = {
            _id: oid(), orgId: ORG_ID, branchId, examId: midTermExam._id, examTypeId: examType._id,
            subjectId: subjectIdByCode[code], classId, createdById: teacherId, status,
            sections: status === 'draft' ? examType.sections.map((s) => ({ name: s.name, type: s.type, totalMarks: s.totalMarks, questions: [] })) : buildSections(),
            createdAt: daysAgo(randInt(5, 30)), updatedAt: now,
          };
          if (status === 'approved' || status === 'printed') { doc.approvedById = principal._id; doc.approvedAt = daysAgo(randInt(1, 4)); }
          if (status === 'rejected') { doc.rejectedById = principal._id; doc.rejectionComment = 'Please balance question difficulty across sections and resubmit.'; }
          examPaperDraftsToInsert.push(doc);
        }
      }
    }

    // ── 6. Admission Programs + Applications ─────────────────────────────────
    const programDefs = STREAMS.map((stream) => ({
      stream, name: `Inter I — ${stream}`, code: `${branch.code}-${stream}`,
      totalSeats: 40, quotaSeats: { sports: 2, staff: 3, army: 1 },
    }));
    const programIds = {};
    for (const p of programDefs) {
      const id = oid();
      programIds[p.stream] = id;
      admissionProgramsToInsert.push({
        _id: id, orgId: ORG_ID, branchId, name: p.name, code: p.code,
        description: `Intermediate Part I admission for the ${p.stream} stream.`,
        totalSeats: p.totalSeats, quotaSeats: p.quotaSeats, isOpen: true, sortOrder: STREAMS.indexOf(p.stream),
        createdAt: daysAgo(120), updatedAt: now,
      });
    }

    const statusPlan = [
      ...Array(3).fill('submitted'), ...Array(2).fill('under_review'), ...Array(2).fill('docs_verified'),
      ...Array(2).fill('shortlisted'), ...Array(2).fill('offered'), ...Array(2).fill('accepted'),
      'rejected', 'waitlisted',
    ];
    const HISTORY_ORDER = ['submitted', 'under_review', 'docs_verified', 'shortlisted', 'offered', 'accepted'];
    for (const status of statusPlan) {
      const gender = Math.random() < 0.5 ? 'male' : 'female';
      const n = randomName(gender);
      const marksObtained = randInt(650, 1050);
      const totalMarks = 1100;
      const primaryStream = rand(STREAMS);
      const prefs = [primaryStream, ...STREAMS.filter((s) => s !== primaryStream)].map((s, i) => ({
        programId: programIds[s], programName: `Inter I — ${s}`, rank: i + 1,
      }));
      const submittedAt = daysAgo(randInt(10, 45));
      const history = (status === 'rejected' || status === 'waitlisted')
        ? [{ status: 'submitted', changedAt: submittedAt, changedByName: 'Applicant', note: 'Application submitted online' },
           { status, changedAt: daysAgo(randInt(1, 8)), changedByName: coordinator.name, note: status === 'rejected' ? 'Did not meet merit criteria' : 'Placed on waiting list' }]
        : HISTORY_ORDER.slice(0, HISTORY_ORDER.indexOf(status) + 1).map((st, i) => ({
            status: st, changedAt: new Date(submittedAt.getTime() + i * 4 * 86400000),
            changedByName: i === 0 ? 'Applicant' : coordinator.name, note: undefined,
          }));

      applicationsToInsert.push({
        _id: oid(), orgId: ORG_ID, refNo: `APP-26-${pad(refSeq++, 5)}`,
        preferences: prefs,
        personal: {
          name: n.full, fatherName: `${rand(LAST_NAMES)} ${n.last}`, dob: new Date(2010, randInt(0, 11), randInt(1, 28)),
          gender, religion: 'Islam', nationality: 'Pakistani', address: `House ${randInt(1, 400)}, ${branch.city}`,
          parentPhone: `03${randInt(0, 4)}${pad(randInt(1000000, 9999999), 7)}`,
        },
        academic: { previousSchool: rand(['Beacon House Secondary School', 'City Public High School', 'Punjab Group of Colleges', 'Government Model High School', 'Allied Schools']), board: 'BISE', marksObtained, totalMarks, percentage: Math.round((marksObtained / totalMarks) * 10000) / 100 },
        sibling: { has: false, verified: false },
        quota: { type: 'none', verified: false },
        documents: {
          photo: { verified: status !== 'submitted' },
          bForm: { verified: status !== 'submitted' },
          resultCard: { verified: !['submitted', 'under_review'].includes(status) },
          quotaProof: { verified: false },
        },
        status,
        ...(status === 'shortlisted' || status === 'offered' || status === 'accepted' ? { meritScore: Math.round((marksObtained / totalMarks) * 100), allocatedProgramId: programIds[primaryStream], allocatedProgramName: `Inter I — ${primaryStream}`, meritRound: 1 } : {}),
        ...(status === 'offered' || status === 'accepted' ? { offerSentAt: daysAgo(randInt(1, 6)) } : {}),
        adminNotes: [],
        statusHistory: history,
        submittedAt, createdAt: submittedAt, updatedAt: now,
      });
    }

    console.log(`  topics=${Object.keys(topicIdsByClassSubject).length * 5} questionBank+=${TAUGHT_CODES.length * 2 * 3 * GRADES.length} sops=${sopDefs.length} programs=${programDefs.length} applications=${statusPlan.length}`);
  }

  // ── Org-level: Payment Gateway configs ─────────────────────────────────────
  const paymentGatewayConfigsToInsert = [];
  if (GATEWAY_KEY) {
    const jazzCreds = makeCipherCreds({ merchantId: 'MC00000', password: 'demo_password_123', integritySalt: 'demo_salt_abcd1234' });
    const easyCreds = makeCipherCreds({ merchantId: 'DEMO123', storeId: 'STORE001', hashKey: 'demo_hash_key_5678' });
    paymentGatewayConfigsToInsert.push(
      { _id: oid(), orgId: ORG_ID, gateway: 'jazzcash', isSandbox: true, isActive: true, credentials: jazzCreds, createdAt: now, updatedAt: now },
      { _id: oid(), orgId: ORG_ID, gateway: 'easypaisa', isSandbox: true, isActive: true, credentials: easyCreds, createdAt: now, updatedAt: now },
    );
  } else {
    console.log('\n(!) GATEWAY_ENCRYPTION_KEY not set — skipping PaymentGatewayConfig (would insert invalid ciphertext).');
  }

  // ── bulk writes ──────────────────────────────────────────────────────────
  console.log(`\nCleanup: pulled untaught subjects from ${cleanupPulled} exam/schedule docs.`);
  console.log('Writing to MongoDB...');

  async function insertAll(name, docs) {
    if (docs.length === 0) return;
    const BATCH = 1000;
    for (let i = 0; i < docs.length; i += BATCH) {
      await db.collection(name).insertMany(docs.slice(i, i + BATCH), { ordered: false });
    }
    console.log(`✓ ${name}: ${docs.length}`);
  }

  await insertAll('subjecttopics', subjectTopicsToInsert);
  await insertAll('paper', papersToInsert); // NOTE: Mongoose pluralizes "Paper" -> "paper" (singular) — not a typo
  await insertAll('paperresults', paperResultsToInsert);
  await insertAll('clearanceexams', clearanceExamsToInsert);
  await insertAll('assignments', assignmentsToInsert);
  await insertAll('submissions', submissionsToInsert);
  await insertAll('learningresources', learningResourcesToInsert);
  await insertAll('sops', sopsToInsert);
  await insertAll('examtypes', examTypesToInsert);
  await insertAll('questionbanks', questionBankToInsert);
  await insertAll('exampaperdrafts', examPaperDraftsToInsert);
  await insertAll('admissionprograms', admissionProgramsToInsert);
  await insertAll('applications', applicationsToInsert);
  await insertAll('paymentgatewayconfigs', paymentGatewayConfigsToInsert);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  DONE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  SubjectTopics       : ${subjectTopicsToInsert.length}`);
  console.log(`  Weekly/Clearance Papers : ${papersToInsert.length}`);
  console.log(`  PaperResults        : ${paperResultsToInsert.length}`);
  console.log(`  ClearanceExams      : ${clearanceExamsToInsert.length}`);
  console.log(`  Assignments         : ${assignmentsToInsert.length}`);
  console.log(`  Submissions         : ${submissionsToInsert.length}`);
  console.log(`  LearningResources   : ${learningResourcesToInsert.length}`);
  console.log(`  SOPs                : ${sopsToInsert.length}`);
  console.log(`  QuestionBank        : ${questionBankToInsert.length}`);
  console.log(`  ExamTypes           : ${examTypesToInsert.length}`);
  console.log(`  ExamPaperDrafts     : ${examPaperDraftsToInsert.length}`);
  console.log(`  AdmissionPrograms   : ${admissionProgramsToInsert.length}`);
  console.log(`  Applications        : ${applicationsToInsert.length}`);
  console.log(`  PaymentGatewayConfigs : ${paymentGatewayConfigsToInsert.length}`);

  await client.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
