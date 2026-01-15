/**
 * Experiments - Todo Manager
 * Handles all Todo logic: CRUD, subtasks, persistence, and drag-and-drop state.
 * Storage Key: experiments_todos
 */

const TodoManager = {
    DB_KEY: 'experiments_todos',

    /**
     * Generate a unique ID
     * @param {string} prefix - Prefix for the ID (e.g., 'todo', 'sub')
     * @returns {string} Unique ID
     */
    generateId(prefix = 'id') {
        // Use timestamp + random string for uniqueness
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        return `${prefix}-${timestamp}-${random}`;
    },

    /**
     * Load todos from localStorage
     * @returns {Array} Array of TodoItem objects
     */
    load() {
        try {
            const raw = localStorage.getItem(this.DB_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            // Validate data structure
            if (!Array.isArray(parsed)) {
                console.warn('Invalid todos data structure, resetting');
                return [];
            }
            return parsed;
        } catch (error) {
            console.error('Failed to load todos from localStorage:', error);
            // Return empty array as fallback
            return [];
        }
    },

    /**
     * Save todos to localStorage
     * @param {Array} todos - Array of TodoItem objects
     * @returns {boolean} Success status
     */
    save(todos) {
        try {
            localStorage.setItem(this.DB_KEY, JSON.stringify(todos));
            return true;
        } catch (error) {
            console.error('Failed to save todos to localStorage:', error);
            // Show user-friendly error if possible
            if (window.App && window.App.showToast) {
                window.App.showToast('Failed to save tasks. Storage may be full.');
            }
            return false;
        }
    },

    /**
     * Get all todos
     * @returns {Array} Array of TodoItem objects
     */
    getAll() {
        return this.load();
    },

    /**
     * Add a new todo
     * @param {Object} todoData - { title, notes?, subtasks? }
     * @returns {Object} The created TodoItem
     */
    add(todoData) {
        const todos = this.load();
        const newTodo = {
            id: this.generateId('todo'),
            title: todoData.title || 'New Task',
            notes: todoData.notes || '',
            subtasks: todoData.subtasks || [],
            completed: false,
            createdAt: new Date().toISOString()
        };
        todos.push(newTodo);
        this.save(todos);
        return newTodo;
    },

    /**
     * Update an existing todo
     * @param {string} id - Todo ID
     * @param {Object} updates - Fields to update
     * @returns {Object|null} Updated todo or null if not found
     */
    update(id, updates) {
        const todos = this.load();
        const index = todos.findIndex(t => t.id === id);
        if (index === -1) return null;

        todos[index] = { ...todos[index], ...updates };
        this.save(todos);
        return todos[index];
    },

    /**
     * Delete a todo
     * @param {string} id - Todo ID
     * @returns {boolean} Success status
     */
    delete(id) {
        const todos = this.load();
        const filtered = todos.filter(t => t.id !== id);
        if (filtered.length === todos.length) return false;
        this.save(filtered);
        return true;
    },

    /**
     * Toggle todo completion status
     * @param {string} id - Todo ID
     * @returns {Object|null} Updated todo or null
     */
    toggle(id) {
        const todos = this.load();
        const todo = todos.find(t => t.id === id);
        if (!todo) return null;
        return this.update(id, { completed: !todo.completed });
    },

    /**
     * Reorder todos (for drag-and-drop)
     * @param {Array} orderedIds - Array of todo IDs in new order
     */
    reorder(orderedIds) {
        const todos = this.load();
        const reordered = orderedIds
            .map(id => todos.find(t => t.id === id))
            .filter(Boolean);
        this.save(reordered);
    },

    // --- Subtask Methods ---

    /**
     * Add a subtask to a todo
     * @param {string} todoId - Parent todo ID
     * @param {string} text - Subtask text
     * @returns {Object|null} Updated todo or null
     */
    addSubtask(todoId, text) {
        const todo = this.load().find(t => t.id === todoId);
        if (!todo) return null;

        const subtasks = todo.subtasks || [];
        subtasks.push({
            id: this.generateId('sub'),
            text: text,
            completed: false
        });
        return this.update(todoId, { subtasks });
    },

    /**
     * Update a subtask
     * @param {string} todoId - Parent todo ID
     * @param {string} subtaskId - Subtask ID
     * @param {Object} updates - Fields to update
     * @returns {Object|null} Updated todo or null
     */
    updateSubtask(todoId, subtaskId, updates) {
        const todo = this.load().find(t => t.id === todoId);
        if (!todo) return null;

        const subtasks = (todo.subtasks || []).map(s =>
            s.id === subtaskId ? { ...s, ...updates } : s
        );
        return this.update(todoId, { subtasks });
    },

    /**
     * Delete a subtask
     * @param {string} todoId - Parent todo ID
     * @param {string} subtaskId - Subtask ID
     * @returns {Object|null} Updated todo or null
     */
    deleteSubtask(todoId, subtaskId) {
        const todo = this.load().find(t => t.id === todoId);
        if (!todo) return null;

        const subtasks = (todo.subtasks || []).filter(s => s.id !== subtaskId);
        return this.update(todoId, { subtasks });
    },

    /**
     * Toggle subtask completion
     * @param {string} todoId - Parent todo ID
     * @param {string} subtaskId - Subtask ID
     * @returns {Object|null} Updated todo or null
     */
    toggleSubtask(todoId, subtaskId) {
        const todo = this.load().find(t => t.id === todoId);
        if (!todo) return null;

        const subtask = (todo.subtasks || []).find(s => s.id === subtaskId);
        if (!subtask) return null;

        return this.updateSubtask(todoId, subtaskId, { completed: !subtask.completed });
    },

    /**
     * Reorder subtasks within a todo
     * @param {string} todoId - Parent todo ID
     * @param {Array} orderedIds - Array of subtask IDs in new order
     * @returns {Object|null} Updated todo or null
     */
    reorderSubtasks(todoId, orderedIds) {
        const todo = this.load().find(t => t.id === todoId);
        if (!todo) return null;

        const subtasks = orderedIds
            .map(id => (todo.subtasks || []).find(s => s.id === id))
            .filter(Boolean);
        return this.update(todoId, { subtasks });
    }
};
