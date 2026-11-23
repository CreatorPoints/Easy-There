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

const slackTokenForm = document.getElementById("slack-token-form");
const slackTokenInput = document.getElementById("slack-token-input");
const slackChannelIdInput = document.getElementById("slack-channel-id-input");
const slackTokenSubmitBtn = document.getElementById("slack-token-submit-btn");
const slackTokenDisconnectBtn = document.getElementById("slack-token-disconnect-btn");
const slackStatusBadge = document.getElementById("slack-status-badge");
const slackFeedback = document.getElementById("slack-feedback");
const slackChannelDetails = document.getElementById("slack-channel-details");

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
    return null;
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
    if (data && data.token) {
        slackStatusBadge.textContent = data.channel ? data.channel : "Connected";
        slackStatusBadge.className = "status-badge connected";
        if (slackTokenInput) slackTokenInput.value = data.token;
        if (slackChannelIdInput) slackChannelIdInput.value = data.channelId || "";
        if (slackTokenDisconnectBtn) slackTokenDisconnectBtn.classList.remove("hidden");

        if (slackFeedback) {
            slackFeedback.textContent = `Connected to ${data.channel || 'Slack'} via Bot API. Live topic and messages enabled.`;
            slackFeedback.style.color = "#4ade80";
        }

        if (slackChannelDetails) {
            slackChannelDetails.classList.remove("hidden");
            const topicText = data.topic ? `<div class="slack-channel-topic">Topic: ${data.topic}</div>` : "";
            const purposeText = data.purpose ? `<div class="slack-channel-purpose">Purpose: ${data.purpose}</div>` : "";
            const pinsCount = Array.isArray(data.pinnedMessages) && data.pinnedMessages.length > 0 ? ` • ${data.pinnedMessages.length} pinned` : "";
            const msgsCount = Array.isArray(data.recentMessages) && data.recentMessages.length > 0 ? ` • ${data.recentMessages.length} messages loaded` : "";
            const membersText = data.numMembers ? `<span class="slack-channel-meta">${data.numMembers} members${pinsCount}${msgsCount}</span>` : `<span class="slack-channel-meta">Bot API${pinsCount}${msgsCount}</span>`;
            slackChannelDetails.innerHTML = `
                <div class="slack-channel-top">
                    <span class="slack-channel-name">${data.channel || 'Slack Channel'}</span>
                    ${membersText}
                </div>
                ${topicText}
                ${purposeText}
            `;
        }
    } else {
        slackStatusBadge.textContent = "Disconnected";
        slackStatusBadge.className = "status-badge disconnected";
        if (slackTokenInput) slackTokenInput.value = "";
        if (slackChannelIdInput) slackChannelIdInput.value = "";
        if (slackTokenDisconnectBtn) slackTokenDisconnectBtn.classList.add("hidden");
        if (slackFeedback) slackFeedback.textContent = "";
        if (slackChannelDetails) {
            slackChannelDetails.classList.add("hidden");
            slackChannelDetails.innerHTML = "";
        }
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
                slackData: getStoredSlackData()
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
            slackData: getStoredSlackData()
        });
    }
    updateGitHubUI();
}

async function connectSlackBot(token, channelId) {
    const cleanToken = (token || "").trim();
    const cleanChannel = (channelId || "").trim();

    if (!cleanToken.startsWith("xoxb-")) {
        if (slackFeedback) {
            slackFeedback.textContent = "Invalid Bot Token. A Slack Bot User Token starts with xoxb-";
            slackFeedback.style.color = "#f87171";
        }
        return;
    }

    if (!cleanChannel) {
        if (slackFeedback) {
            slackFeedback.textContent = "Please enter a Channel ID (e.g. C0123456789).";
            slackFeedback.style.color = "#f87171";
        }
        return;
    }

    if (slackFeedback) {
        slackFeedback.textContent = "Connecting to Slack API and fetching live channel details...";
        slackFeedback.style.color = "#888888";
    }

    try {
        const res = await fetch("/api/slack", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "fetch_channel",
                token: cleanToken,
                channelId: cleanChannel
            })
        });

        const data = await res.json();
        if (!res.ok || data.error) {
            throw new Error(data.error || "Failed to fetch channel from Slack");
        }

        const ch = data.channel || {};
        const chName = ch.name ? `#${ch.name}` : cleanChannel;
        const slackData = {
            mode: "token",
            token: cleanToken,
            channelId: ch.id || cleanChannel,
            channel: chName,
            topic: ch.topic || "",
            purpose: ch.purpose || "",
            numMembers: ch.num_members || 0,
            pinnedMessages: data.pinnedMessages || [],
            recentMessages: data.recentMessages || [],
            connectedAt: new Date().toISOString()
        };

        localStorage.setItem("easy_there_slack_data", JSON.stringify(slackData));

        if (window.EasyThereFirebase && window.EasyThereFirebase.syncIntegrationsToCloud) {
            window.EasyThereFirebase.syncIntegrationsToCloud({
                github: getStoredGitHubData(),
                slackData: slackData
            });
        }

        updateSlackUI();
    } catch (err) {
        if (slackFeedback) {
            slackFeedback.textContent = err.message || "Failed to connect to Slack API";
            slackFeedback.style.color = "#f87171";
        }
    }
}

function disconnectSlack() {
    localStorage.removeItem("easy_there_slack_webhook");
    localStorage.removeItem("easy_there_slack_data");
    if (window.EasyThereFirebase && window.EasyThereFirebase.syncIntegrationsToCloud) {
        window.EasyThereFirebase.syncIntegrationsToCloud({
            github: getStoredGitHubData(),
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

if (slackTokenForm) {
    slackTokenForm.addEventListener("submit", function(e) {
        e.preventDefault();
        if (slackTokenInput && slackChannelIdInput) {
            connectSlackBot(slackTokenInput.value, slackChannelIdInput.value);
        }
    });
}

if (slackTokenDisconnectBtn) {
    slackTokenDisconnectBtn.addEventListener("click", disconnectSlack);
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
