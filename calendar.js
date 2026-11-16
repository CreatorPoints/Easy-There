const monthYearEl = document.getElementById("calendar-month-year");
const calendarDaysEl = document.getElementById("calendar-days");
const prevBtn = document.getElementById("calendar-prev");
const nextBtn = document.getElementById("calendar-next");
const dateHeadingEl = document.getElementById("selected-date-heading");
const previewBadgeEl = document.getElementById("timeline-mode-badge");
const allDayEventsEl = document.getElementById("all-day-events");
const timelineScrollEl = document.getElementById("day-timeline-scroll");
const timelineGridEl = document.getElementById("day-timeline-grid");

const eventForm = document.getElementById("calendar-event-form");
const eventInput = document.getElementById("calendar-event-input");
const eventStartInput = document.getElementById("calendar-event-start");
const eventEndInput = document.getElementById("calendar-event-end");

const STORAGE_KEY = "easy_there_calendar_events";
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
    if (window.EasyThereFirebase && window.EasyThereFirebase.getGoogleCalendarEvents) {
        return window.EasyThereFirebase.getGoogleCalendarEvents();
    }
    if (localStorage.getItem("easy_there_gcal_connected") !== "true") {
        return {};
    }
    try {
        const raw = localStorage.getItem("easy_there_gcal_events");
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function saveEvents(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
    if (window.EasyThereFirebase) {
        window.EasyThereFirebase.syncEventsToCloud(events);
    }
}

function getDateKey(year, month, day) {
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
}

function parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== "string" || timeStr.toLowerCase().includes("all day")) {
        return null;
    }
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return null;

    let h1 = parseInt(match[1], 10);
    const m1 = parseInt(match[2], 10);
    let p1 = match[3] ? match[3].toUpperCase() : null;

    let h2 = parseInt(match[4], 10);
    const m2 = parseInt(match[5], 10);
    let p2 = match[6] ? match[6].toUpperCase() : null;

    if (!p1 && p2) {
        if (h1 < 12 && p2 === "PM" && h1 > h2) {
            p1 = "AM";
        } else {
            p1 = p2;
        }
    }

    if (p1 === "PM" && h1 < 12) h1 += 12;
    if (p1 === "AM" && h1 === 12) h1 = 0;

    if (p2 === "PM" && h2 < 12) h2 += 12;
    if (p2 === "AM" && h2 === 12) h2 = 0;

    const start = h1 * 60 + m1;
    let end = h2 * 60 + m2;
    if (end <= start) end = Math.min(1440, start + 60);

    return { start: start, end: end };
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

        dayCell.addEventListener("mouseenter", function() {
            const isSelected = (
                day === selectedDay &&
                displayedMonth === selectedMonth &&
                displayedYear === selectedYear
            );
            if (!isSelected && previewBadgeEl) {
                previewBadgeEl.classList.remove("hidden");
            }
            renderDayTimeline(displayedYear, displayedMonth, day, !isSelected);
        });

        dayCell.addEventListener("mouseleave", function() {
            if (previewBadgeEl) previewBadgeEl.classList.add("hidden");
            renderDayTimeline(selectedYear, selectedMonth, selectedDay, false);
        });

        dayCell.addEventListener("click", function() {
            if (previewBadgeEl) previewBadgeEl.classList.add("hidden");
            selectedYear = displayedYear;
            selectedMonth = displayedMonth;
            selectedDay = day;

            document.querySelectorAll(".calendar-day").forEach(function(c) {
                c.classList.remove("selected");
            });
            dayCell.classList.add("selected");

            renderDayTimeline(selectedYear, selectedMonth, selectedDay, false);
        });

        calendarDaysEl.appendChild(dayCell);
    }
}

if (calendarDaysEl) {
    calendarDaysEl.addEventListener("mouseleave", function() {
        if (previewBadgeEl) previewBadgeEl.classList.add("hidden");
        renderDayTimeline(selectedYear, selectedMonth, selectedDay, false);
    });
}

