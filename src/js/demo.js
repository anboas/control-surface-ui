const demoState = {
  widgets: [
    { id: "policy", icon: "policy", title: "Policy Changes", description: "Summary of recent and upcoming policy changes", value: 27, note: "New & Upcoming", change: "Up 18% vs last 7 days", meta: ["DoD + SECNAV", "Last 7 days"], tone: "success", size: "Medium", visible: true },
    { id: "deadlines", icon: "calendar", title: "Key Deadlines", description: "List of important upcoming deadlines", value: 6, note: "Due in next 30 days", change: "Up 2 vs last 7 days", meta: ["Obligation index", "Next 30 days"], tone: "danger", size: "Medium", visible: true },
    { id: "gaps", icon: "warning", title: "Implementation Gaps", description: "Tracking of gaps and at-risk items", value: 22, note: "Open Gaps", change: "Up 10% vs last week", meta: ["Gap Agent v2.1", "Open branches"], tone: "success", size: "Medium", visible: true },
    { id: "review", icon: "check", title: "Review Queue", description: "Items awaiting review and action", value: 128, note: "Items in queue", change: "Up 18% vs last 7 days", meta: ["Review console", "Assigned team"], tone: "success", size: "Large", visible: true },
    { id: "sources", icon: "database", title: "Source Health", description: "Health and freshness of sources", value: 124, note: "Active Sources", change: "Active sources", meta: ["Source Monitor", "Synced 10:22 AM"], tone: "success", size: "Large", visible: true },
    { id: "opportunities", icon: "link", title: "Linked Opportunities", description: "Opportunities related to this policy", value: 63, note: "Open Opportunities", change: "Up 12% vs Apr 1 - Apr 30", meta: ["Impact Analyzer", "Apr 1 - May 12"], tone: "success", size: "Medium", visible: true }
  ],
  sources: [
    { id: "src-federal-register", source: "Federal Register API", tier: "Tier 1", family: "Public rulemaking", adapter: "REST + daily delta", access: "API", owner: "Source Monitor", cadence: "Hourly delta", sync: "May 12, 2025 9:22 AM", freshness: "18 min", health: "Healthy", trust: 94, coverage: 91, docs: "21,637", change: "+12.7%", parser: "OK", trend: "up", artifacts: 184, queue: 12, published: 28, failed: 0, issues: "None", latest: ["Cyber Incident Reporting Harmonization", "Acquisition Threshold Update", "Cloud service reporting rule"] },
    { id: "src-govinfo", source: "GovInfo / Congress.gov", tier: "Tier 1", family: "Legislation", adapter: "Bulk XML + API", access: "API + bulk", owner: "Citation Graph", cadence: "Daily bulk", sync: "May 12, 2025 9:33 AM", freshness: "29 min", health: "Healthy", trust: 92, coverage: 88, docs: "18,044", change: "+6.8%", parser: "OK", trend: "up", artifacts: 121, queue: 9, published: 17, failed: 0, issues: "None", latest: ["Defense Modernization Authorization", "Cyber workforce amendments", "Committee report language"] },
    { id: "src-dod-issuances", source: "DoD Issuances Portal", tier: "Tier 1", family: "Defense policy", adapter: "HTML/PDF crawler", access: "Crawler", owner: "Metadata Extractor", cadence: "Every 30 min", sync: "May 12, 2025 10:21 AM", freshness: "6 min", health: "Healthy", trust: 96, coverage: 94, docs: "12,845", change: "+8.4%", parser: "OK", trend: "up", artifacts: 96, queue: 6, published: 31, failed: 0, issues: "2 records pending provenance confirmation", latest: ["DoDI 5200.01 Information Governance", "DoDI 5025.01 Directives Program", "DOD 5230.24 Data Access"] },
    { id: "src-navy-directives", source: "Navy Directives Library", tier: "Tier 1", family: "Service directives", adapter: "Watchlist + parser", access: "Watchlist", owner: "Impact Analyzer", cadence: "Every 2 hours", sync: "May 12, 2025 9:58 AM", freshness: "24 min", health: "Healthy", trust: 89, coverage: 84, docs: "8,317", change: "+5.2%", parser: "OK", trend: "up", artifacts: 63, queue: 5, published: 14, failed: 0, issues: "1 supersession awaiting analyst review", latest: ["SECNAV Memo 25-104", "NAVADMIN 105/25", "N4/N6 Cloud Migration Plan"] },
    { id: "src-omb", source: "OMB Memoranda Feed", tier: "Tier 2", family: "Executive policy", adapter: "RSS + PDF parser", access: "RSS", owner: "Review Triage", cadence: "Daily", sync: "May 12, 2025 9:41 AM", freshness: "41 min", health: "Degraded", trust: 76, coverage: 72, docs: "3,214", change: "-1.3%", parser: "Warnings", trend: "down", artifacts: 38, queue: 11, published: 6, failed: 2, issues: "PDF tables produced low-confidence headings", latest: ["M-25-77 AI Governance Practices", "Budget execution memo", "Zero Trust reporting update"] },
    { id: "src-nist", source: "NIST Publications Feed", tier: "Tier 2", family: "Standards", adapter: "Publication index", access: "Index", owner: "Confidence Calibrator", cadence: "Daily", sync: "May 12, 2025 8:57 AM", freshness: "85 min", health: "Healthy", trust: 87, coverage: 90, docs: "5,496", change: "+3.1%", parser: "OK", trend: "up", artifacts: 49, queue: 2, published: 9, failed: 0, issues: "None", latest: ["NIST SP 800-207", "Cloud controls crosswalk", "Identity assurance draft"] },
    { id: "src-cisa", source: "CISA Directives & Alerts", tier: "Tier 2", family: "Cyber alerts", adapter: "Alert feed + pages", access: "Feed", owner: "Gap Agent", cadence: "Every 15 min", sync: "May 12, 2025 8:46 AM", freshness: "96 min", health: "Healthy", trust: 84, coverage: 79, docs: "2,920", change: "+9.5%", parser: "OK", trend: "up", artifacts: 72, queue: 8, published: 12, failed: 0, issues: "Some alert pages lack stable section anchors", latest: ["Identity Security Baseline", "Known exploited vulnerability update", "Cloud hardening directive"] },
    { id: "src-restricted", source: "Internal Restricted Repository", tier: "Tier 3", family: "Access gated", adapter: "Guarded blob import", access: "Gated", owner: "Source Discovery", cadence: "Manual release", sync: "May 12, 2025 8:12 AM", freshness: "130 min", health: "Degraded", trust: 68, coverage: 61, docs: "1,104", change: "-2.1%", parser: "Warnings", trend: "down", artifacts: 27, queue: 14, published: 3, failed: 1, issues: "Access token rotation required", latest: ["Restricted implementation evidence", "Program milestone ledger", "Internal control memo"] },
    { id: "src-service-watchlist", source: "Service Memo Watchlist", tier: "Tier 3", family: "Service watchlists", adapter: "Analyst-curated", access: "Manual", owner: "Source Monitor", cadence: "Analyst update", sync: "May 12, 2025 8:31 AM", freshness: "112 min", health: "Degraded", trust: 62, coverage: 58, docs: "742", change: "-4.8%", parser: "Errors", trend: "down", artifacts: 19, queue: 17, published: 1, failed: 4, issues: "Two source URLs failed checksum validation", latest: ["Service cloud transition memo", "Readiness status note", "Obligation exception report"] }
  ],
  ingestStages: [
    { stage: "External Sources", count: 9, status: "Healthy", note: "Public, service, standards, alert, and restricted repositories" },
    { stage: "Ingestion & Extraction", count: 244, status: "Warnings", note: "Adapters, queue events, raw artifacts, document parsing" },
    { stage: "Core Agent Layer", count: 8, status: "Healthy", note: "Monitor, discovery, metadata, citations, relationships, obligations" },
    { stage: "Data / Search / Knowledge", count: 4812, status: "Healthy", note: "Canonical store, semantic index, blob exports, graph views" },
    { stage: "Experience Surfaces", count: 5, status: "Healthy", note: "Portal, APIs, alerts, events, opportunities, review console" }
  ],
  syntheticRecords: [
    { id: "FR-2025-09124", source: "Federal Register API", title: "Cyber Incident Reporting Harmonization", type: "Proposed Rule", extracted: "3 obligations, 5 citations", agent: "Obligation Extractor", confidence: "Medium" },
    { id: "PLAW-119-42", source: "GovInfo / Congress.gov", title: "Defense Modernization Authorization", type: "Public Law", extracted: "8 authorities, 12 deadlines", agent: "Citation Extractor", confidence: "High" },
    { id: "DODI-5200.01", source: "DoD Issuances Portal", title: "Information Governance", type: "Instruction", extracted: "11 relationships, 4 obligations", agent: "Relationship Linker", confidence: "High" },
    { id: "SECNAV-25-104", source: "Navy Directives Library", title: "Cloud Transition Guidance", type: "Memo", extracted: "6 milestones, 4 owners", agent: "Impact Analyzer", confidence: "High" },
    { id: "M-25-77", source: "OMB Memoranda Feed", title: "AI Governance Practices", type: "Memorandum", extracted: "5 review gates, 7 citations", agent: "Review Triage", confidence: "Medium" },
    { id: "NIST-SP-800-207", source: "NIST Publications Feed", title: "Zero Trust Architecture", type: "Standard", extracted: "9 mappings, 18 controls", agent: "Metadata Extractor", confidence: "High" },
    { id: "CISA-BOD-25-02", source: "CISA Directives & Alerts", title: "Identity Security Baseline", type: "Directive", extracted: "4 deadlines, 3 conflicts", agent: "Gap Agent", confidence: "Medium" }
  ],
  relationshipBundles: [
    { relation: "Derived From", count: 18, examples: "EOs, public laws, OMB memos", confidence: "High" },
    { relation: "References", count: 73, examples: "NIST, CISA, DoD manuals", confidence: "High" },
    { relation: "Implements", count: 41, examples: "Service owners, organizations", confidence: "Medium" },
    { relation: "Guides", count: 29, examples: "Playbooks, directives, baselines", confidence: "Medium" },
    { relation: "Has Obligation", count: 52, examples: "Deadlines, actions, review gates", confidence: "High" },
    { relation: "Enables Opportunity", count: 17, examples: "Modernization, API, AI platform", confidence: "Medium" }
  ],
  agents: [
    ["Source Monitor", "Healthy", "May 12, 10:21 AM", "May 12, 11:00 AM"],
    ["Source Discovery", "Healthy", "May 12, 9:45 AM", "May 12, 10:45 AM"],
    ["Citation Graph", "Healthy", "May 12, 10:05 AM", "May 12, 11:05 AM"],
    ["Relationship Linker", "Healthy", "May 12, 9:58 AM", "May 12, 10:58 AM"],
    ["Confidence Calibrator", "Healthy", "May 12, 10:12 AM", "May 12, 11:12 AM"],
    ["Implementation Gap Agent", "Paused", "May 12, 8:30 AM", "Paused"],
    ["Review Triage", "Healthy", "May 12, 10:18 AM", "May 12, 11:18 AM"]
  ],
  audit: [
    ["Run Now executed", "All agents", "May 12, 2025 10:21 AM"],
    ["Promoted candidate source", "DOE Rulemaking Watch", "May 12, 2025 9:48 AM"],
    ["Paused agent", "Implementation Gap Agent", "May 12, 2025 8:30 AM"],
    ["Published metadata", "DoD Issuances Portal", "May 12, 2025 7:58 AM"]
  ],
  findings: [
    { id: "CF-2025-1187-001", title: "Supplier Data Residency Obligation Missing", type: "Implementation Gap Candidate", source: "Global Privacy Policy v2.1", confidence: "High", risk: "High", assigned: "Jane Doe", due: "May 12, 2025", status: "Needs Review", summary: "The policy does not specify a required data residency or geographic location constraint for personal data stored or processed by the supplier." },
    { id: "CF-2025-1187-002", title: "Acme Corp. Relationship Candidate", type: "Relationship Candidate", source: "Third-Party Risk Register", confidence: "Medium", risk: "Medium", assigned: "Michael Lee", due: "May 13, 2025", status: "Needs Review", summary: "A supplier relationship appears in risk records but is not yet linked to the policy obligation." },
    { id: "CF-2025-1187-003", title: "CloudTrail Logging Requirement Gap", type: "Implementation Gap Candidate", source: "Cloud Security Standard 1.4", confidence: "High", risk: "High", assigned: "Priya Shah", due: "May 11, 2025", status: "Open", summary: "Indexed control text does not show logging coverage for privileged data access events." },
    { id: "CF-2025-1187-004", title: "New Source Onboarding: ISO/IEC 27018:2019", type: "Source Onboarding Candidate", source: "ISO/IEC 27018:2019", confidence: "Medium", risk: "Low", assigned: "Alex Kim", due: "May 15, 2025", status: "Open", summary: "A candidate source may improve privacy obligation coverage for cloud processing controls." }
  ],
  searchResults: [
    ["Zero Trust Architecture Implementation Guide for Cloud Environments", "Policy / Guidance", "CISA", "May 12, 2025", "High", "8 fields"],
    ["Cloud Migration Playbook: Zero Trust Design Patterns", "Guidance", "DoD", "May 9, 2025", "High", "6 fields"],
    ["Implementing Zero Trust per NIST 800-207 for Federal Workloads", "Instruction", "OMB", "May 5, 2025", "Medium", "7 fields"],
    ["Zero Trust Reference Architecture for Cloud Services", "Standard / Framework", "NIST", "Apr 28, 2025", "High", "10 fields"],
    ["Zero Trust Controls Mapping: NIST 800-207 to FedRAMP", "Report / Study", "GSA", "Apr 26, 2025", "Medium", "5 fields"]
  ],
  clauses: [
    ["CONTAINS", "\"zero trust architecture\"", "Any Field"],
    ["CONTAINS", "cloud migration", "Title or Abstract"],
    ["CITED BY", "NIST SP 800-207", "Document"],
    ["RELATIONSHIP TYPE", "Implements", "Policy / Guidance"],
    ["SEMANTIC SIMILARITY", "At least 0.70 to NIST SP 800-207", "Semantic"]
  ]
};

