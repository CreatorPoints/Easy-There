const sidebar = document.getElementById("sidebar");
const toggleBtn = document.getElementById("sidebar-toggle");
const closeBtn = document.getElementById("sidebar-close");

function toggleSidebar() {
    sidebar.classList.toggle("collapsed");
}

if (toggleBtn) {
    toggleBtn.addEventListener("click", toggleSidebar);
}

if (closeBtn) {
    closeBtn.addEventListener("click", toggleSidebar);
}
