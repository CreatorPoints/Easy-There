const connectBtn = document.getElementById("gcal-connect-btn");
const disconnectBtn = document.getElementById("gcal-disconnect-btn");
const statusBadge = document.getElementById("gcal-status-badge");
const calendarIdInput = document.getElementById("gcal-calendar-id");
const apiKeyInput = document.getElementById("gcal-api-key");
const feedbackMsg = document.getElementById("gcal-feedback");

const fbLoginBtn = document.getElementById("firebase-login-btn");
const fbLogoutBtn = document.getElementById("firebase-logout-btn");
const fbStatusBadge = document.getElementById("firebase-status-badge");
const fbFeedback = document.getElementById("firebase-feedback");

const GCAL_CONNECTED_KEY = "easy_there_gcal_connected";
const GCAL_STORAGE_KEY = "easy_there_gcal_events";
const GCAL_CALENDAR_ID_KEY = "easy_there_gcal_calendar_id";
const GCAL_API_KEY_KEY = "easy_there_gcal_api_key";

function parseGoogleEvents(items) {
    const events = {};
    if (!Array.isArray(items)) return events;

    items.forEach(function(item) {
        const start = item.start?.dateTime || item.start?.date;
        if (!start) return;

        const dateKey = start.substring(0, 10);
        if (!events[dateKey]) {
            events[dateKey] = [];
        }

        let timeStr = "All Day";
        if (item.start?.dateTime && item.end?.dateTime) {
            const startDate = new Date(item.start.dateTime);
            const endDate = new Date(item.end.dateTime);
            timeStr = `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }

        events[dateKey].push({
            title: item.summary || "Busy",
            time: timeStr,
            busy: item.transparency !== "transparent",
            source: "google"
        });
    });

    return events;
}

async function fetchGoogleCalendar(calendarId, apiKey) {
    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const timeMax = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${encodeURIComponent(apiKey)}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Connection failed with status ${response.status}`);
    }
    const data = await response.json();
    return parseGoogleEvents(data.items);
}

function updateUI() {
    const isConnected = localStorage.getItem(GCAL_CONNECTED_KEY) === "true";
    const savedCalId = localStorage.getItem(GCAL_CALENDAR_ID_KEY) || "";
    const savedApiKey = localStorage.getItem(GCAL_API_KEY_KEY) || "";

    if (calendarIdInput) calendarIdInput.value = savedCalId;
    if (apiKeyInput) apiKeyInput.value = savedApiKey;

    if (isConnected) {
        statusBadge.textContent = "Connected";
        statusBadge.className = "status-badge connected";
        connectBtn.textContent = "Sync Now";
        disconnectBtn.classList.remove("hidden");
        feedbackMsg.textContent = "Google Calendar is connected and synchronized.";
    } else {
        statusBadge.textContent = "Disconnected";
        statusBadge.className = "status-badge disconnected";
        connectBtn.textContent = "Connect Google Calendar";
        disconnectBtn.classList.add("hidden");
        feedbackMsg.textContent = "";
    }
}

function updateFirebaseUI(user) {
    if (!fbStatusBadge) return;
    if (user) {
        fbStatusBadge.textContent = "Signed In";
        fbStatusBadge.className = "status-badge connected";
        if (fbLoginBtn) fbLoginBtn.classList.add("hidden");
        if (fbLogoutBtn) fbLogoutBtn.classList.remove("hidden");
        if (fbFeedback) {
            fbFeedback.textContent = `Connected as ${user.displayName || user.email}`;
            fbFeedback.style.color = "#4ade80";
        }
    } else {
        fbStatusBadge.textContent = "Signed Out";
        fbStatusBadge.className = "status-badge disconnected";
        if (fbLoginBtn) fbLoginBtn.classList.remove("hidden");
        if (fbLogoutBtn) fbLogoutBtn.classList.add("hidden");
        if (fbFeedback) {
            fbFeedback.textContent = "";
        }
    }
}

function clearLegacyMockData() {
    const raw = localStorage.getItem(GCAL_STORAGE_KEY);
    if (raw && raw.includes("Sponsor Sync: Kickoff")) {
        localStorage.removeItem(GCAL_STORAGE_KEY);
        localStorage.setItem(GCAL_CONNECTED_KEY, "false");
    }
}

if (connectBtn) {
    connectBtn.addEventListener("click", async function() {
        const calId = calendarIdInput ? calendarIdInput.value.trim() : "";
        const apiKey = apiKeyInput ? apiKeyInput.value.trim() : "";

        if (!calId || !apiKey) {
            feedbackMsg.textContent = "Please enter both a Calendar ID and an API Key.";
            feedbackMsg.style.color = "#f87171";
            return;
        }

        feedbackMsg.textContent = "Connecting to Google Calendar...";
        feedbackMsg.style.color = "#888888";

        try {
            const events = await fetchGoogleCalendar(calId, apiKey);
            localStorage.setItem(GCAL_CALENDAR_ID_KEY, calId);
            localStorage.setItem(GCAL_API_KEY_KEY, apiKey);
            localStorage.setItem(GCAL_STORAGE_KEY, JSON.stringify(events));
            localStorage.setItem(GCAL_CONNECTED_KEY, "true");
            feedbackMsg.style.color = "#4ade80";
            updateUI();
        } catch (err) {
            feedbackMsg.textContent = err.message;
            feedbackMsg.style.color = "#f87171";
        }
    });
}

if (disconnectBtn) {
    disconnectBtn.addEventListener("click", function() {
        localStorage.setItem(GCAL_CONNECTED_KEY, "false");
        localStorage.removeItem(GCAL_STORAGE_KEY);
        updateUI();
    });
}

if (fbLoginBtn) {
    fbLoginBtn.addEventListener("click", function() {
        if (window.EasyThereFirebase) {
            window.EasyThereFirebase.loginWithGoogle().catch(function(err) {
                if (fbFeedback) {
                    fbFeedback.textContent = err.message;
                    fbFeedback.style.color = "#f87171";
                }
            });
        }
    });
}

if (fbLogoutBtn) {
    fbLogoutBtn.addEventListener("click", function() {
        if (window.EasyThereFirebase) {
            window.EasyThereFirebase.logout();
        }
    });
}

if (window.EasyThereFirebase) {
    window.EasyThereFirebase.onUserChanged(updateFirebaseUI);
}

clearLegacyMockData();
updateUI();
