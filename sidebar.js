const sidebar = document.getElementById("sidebar");
const toggleBtn = document.getElementById("sidebar-toggle");
const closeBtn = document.getElementById("sidebar-close");
const navItems = document.querySelectorAll(".nav-item");
const views = document.querySelectorAll(".view");

function toggleSidebar() {
    sidebar.classList.toggle("collapsed");
}

if (toggleBtn) {
    toggleBtn.addEventListener("click", toggleSidebar);
}

if (closeBtn) {
    closeBtn.addEventListener("click", toggleSidebar);
}

navItems.forEach(function(item) {
    item.addEventListener("click", function() {
        const targetView = item.getAttribute("data-view");
        if (!targetView) return;

        navItems.forEach(function(btn) {
            btn.classList.remove("active");
        });
        item.classList.add("active");

        views.forEach(function(view) {
            if (view.id === "view-" + targetView) {
                view.classList.add("active");
            } else {
                view.classList.remove("active");
            }
        });

        if (window.innerWidth <= 768) {
            sidebar.classList.add("collapsed");
        }
    });
});
