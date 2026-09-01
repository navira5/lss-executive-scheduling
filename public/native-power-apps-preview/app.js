const $ = (id) => document.getElementById(id);
const YEAR = 2027;
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

let toastTimer;
let calendarMonth = 2;
let selectedDay = 9;
let editingEventId = null;
let nextId = 1;
let outlookQueue = [];

let calendarEvents = [
  { id: "board-mar", title: "Full Board Meeting", date: "2027-03-09", time: "17:00", duration: "120", type: "Meeting", status: "Needs validation", source: "Planner" },
  { id: "board-jul", title: "Full Board Meeting", date: "2027-07-13", time: "17:00", duration: "120", type: "Meeting", status: "Needs validation", source: "Planner" },
  { id: "board-sep", title: "Full Board Meeting", date: "2027-09-14", time: "17:00", duration: "120", type: "Meeting", status: "Needs validation", source: "Planner" },
  { id: "board-nov", title: "Full Board Meeting", date: "2027-11-09", time: "17:00", duration: "120", type: "Meeting", status: "Needs validation", source: "Planner" },
  { id: "programs-mar", title: "Programs Committee", date: "2027-03-16", time: "17:00", duration: "90", type: "Meeting", status: "Confirmed", source: "Planner" },
  { id: "finance-mar", title: "Finance Committee", date: "2027-03-23", time: "17:00", duration: "90", type: "Meeting", status: "Confirmed", source: "Planner" },
  { id: "outlook-donor", title: "Rachel — donor call", date: "2027-03-09", time: "14:00", duration: "60", type: "One-time event", status: "Existing Outlook", source: "Outlook" },
  { id: "closure-good-friday", title: "Good Friday — LSS closed", date: "2027-03-26", time: "", duration: "all-day", type: "Closure", status: "Confirmed", source: "Planner" },
];

function showToast(message) {
  clearTimeout(toastTimer);
  $("toast").textContent = message;
  $("toast").classList.add("show");
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 3200);
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function dateParts(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return { year, month: month - 1, day };
}

function formatDate(dateString, style = "short") {
  const { year, month, day } = dateParts(dateString);
  return new Intl.DateTimeFormat("en-US", style === "long"
    ? { month: "long", day: "numeric", year: "numeric" }
    : { month: "short", day: "numeric" }).format(new Date(year, month, day));
}

function selectedDate() {
  return `${YEAR}-${String(calendarMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
}

function eventsOnDate(date) {
  return calendarEvents.filter((item) => item.date === date).sort((a, b) => (a.time || "00:00").localeCompare(b.time || "00:00"));
}

function queueOutlook(action, item) {
  if (item.source === "Outlook" && action === "Create") return;
  const index = outlookQueue.findIndex((change) => change.eventId === item.id);
  if (index >= 0 && outlookQueue[index].action === "Create") {
    if (action === "Delete") outlookQueue.splice(index, 1);
    else outlookQueue.splice(index, 1, { ...outlookQueue[index], title: item.title, date: item.date });
    return;
  }
  const change = { id: `change-${Date.now()}-${nextId++}`, eventId: item.id, action, title: item.title, date: item.date };
  if (index >= 0) outlookQueue.splice(index, 1, change);
  else outlookQueue.push(change);
}

function eventClass(item) {
  if (item.type === "Closure") return "closure-event";
  if (item.source === "Outlook") return "outlook-event";
  if (item.status === "Canceled") return "canceled-event";
  return item.status === "Confirmed" ? "confirmed-event" : "planner-event";
}

function sourceLabel(item) {
  if (item.type === "Closure") return "LSS closure";
  return item.source === "Outlook" ? "Existing Outlook" : "Planner proposal";
}

function renderMonth() {
  const first = new Date(YEAR, calendarMonth, 1);
  const dayCount = new Date(YEAR, calendarMonth + 1, 0).getDate();
  $("monthTitle").textContent = `${monthNames[calendarMonth]} ${YEAR}`;
  const cells = [];
  for (let index = 0; index < first.getDay(); index += 1) cells.push('<button class="native-day empty" disabled aria-hidden="true"></button>');
  for (let day = 1; day <= dayCount; day += 1) {
    const date = `${YEAR}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayEvents = eventsOnDate(date);
    const eventMarkup = dayEvents.slice(0, 2).map((item) => `<span class="native-event ${eventClass(item)}" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</span>`).join("");
    const overflow = dayEvents.length > 2 ? `<span class="event-overflow">+${dayEvents.length - 2} more</span>` : "";
    cells.push(`<button class="native-day ${day === selectedDay ? "selected" : ""} ${dayEvents.some((item) => item.type === "Closure") ? "has-closure" : ""}" data-day="${day}"><span>${day}</span>${eventMarkup}${overflow}</button>`);
  }
  $("nativeMonthGrid").innerHTML = cells.join("");
  document.querySelectorAll("[data-day]").forEach((button) => button.addEventListener("click", () => {
    selectedDay = Number(button.dataset.day);
    renderCalendar();
  }));
}