function demoEscape(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
}

function demoBadge(value, semantic = "") {
  const lower = String(value).toLowerCase();
  let tone = "";
  if (semantic === "confidence" && ["high", "medium", "low"].includes(lower)) tone = ` if-badge--confidence-${lower}`;
  else if (semantic === "risk" && ["high", "medium", "low"].includes(lower)) tone = ` if-badge--risk-${lower}`;
  else if (semantic === "severity") {
    if (lower === "critical") tone = " if-badge--severity-critical";
    else if (["high", "medium", "low"].includes(lower)) tone = ` if-badge--severity-${lower}`;
  } else if (semantic === "status") {
    const normalized = lower.replace(/\s+/g, "-");
    tone = ` if-badge--status-${normalized}`;
  } else {
    if (["active", "clean", "complete", "done", "healthy", "ok", "approved", "on track", "on-track", "low"].includes(lower)) tone = " if-badge--status-healthy";
    if (["degraded", "pending", "warnings", "medium", "paused"].includes(lower)) tone = " if-badge--status-warnings";
    if (["errors", "failed", "blocked", "rejected"].includes(lower)) tone = " if-badge--status-failed";
    if (lower === "high") tone = " if-badge--confidence-high";
  }
  if (["tier 1", "tier 2", "tier 3"].includes(lower)) tone = " if-badge--info";
  return `<span class="if-badge${tone}">${demoEscape(value)}</span>`;
}

