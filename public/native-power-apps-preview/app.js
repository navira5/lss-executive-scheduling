const $ = (id) => document.getElementById(id);
let toastTimer;
let calendarMonth = 2;
let selectedDay = 9;

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const events = {
  2: { 9: ["Full Board Meeting", "Rachel — donor call"], 16: ["Programs Committee"], 23: ["Finance Committee"] },
  3: { 13: ["Executive Team"], 27: ["Leadership Team"] },
  4: { 11: ["Board Retreat"], 25: ["Finance Committee"] },
};

function showToast(message) {
  clearTimeout(toastTimer);
  $("toast").textContent = message;
  $("toast").classList.add("show");
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2800);
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
}

function renderMonth() {
  const first = new Date(2027, calendarMonth, 1);
  const dayCount = new Date(2027, calendarMonth + 1, 0).getDate();
  $("monthTitle").textContent = `${monthNames[calendarMonth]} 2027`;
  const cells = [];
  for (let i = 0; i < first.getDay(); i += 1) cells.push('<button class="native-day empty" disabled></button>');
  for (let day = 1; day <= dayCount; day += 1) {
    const dayEvents = events[calendarMonth]?.[day] || [];
    const eventMarkup = dayEvents.slice(0, 2).map((title, index) => `<span class="native-event ${index ? "outlook-event" : "planner-event"}" title="${title}">${title}</span>`).join("");
    cells.push(`<button class="native-day ${day === selectedDay ? "selected" : ""}" data-day="${day}"><span>${day}</span>${eventMarkup}</button>`);
  }
  $("nativeMonthGrid").innerHTML = cells.join("");
  document.querySelectorAll("[data-day]").forEach((button) => button.addEventListener("click", () => {
    selectedDay = Number(button.dataset.day);
    $("agendaDate").textContent = `${monthNames[calendarMonth]} ${selectedDay}, 2027`;
    renderMonth();
  }));
}

function openDateDialog(date) {
  $("newDate").value = date;
  $("dateDialog").showModal();
}

document.querySelectorAll(".view-tab").forEach((tab) => tab.addEventListener("click", () => switchView(tab.dataset.view)));
document.querySelectorAll("[data-toast]").forEach((button) => button.addEventListener("click", () => showToast(button.dataset.toast)));
document.querySelectorAll("[data-change-date]").forEach((button) => button.addEventListener("click", () => openDateDialog(button.dataset.changeDate)));
document.querySelectorAll(".layer").forEach((layer) => layer.addEventListener("click", () => {
  document.querySelectorAll(".layer").forEach((item) => item.classList.remove("active"));
  layer.classList.add("active");
  if (!layer.textContent.includes("Board & Governance")) showToast("This comparison preview demonstrates the Board layer end to end.");
}));

$("previousMonth").addEventListener("click", () => { calendarMonth = Math.max(0, calendarMonth - 1); selectedDay = 1; renderMonth(); });
$("nextMonth").addEventListener("click", () => { calendarMonth = Math.min(11, calendarMonth + 1); selectedDay = 1; renderMonth(); });
$("closeDialog").addEventListener("click", () => $("dateDialog").close());
$("saveDate").addEventListener("click", () => showToast("Date saved as a one-time exception. Calendar refreshed; Outlook remains unchanged."));
$("applyRule").addEventListener("click", () => {
  $("generatedCount").textContent = Math.max(1, Math.min(12, Number($("annualCount").value) || 4));
  showToast("Rule applied. Proposed meeting records and the calendar were refreshed.");
});

renderMonth();
