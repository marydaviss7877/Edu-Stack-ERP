const screenChangeNotes = {
  scan: 'Retains the immersive camera and bottom sheet, but removes the misleading continue action until a QR code is actually detected.',
  confirm: 'Uses the same identity card with the finalized indigo system and clearer trust language.',
  login: 'Unifies authentication with the permanent EduStack identity instead of keeping an unrelated blue gradient.',
  'student-dashboard': 'Promotes fee urgency and the next class above secondary metrics; the oversized decorative welcome card is removed.',
  timetable: 'Keeps day tabs but increases touch targets and strengthens active-period hierarchy.',
  results: 'Changes the result page into an academic ledger with immediately comparable subjects and visible progress.',
  attendance: 'Preserves the numeric summary while separating brand color from present/absent semantic colors.',
  assignments: 'Uses stronger deadline hierarchy with consistent action and status treatments.',
  fees: 'Introduces a financial-center summary with amount, due date, and payment history visible in one scan.',
  classmates: 'Keeps performance context without making ranking the dominant identity of every student.',
  notifications: 'Uses improved row spacing, read-state hierarchy, and accessible touch targets.',
  'teacher-dashboard': 'Replaces generic dashboard tiles with a time-based agenda, current-class actions, and a focused action queue.',
  'select-class': 'Preserves the efficient class-selection workflow and applies the new component system.',
  'mark-attendance': 'Keeps bulk controls, adds clearer semantic state colors, and maintains large touch targets.',
  marks: 'Retains a task-oriented entry table rather than adopting the proposal’s desktop-first layout.',
  'teacher-assignments': 'Uses the new surface system while keeping creation and submission counts prominent.',
  'principal-dashboard': 'Adopts the strongest bento concept: compact KPIs, school attendance, and low-attendance exceptions.',
  'attendance-report': 'Uses calm report surfaces and reserves red only for genuine exceptions.',
  coordinator: 'Reorganizes quick actions around academic operations instead of reusing a recolored generic dashboard.',
  accountant: 'Creates a purpose-built financial overview with collection progress, outstanding balance, and overdue work.',
  admin: 'Balances organization health, system KPIs, and direct administrative actions without excessive hero decoration.',
  users: 'Retains role tabs and search, with clearer account state and safer row-level actions.',
  qr: 'Uses the finalized institutional identity and keeps QR sharing separate from onboarding scanning.',
  profile: 'Applies the indigo identity while retaining readable account and organization details.',
  settings: 'Adds the finalized typography and larger targets. Language switching is removed because the product is English-only.',
  offline: 'Uses a quieter, recognizable system state and one obvious recovery action.'
};

const roleProfiles = {
  Student: {name:'Ayesha Khan', subtitle:'Grade 8 · Section A', initials:'AK', variant:'student'},
  Teacher: {name:'Mr. Usman', subtitle:'Mathematics Teacher', initials:'MU', variant:'teacher'},
  Principal: {name:'Dr. Fatima', subtitle:'Principal', initials:'DF', variant:'principal'},
  Coordinator: {name:'Ms. Hira', subtitle:'Academic Coordinator', initials:'MH', variant:'coordinator'},
  Accountant: {name:'Ali Raza', subtitle:'Accountant', initials:'AR', variant:'accountant'},
  Admin: {name:'Super Admin', subtitle:'Administration', initials:'SA', variant:'admin'},
  Shared: {name:'Ayesha Khan', subtitle:'Student', initials:'AK', variant:'student'}
};

const avatarArt = (initials, variant='student') => `<span class="avatar-art avatar-${variant}" aria-hidden="true"><svg viewBox="0 0 48 48" role="img"><circle cx="24" cy="24" r="24" class="avatar-bg"/><circle cx="24" cy="20" r="9" class="avatar-face"/><path d="M9 46c1.5-10 7-15 15-15s13.5 5 15 15" class="avatar-shirt"/><path d="M15 19c.5-8 4.5-12 10-12 6.2 0 9.8 5 9.2 12-2-4.5-5.5-7-10.2-7-3.8 0-6.8 2.2-9 7Z" class="avatar-hair"/></svg><span class="avatar-fallback">${initials}</span></span>`;

