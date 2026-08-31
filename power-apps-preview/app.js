const holidays = new Set([
  "2027-01-01", "2027-01-18", "2027-02-15", "2027-05-31", "2027-06-18",
  "2027-07-05", "2027-09-06", "2027-10-11", "2027-11-11", "2027-11-25", "2027-12-24"
]);

const holidayNames = {
  "2027-01-01": "New Year's Day",
  "2027-01-18": "Martin Luther King Jr. Day",
  "2027-02-15": "Washington's Birthday",
  "2027-05-31": "Memorial Day",
  "2027-06-18": "Juneteenth observed",
  "2027-07-05": "Independence Day observed",
  "2027-09-06": "Labor Day",
  "2027-10-11": "Columbus Day",
  "2027-11-11": "Veterans Day",
  "2027-11-25": "Thanksgiving Day",
  "2027-12-24": "Christmas Day observed"
};

const groups = [
  {
    id: "full-board",
    title: "Full Board Meetings",
    purpose: "Governance, key decisions, and organizational oversight.",
    count: 4,
    cadence: "custom",
    months: [0, 2, 6, 10],
    week: 2,
    day: 2,
    time: "17:00",
    duration: 120,
    attendees: "Full Board",
    status: "Needs validation",
    confirmed: false,
    source: {
      Purpose: "Governance, key decisions, organizational oversight",
      "Who attends": "Full Board",
      "Historical cadence": "Every other month; generally the second Tuesday",
      "Historical time": "5:00–7:00 PM",
      Format: "In person",
      "2027 proposal": "Four regular meetings",
      "Needs validation": "Which months and preferred weekday"
    }
  },
  {
    id: "retreats",
    title: "Full Board Retreats",
    purpose: "Extended strategic and governance discussion.",
    count: 2,
    cadence: "semiannual",
    months: [4, 8],
    week: 2,
    day: 2,
    time: "12:00",
    duration: 300,
    attendees: "Full Board",
    status: "Confirmed",
    confirmed: true,
    source: {
      Purpose: "Extended strategic and governance discussion",
      "Who attends": "Full Board",
      "Historical timing": "A regular meeting was converted to a retreat in May 2026",
      Duration: "Approximately five hours",
      Format: "In person",
      "2027 proposal": "Two retreats",
      "Needs validation": "Retreat months"
    }
  },
  {
    id: "check-ins",
    title: "Critical Issue Check-Ins",
    purpose: "Short Board touchpoints between Full Board meetings.",
    count: 6,
    cadence: "every-other-month",
    months: [1, 3, 5, 7, 9, 11],
    week: 2,
    day: 2,
    time: "17:00",
    duration: 30,
    attendees: "Board",
    status: "Open question",
    confirmed: false,
    source: {
      Purpose: "Short Board touchpoint between Full Board meetings",
      "Who attends": "Board",
      "Historical cadence": "Every other month, alternating with Full Board meetings",
      "Historical time": "5:00–5:30 PM",
      Format: "Virtual",
      "2027 proposal": "Six per year",
      "Needs validation": "Whether to continue monthly Board touchpoints"
    }
  }
];

groups.forEach(group => { group.layer = "board"; });

const otherRules = [
  {
    id: "executive-committee",
    layer: "committee",
    title: "Executive Committee",
    purpose: "Board leadership coordination between Full Board meetings.",
    count: 6,
    cadence: "every-other-month",
    week: 4,
    day: 2,
    time: "17:00",
    duration: 90,
    attendees: "Executive Committee",
    status: "Needs validation",
    source: { "Needs validation": "Reconfirm the cadence after the Full Board months are selected." }
  },
  {
    id: "finance-committee",
    layer: "committee",
    title: "Administration & Finance Committee",
    purpose: "Financial oversight and review before related Board decisions.",
    count: 6,
    cadence: "every-other-month",
    week: 4,
    day: 2,
    time: "17:00",
    duration: 90,
    attendees: "Administration & Finance Committee",
    status: "Needs validation",
    source: { "Needs validation": "Confirm exact dates after financial-data availability and Board dates are known." }
  },
  {
    id: "health-programs-committee",
    layer: "committee",
    title: "Health Center & Programs Committee",
    purpose: "Program and health-center oversight.",
    count: 4,
    cadence: "quarterly",
    week: 3,
    day: 2,
    time: "17:00",
    duration: 90,
    attendees: "Health Center & Programs Committee",
    status: "Needs validation",
    source: { "Needs validation": "Confirm the quarterly cadence for 2027." }
  },
  {
    id: "talent-risk-committee",
    layer: "committee",
    title: "Talent & Risk Management Committee",
    purpose: "Talent, organizational risk, and management oversight.",
    count: 4,
    cadence: "quarterly",
    week: 1,
    day: 2,
    time: "17:00",
    duration: 90,
    attendees: "Talent & Risk Management Committee",
    status: "Needs validation",
    source: { "Needs validation": "Confirm the first-Tuesday pattern; May 2026 was an exception." }
  },
  {
    id: "nominations-committee",
    layer: "committee",
    title: "Nominations Committee",
    purpose: "Recruitment, nominations, succession planning, and Board deadlines.",
    count: 0,
    cadence: "custom",
    week: 2,
    day: 2,
    time: "17:00",
    duration: 60,
    attendees: "Nominations Committee",
    status: "Open question",
    source: { "Needs validation": "No recurring cadence is documented." }
  },
  {
    id: "program-committee",
    layer: "committee",
    title: "Program Committee",
    purpose: "Program oversight; recurring scheduling pattern is not yet documented.",
    count: 0,
    cadence: "custom",
    week: 2,
    day: 2,
    time: "17:00",
    duration: 60,
    attendees: "Program Committee",
    status: "Open question",
    source: { "Needs validation": "Confirm whether this group needs a recurring 2027 cadence." }
  }
];

