(function () {
  "use strict";

  var DATA = window.AUDIT_DATA;
  if (!DATA) return;

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $all(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function statusLabel(key) {
    return (DATA.statuses[key] && DATA.statuses[key].label) || key;
  }

  function riskLabel(key) {
    if (!key || key === "none") return "none";
    return key;
  }

  var state = {
    featureStatus: "all",
    findingSev: "all",
    featureQuery: "",
    findingQuery: ""
  };

  /* ── Overview ─────────────────────────────────────────── */
  function renderKpis() {
    var grid = document.getElementById("kpi-grid");
    grid.innerHTML = DATA.kpis
      .map(function (kpi) {
        return (
          '<div class="kpi">' +
          '<span class="kpi-value">' + esc(kpi.value) + "</span>" +
          '<span class="kpi-label">' + esc(kpi.label) + "</span>" +
          '<span class="kpi-hint">' + esc(kpi.hint) + "</span>" +
          "</div>"
        );
      })
      .join("");
  }

  function renderStatusLegend() {
    var legend = document.getElementById("status-legend");
    if (!legend) return;
    legend.innerHTML = Object.keys(DATA.statuses)
      .map(function (key) {
        var status = DATA.statuses[key];
        return '<span class="badge" data-status="' + esc(key) + '" title="' + esc(status.note) + '">' + esc(status.label) + "</span>";
      })
      .join("") + '<span class="legend-note">Runtime not proven unless explicitly stated.</span>';
  }

  function renderVerdicts() {
    var list = document.getElementById("headline-verdicts");
    list.innerHTML = DATA.verdicts
      .map(function (item) {
        return (
          '<div class="verdict-item">' +
          '<span class="verdict-score">' + esc(item.score) + "</span>" +
          "<div><strong>" + esc(item.title) + "</strong><p>" + esc(item.text) + "</p></div>" +
          "</div>"
        );
      })
      .join("");
  }

  function renderClaims() {
    var list = document.getElementById("claim-list");
    list.innerHTML = DATA.claims
      .map(function (claim) {
        return (
          '<div class="claim-item" data-state="' + esc(claim.state) + '">' +
          '<p class="claim-q">' + esc(claim.q) + "</p>" +
          '<p class="claim-a">' + esc(claim.a) + "</p>" +
          "</div>"
        );
      })
      .join("");
  }

  /* ── Tabs ─────────────────────────────────────────────── */
  function activateTab(name, focusTab) {
    var target = document.getElementById("panel-" + name);
    if (!target) return;

    $all(".tab").forEach(function (tab) {
      var active = tab.getAttribute("data-tab") === name;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
      tab.setAttribute("tabindex", active ? "0" : "-1");
      if (active && focusTab) tab.focus();
    });

    $all(".panel").forEach(function (panel) {
      var active = panel.id === "panel-" + name;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });

    if (history.replaceState) {
      history.replaceState(null, "", "#" + name);
    } else {
      window.location.hash = name;
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function setupTabs() {
    var tabs = $all(".tab");
    tabs.forEach(function (tab) {
      tab.setAttribute("aria-controls", "panel-" + tab.getAttribute("data-tab"));
      tab.addEventListener("click", function () {
        activateTab(tab.getAttribute("data-tab"), false);
      });
      tab.addEventListener("keydown", function (event) {
        var index = tabs.indexOf(tab);
        var next = null;
        if (event.key === "ArrowRight") next = tabs[(index + 1) % tabs.length];
        if (event.key === "ArrowLeft") next = tabs[(index - 1 + tabs.length) % tabs.length];
        if (event.key === "Home") next = tabs[0];
        if (event.key === "End") next = tabs[tabs.length - 1];
        if (next) {
          event.preventDefault();
          activateTab(next.getAttribute("data-tab"), true);
        }
      });
    });

    var initial = (window.location.hash || "").replace("#", "");
    if (initial && document.getElementById("panel-" + initial)) {
      activateTab(initial, false);
    }

    var print = document.getElementById("print-btn");
    if (print) {
      print.addEventListener("click", function () {
        window.print();
      });
    }

    var printState = null;
    window.addEventListener("beforeprint", function () {
      printState = $all(".finding").map(function (item) { return item.open; });
      $all(".finding").forEach(function (item) { item.open = true; });
    });
    window.addEventListener("afterprint", function () {
      if (!printState) return;
      $all(".finding").forEach(function (item, index) {
        item.open = Boolean(printState[index]);
      });
      printState = null;
    });
  }

  /* ── Feature table ────────────────────────────────────── */
  function featureHaystack(feature) {
    var parts = [feature.name, feature.category, feature.summary, feature.details, statusLabel(feature.status), feature.risk];
    (feature.evidence || []).forEach(function (ev) {
      parts.push(ev.file, ev.note);
    });
    return parts.join(" ").toLowerCase();
  }

  function featureMatches(feature) {
    if (state.featureStatus !== "all" && feature.status !== state.featureStatus) return false;
    if (!state.featureQuery) return true;
    return featureHaystack(feature).indexOf(state.featureQuery) !== -1;
  }

  function renderFeatureFilters() {
    var container = document.getElementById("feature-filters");
    var keys = ["all", "implemented", "partial", "mocked", "missing", "blocked"];
    container.innerHTML = keys
      .map(function (key) {
        var count = key === "all" ? DATA.features.length : DATA.features.filter(function (f) { return f.status === key; }).length;
        var label = key === "all" ? "All" : statusLabel(key);
        var active = state.featureStatus === key ? " is-active" : "";
        return (
          '<button type="button" class="filter-chip' + active + '" data-status="' + key + '" aria-pressed="' + (state.featureStatus === key) + '">' +
          esc(label) + '<span class="n">' + count + "</span></button>"
        );
      })
      .join("");

    $all(".filter-chip", container).forEach(function (chip) {
      chip.addEventListener("click", function () {
        state.featureStatus = chip.getAttribute("data-status");
        renderFeatureFilters();
        renderFeatures();
      });
    });
  }

  function renderFeatures() {
    var tbody = $("#feature-table tbody");
    var visible = DATA.features.filter(featureMatches);

    tbody.innerHTML = visible
      .map(function (feature, index) {
        var detailId = "feature-detail-" + feature.id;
        var evidence = (feature.evidence || [])
          .map(function (ev) {
            return "<li>" + esc(ev.file) + "<span>" + esc(ev.note) + "</span></li>";
          })
          .join("");

        return (
          '<tr class="row" data-id="' + esc(feature.id) + '">' +
          '<td class="name"><strong>' + esc(feature.name) + "</strong><span>" + esc(feature.summary) + "</span></td>" +
          '<td class="area">' + esc(feature.category) + "</td>" +
          '<td><span class="badge" data-status="' + esc(feature.status) + '">' + esc(statusLabel(feature.status)) + "</span></td>" +
          '<td class="proof">' + esc(feature.runtime) + "</td>" +
          '<td><span class="risk-dot" data-risk="' + esc(feature.risk) + '">' + esc(riskLabel(feature.risk)) + "</span></td>" +
          '<td><button type="button" class="detail-btn" aria-expanded="false" aria-controls="' + detailId + '" data-detail="' + detailId + '">Details</button></td>' +
          "</tr>" +
          '<tr class="detail-row" id="' + detailId + '" data-detail-row="' + esc(feature.id) + '" hidden>' +
          '<td colspan="6"><div class="detail-body">' +
          '<div><h4>Assessment</h4><p>' + esc(feature.details || feature.summary) + "</p>" +
          (feature.runtime ? '<h4 style="margin-top:12px">Verification</h4><p>' + esc(feature.runtime) + " — runtime evidence was not collected.</p>" : "") +
          "</div>" +
          "<div><h4>Evidence</h4><ul class=\"evidence-list\">" + (evidence || "<li>No evidence recorded.</li>") + "</ul></div>" +
          "</div></td></tr>"
        );
      })
      .join("");

    document.getElementById("feature-empty").hidden = visible.length !== 0;
    updateExpandLabel("feature-expand", "feature");
  }

  function updateExpandLabel(buttonId, kind) {
    var button = document.getElementById(buttonId);
    if (!button) return;
    var rows = kind === "feature" ? $all(".detail-row:not([hidden])") : $all(".finding[open]");
    button.textContent = rows.length > 0 ? "Collapse all" : "Expand all";
  }

  function setupFeatureEvents() {
    var tbody = $("#feature-table tbody");

    tbody.addEventListener("click", function (event) {
      var button = event.target.closest(".detail-btn");
      if (!button) return;
      var detail = document.getElementById(button.getAttribute("data-detail"));
      if (!detail) return;
      var open = detail.hidden;
      detail.hidden = !open;
      button.setAttribute("aria-expanded", open ? "true" : "false");
      button.textContent = open ? "Hide" : "Details";
      updateExpandLabel("feature-expand", "feature");
    });

    var expand = document.getElementById("feature-expand");
    expand.addEventListener("click", function () {
      var anyCollapsed = $all(".detail-row").some(function (row) { return row.hidden; });
      $all(".detail-row").forEach(function (row) { row.hidden = !anyCollapsed; });
      $all(".detail-btn").forEach(function (btn) {
        btn.setAttribute("aria-expanded", anyCollapsed ? "true" : "false");
        btn.textContent = anyCollapsed ? "Hide" : "Details";
      });
      expand.textContent = anyCollapsed ? "Collapse all" : "Expand all";
    });

    var search = document.getElementById("feature-search");
    search.addEventListener("input", function () {
      state.featureQuery = search.value.trim().toLowerCase();
      renderFeatures();
    });
  }

  /* ── Findings ─────────────────────────────────────────── */
  function findingHaystack(finding) {
    return [finding.title, finding.area, finding.impact, finding.evidence, finding.recommendation, finding.confidence, finding.sev]
      .concat(finding.tags || [])
      .join(" ")
      .toLowerCase();
  }

  function renderSeveritySummary() {
    var container = document.getElementById("sev-summary");
    var order = ["critical", "high", "medium", "low", "info"];
    container.innerHTML = order
      .map(function (sev) {
        var count = DATA.findings.filter(function (f) { return f.sev === sev; }).length;
        return '<span class="sev-pill">' + esc(sev) + " <strong>" + count + "</strong></span>";
      })
      .join("");
  }

  function renderFindingFilters() {
    var container = document.getElementById("finding-filters");
    var keys = ["all", "critical", "high", "medium", "low", "info"];
    container.innerHTML = keys
      .map(function (key) {
        var count = key === "all" ? DATA.findings.length : DATA.findings.filter(function (f) { return f.sev === key; }).length;
        var label = key === "all" ? "All" : key;
        var active = state.findingSev === key ? " is-active" : "";
        return (
          '<button type="button" class="filter-chip' + active + '" data-sev="' + key + '" aria-pressed="' + (state.findingSev === key) + '">' +
          esc(label) + '<span class="n">' + count + "</span></button>"
        );
      })
      .join("");

    $all(".filter-chip", container).forEach(function (chip) {
      chip.addEventListener("click", function () {
        state.findingSev = chip.getAttribute("data-sev");
        renderFindingFilters();
        renderFindings();
      });
    });
  }

  function renderFindings() {
    var list = document.getElementById("finding-list");
    var visible = DATA.findings.filter(function (finding) {
      if (state.findingSev !== "all" && finding.sev !== state.findingSev) return false;
      if (!state.findingQuery) return true;
      return findingHaystack(finding).indexOf(state.findingQuery) !== -1;
    });

    list.innerHTML = visible
      .map(function (finding) {
        return (
          '<details class="finding" data-sev="' + esc(finding.sev) + '">' +
          "<summary>" +
          '<span class="badge" data-sev="' + esc(finding.sev) + '">' + esc(finding.sev) + "</span>" +
          '<span class="finding-title">' + esc(finding.title) +
          '<span class="finding-sub">' + esc(finding.id) + " · " + esc(finding.area) + "</span></span>" +
          '<span class="finding-toggle" aria-hidden="true">+</span>' +
          "</summary>" +
          '<div class="finding-body">' +
          "<div><h4>Impact</h4><p>" + esc(finding.impact) + "</p></div>" +
          '<div><h4>Evidence</h4><div class="finding-evidence">' + esc(finding.evidence) + "</div></div>" +
          '<div class="finding-grid">' +
          "<div><h4>Remediation</h4><p>" + esc(finding.recommendation) + "</p></div>" +
          "<div><h4>Confidence</h4><p>" + esc(finding.confidence) + "</p></div>" +
          "</div>" +
          '<div class="finding-meta">' + (finding.tags || []).map(function (tag) {
            return '<span class="chip">' + esc(tag) + "</span>";
          }).join("") + "</div>" +
          "</div>" +
          "</details>"
        );
      })
      .join("");

    document.getElementById("finding-empty").hidden = visible.length !== 0;
    updateExpandLabel("finding-expand", "finding");
  }

  function setupFindingEvents() {
    var list = document.getElementById("finding-list");

    list.addEventListener("toggle", function () {
      updateExpandLabel("finding-expand", "finding");
    }, true);

    var expand = document.getElementById("finding-expand");
    expand.addEventListener("click", function () {
      var anyClosed = $all(".finding").some(function (item) { return !item.open; });
      $all(".finding").forEach(function (item) { item.open = anyClosed; });
      expand.textContent = anyClosed ? "Collapse all" : "Expand all";
    });

    var search = document.getElementById("finding-search");
    search.addEventListener("input", function () {
      state.findingQuery = search.value.trim().toLowerCase();
      renderFindings();
    });
  }

  /* ── Real-time ────────────────────────────────────────── */
  function renderRealtime() {
    var grid = document.getElementById("realtime-grid");
    grid.innerHTML = DATA.realtime
      .map(function (item) {
        return (
          '<article class="rt-card">' +
          '<div class="rt-top"><h3>' + esc(item.name) + "</h3>" +
          '<span class="badge" data-status="' + esc(item.status) + '">' + esc(statusLabel(item.status)) + "</span></div>" +
          '<span class="rt-transport">' + esc(item.transport) + "</span>" +
          "<p>" + esc(item.detail) + "</p>" +
          '<div class="rt-foot"><span>Runtime proof</span><span>' + esc(item.proof) + "</span></div>" +
          "</article>"
        );
      })
      .join("");
  }

  /* ── Architecture ─────────────────────────────────────── */
  var flatNodes = [];

  function renderArchitecture() {
    var stack = document.getElementById("arch-stack");
    flatNodes = [];

    stack.innerHTML = DATA.architecture
      .map(function (band) {
        var nodes = band.nodes
          .map(function (node) {
            flatNodes.push(node);
            return (
              '<button type="button" class="arch-node" data-node="' + esc(node.id) + '" data-kind="' + esc(node.kind) + '">' +
              esc(node.label) + "</button>"
            );
          })
          .join("");
        return (
          '<div class="arch-band">' +
          '<div class="arch-band-label"><span>' + esc(band.layer) + '</span><span>' + esc(band.note) + "</span></div>" +
          '<div class="arch-nodes">' + nodes + "</div>" +
          "</div>"
        );
      })
      .join("");

    stack.addEventListener("click", function (event) {
      var button = event.target.closest(".arch-node");
      if (!button) return;
      showNode(button.getAttribute("data-node"));
    });

    showNode(null);
  }

  function showNode(id) {
    var detail = document.getElementById("arch-detail");
    var node = flatNodes.filter(function (item) { return item.id === id; })[0];

    $all(".arch-node").forEach(function (button) {
      button.classList.toggle("is-active", button.getAttribute("data-node") === id);
    });

    if (!node) {
      detail.innerHTML =
        '<span class="kind">Select a node</span>' +
        "<h3>System map</h3>" +
        '<p class="placeholder">Choose any component to see its responsibility and source evidence. Nodes marked with a risk tag participate in a notable exposure or integrity gap.</p>' +
        '<ul class="evidence-list"><li>Bands are conceptual layers.<span>They do not imply independent deployment or trust boundaries.</span></li></ul>';
      return;
    }

    detail.innerHTML =
      '<span class="kind">' + (node.kind === "risk" ? "Risk-related component" : "Component") + "</span>" +
      "<h3>" + esc(node.label) + "</h3>" +
      "<p>" + esc(node.detail) + "</p>" +
      '<h4>Source evidence</h4><ul class="evidence-list">' +
      (node.files || []).map(function (file) {
        return "<li>" + esc(file) + "</li>";
      }).join("") +
      "</ul>";
  }

  /* ── Data & flows ─────────────────────────────────────── */
  function renderCollections() {
    var list = document.getElementById("collection-list");
    list.innerHTML = DATA.collections
      .map(function (item) {
        return (
          '<div class="collection-row"><code>' + esc(item.name) + "</code><span>" + esc(item.purpose) + "</span></div>"
        );
      })
      .join("");
  }

  function renderExternals() {
    var list = document.getElementById("external-list");
    list.innerHTML = DATA.externals
      .map(function (group) {
        return (
          '<div class="external-group"><h3>' + esc(group.group) + '</h3><div class="external-tags">' +
          group.items.map(function (item) { return '<span class="external-tag">' + esc(item) + "</span>"; }).join("") +
          "</div></div>"
        );
      })
      .join("");
  }

  function renderFlows() {
    ["payment", "automation"].forEach(function (key) {
      var list = document.getElementById(key + "-flow");
      list.innerHTML = DATA.flows[key]
        .map(function (step) {
          return (
            "<li><div class=\"flow-title\"><strong>" + esc(step.title) + "</strong></div>" +
            "<p>" + esc(step.body) + " <code>" + esc(step.ref) + "</code></p>" +
            (step.risk ? '<span class="flow-risk"><strong>Risk</strong> ' + esc(step.risk) + "</span>" : "") +
            "</li>"
          );
        })
        .join("");
    });
  }

  /* ── Verification ─────────────────────────────────────── */
  function renderChecks() {
    var grid = document.getElementById("check-grid");
    var labels = { pass: "Pass", fail: "Fail", blocked: "Blocked", info: "Info" };
    grid.innerHTML = DATA.checks
      .map(function (check) {
        return (
          '<article class="check-card" data-ok="' + esc(check.state) + '">' +
          '<span class="check-status">' + esc(labels[check.state] || check.state) + "</span>" +
          "<h3>" + esc(check.title) + "</h3><p>" + esc(check.text) + "</p></article>"
        );
      })
      .join("");

    var terminal = document.getElementById("check-terminal");
    terminal.innerHTML = DATA.terminal
      .map(function (line) {
        if (!line.text) return "\n";
        return '<span class="' + esc(line.cls || "dim") + '">' + esc(line.text) + "</span>";
      })
      .join("\n");

    var plan = document.getElementById("runtime-plan");
    plan.innerHTML = DATA.runtimePlan
      .map(function (step) { return "<li>" + esc(step) + "</li>"; })
      .join("");
  }

  /* ── Roadmap ──────────────────────────────────────────── */
  function renderRoadmap() {
    var wrap = document.getElementById("roadmap");
    wrap.innerHTML = DATA.roadmap
      .map(function (phase) {
        return (
          '<article class="phase" data-priority="' + esc(phase.priority) + '">' +
          '<div class="phase-head"><h2>' + esc(phase.title) + "</h2><span>" + esc(phase.priority) + "</span></div>" +
          '<span class="chip">' + esc(phase.caption) + "</span>" +
          "<ul>" +
          phase.items.map(function (item) {
            return "<li><strong>" + esc(item.title) + "</strong><span>" + esc(item.text) + "</span></li>";
          }).join("") +
          "</ul></article>"
        );
      })
      .join("");
  }

  /* ── Init ─────────────────────────────────────────────── */
  function init() {
    renderKpis();
    renderStatusLegend();
    renderVerdicts();
    renderClaims();
    renderFeatureFilters();
    renderFeatures();
    renderSeveritySummary();
    renderFindingFilters();
    renderFindings();
    renderRealtime();
    renderArchitecture();
    renderCollections();
    renderExternals();
    renderFlows();
    renderChecks();
    renderRoadmap();
    setupTabs();
    setupFeatureEvents();
    setupFindingEvents();

    var featureCount = document.querySelector('[data-count="features"]');
    if (featureCount) featureCount.textContent = DATA.features.length;
    var findingCount = document.querySelector('[data-count="findings"]');
    if (findingCount) findingCount.textContent = DATA.findings.length;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
