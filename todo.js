const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");

const STORAGE_KEY = "easy_there_todos";
let todos = loadTodos();

function loadTodos() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveTodos() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (e) {}
    if (window.EasyThereFirebase) {
        window.EasyThereFirebase.syncTodosToCloud(todos);
    }
}

function createTodoElement(todo) {
    const item = document.createElement("div");
    item.className = "todo-item";
    if (todo.completed) {
        item.classList.add("completed");
    }

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(todo.completed);

    const text = document.createElement("span");
    text.textContent = todo.text;

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "todo-delete-btn";
    deleteBtn.setAttribute("aria-label", "Delete task");
    deleteBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

    checkbox.addEventListener("change", function() {
        todo.completed = checkbox.checked;
        if (checkbox.checked) {
            item.classList.add("completed");
        } else {
            item.classList.remove("completed");
        }
        saveTodos();
    });

    deleteBtn.addEventListener("click", function() {
        todos = todos.filter(function(t) {
            return t !== todo;
        });
        saveTodos();
        item.remove();
    });

    item.appendChild(checkbox);
    item.appendChild(text);
    item.appendChild(deleteBtn);
    return item;
}

function renderTodos() {
    list.innerHTML = "";
    todos.forEach(function(todo) {
        list.appendChild(createTodoElement(todo));
    });
}

form.addEventListener("submit", function(event) {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    const newTodo = {
        text: text,
        completed: false
    };

    todos.push(newTodo);
    saveTodos();
    list.appendChild(createTodoElement(newTodo));
    input.value = "";
});

if (window.EasyThereFirebase) {
    window.EasyThereFirebase.onUserChanged(async function(user) {
        if (user) {
            const cloudTodos = await window.EasyThereFirebase.fetchTodosFromCloud();
            if (cloudTodos && Array.isArray(cloudTodos)) {
                todos = cloudTodos;
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
                } catch (e) {}
                renderTodos();
            } else {
                window.EasyThereFirebase.syncTodosToCloud(todos);
            }
        }
    });
}

renderTodos();