const rulebookEntries = [...groups, ...otherRules];

let selectedId = "full-board";
let selectedRuleId = "full-board";
let activeView = "plan";
let toastTimer;

const $ = (id) => document.getElementById(id);

function nthWeekday(year, month, weekday, occurrence) {
  const first = new Date(year, month, 1);
  const shift = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + shift + (occurrence - 1) * 7);
}

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function displayDate(date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function cadenceMonths(group) {
  const count = Math.max(0, Math.min(12, Number(group.count) || 0));
  if (group.cadence === "monthly") return Array.from({ length: count }, (_, i) => i % 12);
  if (group.cadence === "every-other-month") return Array.from({ length: count }, (_, i) => (1 + i * 2) % 12);
  if (group.cadence === "quarterly") return Array.from({ length: count }, (_, i) => (2 + i * 3) % 12);
  if (group.cadence === "semiannual") return Array.from({ length: count }, (_, i) => (4 + i * 6) % 12);
  if (group.months.length === count) return [...group.months];
  if (!count) return [];
  return Array.from({ length: count }, (_, i) => Math.min(11, Math.round(i * 11 / Math.max(1, count - 1))));
}

function buildMeetings(group) {
  return cadenceMonths(group).map((month, index) => {
    const date = nthWeekday(2027, month, Number(group.day), Number(group.week));
    return {
      id: `${group.id}-${index}`,
      date,
      holiday: holidays.has(dateKey(date)),
      override: false
    };
  });
}

function statusClass(status) {
  if (status === "Confirmed") return "confirmed";
  if (status === "Open question") return "open";
  return "warning";
}

function cadenceLabel(cadence) {
  return ({
    custom: "Custom months",
    monthly: "Monthly",
    "every-other-month": "Every other month",
    quarterly: "Quarterly",
    semiannual: "Every six months"
  })[cadence] || cadence;
}

function layerLabel(layer) {
  return ({
    board: "Board & Governance",
    committee: "Committees",
    executive: "Executive Leadership",
    organization: "Organization"
  })[layer] || layer;
}

function ordinal(value) {
  return ({ 1: "First", 2: "Second", 3: "Third", 4: "Fourth" })[value] || `${value}th`;
}

function weekdayLabel(value) {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][Number(value)] || "Not set";
}

