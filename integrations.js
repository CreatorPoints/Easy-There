const connectBtn = document.getElementById("gcal-connect-btn");
const disconnectBtn = document.getElementById("gcal-disconnect-btn");
const statusBadge = document.getElementById("gcal-status-badge");
const feedbackMsg = document.getElementById("gcal-feedback");

const fbLoginBtn = document.getElementById("firebase-login-btn");
const fbLogoutBtn = document.getElementById("firebase-logout-btn");
const fbStatusBadge = document.getElementById("firebase-status-badge");
const fbFeedback = document.getElementById("firebase-feedback");

const GCAL_CONNECTED_KEY = "easy_there_gcal_connected";

function updateUI() {
    const isConnected = localStorage.getItem(GCAL_CONNECTED_KEY) === "true";

    if (isConnected) {
        statusBadge.textContent = "Connected";
        statusBadge.className = "status-badge connected";
        connectBtn.textContent = "Sync Now";
        disconnectBtn.classList.remove("hidden");
        feedbackMsg.textContent = "Google Calendar is connected and synchronized with your primary calendar.";
        feedbackMsg.style.color = "#4ade80";
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

if (connectBtn) {
    connectBtn.addEventListener("click", async function() {
        if (!window.EasyThereFirebase) return;

        feedbackMsg.textContent = "Connecting to Google Calendar...";
        feedbackMsg.style.color = "#888888";

        try {
            await window.EasyThereFirebase.refreshGoogleCalendar();
            updateUI();
        } catch (err) {
            feedbackMsg.textContent = err.message;
            feedbackMsg.style.color = "#f87171";
        }
    });
}

if (disconnectBtn) {
    disconnectBtn.addEventListener("click", function() {
        if (window.EasyThereFirebase) {
            window.EasyThereFirebase.disconnectGoogleCalendar();
        }
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

updateUI();
