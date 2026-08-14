const proposals = {
  pulse: {
    title: 'Executive Pulse', score: '9.8 / 10',
    summary: 'Best default: financial result leads, then trend, actionable exceptions and branch ranking—without making the page noisy.',
    render: executivePulse
  },
  story: {
    title: 'Financial Story', score: '9.2 / 10',
    summary: 'Best when the principal asks “where did the money go?” A visual bridge explains income, cash costs, depreciation and final operating result.',
    render: financialStory
  },
  campus: {
    title: 'Campus Benchmark', score: '9.1 / 10',
    summary: 'Best for the Group Admin: ranks all five campuses consistently and exposes where revenue, cost or asset health is falling behind.',
    render: campusBenchmark
  },
  control: {
    title: 'Control Tower', score: '9.4 / 10',
    summary: 'Best for daily management: overdue verification, low stock, maintenance and approvals are promoted into a clear work queue.',
    render: controlTower
  },
  scorecard: {
    title: 'Balanced Scorecard', score: '8.9 / 10',
    summary: 'Best for board and governance reviews: financial, asset, operational and compliance health receive equal, predictable space.',
    render: balancedScorecard
  },
  blueprint: {
    title: 'Blueprint 10/10', score: '10 / 10',
    summary: 'The final hybrid: profit clarity, operating trend, action queue, campus ranking and governance assurance in one disciplined hierarchy.',
    render: blueprint
  },
  principal: {
    title: 'Principal Blueprint', score: '10 / 10',
    summary: 'The branch-owner source of truth: result, forecast, collections, budget, assigned decisions, operational impact and audit confidence.',
    render: principalBlueprint
  }
};

const actions = `
  <div class="action-list">
    <div class="action-item"><span class="action-icon red">!</span><span><strong>Verification overdue</strong><small>7 assets across 3 campuses</small></span><b>7</b></div>
    <div class="action-item"><span class="action-icon">◇</span><span><strong>Maintenance due</strong><small>ACs, generators and lab equipment</small></span><b>11</b></div>
    <div class="action-item"><span class="action-icon blue">✓</span><span><strong>Approvals waiting</strong><small>Expenses and procurement requests</small></span><b>8</b></div>
  </div>`;

const branches = `
  <div class="branch-list">
    <div class="branch-row"><span>Faisalabad Campus</span><div class="branch-track"><i style="width:100%"></i></div><b>₨ 2.18M</b></div>
    <div class="branch-row"><span>Gulberg Campus</span><div class="branch-track"><i style="width:84%"></i></div><b>₨ 1.84M</b></div>
    <div class="branch-row"><span>Model Town</span><div class="branch-track"><i style="width:71%"></i></div><b>₨ 1.55M</b></div>
    <div class="branch-row"><span>Garden Town</span><div class="branch-track"><i style="width:63%"></i></div><b>₨ 1.37M</b></div>
    <div class="branch-row"><span>Multan Campus</span><div class="branch-track"><i style="width:41%"></i></div><b>₨ 0.90M</b></div>
  </div>`;

function financeHero() {
  return `<section class="panel hero-finance"><div class="hero-top"><div><div class="hero-label">August operating result</div><div class="hero-value">₨ 7.84M</div><div class="hero-positive">↑ 11.4% from July · Healthy surplus</div></div><div class="hero-margin"><span><b>18.6%</b><small>margin</small></span></div></div><div class="hero-breakdown"><div><small>Total income</small><strong>₨ 42.10M</strong></div><div><small>Operating expenses</small><strong>₨ 11.90M</strong></div><div><small>Payroll</small><strong>₨ 20.80M</strong></div><div><small>Depreciation</small><strong>₨ 1.56M</strong></div></div></section>`;
}

function trendPanel() {
  return `<section class="panel"><div class="panel-head"><div><h2>Income vs operating cost</h2><p>Six-month organization trend</p></div><div class="legend"><span><i style="background:#2563eb"></i>Income</span><span><i style="background:#f59e0b"></i>Total cost</span></div></div><div class="trend-wrap"><svg class="trend-chart" viewBox="0 0 700 155" preserveAspectRatio="none" aria-label="Income and cost trend"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b82f6" stop-opacity=".22"/><stop offset="1" stop-color="#3b82f6" stop-opacity="0"/></linearGradient></defs><path class="trend-grid" d="M0 25H700M0 75H700M0 125H700"/><path class="trend-area" d="M10 114 L145 97 L280 85 L415 56 L550 65 L690 31 L690 145 L10 145 Z"/><polyline class="trend-income" points="10,114 145,97 280,85 415,56 550,65 690,31"/><polyline class="trend-cost" points="10,133 145,121 280,112 415,96 550,99 690,76"/></svg><div class="trend-labels"><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span></div></div></section>`;
}

