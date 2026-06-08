(() => {
  const page = document.querySelector(".if-action-showcase");
  if (!page) return;

  const pulse = (element, className = "is-transitioning") => {
    if (!element) return;
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
    window.setTimeout(() => element.classList.remove(className), 520);
  };

  const setFeedback = (message, tone = "info") => {
    const feedback = page.querySelector("[data-if-action-feedback]");
    if (!feedback) return;
    feedback.textContent = message;
    feedback.dataset.tone = tone;
    pulse(feedback);
  };

  const setActiveButton = (button, scopeSelector) => {
    const scope = button.closest(scopeSelector);
    if (!scope) return;
    scope.querySelectorAll("button").forEach((item) => {
      const active = item === button;
      item.classList.toggle("is-active", active);
      if (item.hasAttribute("aria-pressed")) item.setAttribute("aria-pressed", String(active));
    });
    pulse(button);
  };

  const updateSort = (button) => {
    const current = button.dataset.sortDirection || "none";
    const next = current === "asc" ? "desc" : "asc";
    const icon = button.querySelector("[data-if-icon]");
    button.dataset.sortDirection = next;
    button.setAttribute("aria-pressed", "true");
    button.classList.toggle("is-sort-asc", next === "asc");
    button.classList.toggle("is-sort-desc", next === "desc");
    button.querySelector("span:last-child").textContent = next === "asc" ? "Sort ascending" : "Sort descending";
    if (icon) icon.dataset.ifIcon = "sort";
    pulse(button, "is-sorting");
    setFeedback(`Records sorted ${next === "asc" ? "ascending" : "descending"}.`, "info");
  };

  const updateSelection = (button) => {
    const bar = page.querySelector("[data-if-action-selection]");
    const count = page.querySelector("[data-if-action-selection-count]");
    if (!bar || !count) return;
    const clear = button.dataset.ifActionDemo === "clear-selection";
    const next = clear ? 0 : Number(count.textContent || "0") || 12;
    count.textContent = String(next);
    bar.classList.toggle("is-empty", clear);
    bar.querySelectorAll("button").forEach((item) => {
      if (item.dataset.ifActionDemo !== "clear-selection") item.disabled = clear;
    });
    setFeedback(clear ? "Selection cleared. Click the close button again to restore the batch state." : `${button.textContent.trim()} queued for ${next} records.`, clear ? "warning" : "success");
    if (clear) {
      button.setAttribute("aria-label", "Restore selection");
      window.setTimeout(() => {
        if (!bar.classList.contains("is-empty")) return;
        count.textContent = "12";
        bar.classList.remove("is-empty");
        bar.querySelectorAll("button").forEach((item) => {
          item.disabled = false;
        });
        button.setAttribute("aria-label", "Clear selection");
      }, 1800);
    }
    pulse(bar);
  };

  const updateDanger = (action) => {
    const box = page.querySelector("[data-if-action-danger]");
    if (!box) return;
    const title = box.querySelector("[data-if-action-danger-title]");
    const copy = box.querySelector("[data-if-action-danger-copy]");
    const confirmed = action === "confirm-danger";
    box.classList.toggle("is-confirmed", confirmed);
    title.textContent = confirmed ? "Draft records deleted" : "Deletion cancelled";
    copy.textContent = confirmed
      ? "The confirmation transitioned to a completed state. Click Cancel to restore the original warning."
      : "The destructive action was stopped and the records remain selected.";
    setFeedback(confirmed ? "Destructive action confirmed." : "Destructive action cancelled.", confirmed ? "warning" : "info");
    pulse(box);
  };

  const updateViewMode = (button) => {
    const shell = button.closest("[data-if-action-view]");
    if (!shell) return;
    const mode = button.dataset.ifActionViewMode || "table";
    shell.dataset.ifActionView = mode;
    setActiveButton(button, ".if-action-segmented");
    setFeedback(`Preview switched to ${mode} view.`, "info");
    pulse(shell.querySelector(".if-action-preview-grid"));
  };

  const updatePublish = (button) => {
    const label = button.querySelector("[data-if-action-publish-label]");
    const running = !button.classList.contains("is-running");
    button.classList.toggle("is-running", running);
    button.classList.toggle("is-complete", !running);
    label.textContent = running ? "Publishing..." : "Published";
    setFeedback(running ? "Publishing started." : "Publishing completed.", running ? "info" : "success");
    pulse(button);
  };

  const updateExportUnlock = (button) => {
    const label = button.querySelector("[data-if-action-export-label]");
    const alert = page.querySelector("[data-if-action-state-alert]");
    const unlocked = !button.classList.contains("is-unlocked");
    button.classList.toggle("is-unlocked", unlocked);
    button.classList.toggle("if-btn--primary", unlocked);
    button.classList.toggle("if-btn--secondary", !unlocked);
    label.textContent = unlocked ? "Export ready" : "Export unavailable";
    if (alert) {
      alert.classList.toggle("if-alert--success", unlocked);
      alert.classList.toggle("if-alert--info", !unlocked);
      alert.querySelector("span:last-child").textContent = unlocked
        ? "Selected records now have source evidence and can be exported."
        : "Exports unlock after all selected records have source evidence.";
      pulse(alert);
    }
    setFeedback(unlocked ? "Export unlocked." : "Export locked.", unlocked ? "success" : "info");
  };

  page.addEventListener("click", (event) => {
    const sort = event.target.closest("[data-if-action-sort]");
    if (sort) {
      updateSort(sort);
      return;
    }

    const viewButton = event.target.closest("[data-if-action-view-mode]");
    if (viewButton) {
      updateViewMode(viewButton);
      return;
    }

    const button = event.target.closest("button[data-if-action-demo]");
    if (!button || !page.contains(button)) return;
    const action = button.dataset.ifActionDemo;

    if (action === "tool") {
      setActiveButton(button, ".if-action-icon-strip");
      setFeedback(`${button.getAttribute("aria-label")} tool selected.`, "info");
      return;
    }

    if (action === "filter") {
      button.classList.toggle("is-active");
      button.setAttribute("aria-pressed", String(button.classList.contains("is-active")));
      setFeedback(`${button.textContent.trim()} filter ${button.classList.contains("is-active") ? "enabled" : "disabled"}.`, "info");
      pulse(button);
      return;
    }

    if (["assign", "export", "delete", "clear-selection"].includes(action)) {
      updateSelection(button);
      return;
    }

    if (["confirm-danger", "cancel-danger"].includes(action)) {
      updateDanger(action);
      return;
    }

    if (action === "publish") {
      updatePublish(button);
      return;
    }

    if (action === "unlock-export") {
      updateExportUnlock(button);
      return;
    }

    if (action === "palette" || action === "mobile" || action === "mobile-close" || action.startsWith("row-") || action.startsWith("run")) {
      button.classList.toggle("is-active");
      setFeedback(`${button.textContent.trim() || button.getAttribute("aria-label")} activated.`, "success");
      pulse(button);
      return;
    }

    setFeedback(`${button.textContent.trim() || button.getAttribute("aria-label")} activated.`, "success");
    pulse(button);
  });

  page.addEventListener("input", (event) => {
    const input = event.target.closest("[data-if-action-search], [data-if-action-palette-search]");
    if (!input) return;
    input.closest(".if-search")?.classList.toggle("is-active", Boolean(input.value.trim()));
    setFeedback(input.value.trim() ? `Filtering for "${input.value.trim()}".` : "Search cleared.", "info");
  });
})();
