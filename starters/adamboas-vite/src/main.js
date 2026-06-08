import "control-surface-ui/css";
import { init, destroy, setTheme, showToast } from "control-surface-ui";

const routes = ["Home", "Services", "Experience", "Insights", "Profile", "Resume", "Contact"];
const posts = [
  { title: "The Next AI Bottleneck Is Delegated Authority", type: "Memo", date: "Apr 18, 2026" },
  { title: "Continuous Assurance Fabric Reference Architecture", type: "Paper", date: "Feb 23, 2026" },
  { title: "Policy Intelligence, Real-World Impact", type: "Brief", date: "May 1, 2026" }
];

document.querySelector("#app").innerHTML = `
  <div class="if-public-site">
    <header class="if-site-nav">
      <a class="if-site-brand" href="#"><strong>Adam Boas</strong><span>Consulting</span></a>
      <nav class="if-site-nav__links" aria-label="Public routes">
        ${routes.map((route) => `<a href="#${route.toLowerCase()}">${route}</a>`).join("")}
      </nav>
      <select class="if-select" data-public-theme aria-label="Theme"><option value="light">Light</option><option value="dark">Dark</option><option value="high-contrast">High contrast</option></select>
    </header>
    <main>
      <section class="if-consulting-hero">
        <div class="if-site-container if-consulting-hero__inner">
          <div class="if-consulting-hero__copy">
            <span class="if-page-header__eyebrow">AdamBoas.com starter</span>
            <h1>Strategic counsel for policy intelligence, AI governance, and real-world delivery.</h1>
            <p>Packaged Vite starter for public routes, writing, profile, resume, and contact sections.</p>
            <div class="if-cluster"><button class="if-btn if-btn--primary" type="button" data-public-toast>Verify framework</button><a class="if-btn if-btn--secondary" href="#insights">Read insights</a></div>
          </div>
        </div>
      </section>
      <section class="if-site-container if-stack" id="insights">
        <div class="if-consulting-section-head"><span>Insights</span><h2>Public writing cards</h2><p>Replace these fixtures with a content adapter or static-site content source.</p></div>
        <div class="if-grid if-grid--3">
          ${posts.map((post) => `<article class="if-publication-card"><div class="if-publication-card__meta"><span class="if-badge">${post.type}</span><time>${post.date}</time></div><h3 class="if-publication-card__title">${post.title}</h3><p class="if-publication-card__abstract">Starter copy for public-site content modeling and route composition.</p></article>`).join("")}
        </div>
      </section>
    </main>
  </div>
`;

init(document);

document.querySelector("[data-public-theme]")?.addEventListener("change", (event) => setTheme(event.target.value));
document.querySelector("[data-public-toast]")?.addEventListener("click", () => {
  showToast("Public starter wired: AdamBoas.com consumes packaged framework artifacts.", "check");
});

window.addEventListener("beforeunload", () => destroy(document));