function executivePulse() {
  return `<div class="stack">${financeHero()}<div class="kpi-row"><div class="kpi"><div class="kpi-top"><small>Outstanding fees</small><span class="delta warn">Needs focus</span></div><strong>₨ 8.40M</strong></div><div class="kpi"><div class="kpi-top"><small>Net book value</small><span class="delta">+2.1%</span></div><strong>₨ 84.70M</strong></div><div class="kpi"><div class="kpi-top"><small>Assets verified</small><span class="delta">On track</span></div><strong>94%</strong></div><div class="kpi"><div class="kpi-top"><small>Open approvals</small><span class="delta bad">8 waiting</span></div><strong>₨ 1.26M</strong></div></div><div class="overview-grid"><div class="stack">${trendPanel()}<section class="panel"><div class="panel-head"><div><h2>Campus contribution</h2><p>Cash surplus by branch</p></div><button>View branch report →</button></div>${branches}</section></div><div class="stack"><section class="panel"><div class="panel-head"><div><h2>Needs your attention</h2><p>Only actionable exceptions</p></div><span class="period-chip">26 items</span></div>${actions}</section><section class="panel"><div class="panel-head"><div><h2>Inventory assurance</h2><p>Physical records and compliance</p></div></div><div class="panel-pad"><div class="health-score"><div class="health-ring"><b>94%</b></div><div><h2>Healthy</h2><p style="color:var(--slate-500)">8,721 of 9,284 units verified. Next cycle closes 31 Aug.</p></div></div></div></section></div></div></div>`;
}

function financialStory() {
  return `<div class="stack"><div class="kpi-row"><div class="kpi"><small>Total income</small><strong>₨ 42.10M</strong><span class="delta">↑ 8.2%</span></div><div class="kpi"><small>Cash operating cost</small><strong>₨ 32.70M</strong><span class="delta warn">77.7% of income</span></div><div class="kpi"><small>Cash surplus</small><strong>₨ 9.40M</strong><span class="delta">↑ 12.1%</span></div><div class="kpi"><small>Final operating result</small><strong>₨ 7.84M</strong><span class="delta">18.6% margin</span></div></div><div class="overview-grid"><section class="panel"><div class="panel-head"><div><h2>How August income became operating surplus</h2><p>Revenue less expenses, payroll and non-cash depreciation</p></div><span class="period-chip">PKR · millions</span></div><div class="waterfall"><div class="water-col"><div class="water-bar" style="height:100%">42.10</div><small>Total income</small></div><div class="water-col"><div class="water-bar cost" style="height:28%">−11.90</div><small>Expenses</small></div><div class="water-col"><div class="water-bar cost" style="height:49%">−20.80</div><small>Payroll</small></div><div class="water-col"><div class="water-bar depr" style="height:10%">−1.56</div><small>Depreciation</small></div><div class="water-col"><div class="water-bar result" style="height:19%">7.84</div><small>Final result</small></div></div><div class="formula-row"><div><small>Fee revenue</small><strong>₨ 38.62M</strong></div><div><small>Other income</small><strong>₨ 3.48M</strong></div><div><small>Outstanding fees</small><strong>₨ 8.40M</strong></div><div><small>Operating margin</small><strong>18.6%</strong></div></div></section><div class="stack"><section class="panel"><div class="panel-head"><div><h2>Principal’s explanation</h2><p>Plain-language financial interpretation</p></div></div><div class="panel-pad"><div class="insight"><b>Every ₨100 collected produced ₨18.60 in operating surplus</b><br>after ₨77.70 in cash costs and ₨3.70 in asset depreciation. Fee collection remains the largest opportunity.</div></div></section><section class="panel"><div class="panel-head"><div><h2>Cost composition</h2><p>Share of total income</p></div></div><div class="branch-list"><div class="branch-row"><span>Payroll</span><div class="branch-track"><i style="width:49%;background:#f59e0b"></i></div><b>49.4%</b></div><div class="branch-row"><span>Operating</span><div class="branch-track"><i style="width:28%;background:#f59e0b"></i></div><b>28.3%</b></div><div class="branch-row"><span>Depreciation</span><div class="branch-track"><i style="width:9%;background:#8b5cf6"></i></div><b>3.7%</b></div></div></section></div></div>${trendPanel()}</div>`;
}