function renderAgenda() {
  const date = selectedDate();
  const items = eventsOnDate(date);
  $("agendaDate").textContent = formatDate(date, "long");
  $("agendaEvents").innerHTML = items.length ? items.map((item) => `
    <article>
      <span class="agenda-source ${item.type === "Closure" ? "closure-source" : item.source === "Outlook" ? "outlook-source" : "planner-source"}">${sourceLabel(item)}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <small>${item.duration === "all-day" ? "All day" : `${item.time || "Time not set"} · ${item.duration} minutes`} · ${escapeHtml(item.status)}</small>
      ${item.source === "Planner" ? `<button class="button secondary" data-edit-event-id="${item.id}">Edit / delete</button>` : '<small>Imported context is read-only until a reviewed Outlook action is approved.</small>'}
    </article>
  `).join("") : '<p class="empty-agenda">No events on this date.</p>';
  bindEditButtons();
}

function renderAnnualList() {
  const items = [...calendarEvents].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  $("annualListBody").innerHTML = items.map((item) => `
    <div class="native-annual-row">
      <strong>${formatDate(item.date)}</strong><span>${escapeHtml(item.title)}</span><span>${escapeHtml(item.type)}</span>
      <span>${escapeHtml(item.status)}</span><span>${sourceLabel(item)}</span>
      ${item.source === "Planner" ? `<button class="button secondary" data-edit-event-id="${item.id}">Edit / delete</button>` : '<span class="read-only">Read only</span>'}
    </div>`).join("");
  bindEditButtons();
}

function renderMeetingRows() {
  const meetings = calendarEvents.filter((item) => item.source === "Planner" && item.title === "Full Board Meeting").sort((a, b) => a.date.localeCompare(b.date));
  $("generatedCount").textContent = meetings.length;
  $("nativeMeetingRows").innerHTML = meetings.map((item) => `
    <div class="native-meeting-row"><strong>${formatDate(item.date)}</strong><span>${escapeHtml(item.title)}</span>
      <span class="mini-status ${item.status === "Confirmed" ? "confirmed" : "warning"}">${escapeHtml(item.status)}</span>
      <button data-edit-event-id="${item.id}">Edit / delete</button></div>`).join("");
  bindEditButtons();
}

function renderCalendar() {
  renderMonth();
  renderAgenda();
  renderAnnualList();
  renderMeetingRows();
}

function setCalendarMode(mode) {
  const monthMode = mode === "month";
  $("calendarModeMonth").classList.toggle("active", monthMode);
  $("calendarModeYear").classList.toggle("active", !monthMode);
  $("monthNavigation").hidden = !monthMode;
  $("nativeCalendarLayout").hidden = !monthMode;
  $("annualList").hidden = monthMode;
  $("addClosure").hidden = !monthMode;
  renderAnnualList();
}

