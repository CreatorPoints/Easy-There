const connectBtn = document.getElementById("gcal-connect-btn");
const disconnectBtn = document.getElementById("gcal-disconnect-btn");
const statusBadge = document.getElementById("gcal-status-badge");
const feedbackMsg = document.getElementById("gcal-feedback");

const fbLoginBtn = document.getElementById("firebase-login-btn");
const fbLogoutBtn = document.getElementById("firebase-logout-btn");
const fbStatusBadge = document.getElementById("firebase-status-badge");
const fbFeedback = document.getElementById("firebase-feedback");

function updateUI() {
    const isConnected = window.EasyThereFirebase ? window.EasyThereFirebase.isGoogleCalendarConnected() : (localStorage.getItem("easy_there_gcal_connected") === "true");

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
            feedbackMsg.innerHTML = err.message.replace(
                /(https?:\/\/[^\s]+)/g,
                '<a href="$1" target="_blank" rel="noopener" style="color: #60a5fa; text-decoration: underline;">Enable Google Calendar API</a>'
            );
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

const ghForm = document.getElementById("github-form");
const ghInput = document.getElementById("github-username-input");
const ghConnectBtn = document.getElementById("github-connect-btn");
const ghDisconnectBtn = document.getElementById("github-disconnect-btn");
const ghStatusBadge = document.getElementById("github-status-badge");
const ghFeedback = document.getElementById("github-feedback");
const ghPreview = document.getElementById("github-repos-preview");

const slackForm = document.getElementById("slack-form");
const slackInput = document.getElementById("slack-webhook-input");
const slackChannelInput = document.getElementById("slack-channel-input");
const slackPurposeInput = document.getElementById("slack-purpose-input");
const slackConnectBtn = document.getElementById("slack-connect-btn");
const slackDisconnectBtn = document.getElementById("slack-disconnect-btn");
const slackStatusBadge = document.getElementById("slack-status-badge");
const slackFeedback = document.getElementById("slack-feedback");

function getStoredGitHubData() {
    try {
        const raw = localStorage.getItem("easy_there_github_data");
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function getStoredSlackData() {
    try {
        const raw = localStorage.getItem("easy_there_slack_data");
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    const webhook = localStorage.getItem("easy_there_slack_webhook");
    if (webhook) {
        return {
            webhook: webhook,
            channel: "",
            purpose: ""
        };
    }
    return null;
}

function getStoredSlackWebhook() {
    const data = getStoredSlackData();
    return data ? data.webhook : (localStorage.getItem("easy_there_slack_webhook") || "");
}

function updateGitHubUI() {
    if (!ghStatusBadge) return;
    const data = getStoredGitHubData();
    if (data && data.username) {
        ghStatusBadge.textContent = `@${data.username}`;
        ghStatusBadge.className = "status-badge connected";
        if (ghInput) ghInput.value = data.username;
        if (ghConnectBtn) ghConnectBtn.textContent = "Refresh Repos";
        if (ghDisconnectBtn) ghDisconnectBtn.classList.remove("hidden");
        if (ghFeedback) {
            ghFeedback.textContent = `Connected to GitHub as @${data.username}. Loaded ${data.repos ? data.repos.length : 0} repositories.`;
            ghFeedback.style.color = "#4ade80";
        }
        if (ghPreview && Array.isArray(data.repos) && data.repos.length > 0) {
            ghPreview.classList.remove("hidden");
            ghPreview.innerHTML = data.repos.slice(0, 8).map(r => `
                <div class="github-repo-chip">
                    <div class="github-repo-top">
                        <span class="github-repo-name">${r.name}</span>
                        <span class="github-repo-meta">${r.language || 'Code'}${r.stars ? ` ★${r.stars}` : ''}</span>
                    </div>
                    <span class="github-repo-desc">${r.description ? r.description.slice(0, 60) : 'No description'}</span>
                </div>
            `).join("");
        }
    } else {
        ghStatusBadge.textContent = "Disconnected";
        ghStatusBadge.className = "status-badge disconnected";
        if (ghInput) ghInput.value = "";
        if (ghConnectBtn) ghConnectBtn.textContent = "Connect";
        if (ghDisconnectBtn) ghDisconnectBtn.classList.add("hidden");
        if (ghFeedback) ghFeedback.textContent = "";
        if (ghPreview) {
            ghPreview.classList.add("hidden");
            ghPreview.innerHTML = "";
        }
    }
}

function updateSlackUI() {
    if (!slackStatusBadge) return;
    const data = getStoredSlackData();
    if (data && data.webhook) {
        slackStatusBadge.textContent = data.channel ? data.channel : "Connected";
        slackStatusBadge.className = "status-badge connected";
        if (slackInput) slackInput.value = data.webhook;
        if (slackChannelInput) slackChannelInput.value = data.channel || "";
        if (slackPurposeInput) slackPurposeInput.value = data.purpose || "";
        if (slackConnectBtn) slackConnectBtn.textContent = "Update Slack Configuration";
        if (slackDisconnectBtn) slackDisconnectBtn.classList.remove("hidden");
        if (slackFeedback) {
            const extra = data.purpose ? ` (${data.purpose})` : "";
            slackFeedback.textContent = `Slack webhook active for ${data.channel || 'channel'}${extra}. Ready for AI messages.`;
            slackFeedback.style.color = "#4ade80";
        }
    } else {
        slackStatusBadge.textContent = "Disconnected";
        slackStatusBadge.className = "status-badge disconnected";
        if (slackInput) slackInput.value = "";
        if (slackChannelInput) slackChannelInput.value = "";
        if (slackPurposeInput) slackPurposeInput.value = "";
        if (slackConnectBtn) slackConnectBtn.textContent = "Save Slack Configuration";
        if (slackDisconnectBtn) slackDisconnectBtn.classList.add("hidden");
        if (slackFeedback) slackFeedback.textContent = "";
    }
}

async function connectGitHub(username) {
    const cleanUser = username.trim().replace(/^@/, "");
    if (!cleanUser) return;
    if (ghFeedback) {
        ghFeedback.textContent = `Fetching public repositories for @${cleanUser}...`;
        ghFeedback.style.color = "#888888";
    }
    try {
        const res = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUser)}/repos?sort=updated&per_page=8`);
        if (!res.ok) {
            throw new Error(`GitHub user "${cleanUser}" not found`);
        }
        const repos = await res.json();
        const simplifiedRepos = Array.isArray(repos) ? repos.map(r => ({
            name: r.name,
            description: r.description || "",
            language: r.language || "",
            stars: r.stargazers_count || 0,
            updatedAt: r.updated_at || ""
        })) : [];

        const ghData = {
            username: cleanUser,
            repos: simplifiedRepos,
            connectedAt: new Date().toISOString()
        };

        localStorage.setItem("easy_there_github_data", JSON.stringify(ghData));
        if (window.EasyThereFirebase && window.EasyThereFirebase.syncIntegrationsToCloud) {
            window.EasyThereFirebase.syncIntegrationsToCloud({
                github: ghData,
                slackWebhook: getStoredSlackWebhook()
            });
        }
        updateGitHubUI();
    } catch (err) {
        if (ghFeedback) {
            ghFeedback.textContent = err.message || "Failed to connect to GitHub";
            ghFeedback.style.color = "#f87171";
        }
    }
}

function disconnectGitHub() {
    localStorage.removeItem("easy_there_github_data");
    if (window.EasyThereFirebase && window.EasyThereFirebase.syncIntegrationsToCloud) {
        window.EasyThereFirebase.syncIntegrationsToCloud({
            github: null,
            slackWebhook: getStoredSlackWebhook()
        });
    }
    updateGitHubUI();
}

function connectSlack(url, channel, purpose) {
    const cleanUrl = (url || "").trim();
    if (!cleanUrl.startsWith("https://hooks.slack.com/")) {
        if (slackFeedback) {
            slackFeedback.textContent = "Invalid Slack Webhook URL. It must start with https://hooks.slack.com/";
            slackFeedback.style.color = "#f87171";
        }
        return;
    }

    const slackData = {
        webhook: cleanUrl,
        channel: (channel || "").trim(),
        purpose: (purpose || "").trim()
    };

    localStorage.setItem("easy_there_slack_webhook", cleanUrl);
    localStorage.setItem("easy_there_slack_data", JSON.stringify(slackData));

    if (window.EasyThereFirebase && window.EasyThereFirebase.syncIntegrationsToCloud) {
        window.EasyThereFirebase.syncIntegrationsToCloud({
            github: getStoredGitHubData(),
            slackWebhook: cleanUrl,
            slackData: slackData
        });
    }
    updateSlackUI();
}

function disconnectSlack() {
    localStorage.removeItem("easy_there_slack_webhook");
    localStorage.removeItem("easy_there_slack_data");
    if (window.EasyThereFirebase && window.EasyThereFirebase.syncIntegrationsToCloud) {
        window.EasyThereFirebase.syncIntegrationsToCloud({
            github: getStoredGitHubData(),
            slackWebhook: null,
            slackData: null
        });
    }
    updateSlackUI();
}

if (ghForm) {
    ghForm.addEventListener("submit", function(e) {
        e.preventDefault();
        if (ghInput) {
            connectGitHub(ghInput.value);
        }
    });
}

if (ghDisconnectBtn) {
    ghDisconnectBtn.addEventListener("click", disconnectGitHub);
}

if (slackForm) {
    slackForm.addEventListener("submit", function(e) {
        e.preventDefault();
        if (slackInput) {
            const channelVal = slackChannelInput ? slackChannelInput.value : "";
            const purposeVal = slackPurposeInput ? slackPurposeInput.value : "";
            connectSlack(slackInput.value, channelVal, purposeVal);
        }
    });
}

if (slackDisconnectBtn) {
    slackDisconnectBtn.addEventListener("click", disconnectSlack);
}

if (window.EasyThereFirebase) {
    window.EasyThereFirebase.onUserChanged(async function(user) {
        updateFirebaseUI(user);
        if (user) {
            const cloudIntegrations = await window.EasyThereFirebase.fetchIntegrationsFromCloud();
            if (cloudIntegrations) {
                if (cloudIntegrations.github) {
                    localStorage.setItem("easy_there_github_data", JSON.stringify(cloudIntegrations.github));
                }
                if (cloudIntegrations.slackData) {
                    localStorage.setItem("easy_there_slack_data", JSON.stringify(cloudIntegrations.slackData));
                    if (cloudIntegrations.slackData.webhook) {
                        localStorage.setItem("easy_there_slack_webhook", cloudIntegrations.slackData.webhook);
                    }
                } else if (cloudIntegrations.slackWebhook) {
                    localStorage.setItem("easy_there_slack_webhook", cloudIntegrations.slackWebhook);
                }
                updateGitHubUI();
                updateSlackUI();
            }
        }
    });
}

updateUI();
updateGitHubUI();
updateSlackUI();