function campusBenchmark() {
  const rows = [['1','Faisalabad Campus','₨ 10.84M','₨ 8.66M','₨ 2.18M','20.1%',100],['2','Gulberg Campus','₨ 9.46M','₨ 7.62M','₨ 1.84M','19.5%',92],['3','Model Town','₨ 8.21M','₨ 6.66M','₨ 1.55M','18.9%',84],['4','Garden Town','₨ 7.63M','₨ 6.26M','₨ 1.37M','18.0%',76],['5','Multan Campus','₨ 5.96M','₨ 5.06M','₨ 0.90M','15.1%',60]];
  return `<div class="stack"><section class="panel"><div class="campus-hero"><div><small>Group operating surplus</small><strong>₨ 7.84M</strong></div><div><small>Best margin</small><strong>20.1%</strong></div><div><small>Group average</small><strong>18.6%</strong></div><div><small>Lowest margin</small><strong>15.1%</strong></div></div></section><section class="panel table-panel"><div class="panel-head"><div><h2>Campus performance league</h2><p>Comparable month-to-date financial and asset-health metrics</p></div><button>Open branch comparison →</button></div><table class="campus-table"><thead><tr><th>Rank</th><th>Campus</th><th>Income</th><th>Total cost</th><th>Surplus</th><th>Margin</th><th>Asset health</th></tr></thead><tbody>${rows.map(r=>`<tr><td><span class="rank">${r[0]}</span></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td><b>${r[4]}</b></td><td>${r[5]}</td><td><div class="margin-bar"><i style="width:${r[6]}%"></i></div></td></tr>`).join('')}</tbody></table></section><div class="benchmark-note"><div><b>Top performer · Faisalabad</b><small>Highest operating surplus and strongest verification rate. Use it as the internal benchmark.</small></div><div><b>Opportunity · Multan</b><small>Margin is 3.5 points below group average; payroll and fee recovery need review.</small></div><div><b>Asset exception · Garden Town</b><small>Five of the seven overdue verifications are concentrated in science labs.</small></div></div></div>`;
}

function controlTower() {
  return `<div class="stack"><div class="control-hero"><section class="panel health-card"><div class="health-score"><div class="health-ring"><b>94%</b></div><div><h2>Inventory health is strong</h2><p>26 exceptions need attention across<br>9,284 physical units.</p></div></div></section><section class="control-finance"><small>August operating surplus</small><strong>₨ 7.84M</strong><p>↑ 11.4% from July · 18.6% margin</p><div class="hero-breakdown" style="color:var(--slate-800);margin-top:22px"><div><small style="color:var(--slate-400)">Income</small><strong>₨42.1M</strong></div><div><small style="color:var(--slate-400)">Cash cost</small><strong>₨32.7M</strong></div></div></section></div><div class="queue-grid"><section class="queue-card"><div class="queue-head"><h3>Critical asset exceptions</h3><b>18 open</b></div>${actions}</section><section class="queue-card"><div class="queue-head"><h3>Financial approvals</h3><b style="color:var(--amber-700);background:var(--amber-50)">8 waiting</b></div><div class="action-list"><div class="action-item"><span class="action-icon blue">₨</span><span><strong>Procurement requests</strong><small>3 requests · oldest 4 days</small></span><b>₨ 820K</b></div><div class="action-item"><span class="action-icon">↗</span><span><strong>Expense approvals</strong><small>5 claims · oldest 2 days</small></span><b>₨ 440K</b></div><div class="action-item"><span class="action-icon red">↓</span><span><strong>Low-stock categories</strong><small>Lab and office consumables</small></span><b>6</b></div></div></section></div><div class="overview-grid"><section class="panel"><div class="panel-head"><div><h2>Campus exception load</h2><p>Open operational actions by branch</p></div><button>Open all tasks →</button></div>${branches}</section><section class="panel"><div class="panel-head"><div><h2>Upcoming</h2><p>Next seven days</p></div></div><div class="action-list"><div class="action-item"><span class="action-icon blue">31</span><span><strong>Verification cycle closes</strong><small>August 31 · 563 units left</small></span></div><div class="action-item"><span class="action-icon">04</span><span><strong>Generator service</strong><small>September 4 · Multan</small></span></div></div></section></div></div>`;
}

