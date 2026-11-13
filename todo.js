form.addEventListener("submit", function(event) {
    event.preventDefault();
    const todo = input.value.trim();
    if(!todo) return;
    const item = document.createElement("li");
    item.textContent = todo;
    item.addEventListener("click", function() {
        item.style.textDecoration = "line-through"
        ? "none"
        : "line-through";
    })
    list.appendChild(item);
    input.value = "";
})