function timeLabel(value) {
  const [hours, minutes] = String(value || "00:00").split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes || 0).padStart(2, "0")} ${suffix}`;
}

function durationLabel(minutes) {
  if (minutes === 60) return "1 hour";
  if (minutes === 90) return "1.5 hours";
  if (minutes === 120) return "2 hours";
  if (minutes === 300) return "5 hours";
  return `${minutes} minutes`;
}

function allCalendarMeetings() {
  return groups.flatMap(group => buildMeetings(group).map(meeting => ({
    ...meeting,
    title: group.title,
    confirmed: group.confirmed,
    status: group.status
  })));
}

function renderCalendar() {
  const filter = $("calendarFilter").value;
  const allMeetings = allCalendarMeetings();
  const meetings = allMeetings.filter(meeting => {
    if (filter === "confirmed") return meeting.confirmed;
    if (filter === "working") return !meeting.confirmed;
    return true;
  });
  const byDate = new Map();
  meetings.forEach(meeting => {
    const key = dateKey(meeting.date);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push(meeting);
  });

  $("proposedMetric").textContent = allMeetings.length;
  const confirmedCount = allMeetings.filter(meeting => meeting.confirmed).length;
  $("confirmedMetric").textContent = confirmedCount;
  $("reviewMetric").textContent = allMeetings.length - confirmedCount;

  const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long" });
  $("yearCalendar").innerHTML = Array.from({ length: 12 }, (_, month) => {
    const first = new Date(2027, month, 1);
    const daysInMonth = new Date(2027, month + 1, 0).getDate();
    const leading = first.getDay();
    const cells = [];
    for (let index = 0; index < leading; index += 1) cells.push('<div class="calendar-day empty" aria-hidden="true"></div>');
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(2027, month, day);
      const key = dateKey(date);
      const dayMeetings = byDate.get(key) || [];
      const holiday = holidayNames[key];
      const eventMarkup = dayMeetings.map(meeting => `
        <span class="calendar-event ${meeting.holiday ? "conflict" : meeting.confirmed ? "confirmed" : ""}" title="${meeting.title} — ${displayDate(meeting.date)}">
          ${meeting.title.replace("Full Board ", "")}
        </span>
      `).join("");
      cells.push(`
        <div class="calendar-day ${holiday ? "holiday" : ""}">
          <span class="day-number">${day}</span>
          ${holiday ? `<span class="holiday-name" title="${holiday}">${holiday}</span>` : ""}
          ${eventMarkup}
        </div>
      `);
    }
    while (cells.length % 7 !== 0) cells.push('<div class="calendar-day empty" aria-hidden="true"></div>');
    const monthMeetingCount = meetings.filter(meeting => meeting.date.getMonth() === month).length;
    return `
      <section class="month-card">
        <div class="month-heading"><strong>${monthFormatter.format(first)}</strong><span>${monthMeetingCount} meeting${monthMeetingCount === 1 ? "" : "s"}</span></div>
        <div class="weekday-row"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div>
        <div class="month-grid">${cells.join("")}</div>
      </section>
    `;
  }).join("");
}

function filteredRulebookEntries() {
  const query = $("ruleSearch").value.trim().toLowerCase();
  const layer = $("ruleLayerFilter").value;
  const status = $("ruleStatusFilter").value;
  return rulebookEntries.filter(rule => {
    const matchesQuery = !query || `${rule.title} ${rule.purpose} ${rule.attendees}`.toLowerCase().includes(query);
    const matchesLayer = layer === "all" || rule.layer === layer;
    const matchesStatus = status === "all" || rule.status === status;
    return matchesQuery && matchesLayer && matchesStatus;
  });
}

function renderRulebook() {
  const visibleRules = filteredRulebookEntries();
  if (!visibleRules.some(rule => rule.id === selectedRuleId)) selectedRuleId = visibleRules[0]?.id || "";
  $("ruleCount").textContent = visibleRules.length;
  $("ruleRows").innerHTML = visibleRules.length ? visibleRules.map(rule => `
    <button class="rule-row ${rule.id === selectedRuleId ? "active" : ""}" data-rule-id="${rule.id}">
      <span class="rule-row-name"><strong>${rule.title}</strong><small>${layerLabel(rule.layer)}</small></span>
      <span>${cadenceLabel(rule.cadence)}</span>
      <span class="rule-row-count">${rule.count}</span>
      <span class="mini-status ${statusClass(rule.status)}">${rule.status}</span>
    </button>
  `).join("") : '<div class="empty-rules">No rules match these filters.</div>';

  document.querySelectorAll("[data-rule-id]").forEach(button => {
    button.addEventListener("click", () => {
      selectedRuleId = button.dataset.ruleId;
      renderRulebook();
    });
  });

  const rule = rulebookEntries.find(item => item.id === selectedRuleId);
  if (!rule) {
    $("ruleDetailTitle").textContent = "No rule selected";
    $("ruleDetailStatus").hidden = true;
    return;
  }
  $("ruleDetailStatus").hidden = false;
  $("ruleDetailTitle").textContent = rule.title;
  $("ruleDetailStatus").textContent = rule.status;
  $("ruleDetailStatus").className = `status-badge ${statusClass(rule.status)}`;
  $("ruleDetailLayer").textContent = layerLabel(rule.layer);
  $("ruleDetailCadence").textContent = `${cadenceLabel(rule.cadence)} · ${rule.count} per year`;
  $("ruleDetailPattern").textContent = `${ordinal(rule.week)} ${weekdayLabel(rule.day)}`;
  $("ruleDetailTime").textContent = `${timeLabel(rule.time)} · ${durationLabel(rule.duration)}`;
  $("ruleDetailAttendees").textContent = rule.attendees;
  const question = rule.source?.["Needs validation"] || "No unresolved question is recorded.";
  $("ruleQuestion").className = `rule-question ${rule.status === "Confirmed" ? "confirmed" : ""}`;
  $("ruleQuestion").innerHTML = rule.status === "Confirmed"
    ? `<strong>Rule confirmed</strong><span>This rule is ready to generate 2027 meetings.</span>`
    : `<strong>${rule.status === "Open question" ? "Open question" : "Needs confirmation"}</strong><span>${question}</span>`;
}

function switchView(view, updateUrl = false) {
  activeView = view;
  document.querySelectorAll(".view-tab").forEach(tab => {
    const selected = tab.dataset.view === view;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", selected ? "true" : "false");
  });
  document.querySelectorAll(".view-screen").forEach(screen => {
    const selected = screen.id === `${view}View`;
    screen.classList.toggle("active", selected);
    screen.hidden = !selected;
  });
  if (updateUrl) window.history.pushState({ view }, "", view === "plan" ? "/plan" : `/${view}`);
  if (view === "calendar") renderCalendar();
  if (view === "rulebook") renderRulebook();
}

function showToast(message) {
  clearTimeout(toastTimer);
  $("toast").textContent = message;
  $("toast").classList.add("show");
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2600);
}

function renderGroupList() {
  $("groupList").innerHTML = groups.map(group => `
    <button class="group-item ${group.id === selectedId ? "active" : ""}" data-group-id="${group.id}">
      <span class="group-dot"></span>
      <span>
        <span class="group-name">${group.title}</span>
        <span class="group-summary">${group.count} planned · ${group.status}</span>
      </span>
      <span class="group-count">${group.count}</span>
    </button>
  `).join("");

  document.querySelectorAll("[data-group-id]").forEach(button => {
    button.addEventListener("click", () => {
      saveFormToSelected();
      selectedId = button.dataset.groupId;
      render();
    });
  });
}

function renderSelected() {
  const group = groups.find(item => item.id === selectedId);
  $("groupTitle").textContent = group.title;
  $("groupPurpose").textContent = group.purpose;
  $("groupStatus").textContent = group.status;
  $("groupStatus").className = `status-badge ${statusClass(group.status)}`;
  $("countInput").value = group.count;
  $("cadenceInput").value = group.cadence;
  $("weekInput").value = group.week;
  $("dayInput").value = group.day;
  $("timeInput").value = group.time;
  $("durationInput").value = group.duration;
  $("attendeesInput").value = group.attendees;
  $("statusInput").value = group.status;

  const meetings = buildMeetings(group);
  $("meetingCount").textContent = meetings.length;
  const holidayCount = meetings.filter(item => item.holiday).length;
  if (holidayCount) {
    $("insight").innerHTML = `<strong>Holiday conflict</strong><span>${holidayCount} proposed meeting${holidayCount > 1 ? "s fall" : " falls"} on a federal observance. Choose a different date before confirming.</span>`;
  } else if (group.status === "Confirmed") {
    $("insight").innerHTML = `<strong>Rule confirmed</strong><span>Every proposed meeting currently matches the approved rule.</span>`;
  } else {
    $("insight").innerHTML = `<strong>Decision needed</strong><span>${group.source["Needs validation"] || "Confirm the proposed cadence."}</span>`;
  }

  $("meetingRows").innerHTML = meetings.map((meeting, index) => `
    <div class="meeting-row" data-meeting-index="${index}">
      <span class="meeting-date">${displayDate(meeting.date)}</span>
      <span class="meeting-title" title="${group.title}">${group.title}</span>
      <span class="meeting-match ${meeting.holiday ? "override" : ""}">${meeting.holiday ? "Holiday conflict" : "Matches rule"}</span>
      <button class="row-menu" aria-label="More options for ${displayDate(meeting.date)}" title="Meeting actions">⋯</button>
    </div>
  `).join("");

  $("confirmationTitle").textContent = group.confirmed ? "This group is confirmed" : "Ready to confirm this group?";
  $("confirmationCopy").textContent = group.confirmed
    ? "Later planning layers will work around these dates. You can reopen the group if needed."
    : `The ${meetings.length} proposed meetings will become constraints for later planning layers.`;
  $("confirmButton").textContent = group.confirmed ? "Reopen group" : "Confirm group";
}

function saveFormToSelected() {
  const group = groups.find(item => item.id === selectedId);
  if (!group) return;
  group.count = Math.max(0, Math.min(12, Number($("countInput").value) || 0));
  group.cadence = $("cadenceInput").value;
  group.week = Number($("weekInput").value);
  group.day = Number($("dayInput").value);
  group.time = $("timeInput").value;
  group.duration = Number($("durationInput").value);
  group.attendees = $("attendeesInput").value.trim() || "Not specified";
  group.status = $("statusInput").value;
}

function renderProgress() {
  const confirmed = groups.filter(group => group.confirmed).length;
  const percentage = Math.round((confirmed / groups.length) * 100);
  $("progressValue").textContent = `${percentage}%`;
  $("progressBar").style.width = `${percentage}%`;
  const activeLayer = document.querySelector(".layer.active small");
  if (activeLayer) activeLayer.textContent = `${confirmed} of ${groups.length} groups confirmed`;
}

function render() {
  renderGroupList();
  renderSelected();
  renderProgress();
  if (activeView === "calendar") renderCalendar();
  if (activeView === "rulebook") renderRulebook();
}

$("regenerateButton").addEventListener("click", () => {
  saveFormToSelected();
  const group = groups.find(item => item.id === selectedId);
  group.confirmed = false;
  render();
  showToast("Rule applied. Proposed meeting dates were regenerated.");
});

$("saveDraftButton").addEventListener("click", () => {
  saveFormToSelected();
  render();
  showToast("Draft saved to the Meeting Rules list.");
});

$("confirmButton").addEventListener("click", () => {
  saveFormToSelected();
  const group = groups.find(item => item.id === selectedId);
  group.confirmed = !group.confirmed;
  if (group.confirmed) group.status = "Confirmed";
  render();
  showToast(group.confirmed ? `${group.title} confirmed.` : `${group.title} reopened for planning.`);
});

$("reviewButton").addEventListener("click", () => {
  const count = groups.reduce((sum, group) => sum + (group.confirmed ? group.count : 0), 0);
  showToast(`${count} confirmed meetings are ready for Outlook review. No events were uploaded.`);
});

$("addMeetingButton").addEventListener("click", () => showToast("A Power Apps form would open to add a one-time meeting."));

$("viewSourceButton").addEventListener("click", () => {
  const group = groups.find(item => item.id === selectedId);
  $("sourceTitle").textContent = group.title;
  $("sourceDetails").innerHTML = Object.entries(group.source).map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`).join("");
  $("sourceDialog").showModal();
});

