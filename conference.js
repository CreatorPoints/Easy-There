(function() {
    const startRoomBtn = document.getElementById("start-room-btn");
    const startActionBox = document.getElementById("start-action-box");
    const hostCodeDisplay = document.getElementById("host-code-display");
    const createdRoomCodeEl = document.getElementById("created-room-code");
    const copyRoomLinkBtn = document.getElementById("copy-room-link-btn");
    const copyFeedbackEl = document.getElementById("copy-feedback");
    const enterAsHostBtn = document.getElementById("enter-as-host-btn");
    const joinRoomForm = document.getElementById("join-room-form");
    const joinRoomInput = document.getElementById("join-room-input");
    const joinErrorEl = document.getElementById("join-error");

    const lobbyEl = document.getElementById("conference-lobby");
    const callEl = document.getElementById("conference-call");
    const activeRoomCodeEl = document.getElementById("active-room-code");
    const callCopyLinkBtn = document.getElementById("call-copy-link-btn");

    const localVideo = document.getElementById("local-video");
    const localAvatar = document.getElementById("local-avatar");
    const remoteVideo = document.getElementById("remote-video");
    const remoteAvatar = document.getElementById("remote-avatar");
    const remoteTile = document.getElementById("remote-tile");
    const remoteBadge = document.getElementById("remote-badge");

    const toggleMicBtn = document.getElementById("toggle-mic-btn");
    const toggleVideoBtn = document.getElementById("toggle-video-btn");
    const toggleScreenBtn = document.getElementById("toggle-screen-btn");
    const leaveCallBtn = document.getElementById("leave-call-btn");

    let peer = null;
    let localStream = null;
    let currentCall = null;
    let screenStream = null;
    let activeRoomCode = null;
    let isHost = false;
    let isAudioMuted = false;
    let isVideoMuted = false;
    let isScreenSharing = false;
    let guestTimeout = null;

    function generateCode() {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let res = "ET-";
        for (let i = 0; i < 4; i++) {
            res += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return res;
    }

    function getCleanCode(code) {
        if (!code) return "";
        let clean = code.toUpperCase().trim().replace(/[^A-Z0-9-]/g, "");
        if (/^[A-Z0-9]{4}$/.test(clean)) {
            clean = "ET-" + clean;
        }
        return clean;
    }

    function isValidCode(code) {
        if (!code || typeof code !== "string") return false;
        const clean = getCleanCode(code);
        return clean.length >= 4 && clean.length <= 20;
    }

    function getInviteUrl(code) {
        return window.location.origin + "/conference?room=" + encodeURIComponent(code);
    }

    function copyToClipboard(text, feedbackEl) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function() {
                if (feedbackEl) {
                    feedbackEl.classList.remove("hidden");
                    setTimeout(function() {
                        feedbackEl.classList.add("hidden");
                    }, 2500);
                }
            }).catch(function() {});
        }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get("room");
    if (roomFromUrl && joinRoomInput) {
        joinRoomInput.value = getCleanCode(roomFromUrl);
        if (!isValidCode(roomFromUrl) && joinErrorEl) {
            joinErrorEl.textContent = "Invalid room code in link. Please check the code and try again.";
            joinErrorEl.classList.remove("hidden");
        }
    }

    if (joinRoomInput) {
        joinRoomInput.addEventListener("input", function() {
            if (joinErrorEl) {
                joinErrorEl.classList.add("hidden");
            }
        });
    }

    if (startRoomBtn) {
        startRoomBtn.addEventListener("click", function() {
            if (joinErrorEl) joinErrorEl.classList.add("hidden");
            activeRoomCode = generateCode();
            createdRoomCodeEl.textContent = activeRoomCode;
            startActionBox.classList.add("hidden");
            hostCodeDisplay.classList.remove("hidden");
        });
    }

    if (copyRoomLinkBtn) {
        copyRoomLinkBtn.addEventListener("click", function() {
            if (activeRoomCode) {
                copyToClipboard(getInviteUrl(activeRoomCode), copyFeedbackEl);
            }
        });
    }

    if (callCopyLinkBtn) {
        callCopyLinkBtn.addEventListener("click", function() {
            if (activeRoomCode) {
                copyToClipboard(getInviteUrl(activeRoomCode), null);
                callCopyLinkBtn.textContent = "Copied!";
                setTimeout(function() {
                    callCopyLinkBtn.textContent = "Copy Room Link";
                }, 2000);
            }
        });
    }

    if (enterAsHostBtn) {
        enterAsHostBtn.addEventListener("click", function() {
            if (activeRoomCode) {
                joinHuddle(activeRoomCode, true);
            }
        });
    }

    if (joinRoomForm) {
        joinRoomForm.addEventListener("submit", function(e) {
            e.preventDefault();
            const raw = joinRoomInput.value.trim();
            if (!isValidCode(raw)) {
                if (joinErrorEl) {
                    joinErrorEl.textContent = "Invalid room code. Please enter a valid room code (e.g. ET-8492).";
                    joinErrorEl.classList.remove("hidden");
                }
                return;
            }
            const code = getCleanCode(raw);
            joinHuddle(code, false);
        });
    }

    async function initMedia() {
        try {
            return await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: { width: { ideal: 1280 }, height: { ideal: 720 } }
            });
        } catch (err) {
            try {
                const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: false
                });
                isVideoMuted = true;
                return audioOnlyStream;
            } catch (audioErr) {
                throw new Error("Unable to access microphone. Please check browser permissions.");
            }
        }
    }

    async function joinHuddle(code, hostFlag) {
        if (joinErrorEl) joinErrorEl.classList.add("hidden");
        activeRoomCode = code;
        isHost = hostFlag;

        try {
            localStream = await initMedia();
        } catch (err) {
            if (joinErrorEl) {
                joinErrorEl.textContent = err.message || "Could not access media devices.";
                joinErrorEl.classList.remove("hidden");
            }
            return;
        }

        localVideo.srcObject = localStream;
        if (localStream.getVideoTracks().length === 0) {
            localAvatar.classList.remove("hidden");
        } else {
            localAvatar.classList.add("hidden");
        }

        lobbyEl.classList.add("hidden");
        callEl.classList.remove("hidden");
        activeRoomCodeEl.textContent = code;

        const hostId = `easythere-huddle-${code.toLowerCase()}-host`;
        const guestId = `easythere-huddle-${code.toLowerCase()}-guest-${Math.random().toString(36).substring(2, 7)}`;

        if (isHost) {
            peer = new Peer(hostId);
            peer.on("open", function() {});
            peer.on("call", function(incomingCall) {
                incomingCall.answer(localStream);
                setupCall(incomingCall);
            });
            peer.on("error", function(err) {
                if (err && err.type === "unavailable-id") {
                    peer.destroy();
                    isHost = false;
                    connectAsGuest(guestId, hostId);
                }
            });
        } else {
            connectAsGuest(guestId, hostId);
        }

        updateControlsUI();
    }

    function connectAsGuest(guestId, hostId) {
        if (guestTimeout) clearTimeout(guestTimeout);

        peer = new Peer(guestId);
        peer.on("open", function() {
            const outgoingCall = peer.call(hostId, localStream);
            if (outgoingCall) {
                setupCall(outgoingCall);
            }
            guestTimeout = setTimeout(function() {
                if (remoteTile && remoteTile.classList.contains("waiting")) {
                    endCall();
                    if (joinErrorEl) {
                        joinErrorEl.textContent = "Invalid room code. Room does not exist or host is not active.";
                        joinErrorEl.classList.remove("hidden");
                    }
                }
            }, 10000);
        });

        peer.on("error", function(err) {
            if (guestTimeout) clearTimeout(guestTimeout);
            if (err && (err.type === "peer-unavailable" || err.type === "invalid-id")) {
                endCall();
                if (joinErrorEl) {
                    joinErrorEl.textContent = "Invalid room code. Room does not exist or host is not active.";
                    joinErrorEl.classList.remove("hidden");
                }
            } else {
                remoteBadge.textContent = "Could not connect to host.";
            }
        });
    }

    function setupCall(call) {
        currentCall = call;

        call.on("stream", function(remoteStream) {
            if (guestTimeout) {
                clearTimeout(guestTimeout);
                guestTimeout = null;
            }
            remoteVideo.srcObject = remoteStream;
            remoteTile.classList.remove("waiting");
            remoteAvatar.classList.add("hidden");
            remoteBadge.textContent = isHost ? "Guest" : "Host";
        });

        call.on("close", function() {
            if (guestTimeout) {
                clearTimeout(guestTimeout);
                guestTimeout = null;
            }
            resetRemote();
        });

        call.on("error", function() {
            if (guestTimeout) {
                clearTimeout(guestTimeout);
                guestTimeout = null;
            }
            resetRemote();
        });
    }

    function resetRemote() {
        remoteVideo.srcObject = null;
        remoteTile.classList.add("waiting");
        remoteAvatar.classList.remove("hidden");
        remoteBadge.textContent = "Waiting for peer...";
    }

    function updateControlsUI() {
        if (toggleMicBtn) {
            if (isAudioMuted) {
                toggleMicBtn.classList.add("muted");
            } else {
                toggleMicBtn.classList.remove("muted");
            }
        }
        if (toggleVideoBtn) {
            if (isVideoMuted) {
                toggleVideoBtn.classList.add("muted");
                localAvatar.classList.remove("hidden");
            } else {
                toggleVideoBtn.classList.remove("muted");
                localAvatar.classList.add("hidden");
            }
        }
        if (toggleScreenBtn) {
            if (isScreenSharing) {
                toggleScreenBtn.classList.add("active");
            } else {
                toggleScreenBtn.classList.remove("active");
            }
        }
    }

    if (toggleMicBtn) {
        toggleMicBtn.addEventListener("click", function() {
            if (!localStream) return;
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                isAudioMuted = !audioTrack.enabled;
                updateControlsUI();
            }
        });
    }

    if (toggleVideoBtn) {
        toggleVideoBtn.addEventListener("click", function() {
            if (!localStream) return;
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                isVideoMuted = !videoTrack.enabled;
                updateControlsUI();
            }
        });
    }

    if (toggleScreenBtn) {
        toggleScreenBtn.addEventListener("click", async function() {
            if (isScreenSharing) {
                stopScreenShare();
                return;
            }

            try {
                screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: { cursor: "always" },
                    audio: false
                });

                const screenTrack = screenStream.getVideoTracks()[0];
                screenTrack.onended = function() {
                    stopScreenShare();
                };

                replaceVideoTrack(screenTrack);
                isScreenSharing = true;
                updateControlsUI();
            } catch (err) {}
        });
    }

    function stopScreenShare() {
        if (!isScreenSharing) return;
        if (screenStream) {
            screenStream.getTracks().forEach(function(t) {
                t.stop();
            });
            screenStream = null;
        }

        const originalTrack = localStream ? localStream.getVideoTracks()[0] : null;
        if (originalTrack) {
            replaceVideoTrack(originalTrack);
        }

        isScreenSharing = false;
        updateControlsUI();
    }

    function replaceVideoTrack(newTrack) {
        if (localVideo && localStream) {
            localVideo.srcObject = new MediaStream([newTrack, ...localStream.getAudioTracks()]);
        }
        if (currentCall && currentCall.peerConnection) {
            const senders = currentCall.peerConnection.getSenders();
            const videoSender = senders.find(function(s) {
                return s.track && s.track.kind === "video";
            });
            if (videoSender) {
                videoSender.replaceTrack(newTrack);
            }
        }
    }

    if (leaveCallBtn) {
        leaveCallBtn.addEventListener("click", function() {
            endCall();
        });
    }

    function endCall() {
        if (guestTimeout) {
            clearTimeout(guestTimeout);
            guestTimeout = null;
        }

        stopScreenShare();

        if (localStream) {
            localStream.getTracks().forEach(function(track) {
                track.stop();
            });
            localStream = null;
        }

        if (currentCall) {
            currentCall.close();
            currentCall = null;
        }

        if (peer) {
            peer.destroy();
            peer = null;
        }

        resetRemote();
        localVideo.srcObject = null;

        callEl.classList.add("hidden");
        lobbyEl.classList.remove("hidden");
        startActionBox.classList.remove("hidden");
        hostCodeDisplay.classList.add("hidden");

        isAudioMuted = false;
        isVideoMuted = false;
        isScreenSharing = false;
        activeRoomCode = null;
        isHost = false;

        if (window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
})();