function demoToast(message, type = "info") {
  let stack = document.querySelector("[data-demo-toasts]");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "if-toast-stack";
    stack.dataset.demoToasts = "";
    document.body.append(stack);
  }
  const toast = document.createElement("div");
  toast.className = `if-toast if-alert--${type}`;
  toast.innerHTML = `<strong>${demoEscape(message)}</strong><button class="if-icon-btn if-btn--sm" type="button" aria-label="Dismiss">x</button>`;
  toast.querySelector("button").addEventListener("click", () => toast.remove());
  stack.append(toast);
  setTimeout(() => toast.remove(), 3500);
}

function renderWorkspace() {
  const list = document.querySelector("[data-demo-widgets-list]");
  const canvas = document.querySelector("[data-demo-dashboard-canvas]");
  const settings = document.querySelector("[data-demo-settings-list]");
  if (!list || !canvas || !settings) return;

  list.innerHTML = demoState.widgets.map((widget) => `
    <button class="if-list-item" type="button" data-demo-toggle-widget="${widget.id}">
      <span class="if-list-item__icon if-icon-slot" data-if-icon="${demoEscape(widget.icon)}"></span>
      <span class="if-list-item__body"><span class="if-list-item__title">${demoEscape(widget.title)}</span><span class="if-list-item__meta">${demoEscape(widget.description)}</span></span>
      <span class="if-badge${widget.visible ? " if-badge--info" : ""}">${widget.visible ? "On" : "Off"}</span>
    </button>
  `).join("");

  canvas.innerHTML = demoState.widgets.filter((widget) => widget.visible).map((widget) => `
    <article class="if-card if-metric" data-widget="${widget.id}">
      <div class="if-metric__top">
        <span class="if-metric__icon if-icon-slot" data-if-icon="${demoEscape(widget.icon)}" aria-hidden="true"></span>
        <p class="if-metric__label">${demoEscape(widget.title)}</p>
        <button class="if-icon-btn" type="button" title="More actions" data-demo-action="widget-menu">...</button>
      </div>
      <div class="if-metric__main"><p class="if-metric__value">${demoEscape(widget.value)}</p><span data-if-sparkline="${widget.tone === "danger" ? "6,7,6,8,7,8,9" : "12,14,16,15,19,21,24"}"></span></div>
      <span class="if-metric__change if-text-${widget.tone}">${demoEscape(widget.change)}</span>
      <div class="if-metric__meta">${widget.meta.map((item) => `<span>${demoEscape(item)}</span>`).join("")}</div>
      <select class="if-select" data-demo-widget-size="${widget.id}">
        ${["Small", "Medium", "Large"].map((size) => `<option${widget.size === size ? " selected" : ""}>${size}</option>`).join("")}
      </select>
    </article>
  `).join("") + `<button class="if-btn if-btn--secondary if-btn--block" type="button" data-demo-action="add-widget">Add widget here</button>`;

  settings.innerHTML = demoState.widgets.map((widget, index) => `
    <div class="if-setting-row">
      <span class="if-text-sm">${demoEscape(widget.title)}</span>
      <span class="if-cluster">
        <select class="if-select" data-demo-widget-size="${widget.id}" aria-label="${demoEscape(widget.title)} size">
          ${["Small", "Medium", "Large"].map((size) => `<option${widget.size === size ? " selected" : ""}>${size}</option>`).join("")}
        </select>
        <label class="if-switch">
          <input type="checkbox" data-demo-toggle-widget="${widget.id}" ${widget.visible ? "checked" : ""}>
          <span class="if-switch__track" aria-hidden="true"></span>
        </label>
        <span class="if-badge">${index + 1}</span>
      </span>
    </div>
  `).join("");

  hydrateIcons(list);
  hydrateIcons(canvas);
  hydrateSparklines(canvas);
}