$("closeSourceButton").addEventListener("click", () => $("sourceDialog").close());
$("doneSourceButton").addEventListener("click", () => $("sourceDialog").close());

document.querySelectorAll(".view-tab").forEach(tab => {
  tab.addEventListener("click", (event) => {
    event.preventDefault();
    switchView(tab.dataset.view, true);
  });
});

window.addEventListener("popstate", () => {
  const view = window.location.pathname.replace(/^\/+|\/+$/g, "");
  switchView(["calendar", "rulebook"].includes(view) ? view : "plan");
});

$("calendarFilter").addEventListener("change", renderCalendar);
$("ruleSearch").addEventListener("input", renderRulebook);
$("ruleLayerFilter").addEventListener("change", renderRulebook);
$("ruleStatusFilter").addEventListener("change", renderRulebook);

$("newRuleButton").addEventListener("click", () => showToast("A Power Apps form would open to create a new meeting rule in SharePoint."));
$("editSelectedRule").addEventListener("click", () => {
  const rule = rulebookEntries.find(item => item.id === selectedRuleId);
  showToast(`${rule?.title || "Rule"} would open in an editable Power Apps form.`);
});
$("useRuleInPlanner").addEventListener("click", () => {
  const rule = rulebookEntries.find(item => item.id === selectedRuleId);
  if (groups.some(group => group.id === selectedRuleId)) selectedId = selectedRuleId;
  switchView("plan");
  render();
  if (rule?.layer !== "board") showToast(`${rule.title} would open in the ${layerLabel(rule.layer)} planning layer.`);
});

document.querySelectorAll(".layer").forEach(layer => {
  layer.addEventListener("click", () => {
    document.querySelectorAll(".layer").forEach(item => item.classList.remove("active"));
    layer.classList.add("active");
    if (layer.dataset.layer !== "board") showToast("This preview implements the Board layer as the end-to-end example.");
  });
});

render();
const initialView = window.location.pathname.replace(/^\/+|\/+$/g, "");
switchView(["calendar", "rulebook"].includes(initialView) ? initialView : "plan");
