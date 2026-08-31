const holidays = new Set([
  "2027-01-01", "2027-01-18", "2027-02-15", "2027-05-31", "2027-06-18",
  "2027-07-05", "2027-09-06", "2027-10-11", "2027-11-11", "2027-11-25", "2027-12-24"
]);

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

let selectedId = "full-board";
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
  tab.addEventListener("click", () => {
    document.querySelectorAll(".view-tab").forEach(item => {
      item.classList.toggle("active", item === tab);
      item.setAttribute("aria-selected", item === tab ? "true" : "false");
    });
    if (tab.textContent.trim() !== "Plan meetings") showToast(`${tab.textContent.trim()} is represented as a separate Power Apps screen in the full build.`);
  });
});

document.querySelectorAll(".layer").forEach(layer => {
  layer.addEventListener("click", () => {
    document.querySelectorAll(".layer").forEach(item => item.classList.remove("active"));
    layer.classList.add("active");
    if (layer.dataset.layer !== "board") showToast("This preview implements the Board layer as the end-to-end example.");
  });
});

render();