function miniChart(trend) {
  const danger = trend === "down";
  return `<span class="if-mini-chart" data-if-sparkline="${danger ? "28,24,25,19,21,15,16" : "12,16,15,22,20,27,30"}" data-if-sparkline-label="${danger ? "Decreasing source trend" : "Increasing source trend"}"></span>`;
}

function sourceSignal(label, value, tone = "") {
  return `
    <span class="if-source-signal ${tone ? `if-source-signal--${tone}` : ""}">
      <span class="if-cluster if-cluster--between"><span class="if-text-xs if-text-muted">${demoEscape(label)}</span><strong>${value}%</strong></span>
      <span class="if-source-signal__bar" aria-hidden="true"><span style="--value:${value}%"></span></span>
    </span>
  `;
}

function renderSourceDetail(source) {
  return `
    <tr class="if-table-detail" data-if-table-detail hidden>
      <td colspan="10">
        <div class="if-table-detail__content">
          <div class="if-source-detail">
            <div class="if-source-detail__heading">
              <div>
                <h3 class="if-source-detail__title">${demoEscape(source.source)} ingest profile</h3>
                <p class="if-source-detail__subtitle">${demoEscape(source.family)} via ${demoEscape(source.adapter)}. Owned by ${demoEscape(source.owner)}.</p>
              </div>
              <div class="if-chip-list">${demoBadge(source.health)} ${demoBadge(source.parser)} <span class="if-badge">${demoEscape(source.access)}</span></div>
            </div>
            <div class="if-table-detail__grid">
              <dl class="if-meta-grid if-meta-grid--dense">
                <div class="if-kv"><dt>Cadence</dt><dd>${demoEscape(source.cadence)}</dd></div>
                <div class="if-kv"><dt>Freshness</dt><dd>${demoEscape(source.freshness)}</dd></div>
                <div class="if-kv"><dt>Published</dt><dd>${demoEscape(source.published)} intelligence objects</dd></div>
                <div class="if-kv"><dt>Failed Runs</dt><dd>${demoEscape(source.failed)}</dd></div>
              </dl>
              <div class="if-stack">
                ${sourceSignal("Trust", source.trust, source.trust < 70 ? "danger" : source.trust < 82 ? "warning" : "")}
                ${sourceSignal("Coverage", source.coverage, source.coverage < 70 ? "danger" : source.coverage < 82 ? "warning" : "")}
              </div>
              <div class="if-source-detail__events">
                ${source.latest.map((item, index) => `<div class="if-source-event"><span class="if-badge">${index + 1}</span><span>${demoEscape(item)}</span><span class="if-text-muted">${index === 0 ? "latest" : "indexed"}</span></div>`).join("")}
              </div>
              <div class="if-alert ${source.health === "Healthy" ? "if-alert--success" : source.parser === "Errors" ? "if-alert--danger" : "if-alert--warning"}">
                <strong>${demoEscape(source.issues)}</strong>
                <span>${demoEscape(source.queue)} queued artifacts will be processed by ${demoEscape(source.owner)}.</span>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  `;
}