const identityHeader = (name, subtitle, initials, variant, organization='Beaconhouse Academy', badge='3') => `<header class="identity-header"><div class="identity-school"><span class="identity-mark">${I('account_balance')}</span><span>${organization}</span></div><div class="identity-main"><div class="identity-copy"><span>Good morning</span><h1>${name}</h1><small>${subtitle}</small></div><div class="identity-actions"><button class="identity-bell" aria-label="Notifications">${I('notifications')}${badge?`<i>${badge}</i>`:''}</button><button class="profile-avatar" aria-label="Open profile for ${name}">${avatarArt(initials,variant)}</button></div></div></header>`;

const redesignScreen = (id, renderer, pattern, copy, measures) => {
  const target = screens.find(screen => screen.id === id);
  if (!target) return;
  target.render = renderer;
  target.pattern = pattern;
  target.copy = copy;
  if (measures) target.measures = measures;
};

redesignScreen('scan', () => shell(`
  <div class="scanner" style="justify-content:flex-start;padding:0">
    <div style="flex:1;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding-top:28px">
      <h2 style="margin:0 0 5px">Scan your school QR</h2>
      <p>Position the school-issued QR code inside the frame</p>
      <div class="scan-frame"><i class="scan-line"></i></div>
    </div>
    <div class="scanner-sheet">
      <div class="school-logo">${I('account_balance')}</div>
      <h2>Connect to your school</h2>
      <p>Your code securely selects the correct EduStack organization. It does not sign you in.</p>
      <button class="primary-button">${I('image')} &nbsp; Upload QR from gallery</button>
      <button class="secondary-action">Enter school code manually</button>
    </div>
  </div>`, '', 'scan-screen'), 'Secure school connection', 'An immersive scanner with a trustworthy explanation and useful alternatives. The primary action never implies that authentication has already happened.', [['Scan frame','230 × 230'],['Sheet radius','22 px'],['Touch targets','≥ 44 px']]);

redesignScreen('student-dashboard', () => shell(`${identityHeader('Ayesha Khan','Grade 8 · Section A','AK','student')}${scroll(`
  <div class="page-greeting"><span class="date">Thursday, 14 August</span><h2>Today at a glance</h2><p>Here is what needs your attention today.</p></div>
  <div class="action-alert fee-alert" style="--alert:var(--error)">${I('account_balance_wallet')}<div><b>PKR 8,500 is due in 6 days</b><small>August fee challan · Due 20 Aug</small></div><button class="mini-action">View fee</button></div>
  ${section('Next class', `<div class="m-card"><div class="list-row" style="min-height:78px"><div class="list-icon" style="--row-color:var(--secondary)">${I('calculate')}</div><div class="list-copy"><div class="list-title" style="font-size:13px">Mathematics</div><div class="list-sub">08:00–08:45 · Room 12 · Ms. Sana</div><div class="progress" style="margin-top:8px;--pct:42%;--bar:var(--secondary)"><i></i></div></div><span class="pill">Starts in 15m</span></div></div>`, 'Full timetable')}
  <div class="stat-grid">${stat('check_circle','Attendance','92%','var(--green)')}${stat('grade','Last result','A','var(--primary)')}</div>
  ${section('Upcoming deadlines', card(row('functions','Algebra worksheet','Mathematics · Due tomorrow','1 DAY','var(--orange)')+row('biotech','Plant cell diagram','General Science · Due 18 Aug','4 DAYS','var(--blue)')))}
  ${section('Today', card(row('translate','English','09:00–09:45 · Room 12','09:00')+row('science','General Science','10:00–10:45 · Lab 2','10:00')))}
`)}${studentNav(0)}`), 'Action-first student home', 'The dashboard begins with the next decision, not a decorative identity banner. Attendance and grades remain available without competing with deadlines.', [['Greeting block','Compact'],['Primary priority','Fee + next class'],['Navigation','5 destinations']]);

