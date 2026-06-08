import "control-surface-ui/css";
import {
  init,
  destroy,
  registerAutocompleteAdapter,
  registerDataTableAdapter,
  setTheme,
  showToast
} from "control-surface-ui";

const routeContracts = [
  "Overview",
  "Graph",
  "Documents",
  "Review",
  "Sources",
  "Search",
  "Workspace",
  "Diagrams",
  "Data Model"
];

const policyRecords = [
  { title: "DoDI 5200.01 Information Governance", authority: "DoD", updated: "May 1, 2025", confidence: "High" },
  { title: "SECNAV Memo 25-104 Cloud Transition Guidance", authority: "SECNAV", updated: "May 6, 2025", confidence: "High" },
  { title: "Federal Register API", authority: "Source", updated: "May 12, 2025", confidence: "Medium" }
];

registerAutocompleteAdapter("starter-policy-search", async ({ query }) => {
  const q = String(query || "").toLowerCase();
  return {
    items: policyRecords
      .filter((item) => item.title.toLowerCase().includes(q) || item.authority.toLowerCase().includes(q))
      .map((item) => ({ label: item.title, meta: item.authority, value: item.title }))
  };
});

registerDataTableAdapter("starter-policy-records", async () => ({
  rows: policyRecords,
  total: policyRecords.length
}));

const app = document.querySelector("#app");

app.innerHTML = `
  <div class="if-shell" data-density="comfortable">
    <header class="if-topbar">
      <a class="if-brand" href="#"><span class="if-brand__mark" aria-hidden="true">PI</span><span>Policy Intelligence</span></a>
      <nav class="if-topbar__nav" aria-label="Primary routes">
        ${routeContracts.map((route, index) => `<a class="if-nav-link${index === 0 ? " is-active" : ""}" href="#${route.toLowerCase().replaceAll(" ", "-")}">${route}</a>`).join("")}
      </nav>
      <div class="if-topbar__actions if-utility-cluster">
        <label class="if-search if-autocomplete if-utility-search">
          <span class="if-search__icon if-icon-slot" data-if-icon="search" aria-hidden="true"></span>
          <span class="if-sr-only">Search</span>
          <input class="if-input" type="search" data-if-autocomplete-remote="starter-policy-search" placeholder="Search policies, sources, organizations...">
        </label>
        <select class="if-select" data-starter-theme aria-label="Theme">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="high-contrast">High contrast</option>
        </select>
      </div>
    </header>
    <main class="if-content">
      <section class="if-panel">
        <div class="if-panel__header">
          <div><h1 class="if-panel__title">Policy Intelligence Starter</h1><p class="if-panel__subtitle">Packaged Vite starter with route contracts and adapter stubs.</p></div>
          <button class="if-btn if-btn--primary" type="button" data-starter-toast>Verify wiring</button>
        </div>
        <div class="if-panel__body if-stack">
          <div class="if-metric-grid">
            <article class="if-card if-metric"><div class="if-metric__top"><span class="if-metric__icon if-icon-slot" data-if-icon="policy" aria-hidden="true"></span><p class="if-metric__label">Route contracts</p></div><p class="if-metric__value">${routeContracts.length}</p><span class="if-metric__change">Mapped</span><div class="if-metric__meta"><span>Policy MVP</span><span>Starter</span></div></article>
            <article class="if-card if-metric"><div class="if-metric__top"><span class="if-metric__icon if-icon-slot" data-if-icon="database" aria-hidden="true"></span><p class="if-metric__label">Adapter stubs</p></div><p class="if-metric__value">2</p><span class="if-metric__change">Ready to expand</span><div class="if-metric__meta"><span>Autocomplete</span><span>Table</span></div></article>
          </div>
          <div class="if-table-wrap" role="region" aria-label="Starter records" tabindex="0">
            <table class="if-table">
              <thead><tr><th scope="col">Record</th><th scope="col">Authority</th><th scope="col">Updated</th><th scope="col">Confidence</th></tr></thead>
              <tbody>${policyRecords.map((row) => `<tr><td>${row.title}</td><td>${row.authority}</td><td>${row.updated}</td><td><span class="if-badge if-badge--confidence-${row.confidence.toLowerCase()}">${row.confidence}</span></td></tr>`).join("")}</tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  </div>
`;

init(document);

document.querySelector("[data-starter-theme]")?.addEventListener("change", (event) => {
  setTheme(event.target.value);
});

document.querySelector("[data-starter-toast]")?.addEventListener("click", () => {
  showToast("Starter wired: framework CSS, JS, adapters, and events are loaded.", "check");
});

window.addEventListener("beforeunload", () => destroy(document));