function resetEventForm() {
  editingEventId = null;
  $("eventForm").reset();
  $("eventId").value = "";
  $("eventDate").value = selectedDate();
  $("eventTime").value = "09:00";
  $("eventDuration").value = "60";
  $("eventStatus").value = "Needs validation";
  $("deleteEvent").hidden = true;
  $("eventDialogTitle").textContent = "Add event";
}

function openNewEvent(date = selectedDate(), type = "Meeting") {
  resetEventForm();
  $("eventDate").value = date;
  $("eventType").value = type;
  if (type === "Closure") {
    $("eventTitle").value = "LSS closed";
    $("eventDuration").value = "all-day";
    $("eventStatus").value = "Confirmed";
  }
  $("eventDialog").showModal();
  $("eventTitle").focus();
}

function openEditEvent(id) {
  const item = calendarEvents.find((event) => event.id === id);
  if (!item || item.source !== "Planner") return;
  editingEventId = id;
  $("eventDialogTitle").textContent = item.type === "Closure" ? "Edit closure" : "Edit event";
  $("eventId").value = item.id;
  $("eventTitle").value = item.title;
  $("eventType").value = item.type;
  $("eventDate").value = item.date;
  $("eventTime").value = item.time;
  $("eventDuration").value = item.duration;
  $("eventStatus").value = item.status;
  $("eventScope").value = "Just this occurrence";
  $("deleteEvent").hidden = false;
  $("eventDialog").showModal();
}

function bindEditButtons() {
  document.querySelectorAll("[data-edit-event-id]").forEach((button) => { button.onclick = () => openEditEvent(button.dataset.editEventId); });
}

function saveEvent(formEvent) {
  formEvent.preventDefault();
  const values = { title: $("eventTitle").value.trim(), date: $("eventDate").value, time: $("eventTime").value, duration: $("eventDuration").value, type: $("eventType").value, status: $("eventStatus").value, source: "Planner" };
  if (!values.title || !values.date) return;
  const conflicts = eventsOnDate(values.date).filter((item) => item.id !== editingEventId);
  if (values.type !== "Closure" && conflicts.some((item) => item.type === "Closure")) {
    showToast("That date is closed. Choose another date before saving the meeting.");
    return;
  }
  if (values.type === "Closure" && conflicts.some((item) => item.type !== "Closure") && !window.confirm("Meetings already exist on this date. Add the closure and flag those meetings for review?")) return;
  const previous = editingEventId ? calendarEvents.find((item) => item.id === editingEventId) : null;
  if (previous) {
    Object.assign(previous, values);
    queueOutlook("Update", previous);
  } else {
    const item = { ...values, id: `manual-${Date.now()}-${nextId++}` };
    calendarEvents.push(item);
    queueOutlook("Create", item);
  }
  const { month, day } = dateParts(values.date);
  calendarMonth = month;
  selectedDay = day;
  $("eventDialog").close();
  renderCalendar();
  const ruleScope = $("eventScope").value === "Update the meeting rule";
  showToast(ruleScope
    ? "Occurrence updated. The related rule change is a draft until the meeting group is confirmed."
    : previous ? "Event updated in the plan. Outlook update queued for review." : "Event added to the plan. Outlook creation queued for review.");
}

function deleteEditingEvent() {
  const item = calendarEvents.find((event) => event.id === editingEventId);
  if (!item || !window.confirm(`Delete “${item.title}” from the plan?`)) return;
  calendarEvents = calendarEvents.filter((event) => event.id !== item.id);
  queueOutlook("Delete", item);
  $("eventDialog").close();
  renderCalendar();
  showToast("Event deleted from the plan. Outlook deletion queued for review.");
}