redesignScreen('teacher-dashboard', () => shell(`${identityHeader('Mr. Usman','Mathematics Teacher · 4 classes today','MU','teacher')}${scroll(`
  <div class="page-greeting"><span class="date">Thursday, 14 August</span><h2>Today’s teaching plan</h2><p>Four classes and three actions need your attention.</p></div>
  <div class="filter-row"><span class="filter-chip active">${I('how_to_reg')} Mark attendance</span><span class="filter-chip">${I('grading')} Enter marks</span><span class="filter-chip">${I('add_task')} Assignment</span></div>
  ${section("Today's agenda", `<div class="timeline">
    <div class="timeline-item"><div class="timeline-time">08:00–08:45 · Completed</div><div class="timeline-title">Grade 8-A · Mathematics</div><div class="timeline-meta">Room 12 · Attendance saved</div></div>
    <div class="timeline-item active"><div class="timeline-time">09:00–09:45 · Happening now</div><div class="timeline-title">Grade 9-B · Mathematics</div><div class="timeline-meta">Room 6 · 31 students</div><div class="timeline-actions"><button>Mark attendance</button><button>Class details</button></div></div>
    <div class="timeline-item"><div class="timeline-time">10:30–11:15 · Upcoming</div><div class="timeline-title">Grade 10-A · Mathematics</div><div class="timeline-meta">Room 4 · 26 students</div></div>
  </div>`, 'Full timetable')}
  ${section('3 actions required', card(row('assignment_late','Review Grade 8 homework','12 submissions · Due today','12','var(--orange)')+row('edit_note','Complete Mid Term marks','Grade 9-B · 6 remaining','6','var(--error)')+row('event_available','Confirm department meeting','Tomorrow · 10:00 AM',I('chevron_right'),'var(--blue)')), '')}
`)}${teacherNav(0)}`), 'Time-based teacher workspace', 'A timeline makes past, current, and upcoming classes immediately clear. Operational actions appear exactly where they are needed.', [['Agenda model','Past · now · next'],['Current class','Context actions'],['Action queue','3 items']]);

redesignScreen('principal-dashboard', () => shell(`${identityHeader('Dr. Fatima','Principal · School overview','DF','principal')}${scroll(`
  <div class="page-greeting"><span class="date">Thursday, 14 August</span><h2>School overview</h2><p>Today’s school-wide performance and exceptions.</p></div>
  <div class="stat-grid">${stat('groups','Students','1,248')}${stat('school','Teachers','72')}${stat('check_circle','Attendance','89.6%','var(--green)')}${stat('payments','Fees collected','84%','var(--blue)')}</div>
  ${section('School health', `<div class="bento-row"><div class="bento-panel"><h3>Attendance today</h3><div class="compact-donut" data-label="89.6%"></div><span class="kpi-trend" style="text-align:center">1,118 students present</span></div><div class="bento-panel"><h3 style="color:var(--error)">${I('warning')} Low attendance</h3><div class="compact-alert"><span>Bilal · 7-B</span><b>68%</b></div><div class="compact-alert"><span>Maham · 9-A</span><b>72%</b></div><div class="compact-alert"><span>Zain · 8-C</span><b>74%</b></div></div></div>`, 'Full report')}
  ${section('Upcoming exams', card(row('event','Mid Term — Grade 8','20 August 2026','6d')+row('event','Mid Term — Grade 9','22 August 2026','8d')), '')}
`)}${principalNav(0)}`), 'Exception-led leadership view', 'Leadership sees aggregate health and exceptions together, preventing KPI cards from becoming passive decoration.', [['KPI grid','2 × 2'],['Attendance','89.6%'],['Alert threshold','< 75%']]);