function renderDayTimeline(year, month, day, isPreview) {
    const dateKey = getDateKey(year, month, day);
    const dateObj = new Date(year, month, day);
    const dateString = dateObj.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
    });
    dateHeadingEl.textContent = `Schedule for ${dateString}`;

    if (allDayEventsEl) allDayEventsEl.innerHTML = "";
    if (!timelineGridEl) return;
    timelineGridEl.innerHTML = "";

    const hourHeight = 44;

    for (let h = 0; h < 24; h++) {
        const hourRow = document.createElement("div");
        hourRow.className = "timeline-hour-row";
        hourRow.style.top = `${h * hourHeight}px`;

        const label = document.createElement("span");
        label.className = "timeline-hour-label";
        const displayH = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
        label.textContent = displayH;

        const line = document.createElement("div");
        line.className = "timeline-hour-line";

        hourRow.appendChild(label);
        hourRow.appendChild(line);
        timelineGridEl.appendChild(hourRow);
    }

    const manualList = events[dateKey] || [];
    const gcalList = gcalEvents[dateKey] || [];

    const allEvents = [];

    gcalList.forEach(function(g) {
        allEvents.push({
            title: g.title,
            time: g.time,
            startMinutes: g.startMinutes,
            endMinutes: g.endMinutes,
            busy: g.busy,
            source: "google",
            raw: g
        });
    });

    manualList.forEach(function(m, idx) {
        if (typeof m === "string") {
            const parsed = parseTimeToMinutes(m);
            allEvents.push({
                title: m,
                time: parsed ? "" : "All Day",
                startMinutes: parsed ? parsed.start : null,
                endMinutes: parsed ? parsed.end : null,
                source: "manual",
                index: idx,
                raw: m
            });
        } else {
            allEvents.push({
                title: m.title || m.text,
                time: m.time || "All Day",
                startMinutes: m.startMinutes !== undefined ? m.startMinutes : null,
                endMinutes: m.endMinutes !== undefined ? m.endMinutes : null,
                source: "manual",
                index: idx,
                raw: m
            });
        }
    });

    const timedEvents = [];
    let earliestMinute = 480;
    let hasTimedEvent = false;

    allEvents.forEach(function(ev) {
        let startM = ev.startMinutes;
        let endM = ev.endMinutes;

        if (startM === null || startM === undefined) {
            const parsed = parseTimeToMinutes(ev.time);
            if (parsed) {
                startM = parsed.start;
                endM = parsed.end;
            }
        }

        if (startM === null || startM === undefined) {
            if (allDayEventsEl) {
                const allDayItem = document.createElement("div");
                allDayItem.className = `all-day-event-item ${ev.source === 'google' ? 'gcal' : 'manual'}`;
                allDayItem.textContent = ev.title;
                allDayEventsEl.appendChild(allDayItem);
            }
            return;
        }

        if (!hasTimedEvent || startM < earliestMinute) {
            earliestMinute = startM;
            hasTimedEvent = true;
        }

        timedEvents.push({
            title: ev.title,
            time: ev.time,
            startMinutes: startM,
            endMinutes: endM,
            busy: ev.busy,
            source: ev.source,
            index: ev.index
        });
    });

    timedEvents.sort(function(a, b) {
        if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
        return (b.endMinutes - b.startMinutes) - (a.endMinutes - a.startMinutes);
    });

    const columns = [];
    timedEvents.forEach(function(ev) {
        let placed = false;
        for (let c = 0; c < columns.length; c++) {
            const lastInCol = columns[c][columns[c].length - 1];
            if (lastInCol.endMinutes <= ev.startMinutes) {
                columns[c].push(ev);
                ev.col = c;
                placed = true;
                break;
            }
        }
        if (!placed) {
            ev.col = columns.length;
            columns.push([ev]);
        }
    });

    timedEvents.forEach(function(ev) {
        let maxColsInCluster = 1;
        timedEvents.forEach(function(other) {
            if (other.startMinutes < ev.endMinutes && ev.startMinutes < other.endMinutes) {
                if (other.col + 1 > maxColsInCluster) {
                    maxColsInCluster = other.col + 1;
                }
            }
        });
        ev.totalCols = maxColsInCluster;
    });

    timedEvents.forEach(function(ev) {
        const duration = Math.max(25, (ev.endMinutes - ev.startMinutes));
        const topPx = (ev.startMinutes / 60) * hourHeight;
        const heightPx = Math.max(26, (duration / 60) * hourHeight);

        const block = document.createElement("div");
        block.className = `timeline-event-extent ${ev.source === 'google' ? 'gcal' : 'manual'}`;
        block.style.top = `${topPx}px`;
        block.style.height = `${heightPx}px`;

        if (ev.totalCols > 1) {
            const colWidth = 100 / ev.totalCols;
            const leftOffset = ev.col * colWidth;
            block.style.left = `calc(64px + (100% - 78px) * ${leftOffset / 100})`;
            block.style.width = `calc((100% - 78px) * ${colWidth / 100} - 4px)`;
            block.style.right = "auto";
        } else {
            block.style.left = "64px";
            block.style.right = "14px";
            block.style.width = "auto";
        }

        const info = document.createElement("div");
        info.className = "event-extent-info";

        const titleEl = document.createElement("span");
        titleEl.className = "event-extent-title";
        titleEl.textContent = ev.title;

        const timeEl = document.createElement("span");
        timeEl.className = "event-extent-time";
        timeEl.textContent = ev.time;

        info.appendChild(titleEl);
        info.appendChild(timeEl);
        block.appendChild(info);

        const badges = document.createElement("div");
        badges.className = "event-extent-badges";

        if (ev.source === "google") {
            const gBadge = document.createElement("span");
            gBadge.className = "gcal-badge";
            gBadge.textContent = "Google";
            badges.appendChild(gBadge);

            if (ev.busy) {
                const bBadge = document.createElement("span");
                bBadge.className = "busy-badge";
                bBadge.textContent = "Busy";
                badges.appendChild(bBadge);
            }
        } else if (!isPreview) {
            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "todo-delete-btn";
            delBtn.setAttribute("aria-label", "Delete event");
            delBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
            delBtn.addEventListener("click", function(e) {
                e.stopPropagation();
                events[dateKey].splice(ev.index, 1);
                if (events[dateKey].length === 0) {
                    delete events[dateKey];
                }
                saveEvents(events);
                renderCalendar();
                renderDayTimeline(year, month, day, false);
            });
            badges.appendChild(delBtn);
        }

        block.appendChild(badges);
        timelineGridEl.appendChild(block);
    });

    if (timelineScrollEl && !isPreview) {
        const scrollTarget = Math.max(0, ((earliestMinute - 30) / 60) * hourHeight);
        timelineScrollEl.scrollTop = scrollTarget;
    }
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

        const startTime = eventStartInput ? eventStartInput.value : "09:00";
        const endTime = eventEndInput ? eventEndInput.value : "10:00";

        const startParts = startTime.split(":");
        const endParts = endTime.split(":");
        const startM = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);
        let endM = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1], 10);
        if (endM <= startM) {
            endM = Math.min(1440, startM + 60);
        }

        function formatHour(h, m) {
            const suffix = h >= 12 ? "PM" : "AM";
            const h12 = h % 12 === 0 ? 12 : h % 12;
            const minStr = String(m).padStart(2, "0");
            return `${h12}:${minStr} ${suffix}`;
        }

        const endH = Math.floor(endM / 60);
        const endMin = endM % 60;
        const formattedRange = `${formatHour(parseInt(startParts[0], 10), parseInt(startParts[1], 10))} - ${formatHour(endH, endMin)}`;

        const dateKey = getDateKey(selectedYear, selectedMonth, selectedDay);
        if (!events[dateKey]) {
            events[dateKey] = [];
        }

        events[dateKey].push({
            title: text,
            time: formattedRange,
            startMinutes: startM,
            endMinutes: endM,
            source: "manual"
        });

        saveEvents(events);
        eventInput.value = "";
        renderCalendar();
        renderDayTimeline(selectedYear, selectedMonth, selectedDay, false);
    });
}

if (window.EasyThereFirebase) {
    window.EasyThereFirebase.onUserChanged(async function(user) {
        if (user) {
            const cloudEvents = await window.EasyThereFirebase.fetchEventsFromCloud();
            if (cloudEvents && typeof cloudEvents === "object") {
                events = cloudEvents;
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
                } catch (e) {}
                renderCalendar();
                renderDayTimeline(selectedYear, selectedMonth, selectedDay, false);
            } else {
                window.EasyThereFirebase.syncEventsToCloud(events);
            }
        }
    });
}

window.EasyThereCalendar = {
    reload: function() {
        events = loadEvents();
        gcalEvents = loadGcalEvents();
        renderCalendar();
        renderDayTimeline(selectedYear, selectedMonth, selectedDay, false);
    }
};

renderCalendar();
renderDayTimeline(selectedYear, selectedMonth, selectedDay, false);
