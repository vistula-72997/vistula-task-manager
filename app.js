let CONFIG = {};

async function init() {
    try {
        const response = await fetch('./config.json');

        if (!response.ok) {
            throw new Error('Cannot load config.json');
        }

        CONFIG = await response.json();

        if (!CONFIG.supabaseUrl || !CONFIG.supabasePublishableKey ||
            CONFIG.tableName !== 'tasks') {
            throw new Error('Invalid Supabase configuration');
        }

        CONFIG.supabaseUrl = CONFIG.supabaseUrl.replace(/\/+$/, '');

        await loadTasks();

    } catch (err) {
        showError('Initialization error: ' + err.message);
    }
}

function showError(message) {
    document.getElementById('status-message').textContent = message;
}

function apiUrl(query = '') {
    return `${CONFIG.supabaseUrl}/rest/v1/${CONFIG.tableName}${query}`;
}

function apiHeaders(json = false) {
    const headers = {
        'apikey': CONFIG.supabasePublishableKey
    };

    if (json) {
        headers['Content-Type'] = 'application/json';
        headers['Prefer'] = 'return=minimal';
    }

    return headers;
}

async function apiRequest(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
    }

    if (response.status === 204 || response.status === 201) return null;

    const text = await response.text();
    return text ? JSON.parse(text) : null;
}

async function loadTasks() {
    try {
        const tasks = await apiRequest(
            apiUrl('?select=*&order=id.asc'),
            { headers: apiHeaders() }
        );

        renderTasks(tasks);
        showError('');

    } catch (err) {
        showError('Failed to fetch tasks: ' + err.message);
    }
}

function renderTasks(tasks) {
    const list = document.getElementById('task-list');
    list.replaceChildren();

    if (!Array.isArray(tasks)) {
        showError('Invalid tasks data.');
        return;
    }

    tasks.forEach(task => {
        const div = document.createElement('div');
        div.className = 'task-item' +
            (task.completed ? ' completed' : '');
        div.dataset.id = task.id;

        const title = document.createElement('h3');
        title.className = 'task-title';
        title.textContent = task.title;

        const description = document.createElement('p');
        description.className = 'task-description';
        description.textContent = task.description || '';

        const status = document.createElement('p');
        status.innerHTML = 'Status: ';

        const statusValue = document.createElement('span');
        statusValue.className = 'task-status';
        statusValue.textContent =
            task.completed ? 'Completed' : 'Pending';

        status.appendChild(statusValue);

        const toggle = document.createElement('button');
        toggle.className = 'toggle-task';
        toggle.dataset.action = 'toggle';
        toggle.textContent =
            task.completed ? 'Mark Incomplete' : 'Complete';

        const edit = document.createElement('button');
        edit.className = 'edit-task';
        edit.dataset.action = 'edit';
        edit.textContent = 'Edit';

        const remove = document.createElement('button');
        remove.className = 'delete-task';
        remove.dataset.action = 'delete';
        remove.textContent = 'Delete';

        div.append(title, description, status, toggle, edit, remove);
        list.appendChild(div);
    });
}

document.getElementById('task-form').addEventListener(
    'submit',
    async (event) => {
        event.preventDefault();

        const id = document.getElementById('task-id').value;
        const title = document.getElementById('task-title').value.trim();
        const description =
            document.getElementById('task-description').value.trim();

        if (!title) {
            showError('Task title is required.');
            return;
        }

        const url = id
            ? apiUrl(`?id=eq.${encodeURIComponent(id)}`)
            : apiUrl();

        const options = {
            method: id ? 'PATCH' : 'POST',
            headers: apiHeaders(true),
            body: JSON.stringify({ title, description })
        };

        try {
            await apiRequest(url, options);

            document.getElementById('task-form').reset();
            document.getElementById('task-id').value = '';
            document.getElementById('task-submit').textContent = 'Add Task';

            showError('Task saved successfully.');
            await loadTasks();

        } catch (err) {
            showError('Failed to save task: ' + err.message);
        }
    }
);

document.getElementById('task-list').addEventListener(
    'click',
    async (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;

        const task = button.closest('.task-item');
        const id = task.dataset.id;
        const action = button.dataset.action;

        try {
            if (action === 'delete') {
                if (!confirm('Delete this task?')) return;

                await apiRequest(
                    apiUrl(`?id=eq.${encodeURIComponent(id)}`),
                    {
                        method: 'DELETE',
                        headers: apiHeaders()
                    }
                );

                showError('Task deleted.');
            }

            if (action === 'toggle') {
                const completed =
                    task.querySelector('.task-status').textContent !==
                    'Completed';

                await apiRequest(
                    apiUrl(`?id=eq.${encodeURIComponent(id)}`),
                    {
                        method: 'PATCH',
                        headers: apiHeaders(true),
                        body: JSON.stringify({ completed })
                    }
                );

                showError('Task status updated.');
            }

            if (action === 'edit') {
                document.getElementById('task-id').value = id;

                document.getElementById('task-title').value =
                    task.querySelector('.task-title').textContent;

                document.getElementById('task-description').value =
                    task.querySelector('.task-description').textContent;

                document.getElementById('task-submit').textContent =
                    'Update Task';

                document.getElementById('task-title').focus();
                return;
            }

            await loadTasks();

        } catch (err) {
            showError('Operation failed: ' + err.message);
        }
    }
);

init();
