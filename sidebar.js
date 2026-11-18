const sidebar = document.getElementById("sidebar");
const toggleBtn = document.getElementById("sidebar-toggle");
const closeBtn = document.getElementById("sidebar-close");

let overlay = document.getElementById("sidebar-overlay");
if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "sidebar-overlay";
    overlay.className = "sidebar-overlay";
    document.body.appendChild(overlay);
}

function isMobile() {
    return window.innerWidth <= 768;
}

function closeSidebar() {
    if (sidebar) sidebar.classList.add("collapsed");
    if (overlay) overlay.classList.remove("active");
}

function openSidebar() {
    if (sidebar) sidebar.classList.remove("collapsed");
    if (isMobile() && overlay) {
        overlay.classList.add("active");
    }
}

function toggleSidebar() {
    if (!sidebar) return;
    if (sidebar.classList.contains("collapsed")) {
        openSidebar();
    } else {
        closeSidebar();
    }
}

if (isMobile() && sidebar) {
    sidebar.classList.add("collapsed");
}

if (toggleBtn) {
    toggleBtn.addEventListener("click", toggleSidebar);
}

if (closeBtn) {
    closeBtn.addEventListener("click", closeSidebar);
}

if (overlay) {
    overlay.addEventListener("click", closeSidebar);
}

if (sidebar) {
    const navLinks = sidebar.querySelectorAll(".nav-item");
    navLinks.forEach(function(link) {
        link.addEventListener("click", function() {
            if (isMobile()) {
                closeSidebar();
            }
        });
    });
}

window.addEventListener("resize", function() {
    if (!isMobile() && overlay) {
        overlay.classList.remove("active");
    }
});