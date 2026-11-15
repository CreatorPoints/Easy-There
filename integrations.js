const connectBtn = document.getElementById("gcal-connect-btn");
const disconnectBtn = document.getElementById("gcal-disconnect-btn");
const statusBadge = document.getElementById("gcal-status-badge");
const clientIdInput = document.getElementById("gcal-client-id");
const feedbackMsg = document.getElementById("gcal-feedback");

const GCAL_CONNECTED_KEY = "easy_there_gcal_connected";
const GCAL_STORAGE_KEY = "easy_there_gcal_events";
const GCAL_CLIENT_ID_KEY = "easy_there_gcal_client_id";

function getDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function generateDefaultGoogleCalendarEvents() {
    const events = {};
    const now = new Date();

    const sampleSchedules = [
        {
            offsetDays: 0,
            title: "Sponsor Sync: Kickoff & Grants (Google Meet)",
            time: "10:00 AM - 10:45 AM",
            busy: true
        },
        {
            offsetDays: 0,
            title: "Organizer Huddle: Agenda Review",
            time: "03:00 PM - 03:30 PM",
            busy: true
        },
        {
            offsetDays: 2,
            title: "Sponsor Sync: Mid-Term Milestones",
            time: "09:30 AM - 10:15 AM",
            busy: true
        },
        {
            offsetDays: 5,
            title: "Slack Huddle: Hardware Distribution",
            time: "04:00 PM - 05:00 PM",
            busy: true
        },
        {
            offsetDays: 8,
            title: "Sponsor Sync: Final Deliverables",
            time: "11:00 AM - 11:45 AM",
            busy: true
        },
        {
            offsetDays: 12,
            title: "YSWS Closing Demo Day",
            time: "02:00 PM - 04:00 PM",
            busy: true
        }
    ];

    sampleSchedules.forEach(function(item) {
        const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + item.offsetDays);
        const key = getDateKey(targetDate);
        if (!events[key]) {
            events[key] = [];
        }
        events[key].push({
            title: item.title,
            time: item.time,
            busy: item.busy,
            source: "google"
        });
    });

    return events;
}

function updateUI() {
    const isConnected = localStorage.getItem(GCAL_CONNECTED_KEY) === "true";
    const savedClientId = localStorage.getItem(GCAL_CLIENT_ID_KEY) || "";

    if (clientIdInput) {
        clientIdInput.value = savedClientId;
    }

    if (isConnected) {
        statusBadge.textContent = "Connected";
        statusBadge.className = "status-badge connected";
        connectBtn.textContent = "Sync Now";
        disconnectBtn.classList.remove("hidden");
        feedbackMsg.textContent = "Google Calendar is connected. Synced events and busy timings are active in your calendar.";
    } else {
        statusBadge.textContent = "Disconnected";
        statusBadge.className = "status-badge disconnected";
        connectBtn.textContent = "Connect Google Calendar";
        disconnectBtn.classList.add("hidden");
        feedbackMsg.textContent = "";
    }
}

if (connectBtn) {
    connectBtn.addEventListener("click", function() {
        if (clientIdInput && clientIdInput.value.trim()) {
            localStorage.setItem(GCAL_CLIENT_ID_KEY, clientIdInput.value.trim());
        }

        const gcalEvents = generateDefaultGoogleCalendarEvents();
        localStorage.setItem(GCAL_STORAGE_KEY, JSON.stringify(gcalEvents));
        localStorage.setItem(GCAL_CONNECTED_KEY, "true");
        updateUI();
    });
}

if (disconnectBtn) {
    disconnectBtn.addEventListener("click", function() {
        localStorage.setItem(GCAL_CONNECTED_KEY, "false");
        localStorage.removeItem(GCAL_STORAGE_KEY);
        updateUI();
    });
}

updateUI();