function renderSources(filter = "") {
  const body = document.querySelector("[data-demo-sources-body]");
  const agents = document.querySelector("[data-demo-agents-body]");
  const audit = document.querySelector("[data-demo-audit]");
  if (!body) return;

  const query = filter.trim().toLowerCase();
  const rows = demoState.sources.filter((source) => !query || [
    source.source,
    source.health,
    source.parser,
    source.tier,
    source.family,
    source.owner,
    source.access
  ].join(" ").toLowerCase().includes(query));
  body.innerHTML = rows.map((source, index) => `
    <tr class="${index === 0 ? "is-selected" : ""}" data-if-table-row data-demo-source="${demoEscape(source.source)}" data-if-table-search="${demoEscape(`${source.source} ${source.health} ${source.parser} ${source.tier} ${source.family} ${source.owner} ${source.access} ${source.issues} ${source.latest.join(" ")}`)}" data-sort-source="${demoEscape(source.source)}" data-sort-health="${demoEscape(source.health)}" data-sort-docs="${demoEscape(source.docs)}" data-sort-trust="${source.trust}" data-sort-queue="${source.queue}">
      <td><input type="checkbox" data-if-table-select aria-label="Select ${demoEscape(source.source)}" ${index === 0 ? "checked" : ""}></td>
      <td><button class="if-icon-btn if-table-expand" type="button" data-if-table-expand aria-expanded="false" title="Show source details"><span data-if-icon="chevronDown"></span></button></td>
      <td data-if-table-cell="source"><span class="if-row-title"><strong>${demoEscape(source.source)}</strong><span>${demoEscape(source.family)} - ${demoEscape(source.adapter)}</span></span></td>
      <td>${demoBadge(source.tier)} <span class="if-badge">${demoEscape(source.access)}</span></td>
      <td><span class="if-row-title"><strong>${demoEscape(source.freshness)}</strong><span>${demoEscape(source.sync)}</span></span></td>
      <td data-if-table-cell="health">${demoBadge(source.health)} ${demoBadge(source.parser)}</td>
      <td data-if-table-cell="docs"><span class="if-row-title"><strong>${demoEscape(source.docs)}</strong><span class="${source.trend === "down" ? "if-text-danger" : "if-text-success"}">${demoEscape(source.change)}</span></span></td>
      <td>${sourceSignal("Trust", source.trust, source.trust < 70 ? "danger" : source.trust < 82 ? "warning" : "")}</td>
      <td data-if-table-cell="queue"><span class="if-row-title"><strong>${demoEscape(source.queue)} queued</strong><span>${demoEscape(source.artifacts)} artifacts</span></span></td>
      <td><span class="if-cluster"><button class="if-icon-btn" type="button" data-demo-action="run-source" title="Run"><span data-if-icon="play"></span></button><button class="if-icon-btn" type="button" data-demo-action="edit-source" title="Edit"><span data-if-icon="edit"></span></button><button class="if-icon-btn" type="button" title="More"><span data-if-icon="more"></span></button></span></td>
    </tr>
    ${renderSourceDetail(source)}
  `).join("");
  hydrateSparklines(body);
  hydrateIcons(body);
  applyDataTable(body.closest("[data-if-data-table]"));

  if (agents) {
    agents.innerHTML = demoState.agents.map((agent) => `
      <tr><td>${demoEscape(agent[0])}</td><td>${demoBadge(agent[1])}</td><td>${demoEscape(agent[2])}</td><td>${demoEscape(agent[3])}</td></tr>
    `).join("");
  }

  if (audit) {
    audit.innerHTML = demoState.audit.map((item) => `
      <div class="if-audit-item"><span class="if-audit-item__icon">i</span><div><strong>${demoEscape(item[0])}</strong><p class="if-list-item__meta">${demoEscape(item[1])}<br>${demoEscape(item[2])}</p></div></div>
    `).join("");
  }
}

