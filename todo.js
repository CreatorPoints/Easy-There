const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");

form.addEventListener("submit", function(event) {
    event.preventDefault();
    const todo = input.value.trim();
    if (!todo) return;

    const item = document.createElement("div");
    item.className = "todo-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";

    const text = document.createElement("span");
    text.textContent = todo;

    checkbox.addEventListener("change", function() {
        if (checkbox.checked) {
            item.classList.add("completed");
        } else {
            item.classList.remove("completed");
        }
    });

    item.appendChild(checkbox);
    item.appendChild(text);
    list.appendChild(item);
    input.value = "";
});
