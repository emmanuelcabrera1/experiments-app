/**
 * Unit Tests for TodoManager
 * Run in browser console or include via script tag
 * 
 * Usage:
 * 1. Open experiments-web in browser
 * 2. Open DevTools Console
 * 3. Paste this file or load via script
 * 4. Tests run automatically, results in console
 */

const TodoTests = {
    passed: 0,
    failed: 0,
    originalData: null,

    /**
     * Simple assertion helper
     */
    assert(condition, message) {
        if (condition) {
            this.passed++;
            console.log(`✅ PASS: ${message}`);
        } else {
            this.failed++;
            console.error(`❌ FAIL: ${message}`);
        }
    },

    /**
     * Assert equality helper
     */
    assertEqual(actual, expected, message) {
        const pass = JSON.stringify(actual) === JSON.stringify(expected);
        if (pass) {
            this.passed++;
            console.log(`✅ PASS: ${message}`);
        } else {
            this.failed++;
            console.error(`❌ FAIL: ${message}`);
            console.error(`   Expected: ${JSON.stringify(expected)}`);
            console.error(`   Actual: ${JSON.stringify(actual)}`);
        }
    },

    /**
     * Setup - backup existing data
     */
    setup() {
        console.log('\n🧪 SETTING UP TESTS...');
        this.originalData = localStorage.getItem(TodoManager.DB_KEY);
        localStorage.removeItem(TodoManager.DB_KEY);
        console.log('   Backed up existing data, cleared storage\n');
    },

    /**
     * Teardown - restore original data
     */
    teardown() {
        console.log('\n🧹 CLEANING UP...');
        if (this.originalData) {
            localStorage.setItem(TodoManager.DB_KEY, this.originalData);
            console.log('   Restored original data');
        } else {
            localStorage.removeItem(TodoManager.DB_KEY);
            console.log('   Cleared test data');
        }
    },

    /**
     * Test: generateId creates unique IDs
     */
    testGenerateId() {
        console.log('\n📋 TEST: generateId()');

        const id1 = TodoManager.generateId('todo');
        const id2 = TodoManager.generateId('todo');

        this.assert(id1.startsWith('todo-'), 'ID starts with prefix');
        this.assert(id1 !== id2, 'Generated IDs are unique');
        this.assert(id1.length > 10, 'ID has sufficient length');
    },

    /**
     * Test: add creates todo with correct structure
     */
    testAdd() {
        console.log('\n📋 TEST: add()');

        const todo = TodoManager.add({ title: 'Test Task' });

        this.assert(todo.id.startsWith('todo-'), 'Has valid ID');
        this.assertEqual(todo.title, 'Test Task', 'Title is set correctly');
        this.assertEqual(todo.notes, '', 'Notes defaults to empty string');
        this.assertEqual(todo.subtasks, [], 'Subtasks defaults to empty array');
        this.assertEqual(todo.completed, false, 'Completed defaults to false');
        this.assert(todo.createdAt, 'Has createdAt timestamp');

        // Verify persistence
        const loaded = TodoManager.getAll();
        this.assertEqual(loaded.length, 1, 'Todo is persisted to storage');
    },

    /**
     * Test: getAll returns all todos
     */
    testGetAll() {
        console.log('\n📋 TEST: getAll()');

        // Clear and add fresh data
        localStorage.removeItem(TodoManager.DB_KEY);
        TodoManager.add({ title: 'Task 1' });
        TodoManager.add({ title: 'Task 2' });
        TodoManager.add({ title: 'Task 3' });

        const todos = TodoManager.getAll();
        this.assertEqual(todos.length, 3, 'Returns all 3 todos');
    },

    /**
     * Test: update modifies todo properties
     */
    testUpdate() {
        console.log('\n📋 TEST: update()');

        localStorage.removeItem(TodoManager.DB_KEY);
        const todo = TodoManager.add({ title: 'Original Title' });

        const updated = TodoManager.update(todo.id, {
            title: 'Updated Title',
            notes: 'Some notes'
        });

        this.assertEqual(updated.title, 'Updated Title', 'Title is updated');
        this.assertEqual(updated.notes, 'Some notes', 'Notes is updated');
        this.assertEqual(updated.id, todo.id, 'ID is unchanged');

        // Verify persistence
        const loaded = TodoManager.getAll().find(t => t.id === todo.id);
        this.assertEqual(loaded.title, 'Updated Title', 'Update is persisted');
    },

    /**
     * Test: delete removes todo
     */
    testDelete() {
        console.log('\n📋 TEST: delete()');

        localStorage.removeItem(TodoManager.DB_KEY);
        const todo = TodoManager.add({ title: 'To Delete' });

        const result = TodoManager.delete(todo.id);
        this.assertEqual(result, true, 'Delete returns true on success');

        const todos = TodoManager.getAll();
        this.assertEqual(todos.length, 0, 'Todo is removed from storage');

        // Test delete non-existent
        const result2 = TodoManager.delete('non-existent-id');
        this.assertEqual(result2, false, 'Delete returns false for non-existent ID');
    },

    /**
     * Test: toggle flips completed status
     */
    testToggle() {
        console.log('\n📋 TEST: toggle()');

        localStorage.removeItem(TodoManager.DB_KEY);
        const todo = TodoManager.add({ title: 'Toggle Test' });

        this.assertEqual(todo.completed, false, 'Initially not completed');

        const toggled1 = TodoManager.toggle(todo.id);
        this.assertEqual(toggled1.completed, true, 'First toggle sets to true');

        const toggled2 = TodoManager.toggle(todo.id);
        this.assertEqual(toggled2.completed, false, 'Second toggle sets to false');
    },

    /**
     * Test: reorder changes todo order
     */
    testReorder() {
        console.log('\n📋 TEST: reorder()');

        localStorage.removeItem(TodoManager.DB_KEY);
        const t1 = TodoManager.add({ title: 'First' });
        const t2 = TodoManager.add({ title: 'Second' });
        const t3 = TodoManager.add({ title: 'Third' });

        // Reorder to: Third, First, Second
        TodoManager.reorder([t3.id, t1.id, t2.id]);

        const todos = TodoManager.getAll();
        this.assertEqual(todos[0].title, 'Third', 'Third is now first');
        this.assertEqual(todos[1].title, 'First', 'First is now second');
        this.assertEqual(todos[2].title, 'Second', 'Second is now third');
    },

    /**
     * Test: addSubtask adds subtask to todo
     */
    testAddSubtask() {
        console.log('\n📋 TEST: addSubtask()');

        localStorage.removeItem(TodoManager.DB_KEY);
        const todo = TodoManager.add({ title: 'Parent Task' });

        const updated = TodoManager.addSubtask(todo.id, 'Subtask 1');
        this.assertEqual(updated.subtasks.length, 1, 'Subtask is added');
        this.assertEqual(updated.subtasks[0].text, 'Subtask 1', 'Subtask text is correct');
        this.assert(updated.subtasks[0].id.startsWith('sub-'), 'Subtask has valid ID');
        this.assertEqual(updated.subtasks[0].completed, false, 'Subtask defaults to not completed');

        // Add another
        const updated2 = TodoManager.addSubtask(todo.id, 'Subtask 2');
        this.assertEqual(updated2.subtasks.length, 2, 'Multiple subtasks can be added');
    },

    /**
     * Test: updateSubtask modifies subtask
     */
    testUpdateSubtask() {
        console.log('\n📋 TEST: updateSubtask()');

        localStorage.removeItem(TodoManager.DB_KEY);
        const todo = TodoManager.add({ title: 'Parent' });
        const withSub = TodoManager.addSubtask(todo.id, 'Original');
        const subId = withSub.subtasks[0].id;

        const updated = TodoManager.updateSubtask(todo.id, subId, { text: 'Updated Text' });
        this.assertEqual(updated.subtasks[0].text, 'Updated Text', 'Subtask text is updated');
    },

    /**
     * Test: deleteSubtask removes subtask
     */
    testDeleteSubtask() {
        console.log('\n📋 TEST: deleteSubtask()');

        localStorage.removeItem(TodoManager.DB_KEY);
        const todo = TodoManager.add({ title: 'Parent' });
        TodoManager.addSubtask(todo.id, 'Subtask 1');
        const withTwo = TodoManager.addSubtask(todo.id, 'Subtask 2');
        const subId = withTwo.subtasks[0].id;

        const updated = TodoManager.deleteSubtask(todo.id, subId);
        this.assertEqual(updated.subtasks.length, 1, 'Subtask is removed');
        this.assertEqual(updated.subtasks[0].text, 'Subtask 2', 'Correct subtask remains');
    },

    /**
     * Test: toggleSubtask flips subtask completed
     */
    testToggleSubtask() {
        console.log('\n📋 TEST: toggleSubtask()');

        localStorage.removeItem(TodoManager.DB_KEY);
        const todo = TodoManager.add({ title: 'Parent' });
        const withSub = TodoManager.addSubtask(todo.id, 'Subtask');
        const subId = withSub.subtasks[0].id;

        const toggled1 = TodoManager.toggleSubtask(todo.id, subId);
        this.assertEqual(toggled1.subtasks[0].completed, true, 'Subtask toggled to true');

        const toggled2 = TodoManager.toggleSubtask(todo.id, subId);
        this.assertEqual(toggled2.subtasks[0].completed, false, 'Subtask toggled back to false');
    },

    /**
     * Test: reorderSubtasks changes subtask order
     */
    testReorderSubtasks() {
        console.log('\n📋 TEST: reorderSubtasks()');

        localStorage.removeItem(TodoManager.DB_KEY);
        const todo = TodoManager.add({ title: 'Parent' });
        TodoManager.addSubtask(todo.id, 'First');
        TodoManager.addSubtask(todo.id, 'Second');
        const withThree = TodoManager.addSubtask(todo.id, 'Third');

        const ids = withThree.subtasks.map(s => s.id);
        // Reorder to: Third, First, Second
        TodoManager.reorderSubtasks(todo.id, [ids[2], ids[0], ids[1]]);

        const updated = TodoManager.getAll().find(t => t.id === todo.id);
        this.assertEqual(updated.subtasks[0].text, 'Third', 'Third is now first');
        this.assertEqual(updated.subtasks[1].text, 'First', 'First is now second');
        this.assertEqual(updated.subtasks[2].text, 'Second', 'Second is now third');
    },

    /**
     * Test: handles invalid data gracefully
     */
    testEdgeCases() {
        console.log('\n📋 TEST: Edge Cases');

        // Update non-existent todo
        const updateResult = TodoManager.update('fake-id', { title: 'X' });
        this.assertEqual(updateResult, null, 'Update non-existent returns null');

        // Toggle non-existent todo
        const toggleResult = TodoManager.toggle('fake-id');
        this.assertEqual(toggleResult, null, 'Toggle non-existent returns null');

        // Subtask on non-existent todo
        const subResult = TodoManager.addSubtask('fake-id', 'X');
        this.assertEqual(subResult, null, 'AddSubtask on non-existent returns null');

        // Corrupted localStorage
        localStorage.setItem(TodoManager.DB_KEY, 'not-json');
        const loadResult = TodoManager.load();
        this.assertEqual(loadResult, [], 'Corrupted data returns empty array');

        // Non-array data
        localStorage.setItem(TodoManager.DB_KEY, JSON.stringify({ not: 'array' }));
        const loadResult2 = TodoManager.load();
        this.assertEqual(loadResult2, [], 'Non-array data returns empty array');
    },

    /**
     * Run all tests
     */
    runAll() {
        console.clear();
        console.log('═══════════════════════════════════════════');
        console.log('   🧪 TodoManager Unit Tests');
        console.log('═══════════════════════════════════════════');

        this.passed = 0;
        this.failed = 0;

        this.setup();

        try {
            this.testGenerateId();
            this.testAdd();
            this.testGetAll();
            this.testUpdate();
            this.testDelete();
            this.testToggle();
            this.testReorder();
            this.testAddSubtask();
            this.testUpdateSubtask();
            this.testDeleteSubtask();
            this.testToggleSubtask();
            this.testReorderSubtasks();
            this.testEdgeCases();
        } finally {
            this.teardown();
        }

        console.log('\n═══════════════════════════════════════════');
        console.log(`   📊 RESULTS: ${this.passed} passed, ${this.failed} failed`);
        console.log('═══════════════════════════════════════════');

        return { passed: this.passed, failed: this.failed };
    }
};

// Auto-run if TodoManager is available
if (typeof TodoManager !== 'undefined') {
    TodoTests.runAll();
} else {
    console.error('❌ TodoManager not found. Make sure to run this in the experiments-web context.');
}
