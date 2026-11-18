(function() {
    const STORAGE_KEY = "easy_there_projects";
    const projectsListEl = document.getElementById("projects-list");
    const projectsCountEl = document.getElementById("projects-count");
    const newProjectBtn = document.getElementById("new-project-toggle-btn");
    const newProjectCard = document.getElementById("new-project-card");
    const cancelProjectBtn = document.getElementById("cancel-project-btn");
    const createProjectForm = document.getElementById("create-project-form");
    const titleInput = document.getElementById("project-title-input");
    const descInput = document.getElementById("project-desc-input");
    const dateInput = document.getElementById("project-date-input");

    let projects = loadProjects();

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function loadProjects() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function saveProjects() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
        } catch (e) {}
        if (window.EasyThereFirebase && window.EasyThereFirebase.syncProjectsToCloud) {
            window.EasyThereFirebase.syncProjectsToCloud(projects);
        }
    }

    function getSelectedColor() {
        const checked = document.querySelector('input[name="project-color"]:checked');
        return checked ? checked.value : "default";
    }

    function setSelectedColor(color) {
        const target = document.querySelector(`input[name="project-color"][value="${color}"]`);
        if (target) {
            target.checked = true;
        }
    }

    function formatDisplayDate(dateStr) {
        if (!dateStr) return "";
        try {
            const parts = dateStr.split("-");
            if (parts.length === 3) {
                const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            }
        } catch (e) {}
        return dateStr;
    }

    function createProjectCardElement(project) {
        const card = document.createElement("div");
        card.className = `project-card color-${project.color || 'default'}`;
        card.dataset.id = project.id;

        const tasks = Array.isArray(project.tasks) ? project.tasks : [];
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(function(t) { return Boolean(t.completed); }).length;
        const percent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

        const header = document.createElement("div");
        header.className = "project-card-header";

        const titleGroup = document.createElement("div");
        titleGroup.className = "project-title-group";

        const pip = document.createElement("span");
        pip.className = `project-badge-pip pip-${project.color || 'default'}`;

        const title = document.createElement("h3");
        title.className = "project-card-title";
        title.textContent = project.title;

        titleGroup.appendChild(pip);
        titleGroup.appendChild(title);

        if (project.dueDate) {
            const dueBadge = document.createElement("span");
            dueBadge.className = "project-due-badge";
            dueBadge.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>${escapeHtml(formatDisplayDate(project.dueDate))}</span>
            `;
            titleGroup.appendChild(dueBadge);
        }

        const deleteProjectBtn = document.createElement("button");
        deleteProjectBtn.type = "button";
        deleteProjectBtn.className = "project-delete-btn";
        deleteProjectBtn.setAttribute("aria-label", "Delete project");
        deleteProjectBtn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        `;

        deleteProjectBtn.addEventListener("click", function() {
            projects = projects.filter(function(p) {
                return p.id !== project.id;
            });
            saveProjects();
            renderProjects();
        });

        header.appendChild(titleGroup);
        header.appendChild(deleteProjectBtn);
        card.appendChild(header);

        if (project.description && project.description.trim()) {
            const desc = document.createElement("div");
            desc.className = "project-card-description";
            desc.textContent = project.description.trim();
            card.appendChild(desc);
        }

        const progressSection = document.createElement("div");
        progressSection.className = "project-progress-section";

        const progressMeta = document.createElement("div");
        progressMeta.className = "project-progress-meta";

        const progressLabel = document.createElement("span");
        progressLabel.className = "project-progress-label";
        progressLabel.textContent = totalTasks === 0 ? "No tasks added yet" : `${completedTasks} of ${totalTasks} completed`;

        const progressPercent = document.createElement("span");
        progressPercent.className = "project-progress-percent";
        progressPercent.textContent = totalTasks === 0 ? "0%" : `${percent}%`;

        progressMeta.appendChild(progressLabel);
        progressMeta.appendChild(progressPercent);

        const progressBar = document.createElement("div");
        progressBar.className = "project-progress-bar";

        const progressFill = document.createElement("div");
        progressFill.className = `project-progress-fill fill-${project.color || 'default'}`;
        progressFill.style.width = `${percent}%`;

        progressBar.appendChild(progressFill);
        progressSection.appendChild(progressMeta);
        progressSection.appendChild(progressBar);
        card.appendChild(progressSection);

        const tasksContainer = document.createElement("div");
        tasksContainer.className = "project-tasks-container";

        const taskList = document.createElement("div");
        taskList.className = "project-task-list";

        tasks.forEach(function(task) {
            const taskItem = document.createElement("div");
            taskItem.className = "project-task-item";
            if (task.completed) {
                taskItem.classList.add("completed");
            }

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = Boolean(task.completed);
            checkbox.setAttribute("aria-label", "Mark task as completed");

            const taskText = document.createElement("span");
            taskText.className = "project-task-text";
            taskText.textContent = task.text;

            const deleteTaskBtn = document.createElement("button");
            deleteTaskBtn.type = "button";
            deleteTaskBtn.className = "project-task-delete-btn";
            deleteTaskBtn.setAttribute("aria-label", "Delete task");
            deleteTaskBtn.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            `;

            checkbox.addEventListener("change", function() {
                task.completed = checkbox.checked;
                if (checkbox.checked) {
                    taskItem.classList.add("completed");
                } else {
                    taskItem.classList.remove("completed");
                }
                saveProjects();
                updateCardProgress(card, project);
            });

            deleteTaskBtn.addEventListener("click", function() {
                project.tasks = project.tasks.filter(function(t) {
                    return t.id !== task.id;
                });
                saveProjects();
                taskItem.remove();
                updateCardProgress(card, project);
            });

            taskItem.appendChild(checkbox);
            taskItem.appendChild(taskText);
            taskItem.appendChild(deleteTaskBtn);
            taskList.appendChild(taskItem);
        });

        tasksContainer.appendChild(taskList);

        const taskForm = document.createElement("form");
        taskForm.className = "project-task-form";

        const taskInput = document.createElement("input");
        taskInput.type = "text";
        taskInput.className = "project-task-input";
        taskInput.required = true;
        taskInput.autocomplete = "off";

        const taskSubmitBtn = document.createElement("button");
        taskSubmitBtn.type = "submit";
        taskSubmitBtn.className = "project-task-add-btn";
        taskSubmitBtn.textContent = "+ Add Task";

        taskForm.appendChild(taskInput);
        taskForm.appendChild(taskSubmitBtn);

        taskForm.addEventListener("submit", function(e) {
            e.preventDefault();
            const text = taskInput.value.trim();
            if (!text) return;

            if (!Array.isArray(project.tasks)) {
                project.tasks = [];
            }

            const newTask = {
                id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                text: text,
                completed: false
            };

            project.tasks.push(newTask);
            saveProjects();
            taskInput.value = "";
            renderProjects();
        });

        tasksContainer.appendChild(taskForm);
        card.appendChild(tasksContainer);

        return card;
    }

    function updateCardProgress(card, project) {
        const tasks = Array.isArray(project.tasks) ? project.tasks : [];
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(function(t) { return Boolean(t.completed); }).length;
        const percent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

        const label = card.querySelector(".project-progress-label");
        const percentEl = card.querySelector(".project-progress-percent");
        const fill = card.querySelector(".project-progress-fill");

        if (label) {
            label.textContent = totalTasks === 0 ? "No tasks added yet" : `${completedTasks} of ${totalTasks} completed`;
        }
        if (percentEl) {
            percentEl.textContent = totalTasks === 0 ? "0%" : `${percent}%`;
        }
        if (fill) {
            fill.style.width = `${percent}%`;
        }
    }

    function renderProjects() {
        if (!projectsListEl) return;
        if (projectsCountEl) {
            projectsCountEl.textContent = projects.length;
        }

        projectsListEl.innerHTML = "";

        if (projects.length === 0) {
            projectsListEl.innerHTML = `
                <div class="projects-empty">
                    <div class="projects-empty-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                    <div class="projects-empty-title">No projects yet</div>
                    <div class="projects-empty-subtitle">Create a project to group milestones, track task completion, and organize initiatives.</div>
                </div>
            `;
            return;
        }

        projects.forEach(function(project) {
            projectsListEl.appendChild(createProjectCardElement(project));
        });
    }

    if (newProjectBtn && newProjectCard) {
        newProjectBtn.addEventListener("click", function() {
            newProjectCard.classList.toggle("hidden");
            if (!newProjectCard.classList.contains("hidden") && titleInput) {
                titleInput.focus();
            }
        });
    }

    if (cancelProjectBtn && newProjectCard) {
        cancelProjectBtn.addEventListener("click", function() {
            newProjectCard.classList.add("hidden");
            if (createProjectForm) createProjectForm.reset();
            setSelectedColor("default");
        });
    }

    if (createProjectForm) {
        createProjectForm.addEventListener("submit", function(e) {
            e.preventDefault();
            const title = titleInput.value.trim();
            if (!title) return;

            const desc = descInput ? descInput.value.trim() : "";
            const dueDate = dateInput ? dateInput.value : "";
            const color = getSelectedColor();

            const newProject = {
                id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                title: title,
                description: desc,
                dueDate: dueDate,
                color: color,
                createdAt: new Date().toISOString(),
                tasks: []
            };

            projects.unshift(newProject);
            saveProjects();
            createProjectForm.reset();
            setSelectedColor("default");
            if (newProjectCard) newProjectCard.classList.add("hidden");
            renderProjects();
        });
    }

    if (window.EasyThereFirebase) {
        window.EasyThereFirebase.onUserChanged(async function(user) {
            if (user) {
                const cloudProjects = await window.EasyThereFirebase.fetchProjectsFromCloud();
                if (cloudProjects && Array.isArray(cloudProjects)) {
                    projects = cloudProjects;
                    try {
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
                    } catch (e) {}
                    renderProjects();
                } else if (projects.length > 0) {
                    window.EasyThereFirebase.syncProjectsToCloud(projects);
                }
            }
        });
    }

    window.EasyThereProjects = {
        reload: function() {
            projects = loadProjects();
            renderProjects();
        },
        getProjects: loadProjects
    };

    renderProjects();
})();