redesignScreen('coordinator', () => shell(`${identityHeader('Ms. Hira','Academic Coordinator','MH','coordinator')}${scroll(`
  <div class="page-greeting"><span class="date">Thursday, 14 August</span><h2>Academic operations</h2><p>Timetables, attendance, and exam readiness at a glance.</p></div>
  <div class="quick-grid"><div class="quick">${I('analytics')}Attendance</div><div class="quick">${I('calendar_month')}Timetable</div><div class="quick">${I('event')}Exams</div><div class="quick">${I('campaign')}Notices</div></div>
  ${section('Today’s attendance', `<div class="summary-card"><div class="summary-line"><div><span class="eyebrow">School-wide</span><h2 style="margin:5px 0 0;font-size:22px">89.6%</h2></div><div class="donut" data-label="89.6%"></div></div><div class="progress" style="--pct:89.6%;--bar:var(--green)"><i></i></div><span class="kpi-trend">1,118 present out of 1,248 students</span></div>`, 'By class')}
  ${section('Upcoming exams', card(row('event','Mid Term · Grade 8','20 August · 6 subjects','6d')+row('event','Mid Term · Grade 9','22 August · 7 subjects','8d')), '')}
`)}${principalNav(0)}`), 'Academic operations hub', 'Quick actions are specific to coordination work, followed by attendance health and exam readiness rather than generic business KPIs.', [['Primary actions','4'],['School attendance','89.6%'],['Exam horizon','8 days']]);

redesignScreen('accountant', () => shell(`${identityHeader('Ali Raza','Accountant · Fee management','AR','accountant')}${scroll(`
  <div class="page-greeting"><span class="date">Thursday, 14 August</span><h2>Fee management</h2><p>Collection progress and work requiring follow-up.</p></div>
  <div class="finance-master"><small>Collected this month</small><h2>PKR 2,420,000</h2><div class="finance-row"><div><span>Target</span><b>PKR 2.88m</b></div><div><span>Progress</span><b>84%</b></div><div><span>Outstanding</span><b>PKR 460k</b></div></div></div>
  <div class="stat-grid">${stat('receipt_long','Paid challans','986','var(--green)')}${stat('warning','Overdue','34','var(--error)')}</div>
  ${section('Quick actions', `<div class="quick-grid"><div class="quick">${I('add_card')}Create</div><div class="quick">${I('receipt')}Payment</div><div class="quick">${I('summarize')}Reports</div><div class="quick">${I('download')}Export</div></div>`, '')}
  ${section('Needs follow-up', card(row('receipt_long','Ayesha Khan · August','# BCH-0826-014','PKR 8,500','var(--error)')+row('receipt_long','Hamza Ali · August','# BCH-0826-003','OVERDUE','var(--error)')))}
`)}${nav([['home','Home'],['receipt_long','Challans'],['summarize','Reports'],['notifications','Notifications']],0)}`), 'Financial control center', 'Collection performance, outstanding amount, and overdue work are separated clearly while remaining visible within one mobile viewport.', [['Collected','PKR 2.42m'],['Progress','84%'],['Overdue queue','34']]);

redesignScreen('admin', () => shell(`${identityHeader('Super Admin','EduStack administration','SA','admin','EduStack Platform')}${scroll(`
  <div class="page-greeting"><span class="date">Thursday, 14 August</span><h2>Administration panel</h2><p>Organizations, users, and system configuration.</p></div>
  <div class="quick-grid"><div class="quick">${I('person_add')}Add user</div><div class="quick">${I('qr_code_2')}School QR</div><div class="quick">${I('add_business')}Branch</div><div class="quick">${I('settings')}Settings</div></div>
  <div class="stat-grid">${stat('domain','Organizations','12')}${stat('account_tree','Branches','34')}${stat('groups','Users','8,420')}${stat('check_circle','Active','99.8%','var(--green)')}</div>
  ${section('Organizations', card(row('domain','Beaconhouse Academy','3 branches · 1,842 users','ACTIVE','var(--green)')+row('domain','City Grammar School','2 branches · 1,126 users','ACTIVE','var(--green)')+row('domain','The Scholars School','1 branch · 684 users','REVIEW','var(--orange)')), 'Manage all')}
`)}${adminNav(0)}`), 'Administrative command center', 'The redesign removes the decorative dark hero and moves frequently used setup actions to the first interaction zone.', [['Quick actions','4'],['Organizations','12'],['System health','99.8%']]);

