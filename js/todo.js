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

            let needsSave = false;

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
                    needsSave = true;
                }
                // Ensure checklists array exists
                if (!t.checklists) t.checklists = [];

                // MIGRATION: Add follow-up task properties
                if (!t.hasOwnProperty('sourceSubtaskId')) {
                    t.sourceSubtaskId = null;
                    t.sourceTaskId = null;
                    needsSave = true;
                }

                // MIGRATION: Add followUpTaskId to all subtask items
                if (t.checklists) {
                    t.checklists.forEach(checklist => {
                        if (checklist.items) {
                            checklist.items.forEach(item => {
                                if (!item.hasOwnProperty('followUpTaskId')) {
                                    item.followUpTaskId = null;
                                    needsSave = true;
                                }
                            });
                        }
                    });
                }
            });

            // Save if migrations were applied
            if (needsSave) {
                this.save(parsed);
            }

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
            hidden: todoData.hidden || false,
            createdAt: new Date().toISOString(),
            sourceSubtaskId: todoData.sourceSubtaskId || null,
            sourceTaskId: todoData.sourceTaskId || null
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
        const taskToDelete = todos.find(t => t.id === id);
        if (!taskToDelete) return false;

        // CASCADE DELETE: If deleting a parent task, delete all its follow-up tasks
        if (taskToDelete.checklists) {
            const followUpIds = [];
            taskToDelete.checklists.forEach(checklist => {
                checklist.items.forEach(item => {
                    if (item.followUpTaskId) {
                        followUpIds.push(item.followUpTaskId);
                    }
                });
            });

            // Remove the main task and all follow-ups
            const filtered = todos.filter(t =>
                t.id !== id && !followUpIds.includes(t.id)
            );
            this.save(filtered);
            return true;
        }

        // CLEANUP: If deleting a follow-up task, clear the subtask reference
        if (taskToDelete.sourceTaskId && taskToDelete.sourceSubtaskId) {
            const parentTask = todos.find(t => t.id === taskToDelete.sourceTaskId);
            if (parentTask) {
                const result = this.findSubtaskInTodo(parentTask, taskToDelete.sourceSubtaskId);
                if (result && result.item.followUpTaskId === id) {
                    result.item.followUpTaskId = null;
                }
            }
        }

        // Remove the task
        const filtered = todos.filter(t => t.id !== id);
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
            completed: false,
            followUpTaskId: null
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
        const todos = this.load();
        const todo = todos.find(t => t.id === todoId);
        if (!todo) return null;

        // Find the item and its checklist
        const result = this.findSubtaskInTodo(todo, subtaskId);
        if (!result) return null;

        const { checklist, item } = result;
        const newCompletedState = !item.completed;

        // FOLLOW-UP LOGIC
        if (newCompletedState === true) {
            // ✅ Subtask just checked → Create follow-up task

            // Create new hidden task
            const followUpTask = {
                id: this.generateId('todo'),
                title: item.text,
                notes: `Follow-up from: ${todo.title}${checklist.title ? ' → ' + checklist.title : ''}`,
                checklists: [],
                completed: false,
                hidden: true, // Start in hidden section
                createdAt: new Date().toISOString(),
                sourceSubtaskId: subtaskId,
                sourceTaskId: todoId
            };

            // Add to todos array
            todos.push(followUpTask);

            // Update subtask item with reference
            item.completed = true;
            item.followUpTaskId = followUpTask.id;

            // Save all changes
            this.save(todos);

            // Show notification if App is available
            if (window.App && window.App.showToast) {
                window.App.showToast(`Follow-up created: ${item.text}`, 'success');
            }

            return todo;

        } else if (newCompletedState === false && item.followUpTaskId) {
            // ❌ Subtask unchecked → Delete follow-up task

            // Find and remove follow-up task
            const filteredTodos = todos.filter(t => t.id !== item.followUpTaskId);

            // Update subtask item
            item.completed = false;
            item.followUpTaskId = null;

            // Save all changes
            this.save(filteredTodos);

            // Show notification
            if (window.App && window.App.showToast) {
                window.App.showToast('Follow-up task removed', 'info');
            }

            return todo;

        } else {
            // Normal toggle without follow-up
            item.completed = newCompletedState;
            this.save(todos);
            return todo;
        }
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
    },

    /**
     * Get the follow-up task for a given subtask
     * @param {string} subtaskId - ID of the subtask
     * @returns {Object|null} The follow-up task or null if not found
     */
    getFollowUpTask(subtaskId) {
        const todos = this.load();

        // Find the subtask item first to get its followUpTaskId
        for (const todo of todos) {
            const allItems = this.getAllSubtasks(todo);
            const item = allItems.find(i => i.id === subtaskId);
            if (item && item.followUpTaskId) {
                // Find and return the follow-up task
                return todos.find(t => t.id === item.followUpTaskId) || null;
            }
        }

        return null;
    },

    /**
     * Get the source subtask and parent task for a follow-up task
     * @param {string} taskId - ID of the follow-up task
     * @returns {Object|null} Object with {parentTask, checklist, subtask} or null
     */
    getSourceSubtask(taskId) {
        const todos = this.load();
        const followUpTask = todos.find(t => t.id === taskId);

        if (!followUpTask || !followUpTask.sourceTaskId || !followUpTask.sourceSubtaskId) {
            return null;
        }

        const parentTask = todos.find(t => t.id === followUpTask.sourceTaskId);
        if (!parentTask) return null;

        // Find the subtask and its checklist
        for (const checklist of (parentTask.checklists || [])) {
            const subtask = checklist.items.find(i => i.id === followUpTask.sourceSubtaskId);
            if (subtask) {
                return {
                    parentTask,
                    checklist,
                    subtask
                };
            }
        }

        return null;
    },

    /**
     * Find a subtask item within a todo and return both the item and its checklist
     * @param {Object} todo - The todo object
     * @param {string} subtaskId - ID of the subtask
     * @returns {Object|null} Object with {checklist, item} or null
     */
    findSubtaskInTodo(todo, subtaskId) {
        if (!todo || !todo.checklists) return null;

        for (const checklist of todo.checklists) {
            const item = checklist.items.find(i => i.id === subtaskId);
            if (item) {
                return { checklist, item };
            }
        }

        return null;
    },

    /**
     * Clean up orphaned follow-up tasks and broken references
     * Run this on app initialization to maintain data integrity
     * @returns {Object} Cleanup statistics
     */
    cleanupOrphanedFollowUps() {
        const todos = this.load();
        let orphanedTasksRemoved = 0;
        let brokenReferencesFixed = 0;

        // Step 1: Find all valid follow-up task IDs
        const validFollowUpIds = new Set();
        todos.forEach(todo => {
            if (todo.checklists) {
                todo.checklists.forEach(checklist => {
                    checklist.items.forEach(item => {
                        if (item.followUpTaskId) {
                            validFollowUpIds.add(item.followUpTaskId);
                        }
                    });
                });
            }
        });

        // Step 2: Remove follow-up tasks with broken source references
        const tasksToKeep = todos.filter(todo => {
            // If it's a follow-up task
            if (todo.sourceTaskId && todo.sourceSubtaskId) {
                // Check if parent task still exists
                const parentExists = todos.some(t => t.id === todo.sourceTaskId);
                if (!parentExists) {
                    orphanedTasksRemoved++;
                    return false; // Remove this orphaned task
                }

                // Check if it's still referenced by its source subtask
                if (!validFollowUpIds.has(todo.id)) {
                    orphanedTasksRemoved++;
                    return false; // Remove unreferenced follow-up
                }
            }
            return true; // Keep the task
        });

        // Step 3: Fix subtask references pointing to non-existent follow-ups
        const allTaskIds = new Set(tasksToKeep.map(t => t.id));
        tasksToKeep.forEach(todo => {
            if (todo.checklists) {
                todo.checklists.forEach(checklist => {
                    checklist.items.forEach(item => {
                        if (item.followUpTaskId && !allTaskIds.has(item.followUpTaskId)) {
                            item.followUpTaskId = null;
                            brokenReferencesFixed++;
                        }
                    });
                });
            }
        });

        // Save if anything changed
        if (orphanedTasksRemoved > 0 || brokenReferencesFixed > 0) {
            this.save(tasksToKeep);
        }

        return {
            orphanedTasksRemoved,
            brokenReferencesFixed,
            totalCleaned: orphanedTasksRemoved + brokenReferencesFixed
        };
    }
};