function applyRule() {
  const count = Math.max(1, Math.min(12, Number($("annualCount").value) || 4));
  calendarEvents.filter((item) => item.source === "Planner" && item.title === "Full Board Meeting").forEach((item) => queueOutlook("Delete", item));
  calendarEvents = calendarEvents.filter((item) => !(item.source === "Planner" && item.title === "Full Board Meeting"));
  const months = count === 4 ? [2, 6, 8, 10] : Array.from({ length: count }, (_, index) => Math.floor(index * 12 / count));
  months.forEach((month, index) => {
    const first = new Date(YEAR, month, 1);
    const day = 1 + ((2 - first.getDay() + 7) % 7) + 7;
    const item = { id: `board-rule-${Date.now()}-${index}`, title: "Full Board Meeting", date: `${YEAR}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`, time: "17:00", duration: "120", type: "Meeting", status: "Needs validation", source: "Planner" };
    calendarEvents.push(item);
    queueOutlook("Create", item);
  });
  renderCalendar();
  showToast("Rule applied. Individual proposed meetings were regenerated; Outlook remains unchanged.");
}

function openReview() {
  $("reviewCount").textContent = `${outlookQueue.length} change${outlookQueue.length === 1 ? "" : "s"} queued`;
  $("reviewChangesList").innerHTML = outlookQueue.length ? outlookQueue.map((change) => `<div><strong>${change.action}</strong><span>${escapeHtml(change.title)}</span><small>${formatDate(change.date)}</small></div>`).join("") : "<p>No calendar changes are waiting for review.</p>";
  $("uploadChanges").disabled = outlookQueue.length === 0;
  $("reviewDialog").showModal();
}

function switchView(view) {
  document.querySelectorAll(".view-tab").forEach((tab) => {
    const active = tab.dataset.view === view;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.querySelectorAll(".view-screen").forEach((screen) => {
    const active = screen.id === `${view}View`;
    screen.classList.toggle("active", active);
    screen.hidden = !active;
  });
  if (view === "calendar") renderCalendar();
}

document.querySelectorAll(".view-tab").forEach((tab) => tab.addEventListener("click", () => switchView(tab.dataset.view)));
document.querySelectorAll("[data-toast]").forEach((button) => button.addEventListener("click", () => showToast(button.dataset.toast)));
document.querySelectorAll(".layer").forEach((layer) => layer.addEventListener("click", () => {
  document.querySelectorAll(".layer").forEach((item) => item.classList.remove("active"));
  layer.classList.add("active");
  if (!layer.textContent.includes("Board & Governance")) showToast("This comparison preview demonstrates the Board layer end to end.");
}));

$("previousMonth").addEventListener("click", () => { calendarMonth = (calendarMonth + 11) % 12; selectedDay = 1; renderCalendar(); });
$("nextMonth").addEventListener("click", () => { calendarMonth = (calendarMonth + 1) % 12; selectedDay = 1; renderCalendar(); });
$("calendarModeMonth").addEventListener("click", () => setCalendarMode("month"));
$("calendarModeYear").addEventListener("click", () => setCalendarMode("year"));
$("addCalendarEvent").addEventListener("click", () => openNewEvent());
$("agendaAddEvent").addEventListener("click", () => openNewEvent());
$("addClosure").addEventListener("click", () => openNewEvent(selectedDate(), "Closure"));
$("eventForm").addEventListener("submit", saveEvent);
$("deleteEvent").addEventListener("click", deleteEditingEvent);
$("closeEventDialog").addEventListener("click", () => $("eventDialog").close());
$("cancelEvent").addEventListener("click", () => $("eventDialog").close());
$("applyRule").addEventListener("click", applyRule);
$("reviewOutlook").addEventListener("click", openReview);
$("closeReviewDialog").addEventListener("click", () => $("reviewDialog").close());
$("cancelReview").addEventListener("click", () => $("reviewDialog").close());
$("uploadChanges").addEventListener("click", () => {
  const count = outlookQueue.length;
  outlookQueue = [];
  $("reviewDialog").close();
  showToast(`${count} reviewed change${count === 1 ? "" : "s"} would now be sent through the Outlook connector.`);
});

renderCalendar();
bindEditButtons();