function renderVirtualPolicyTable() {
  const body = document.querySelector("[data-demo-virtual-table-body]");
  if (!body) return;
  const types = ["Instruction", "Memo", "Guide", "Source", "Finding"];
  const risks = ["Low", "Medium", "High"];
  const statuses = ["Open", "In Review", "Needs Review", "Active", "Blocked"];
  body.innerHTML = Array.from({ length: 240 }, (_, index) => {
    const type = types[index % types.length];
    const risk = risks[(index + 1) % risks.length];
    const status = statuses[index % statuses.length];
    return `
      <tr data-if-table-row data-if-table-search="Virtual policy row ${index + 1} ${type} ${risk} ${status}" data-filter-type="${demoEscape(type)}" data-filter-risk="${demoEscape(risk)}" data-sort-title="Virtual policy row ${String(index + 1).padStart(3, "0")}">
        <td><span class="if-table-cell-main"><strong>Virtual policy row ${index + 1}</strong><span class="if-table-cell-meta">Synthetic record window item</span></span></td>
        <td>${demoEscape(type)}</td>
        <td>${demoBadge(risk, "risk")}</td>
        <td>${demoBadge(status, "status")}</td>
        <td class="is-numeric">${3 + (index * 11) % 91}</td>
      </tr>
    `;
  }).join("");
  hydrateIcons(body);
  applyDataTable(body.closest("[data-if-data-table]"), { local: true });
}

function renderIngestIntelligence() {
  const stages = document.querySelector("[data-demo-ingest-stages]");
  const records = document.querySelector("[data-demo-synthetic-records]");
  const sourceCards = document.querySelector("[data-demo-source-cards]");
  const bundles = document.querySelector("[data-demo-relationship-bundles]");

  if (stages) {
    stages.innerHTML = demoState.ingestStages.map((stage, index) => `
      <article class="if-ingest-stage">
        <span class="if-ingest-stage__index">${index + 1}</span>
        <div>
          <h3>${demoEscape(stage.stage)}</h3>
          <p>${demoEscape(stage.note)}</p>
        </div>
        <div class="if-ingest-stage__metric"><strong>${demoEscape(stage.count)}</strong>${demoBadge(stage.status)}</div>
      </article>
    `).join("");
  }

  if (sourceCards) {
    sourceCards.innerHTML = demoState.sources.slice(0, 8).map((source) => `
      <article class="if-source-card">
        <span class="if-source-card__icon if-icon-slot" data-if-icon="${source.source.includes("Navy") ? "anchor" : source.source.includes("Federal") ? "policy" : source.source.includes("NIST") || source.source.includes("CISA") ? "shield" : source.source.includes("Internal") ? "database" : "book"}"></span>
        <div>
          <h3>${demoEscape(source.source)}</h3>
          <p>${demoEscape(source.family)} - ${demoEscape(source.adapter)}</p>
          <div class="if-chip-list">${demoBadge(source.tier)} ${demoBadge(source.health)} <span class="if-badge">${demoEscape(source.artifacts)} artifacts</span></div>
        </div>
      </article>
    `).join("");
    hydrateIcons(sourceCards);
  }

  if (records) {
    records.innerHTML = demoState.syntheticRecords.map((record) => `
      <tr>
        <td><span class="if-row-title"><strong>${demoEscape(record.title)}</strong><span>${demoEscape(record.id)} - ${demoEscape(record.source)}</span></span></td>
        <td>${demoEscape(record.type)}</td>
        <td>${demoEscape(record.extracted)}</td>
        <td>${demoEscape(record.agent)}</td>
        <td>${demoBadge(record.confidence, "confidence")}</td>
      </tr>
    `).join("");
  }

  if (bundles) {
    bundles.innerHTML = demoState.relationshipBundles.map((bundle) => `
      <article class="if-relationship-bundle">
        <div class="if-cluster if-cluster--between"><h3>${demoEscape(bundle.relation)}</h3>${demoBadge(bundle.confidence, "confidence")}</div>
        <p class="if-metric__value">${demoEscape(bundle.count)}</p>
        <p>${demoEscape(bundle.examples)}</p>
      </article>
    `).join("");
  }
}

