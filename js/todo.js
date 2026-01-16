const TodoManager = {
    DB_KEY: 'experiments_todos',

    generateId(prefix = 'id') {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        return `${prefix}-${timestamp}-${random}`;
    },

    load() {
        try {
            const raw = localStorage.getItem(this.DB_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];

            // MIGRATION: 
            // Convert legacy 'subtasks' array to 'checklists' array structure
            parsed.forEach(t => {
                // If has subtasks but no checklists, migrate
                if (t.subtasks && (!t.checklists || t.checklists.length === 0)) {
                    t.checklists = [{
                        id: this.generateId('cl'),
                        title: 'Checklist',
                        isCollapsed: false,
                        items: t.subtasks
                    }];
                    delete t.subtasks;
                }
                // Ensure checklists array exists
                if (!t.checklists) t.checklists = [];
            });

            return parsed;
        } catch (error) {
            console.error('Failed to load todos:', error);
            return [];
        }
    },

    save(todos) {
        try {
            localStorage.setItem(this.DB_KEY, JSON.stringify(todos));
            return true;
        } catch (error) {
            console.error('Failed to save todos:', error);
            if (window.App && window.App.showToast) {
                window.App.showToast('Failed to save tasks. Storage may be full.');
            }
            return false;
        }
    },

    getAll() {
        return this.load();
    },

    add(todoData) {
        const todos = this.load();
        const newTodo = {
            id: this.generateId('todo'),
            title: todoData.title || 'New Task',
            notes: todoData.notes || '',
            checklists: [], // Start with empty checklists array
            completed: false,
            hidden: false,
            createdAt: new Date().toISOString()
        };
        // Add default checklist if subtasks provided
        if (todoData.subtasks && todoData.subtasks.length > 0) {
            newTodo.checklists.push({
                id: this.generateId('cl'),
                title: 'Checklist',
                isCollapsed: false,
                items: todoData.subtasks
            });
        }

        todos.push(newTodo);
        this.save(todos);
        return newTodo;
    },

    update(id, updates) {
        const todos = this.load();
        const index = todos.findIndex(t => t.id === id);
        if (index === -1) return null;

        todos[index] = { ...todos[index], ...updates };
        this.save(todos);
        return todos[index];
    },

    delete(id) {
        const todos = this.load();
        const filtered = todos.filter(t => t.id !== id);
        if (filtered.length === todos.length) return false;
        this.save(filtered);
        return true;
    },

    toggle(id) {
        const todos = this.load();
        const todo = todos.find(t => t.id === id);
        if (!todo) return null;
        return this.update(id, { completed: !todo.completed });
    },

    toggleHidden(id) {
        const todos = this.load();
        const todo = todos.find(t => t.id === id);
        if (!todo) return null;
        return this.update(id, { hidden: !todo.hidden });
    },

    reorder(orderedIds) {
        const todos = this.load();

        // Items in the new order
        const reordered = orderedIds
            .map(id => todos.find(t => t.id === id))
            .filter(Boolean);

        // FIX: Items NOT in the new order (e.g., hidden tasks)
        // Preserve these instead of deleting them.
        const others = todos.filter(t => !orderedIds.includes(t.id));

        this.save([...reordered, ...others]);
    },

    // --- Checklist Methods ---

    addChecklist(todoId, title = 'Checklist') {
        const todo = this.load().find(t => t.id === todoId);
        if (!todo) return null;

        const newChecklist = {
            id: this.generateId('cl'),
            title: title,
            isCollapsed: false,
            items: []
        };

        // Push to existing checklists
        const checklists = todo.checklists || [];
        checklists.push(newChecklist);

        return this.update(todoId, { checklists });
    },

    deleteChecklist(todoId, checklistId) {
        const todo = this.load().find(t => t.id === todoId);
        if (!todo) return null;

        const checklists = (todo.checklists || []).filter(cl => cl.id !== checklistId);
        return this.update(todoId, { checklists });
    },

    updateChecklist(todoId, checklistId, updates) {
        const todo = this.load().find(t => t.id === todoId);
        if (!todo) return null;

        const checklists = (todo.checklists || []).map(cl =>
            cl.id === checklistId ? { ...cl, ...updates } : cl
        );
        return this.update(todoId, { checklists });
    },

    // --- Subtask Item Methods ---

    addSubtaskItem(todoId, checklistId, text) {
        const todo = this.load().find(t => t.id === todoId);
        if (!todo) return null;

        const checklists = todo.checklists || [];
        const checklistIndex = checklists.findIndex(cl => cl.id === checklistId);
        if (checklistIndex === -1) return null;

        // Add item
        checklists[checklistIndex].items.push({
            id: this.generateId('sub'),
            text: text,
            completed: false
        });

        return this.update(todoId, { checklists });
    },

    updateSubtaskItem(todoId, subtaskId, updates) {
        const todo = this.load().find(t => t.id === todoId);
        if (!todo) return null;

        // Find subtask in ANY checklist
        let found = false;
        const checklists = (todo.checklists || []).map(cl => {
            if (found) return cl; // Optimization: skip if already found (though map needs to return all)

            const itemIndex = cl.items.findIndex(i => i.id === subtaskId);
            if (itemIndex > -1) {
                found = true;
                const newItems = [...cl.items];
                newItems[itemIndex] = { ...newItems[itemIndex], ...updates };
                return { ...cl, items: newItems };
            }
            return cl;
        });

        if (!found) return null;
        return this.update(todoId, { checklists });
    },

    deleteSubtaskItem(todoId, subtaskId) {
        const todo = this.load().find(t => t.id === todoId);
        if (!todo) return null;

        const checklists = (todo.checklists || []).map(cl => ({
            ...cl,
            items: cl.items.filter(i => i.id !== subtaskId)
        }));

        return this.update(todoId, { checklists });
    },

    toggleSubtaskItem(todoId, subtaskId) {
        const todo = this.load().find(t => t.id === todoId);
        if (!todo) return null;

        // Find the item to get current status
        const allItems = this.getAllSubtasks(todo);
        const item = allItems.find(i => i.id === subtaskId);
        if (!item) return null;

        return this.updateSubtaskItem(todoId, subtaskId, { completed: !item.completed });
    },

    reorderSubtaskItems(todoId, checklistId, orderedIds) {
        const todo = this.load().find(t => t.id === todoId);
        if (!todo) return null;

        const checklists = todo.checklists || [];
        const clIndex = checklists.findIndex(cl => cl.id === checklistId);
        if (clIndex === -1) return null;

        const originalItems = checklists[clIndex].items;
        // Map orderedIds to items, filtering out any missing ones
        const reorderedItems = orderedIds
            .map(id => originalItems.find(i => i.id === id))
            .filter(Boolean);

        // Update specific checklist
        const newChecklists = [...checklists];
        newChecklists[clIndex] = { ...newChecklists[clIndex], items: reorderedItems };

        return this.update(todoId, { checklists: newChecklists });
    },

    /**
     * Reorder checklists within a todo
     * @param {string} todoId - ID of the todo
     * @param {string[]} orderedChecklistIds - Array of checklist IDs in new order
     */
    reorderChecklists(todoId, orderedChecklistIds) {
        const todo = this.load().find(t => t.id === todoId);
        if (!todo) return null;

        const original = todo.checklists || [];
        const reordered = orderedChecklistIds
            .map(id => original.find(cl => cl.id === id))
            .filter(Boolean);

        return this.update(todoId, { checklists: reordered });
    },

    // --- Helpers ---

    /**
     * Get all subtasks flattened from all checklists
     */
    getAllSubtasks(todo) {
        if (!todo || !todo.checklists) return [];
        return todo.checklists.flatMap(cl => cl.items || []);
    }
};
