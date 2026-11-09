let CONFIG = {};

async function init() {
    try {
        const response = await fetch('config.json');
        CONFIG = await response.json();
        loadTasks();
    } catch (err) {
        showError("Failed to load configuration.");
    }
}

function showError(msg) {
    document.getElementById('status-message').textContent = msg;
}

async function loadTasks() {
    try {
        const res = await fetch(`${CONFIG.supabaseUrl}${CONFIG.tableName}?select=*`, {
            headers: {
                'apikey': CONFIG.supabasePublishableKey,
                'Authorization': `Bearer ${CONFIG.supabasePublishableKey}`
            }
        });
        const tasks = await res.json();
        renderTasks(tasks);
    } catch (err) {
        showError("Failed to fetch tasks.");
    }
}

function renderTasks(tasks) {
    const list = document.getElementById('task-list');
    list.innerHTML = '';
    
    if (!Array.isArray(tasks)) {
        showError(tasks.message || "Failed to load tasks data.");
        return;
    }
    
    tasks.forEach(task => {
        const div = document.createElement('div');
        div.className = `task-item ${task.completed ? 'completed' : ''}`;
        div.setAttribute('data-id', task.id);
        
        div.innerHTML = `
            <h3 class="task-title">${escapeHtml(task.title)}</h3>
            <p class="task-description">${escapeHtml(task.description || '')}</p>
            <p>Status: <span class="task-status">${task.completed ? 'Completed' : 'Pending'}</span></p>
            <button class="toggle-task" onclick="toggleTask(${task.id}, ${!task.completed})">${task.completed ? 'Mark Incomplete' : 'Complete'}</button>
            <button class="edit-task" onclick="editTask(${task.id}, '${escapeHtml(task.title)}', '${escapeHtml(task.description || '')}')">Edit</button>
            <button class="delete-task" onclick="deleteTask(${task.id})">Delete</button>
        `;
        list.appendChild(div);
    });
}

document.getElementById('task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('task-id').value;
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;

    const method = id ? 'PATCH' : 'POST';
    const url = id ? `${CONFIG.supabaseUrl}${CONFIG.tableName}?id=eq.${id}` : `${CONFIG.supabaseUrl}${CONFIG.tableName}`;

    try {
        const res = await fetch(url, {
            method: method,
            headers: {
                'apikey': CONFIG.supabasePublishableKey,
                'Authorization': `Bearer ${CONFIG.supabasePublishableKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ title, description })
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || 'Operation failed');
        }

        document.getElementById('task-form').reset();
        document.getElementById('task-id').value = '';
        document.getElementById('task-submit').textContent = 'Add Task';
        showError(''); 
        loadTasks();
    } catch (err) {
        showError("Failed to save task: " + err.message);
    }
});

async function deleteTask(id) {
    try {
        const res = await fetch(`${CONFIG.supabaseUrl}${CONFIG.tableName}?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': CONFIG.supabasePublishableKey,
                'Authorization': `Bearer ${CONFIG.supabasePublishableKey}`
            }
        });
        if (!res.ok) throw new Error('Delete failed');
        loadTasks();
    } catch (err) {
        showError("Failed to delete task.");
    }
}

async function toggleTask(id, completed) {
    try {
        const res = await fetch(`${CONFIG.supabaseUrl}${CONFIG.tableName}?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
                'apikey': CONFIG.supabasePublishableKey,
                'Authorization': `Bearer ${CONFIG.supabasePublishableKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ completed })
        });
        if (!res.ok) throw new Error('Update failed');
        loadTasks();
    } catch (err) {
        showError("Failed to update status.");
    }
}

function editTask(id, title, description) {
    document.getElementById('task-id').value = id;
    document.getElementById('task-title').value = title;
    document.getElementById('task-description').value = description;
    document.getElementById('task-submit').textContent = 'Update Task';
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

init();