function renderReview() {
  const body = document.querySelector("[data-demo-review-body]");
  const detail = document.querySelector("[data-demo-review-detail]");
  if (!body || !detail) return;
  const selected = demoState.findings.find((finding) => finding.selected) || demoState.findings[0];
  selected.selected = true;

  body.innerHTML = demoState.findings.map((finding) => `
    <tr class="${finding.selected ? "is-selected" : ""}" data-demo-finding="${demoEscape(finding.id)}" data-if-filter-text="${demoEscape(`${finding.id} ${finding.title} ${finding.type} ${finding.source} ${finding.confidence} ${finding.risk} ${finding.assigned} ${finding.status}`)}">
      <td><input type="radio" name="finding" ${finding.selected ? "checked" : ""} aria-label="Select finding"></td>
      <td><span class="if-row-title"><strong>${demoEscape(finding.title)}</strong><span>${demoEscape(finding.id)}</span></span></td>
      <td>${demoBadge(finding.type.replace(" Candidate", ""))}</td>
      <td>${demoEscape(finding.source)}</td>
      <td>${demoBadge(finding.confidence, "confidence")}</td>
      <td>${demoBadge(finding.risk, "risk")}</td>
      <td>${demoEscape(finding.assigned)}</td>
      <td>${demoEscape(finding.due)}</td>
      <td>${demoBadge(finding.status, "status")}</td>
    </tr>
  `).join("");

  detail.innerHTML = `
    <div class="if-panel__header">
      <div><h2 class="if-panel__title">${demoEscape(selected.title)}</h2><div class="if-page-header__meta if-mt-2">${demoBadge(selected.type)} ${demoBadge(selected.status, "status")}</div></div>
      <button class="if-icon-btn" type="button" title="Close detail">x</button>
    </div>
    <div class="if-panel__body if-stack">
      <div class="if-toolbar">
        <button class="if-btn if-btn--success" type="button" data-demo-review-action="Approved">Approve</button>
        <button class="if-btn if-btn--danger" type="button" data-demo-review-action="Rejected">Reject</button>
        <button class="if-btn" type="button" data-demo-review-action="In Review">Edit</button>
        <button class="if-btn" type="button" data-demo-review-action="Escalated">Escalate</button>
        <button class="if-btn" type="button" data-demo-review-action="Assigned">Assign</button>
      </div>
      <label class="if-field"><span class="if-field__label">Decision Reason</span><select class="if-select"><option>Select reason...</option><option>Evidence supports finding</option><option>Insufficient provenance</option><option>Duplicate or superseded</option></select></label>
      <div data-if-tabs class="if-tabs">
        <div class="if-tab-list" role="tablist">
          <button class="if-tab" role="tab" aria-selected="true" aria-controls="review-evidence">Evidence</button>
          <button class="if-tab" role="tab" aria-selected="false" aria-controls="review-diff">Diff</button>
          <button class="if-tab" role="tab" aria-selected="false" aria-controls="review-history">History</button>
        </div>
        <section id="review-evidence" role="tabpanel" class="if-tab-panel if-grid if-grid--2">
          <div class="if-card"><h3 class="if-card__title">Finding Summary</h3><p>${demoEscape(selected.summary)}</p><div class="if-meta-grid"><div class="if-kv"><span class="if-kv__label">Confidence</span><span class="if-kv__value">${demoEscape(selected.confidence)}</span></div><div class="if-kv"><span class="if-kv__label">Risk</span><span class="if-kv__value">${demoEscape(selected.risk)}</span></div></div></div>
          <div class="if-evidence-panel"><h3 class="if-card__title">Evidence Snippet</h3><blockquote class="if-source-quote">Indexed source text requires residency controls when customer data is processed by a supplier.</blockquote><span class="if-text-xs if-text-muted">Source: ${demoEscape(selected.source)}, Section 4.2</span></div>
        </section>
        <section id="review-diff" role="tabpanel" class="if-tab-panel" hidden><div class="if-diff"><div class="if-diff-line if-diff-line--removed"><span>-</span><span>No geographic handling requirement found in prior record.</span></div><div class="if-diff-line if-diff-line--added"><span>+</span><span>Supplier data residency requirement proposed for review.</span></div></div></section>
        <section id="review-history" role="tabpanel" class="if-tab-panel" hidden><ol class="if-timeline"><li class="if-timeline__item"><strong>Extracted</strong><span>Extraction Agent v2.3</span></li><li class="if-timeline__item"><strong>Validated</strong><span>Relationship Agent v1.7</span></li></ol></section>
      </div>
      <label class="if-field"><span class="if-field__label">Reviewer Notes</span><textarea class="if-textarea" placeholder="Add notes for your decision..."></textarea></label>
    </div>
  `;
  init(detail);
}

