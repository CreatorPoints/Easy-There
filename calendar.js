const monthYearEl = document.getElementById("calendar-month-year");
const calendarDaysEl = document.getElementById("calendar-days");
const prevBtn = document.getElementById("calendar-prev");
const nextBtn = document.getElementById("calendar-next");
const dateHeadingEl = document.getElementById("selected-date-heading");
const eventForm = document.getElementById("calendar-event-form");
const eventInput = document.getElementById("calendar-event-input");
const eventsListEl = document.getElementById("calendar-events-list");

const STORAGE_KEY = "easy_there_calendar_events";
const GCAL_STORAGE_KEY = "easy_there_gcal_events";
const GCAL_CONNECTED_KEY = "easy_there_gcal_connected";

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const today = new Date();
let displayedYear = today.getFullYear();
let displayedMonth = today.getMonth();
let selectedYear = displayedYear;
let selectedMonth = displayedMonth;
let selectedDay = today.getDate();

let events = loadEvents();
let gcalEvents = loadGcalEvents();

function loadEvents() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function loadGcalEvents() {
    if (localStorage.getItem(GCAL_CONNECTED_KEY) !== "true") {
        return {};
    }
    try {
        const raw = localStorage.getItem(GCAL_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function saveEvents(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
}

function getDateKey(year, month, day) {
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
}

function renderCalendar() {
    gcalEvents = loadGcalEvents();
    monthYearEl.textContent = `${monthNames[displayedMonth]} ${displayedYear}`;
    calendarDaysEl.innerHTML = "";

    const firstDayIndex = new Date(displayedYear, displayedMonth, 1).getDay();
    const totalDays = new Date(displayedYear, displayedMonth + 1, 0).getDate();

    for (let i = 0; i < firstDayIndex; i++) {
        const emptyCell = document.createElement("div");
        emptyCell.className = "calendar-day empty";
        calendarDaysEl.appendChild(emptyCell);
    }

    for (let day = 1; day <= totalDays; day++) {
        const dayCell = document.createElement("div");
        dayCell.className = "calendar-day";
        dayCell.textContent = day;

        const dateKey = getDateKey(displayedYear, displayedMonth, day);
        const hasManual = events[dateKey] && events[dateKey].length > 0;
        const hasGcal = gcalEvents[dateKey] && gcalEvents[dateKey].length > 0;

        if (hasManual || hasGcal) {
            dayCell.classList.add("has-events");
        }

        const isToday = (
            day === today.getDate() &&
            displayedMonth === today.getMonth() &&
            displayedYear === today.getFullYear()
        );
        if (isToday) {
            dayCell.classList.add("today");
        }

        const isSelected = (
            day === selectedDay &&
            displayedMonth === selectedMonth &&
            displayedYear === selectedYear
        );
        if (isSelected) {
            dayCell.classList.add("selected");
        }

        dayCell.addEventListener("click", function() {
            selectedYear = displayedYear;
            selectedMonth = displayedMonth;
            selectedDay = day;
            renderCalendar();
            renderEvents();
        });

        calendarDaysEl.appendChild(dayCell);
    }
}

function renderEvents() {
    const dateKey = getDateKey(selectedYear, selectedMonth, selectedDay);
    const dateObj = new Date(selectedYear, selectedMonth, selectedDay);
    const dateString = dateObj.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
    });
    dateHeadingEl.textContent = `Events for ${dateString}`;

    eventsListEl.innerHTML = "";
    const manualList = events[dateKey] || [];
    const gcalList = gcalEvents[dateKey] || [];

    if (manualList.length === 0 && gcalList.length === 0) {
        const emptyMsg = document.createElement("p");
        emptyMsg.className = "empty-events-notice";
        emptyMsg.textContent = "No events scheduled for this date.";
        eventsListEl.appendChild(emptyMsg);
        return;
    }

    gcalList.forEach(function(item) {
        const row = document.createElement("div");
        row.className = "calendar-event-item gcal";

        const info = document.createElement("div");
        info.className = "event-info";

        const title = document.createElement("div");
        title.className = "event-title";
        title.textContent = item.title;

        const time = document.createElement("div");
        time.className = "event-time";
        time.textContent = item.time;

        info.appendChild(title);
        info.appendChild(time);

        const badges = document.createElement("div");
        badges.className = "event-badges";

        const gcalBadge = document.createElement("span");
        gcalBadge.className = "gcal-badge";
        gcalBadge.textContent = "Google";
        badges.appendChild(gcalBadge);

        if (item.busy) {
            const busyBadge = document.createElement("span");
            busyBadge.className = "busy-badge";
            busyBadge.textContent = "Busy";
            badges.appendChild(busyBadge);
        }

        row.appendChild(info);
        row.appendChild(badges);
        eventsListEl.appendChild(row);
    });

    manualList.forEach(function(evt) {
        const row = document.createElement("div");
        row.className = "calendar-event-item";
        row.textContent = evt;
        eventsListEl.appendChild(row);
    });
}

if (prevBtn) {
    prevBtn.addEventListener("click", function() {
        displayedMonth--;
        if (displayedMonth < 0) {
            displayedMonth = 11;
            displayedYear--;
        }
        renderCalendar();
    });
}

if (nextBtn) {
    nextBtn.addEventListener("click", function() {
        displayedMonth++;
        if (displayedMonth > 11) {
            displayedMonth = 0;
            displayedYear++;
        }
        renderCalendar();
    });
}

if (eventForm) {
    eventForm.addEventListener("submit", function(event) {
        event.preventDefault();
        const text = eventInput.value.trim();
        if (!text) return;

        const dateKey = getDateKey(selectedYear, selectedMonth, selectedDay);
        if (!events[dateKey]) {
            events[dateKey] = [];
        }
        events[dateKey].push(text);
        saveEvents(events);
        eventInput.value = "";
        renderCalendar();
        renderEvents();
    });
}

renderCalendar();
renderEvents();