function balancedScorecard() {
  const quadrant = (icon, cls, title, sub, stats) => `<section class="score-quadrant"><div class="score-head"><span class="score-icon ${cls}">${icon}</span><div><h2>${title}</h2><p>${sub}</p></div></div><div class="score-body">${stats.map(s=>`<div><small>${s[0]}</small><strong>${s[1]}</strong><div class="status-line ${s[3]||''}"><i style="width:${s[2]}"></i></div></div>`).join('')}</div></section>`;
  return `<div class="stack"><div class="scorecard-grid">${quadrant('₨','green','Financial health','Sustainability and collection',[['Operating surplus','₨ 7.84M','86%'],['Operating margin','18.6%','74%'],['Fee recovery','82%','82%','warn']])}${quadrant('◇','','Asset stewardship','Value, condition and lifecycle',[['Net book value','₨ 84.7M','90%'],['Units verified','94%','94%'],['Maintenance due','11','55%','warn']])}${quadrant('⌁','amber','Operational control','Stock and workflow responsiveness',[['Low-stock lines','6','61%','warn'],['Approvals waiting','8','52%','warn'],['Average approval','1.8 days','78%']])}${quadrant('✓','violet','Governance & assurance','Accuracy and accountability',[['Records verified','94%','94%'],['Overdue checks','7','68%','warn'],['Branches reporting','5 / 5','100%']])}</div><div class="board-summary"><span>✦</span><div><strong>Board summary: Stable with two watch items</strong><small>Financial and asset positions are healthy. Prioritize Multan’s margin and complete seven overdue physical verifications before month close.</small></div></div><section class="panel"><div class="panel-head"><div><h2>Branch status</h2><p>Balanced view across all four perspectives</p></div><button>Open governance report →</button></div>${branches}</section></div>`;
}

function blueprint() {
  return `<div class="stack blueprint-view">
    <div class="blueprint-hero">
      ${financeHero()}
      <section class="panel blueprint-side">
        <div class="blueprint-side-head"><span class="action-icon blue">✦</span><div><small>Principal's bottom line</small><strong>Healthy and improving</strong></div></div>
        <div class="blueprint-formula"><div><small>Cash surplus</small><strong>₨ 9.40M</strong></div><span>−</span><div><small>Depreciation</small><strong>₨ 1.56M</strong></div><span>=</span><div class="final"><small>Final result</small><strong>₨ 7.84M</strong></div></div>
        <p>Every ₨100 collected produced <b>₨18.60 operating surplus</b> after cash costs and asset depreciation.</p>
        <button class="blueprint-link">View financial explanation →</button>
      </section>
    </div>
    <div class="kpi-row blueprint-kpis">
      <div class="kpi"><div class="kpi-top"><small>Outstanding fees</small><span class="delta warn">Needs focus</span></div><strong>₨ 8.40M</strong><p>82% collected this month</p></div>
      <div class="kpi"><div class="kpi-top"><small>Net book value</small><span class="delta">+2.1%</span></div><strong>₨ 84.70M</strong><p>9,284 physical units</p></div>
      <div class="kpi"><div class="kpi-top"><small>Verification health</small><span class="delta">On track</span></div><strong>94%</strong><p>563 units remaining</p></div>
      <div class="kpi"><div class="kpi-top"><small>Decisions waiting</small><span class="delta bad">Action</span></div><strong>8</strong><p>₨ 1.26M pending</p></div>
    </div>
    <div class="overview-grid blueprint-middle">
      ${trendPanel()}
      <section class="panel blueprint-actions"><div class="panel-head"><div><h2>Decision queue</h2><p>Ordered by urgency and value</p></div><span class="period-chip">26 actions</span></div>${actions}<button class="blueprint-action-button">Open prioritized work queue</button></section>
    </div>
    <div class="blueprint-bottom">
      <section class="panel"><div class="panel-head"><div><h2>Campus performance</h2><p>Contribution to group operating surplus</p></div><button>Compare all campuses →</button></div>${branches}</section>
      <section class="panel blueprint-assurance"><div class="panel-head"><div><h2>Governance assurance</h2><p>Board-ready operational controls</p></div><span class="delta">Stable</span></div><div class="blueprint-status"><div><span>Asset records</span><b>94%</b><i><em style="width:94%"></em></i></div><div><span>Fee recovery</span><b>82%</b><i class="warn"><em style="width:82%"></em></i></div><div><span>Branches reporting</span><b>5 / 5</b><i><em style="width:100%"></em></i></div></div><div class="blueprint-note"><span>!</span><p><b>Two watch items</b><br>Improve Multan's margin and close seven overdue asset verifications.</p></div></section>
    </div>
  </div>`;
}