function renderSearch() {
  const clauses = document.querySelector("[data-demo-clauses]");
  const results = document.querySelector("[data-demo-search-results]");
  const count = document.querySelector("[data-demo-result-count]");
  if (!clauses || !results) return;
  clauses.innerHTML = demoState.clauses.map((clause, index) => `
    <div class="if-list-item">
      <span class="if-badge">${index + 1}</span>
      <select class="if-select"><option>${demoEscape(clause[0])}</option><option>CONTAINS</option><option>CITED BY</option><option>RELATIONSHIP TYPE</option></select>
      <input class="if-input" value="${demoEscape(clause[1])}">
      <select class="if-select"><option>${demoEscape(clause[2])}</option></select>
      <button class="if-icon-btn" type="button" data-demo-remove-clause="${index}" title="Remove clause">-</button>
    </div>
  `).join("");
  results.innerHTML = demoState.searchResults.map((row) => `
    <tr><td><input type="checkbox" aria-label="Select result"></td><td><span class="if-row-title"><strong>${demoEscape(row[0])}</strong><span>Matched snippets include zero trust and cloud migration terms.</span></span></td><td>${demoEscape(row[1])}</td><td>${demoEscape(row[2])}</td><td>${demoEscape(row[3])}</td><td>${demoBadge(row[4], "confidence")}</td><td>${demoEscape(row[5])}</td><td><button class="if-icon-btn" title="Open">></button></td></tr>
  `).join("");
  if (count) count.textContent = `${demoState.searchResults.length.toLocaleString()} Results`;
}

function handleDemoClick(event) {
  const toggle = event.target.closest("[data-demo-toggle-widget]");
  if (toggle) {
    const id = toggle.dataset.demoToggleWidget;
    const widget = demoState.widgets.find((item) => item.id === id);
    if (widget) {
      widget.visible = toggle.matches("input") ? toggle.checked : !widget.visible;
      renderWorkspace();
    }
    return;
  }

  const action = event.target.closest("[data-demo-action]")?.dataset.demoAction;
  if (!action) return;
  if (action === "add-widget") {
    const hidden = demoState.widgets.find((widget) => !widget.visible);
    if (hidden) hidden.visible = true;
    demoToast(hidden ? `${hidden.title} added` : "All widgets are already on the canvas", hidden ? "success" : "info");
    renderWorkspace();
  }
  if (action === "reset-layout") {
    demoState.widgets.forEach((widget) => { widget.visible = true; widget.size = widget.id === "review" || widget.id === "sources" ? "Large" : "Medium"; });
    demoToast("Workspace layout restored", "success");
    renderWorkspace();
  }
  if (action === "save-settings") demoToast("Workspace settings saved", "success");
  if (action === "run-all") demoToast("All agents started. Audit log updated.", "success");
  if (action === "pause-agent") demoToast("Implementation Gap Agent paused", "warning");
  if (action === "promote-source") demoToast("Candidate source promoted for review", "success");
  if (action === "run-source") demoToast("Source refresh queued", "success");
  if (action === "edit-source") demoToast("Source editor opened", "info");
  if (action === "add-clause") {
    demoState.clauses.push(["CONTAINS", "new policy term", "Any Field"]);
    renderSearch();
    demoToast("Clause added", "success");
  }
  if (action === "run-search") {
    demoToast("Search executed against indexed policy intelligence", "success");
  }
}

function handleDemoInput(event) {
  if (event.target.matches("[data-demo-widget-size]")) {
    const widget = demoState.widgets.find((item) => item.id === event.target.dataset.demoWidgetSize);
    if (widget) {
      widget.size = event.target.value;
      renderWorkspace();
    }
  }
  if (event.target.matches("[data-demo-density]")) {
    document.querySelector(".if-shell")?.setAttribute("data-density", event.target.value);
  }
  if (event.target.matches("[data-demo-theme]")) {
    const shell = document.querySelector(".if-shell");
    if (window.InterfaceFramework?.setTheme) {
      window.InterfaceFramework.setTheme(event.target.value || "system");
    } else if (shell) {
      if (event.target.value) document.documentElement.setAttribute("data-theme", event.target.value);
      else document.documentElement.removeAttribute("data-theme");
    }
  }
  if (event.target.matches("[data-demo-threshold]")) {
    const label = document.querySelector("[data-demo-threshold-label]");
    if (label) label.textContent = `${event.target.value}%`;
  }
}

function handleDemoChange(event) {
  const row = event.target.closest("[data-demo-finding]");
  if (row) {
    demoState.findings.forEach((finding) => { finding.selected = finding.id === row.dataset.demoFinding; });
    renderReview();
  }
}

function handleDemoReviewAction(event) {
  const button = event.target.closest("[data-demo-review-action]");
  if (!button) return;
  const selected = demoState.findings.find((finding) => finding.selected) || demoState.findings[0];
  selected.status = button.dataset.demoReviewAction;
  demoToast(`${selected.id} marked ${selected.status}`, selected.status === "Rejected" ? "warning" : "success");
  renderReview();
}

function initDemo() {
  renderWorkspace();
  renderSources();
  renderVirtualPolicyTable();
  renderIngestIntelligence();
  renderReview();
  renderSearch();
  document.addEventListener("click", handleDemoClick);
  document.addEventListener("click", handleDemoReviewAction);
  document.addEventListener("input", handleDemoInput);
  document.addEventListener("change", handleDemoChange);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDemo);
  } else {
    initDemo();
  }
}