redesignScreen('results', () => shell(`${appbar('Academic Ledger',{actions:false})}${scroll(`
  <div class="page-greeting"><span class="date">Mid Term · 2026</span><h2>Your academic progress</h2><p>Overall score 87.4% · Grade A · Passed</p></div>
  <div class="filter-row"><span class="filter-chip active">Mid Term 2026</span><span class="filter-chip">Final 2025</span></div>
  <div class="summary-card"><div class="summary-line"><div><span class="eyebrow">Overall result</span><h2 style="margin:5px 0 0;font-size:25px">87.4%</h2></div><div class="donut" data-label="A"></div></div><div class="progress" style="--pct:87.4%;--bar:var(--primary)"><i></i></div></div>
  ${section('Subject ledger', `<div class="m-card"><div class="academic-row"><div class="academic-head"><b>Mathematics</b><span class="academic-grade">A</span></div><div class="list-sub">86 / 100 · Strong performance</div><div class="progress" style="margin-top:8px;--pct:86%"><i></i></div></div><div class="academic-row"><div class="academic-head"><b>General Science</b><span class="academic-grade">A+</span></div><div class="list-sub">91 / 100 · Excellent</div><div class="progress" style="margin-top:8px;--pct:91%;--bar:var(--green)"><i></i></div></div><div class="academic-row"><div class="academic-head"><b>English</b><span class="academic-grade">B+</span></div><div class="list-sub">82 / 100 · Good progress</div><div class="progress" style="margin-top:8px;--pct:82%;--bar:var(--secondary)"><i></i></div></div></div>`, '')}
  <button class="primary-button">${I('download')} &nbsp; Download result PDF</button>
`)}${studentNav(2)}`), 'Readable academic ledger', 'Subject scores are directly comparable and remain text-readable; the progress bars support the numbers rather than replacing them.', [['Overall score','87.4%'],['Subject rows','3 visible'],['PDF action','Persistent in flow']]);

redesignScreen('fees', () => shell(`${appbar('Financial Center',{actions:false})}${scroll(`
  <div class="finance-master"><small>Total outstanding</small><h2>PKR 8,500</h2><div class="finance-row"><div><span>Due date</span><b>20 Aug</b></div><div><span>Status</span><b>Unpaid</b></div><div><span>Challan</span><b>#014</b></div></div></div>
  <button class="primary-button" style="margin-top:12px">View payment instructions</button>
  ${section('Payment history', card(row('check_circle','July 2026','Paid 18 July · # BCH-0726-014','PKR 8,500','var(--green)')+row('check_circle','June 2026','Paid 16 June · # BCH-0626-014','PKR 8,500','var(--green)')+row('receipt_long','May 2026','Paid 19 May · # BCH-0526-014','PKR 8,500','var(--green)')), '')}
  ${section('Need help?', `<div class="notice">${I('support_agent')}<div><b>Contact school accounts</b><br>Ask about challans, adjustments, or payment confirmation.</div></div>`, '')}
`)}${studentNav(3)}`), 'Student financial center', 'The outstanding balance becomes the unmistakable primary object, with history and help presented as secondary tasks.', [['Outstanding','PKR 8,500'],['Due date','20 Aug'],['History','3 payments']]);

const renderBeforeRedesign = render;
render = function renderRedesign(id) {
  renderBeforeRedesign(id);
  const activeScreen = screens.find(screen => screen.id === id);
  const profileKey = roleProfiles[activeScreen?.group] ? activeScreen.group : activeScreen?.role;
  const activeProfile = roleProfiles[profileKey] || roleProfiles.Shared;
  document.querySelectorAll('.appbar-action').forEach(button => {
    const symbol = button.querySelector('.material-symbols-rounded');
    if (symbol?.textContent.trim() === 'person') {
      button.classList.add('mini-profile');
      button.setAttribute('aria-label', `Open profile for ${activeProfile.name}`);
      button.innerHTML = avatarArt(activeProfile.initials, activeProfile.variant);
    }
  });
  const note = document.querySelector('#change-note');
  if (note) note.textContent = screenChangeNotes[id] || 'The finalized brand and component system are applied without changing the essential workflow.';
};

render(current);