function principalBlueprint() {
  return `<div class="stack principal-view">
    <section class="principal-context">
      <div><span class="role-chip">Principal view</span><strong>Gulberg Campus</strong><small>August 2026 · Month to date</small></div>
      <div class="confidence-row"><span class="confidence good">✓ Reconciled</span><span>Updated today, 10:42 AM</span><button>Change branch</button></div>
    </section>

    <div class="principal-hero">
      <section class="panel principal-result">
        <div class="hero-label">August operating surplus</div><div class="hero-value">₨ 1.84M</div>
        <div class="principal-variance"><span>↑ ₨160K above budget</span><span>19.5% margin</span><span>↑ 8.7% vs July</span></div>
        <div class="principal-equation"><div><small>Total income</small><strong>₨ 9.46M</strong></div><span>−</span><div><small>Cash costs</small><strong>₨ 7.32M</strong></div><span>−</span><div><small>Depreciation</small><strong>₨ 0.30M</strong></div><span>=</span><div class="result"><small>Operating surplus</small><strong>₨ 1.84M</strong></div></div>
      </section>
      <section class="panel forecast-card">
        <div class="panel-head"><div><h2>Month-end forecast</h2><p>Based on collection and approved-cost run rate</p></div><span class="delta">On target</span></div>
        <div class="forecast-value"><strong>₨ 1.92M</strong><small>Forecast operating surplus</small></div>
        <div class="forecast-track"><i style="width:89%"></i><span class="target-marker"></span></div>
        <div class="forecast-labels"><span>Budget ₨1.68M</span><b>Forecast +₨240K</b></div>
        <p class="forecast-note">Confidence: 86% · assumes 82% fee recovery by month close.</p>
      </section>
    </div>

    <div class="kpi-row principal-kpis">
      <div class="kpi"><div class="kpi-top"><small>Fee recovery</small><span class="delta warn">3% below target</span></div><strong>82%</strong><p>₨ 1.68M still outstanding</p></div>
      <div class="kpi"><div class="kpi-top"><small>Budget available</small><span class="delta">Healthy</span></div><strong>₨ 2.40M</strong><p>After approved commitments</p></div>
      <div class="kpi"><div class="kpi-top"><small>Committed procurement</small><span class="delta warn">4 requests</span></div><strong>₨ 820K</strong><p>Included in available budget</p></div>
      <div class="kpi"><div class="kpi-top"><small>Learning spaces impacted</small><span class="delta bad">Priority</span></div><strong>3</strong><p>2 classrooms · 1 science lab</p></div>
    </div>

    <div class="principal-main">
      <div class="stack">
        <section class="panel"><div class="panel-head"><div><h2>Income, cost and budget trend</h2><p>Actual performance with operating-surplus target</p></div><div class="legend"><span><i style="background:#2563eb"></i>Income</span><span><i style="background:#f59e0b"></i>Cost</span><span><i style="background:#059669"></i>Target</span></div></div><div class="trend-wrap"><svg class="trend-chart" viewBox="0 0 700 155" preserveAspectRatio="none" aria-label="Branch income, cost and target trend"><path class="trend-grid" d="M0 25H700M0 75H700M0 125H700"/><polyline class="trend-income" points="10,112 145,99 280,82 415,62 550,67 690,34"/><polyline class="trend-cost" points="10,132 145,121 280,110 415,96 550,98 690,77"/><polyline class="principal-target-line" points="10,106 145,91 280,78 415,72 550,60 690,50"/></svg><div class="trend-labels"><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span></div></div></section>
        <section class="panel"><div class="panel-head"><div><h2>Fee collection risk</h2><p>Outstanding receivables by age</p></div><button>Open student ageing →</button></div><div class="ageing-grid"><div><span class="age-dot green"></span><small>Current · 0–30 days</small><strong>₨ 920K</strong><em>55%</em></div><div><span class="age-dot amber"></span><small>Attention · 31–60 days</small><strong>₨ 480K</strong><em>29%</em></div><div><span class="age-dot red"></span><small>High risk · 61+ days</small><strong>₨ 280K</strong><em>16%</em></div></div><div class="collection-guidance"><b>Recommended today:</b> assign follow-up for 43 accounts above 60 days; potential recovery ₨280K.</div></section>
      </div>
      <section class="panel principal-queue"><div class="panel-head"><div><h2>Your decision queue</h2><p>Assigned to Principal · oldest first</p></div><span class="period-chip">8 waiting</span></div><div class="principal-task critical"><span class="task-icon">!</span><div><strong>Science Lab 2 cooling failure</strong><small>Learning space affected · SLA overdue 6h</small><em>Owner: Facilities Officer</em></div><b>Review</b></div><div class="principal-task"><span class="task-icon">₨</span><div><strong>Approve computer-lab UPS purchase</strong><small>Procurement · ₨ 420K · within budget</small><em>Requested by IT Administrator</em></div><b>Approve</b></div><div class="principal-task"><span class="task-icon">↗</span><div><strong>Transport repair expense</strong><small>Expense · ₨ 165K · 2 quotations attached</small><em>Requested by Admin Officer</em></div><b>Review</b></div><div class="principal-task"><span class="task-icon">✓</span><div><strong>Physical verification sign-off</strong><small>563 units remaining · closes 31 August</small><em>Owner: Store Officer</em></div><b>Open</b></div><button class="blueprint-action-button">Open all prioritized decisions</button></section>
    </div>

    <div class="principal-bottom">
      <section class="panel"><div class="panel-head"><div><h2>Operational impact by location</h2><p>Assets currently affecting teaching or service delivery</p></div><button>Open location tree →</button></div><div class="impact-list"><div><span class="impact-severity red"></span><div><strong>Science Lab 2</strong><small>2 ACs unavailable · practical sessions at risk</small></div><b>Critical</b></div><div><span class="impact-severity amber"></span><div><strong>Classroom 204</strong><small>1 whiteboard damaged · replacement approved</small></div><b>Moderate</b></div><div><span class="impact-severity amber"></span><div><strong>Classroom 118</strong><small>2 fans under maintenance · completion tomorrow</small></div><b>Moderate</b></div></div></section>
      <section class="panel"><div class="panel-head"><div><h2>Budget control</h2><p>Approved, spent, committed and available</p></div><button>Open budget ledger →</button></div><div class="budget-stack"><div style="width:61%" class="spent">₨7.32M spent</div><div style="width:7%" class="committed" title="₨820K committed"></div><div class="available">₨2.40M available</div></div><div class="budget-legend"><span><i class="spent"></i>Spent 69%</span><span><i class="committed"></i>Committed 8%</span><span><i class="available"></i>Available 23%</span></div><div class="budget-note"><span>Monthly authorized budget</span><b>₨ 10.54M</b></div></section>
      <section class="panel"><div class="panel-head"><div><h2>Peer benchmark</h2><p>Gulberg versus group average</p></div><span class="delta">Rank #2</span></div><div class="peer-list"><div><span>Operating margin</span><b>19.5%</b><em>Group 18.6% ↑</em></div><div><span>Fee recovery</span><b>82%</b><em class="behind">Group 85% ↓</em></div><div><span>Asset verification</span><b>96%</b><em>Group 94% ↑</em></div><div><span>Approval time</span><b>1.6d</b><em>Group 1.8d ↑</em></div></div></section>
    </div>

    <section class="panel trust-panel"><div class="trust-title"><span>✓</span><div><h2>Source-of-truth controls</h2><p>How the Principal can trust and audit this Overview</p></div></div><div class="trust-grid"><div><small>Reconciliation</small><strong>Complete through 14 Aug</strong><p>Fees, expenses, payroll and inventory ledgers matched.</p></div><div><small>Calculation definition</small><strong>Operating surplus</strong><p>Income − operating expenses − payroll − depreciation.</p><button>View complete formula</button></div><div><small>Data completeness</small><strong>99.4% complete</strong><p>3 purchase records awaiting supporting documents.</p></div><div><small>Latest audit activity</small><strong>10:31 AM · Subhan Ali</strong><p>Approved expense EXP-2026-0184 for ₨165K.</p><button>View audit trail</button></div></div></section>
  </div>`;
}

function selectProposal(key) {
  const proposal = proposals[key];
  document.querySelectorAll('.proposal').forEach(button => button.classList.toggle('active', button.dataset.view === key));
  document.getElementById('viewTitle').textContent = proposal.title;
  document.getElementById('viewSummary').textContent = proposal.summary;
  document.getElementById('viewScore').textContent = proposal.score;
  document.getElementById('designCanvas').innerHTML = proposal.render();
}

document.querySelectorAll('.proposal').forEach(button => button.addEventListener('click', () => selectProposal(button.dataset.view)));
selectProposal('principal');
