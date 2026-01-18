/**
 * Unit Tests for TodoManager (Multi-Checklist Version)
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
        this.assertEqual(todo.checklists, [], 'Checklists defaults to empty array');
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
     * Test: addChecklist adds a new checklist
     */
    testAddChecklist() {
        console.log('\n📋 TEST: addChecklist()');
        localStorage.removeItem(TodoManager.DB_KEY);
        const todo = TodoManager.add({ title: 'Parent Task' });

        const updated = TodoManager.addChecklist(todo.id, 'My Checklist');
        this.assertEqual(updated.checklists.length, 1, 'Checklist added');
        this.assertEqual(updated.checklists[0].title, 'My Checklist', 'Title set correctly');
        this.assert(updated.checklists[0].id.startsWith('cl-'), 'Checklist ID generated');
        this.assertEqual(updated.checklists[0].items, [], 'Items initialized empty');
    },

    /**
     * Test: updateChecklist modifies checklist
     */
    testUpdateChecklist() {
        console.log('\n📋 TEST: updateChecklist()');
        localStorage.removeItem(TodoManager.DB_KEY);
        const todo = TodoManager.add({ title: 'Parent' });
        const withList = TodoManager.addChecklist(todo.id, 'Old Title');
        const listId = withList.checklists[0].id;

        const updated = TodoManager.updateChecklist(todo.id, listId, { title: 'New Title', isCollapsed: true });
        this.assertEqual(updated.checklists[0].title, 'New Title', 'Title updated');
        this.assertEqual(updated.checklists[0].isCollapsed, true, 'Collapsed state updated');
    },

    /**
     * Test: deleteChecklist removes checklist
     */
    testDeleteChecklist() {
        console.log('\n📋 TEST: deleteChecklist()');
        localStorage.removeItem(TodoManager.DB_KEY);
        const todo = TodoManager.add({ title: 'Parent' });
        const withList = TodoManager.addChecklist(todo.id, 'To Delete');
        const listId = withList.checklists[0].id;

        const updated = TodoManager.deleteChecklist(todo.id, listId);
        this.assertEqual(updated.checklists.length, 0, 'Checklist removed');
    },

    /**
     * Test: addSubtaskItem adds item to specific checklist
     */
    testAddSubtaskItem() {
        console.log('\n📋 TEST: addSubtaskItem()');
        localStorage.removeItem(TodoManager.DB_KEY);
        const todo = TodoManager.add({ title: 'Parent' });
        const withList = TodoManager.addChecklist(todo.id, 'Main');
        const listId = withList.checklists[0].id;

        const updated = TodoManager.addSubtaskItem(todo.id, listId, 'New Item');
        const items = updated.checklists[0].items;
        this.assertEqual(items.length, 1, 'Item added to checklist');
        this.assertEqual(items[0].text, 'New Item', 'Item text correct');
        this.assert(items[0].id.startsWith('sub-'), 'Item ID valid');
    },

    /**
     * Test: updateSubtaskItem modifies item
     */
    testUpdateSubtaskItem() {
        console.log('\n📋 TEST: updateSubtaskItem()');
        localStorage.removeItem(TodoManager.DB_KEY);
        const todo = TodoManager.add({ title: 'Parent' });
        const withList = TodoManager.addChecklist(todo.id, 'Main');
        const listId = withList.checklists[0].id;
        const withItem = TodoManager.addSubtaskItem(todo.id, listId, 'Old Text');
        const itemId = withItem.checklists[0].items[0].id;

        const updated = TodoManager.updateSubtaskItem(todo.id, itemId, { text: 'New Text', completed: true });
        const item = updated.checklists[0].items[0];

        this.assertEqual(item.text, 'New Text', 'Text updated');
        this.assertEqual(item.completed, true, 'Completion updated');
    },

    /**
     * Test: deleteSubtaskItem removes item
     */
    testDeleteSubtaskItem() {
        console.log('\n📋 TEST: deleteSubtaskItem()');
        localStorage.removeItem(TodoManager.DB_KEY);
        const todo = TodoManager.add({ title: 'Parent' });
        const withList = TodoManager.addChecklist(todo.id, 'Main');
        const listId = withList.checklists[0].id;
        const withItem = TodoManager.addSubtaskItem(todo.id, listId, 'To Delete');
        const itemId = withItem.checklists[0].items[0].id;

        const updated = TodoManager.deleteSubtaskItem(todo.id, itemId);
        this.assertEqual(updated.checklists[0].items.length, 0, 'Item deleted');
    },

    /**
     * Test: reorderSubtaskItems changes order within checklist
     */
    testReorderSubtaskItems() {
        console.log('\n📋 TEST: reorderSubtaskItems()');
        localStorage.removeItem(TodoManager.DB_KEY);
        const todo = TodoManager.add({ title: 'Parent' });
        const withList = TodoManager.addChecklist(todo.id, 'Main');
        const listId = withList.checklists[0].id;

        TodoManager.addSubtaskItem(todo.id, listId, '1');
        TodoManager.addSubtaskItem(todo.id, listId, '2');
        const withThree = TodoManager.addSubtaskItem(todo.id, listId, '3'); // Returns todo

        // Refetch IDs from the updated todo returned by last call
        const items = withThree.checklists[0].items;
        const ids = items.map(i => i.id);

        // Reorder: 3, 1, 2
        TodoManager.reorderSubtaskItems(todo.id, listId, [ids[2], ids[0], ids[1]]);

        const finalTodo = TodoManager.getAll().find(t => t.id === todo.id);
        const finalItems = finalTodo.checklists[0].items;

        this.assertEqual(finalItems[0].text, '3', 'Order correct 1');
        this.assertEqual(finalItems[1].text, '1', 'Order correct 2');
        this.assertEqual(finalItems[2].text, '2', 'Order correct 3');
    },

    /**
     * Test: reorderChecklists changes checklist order
     */
    testReorderChecklists() {
        console.log('\n📋 TEST: reorderChecklists()');
        localStorage.removeItem(TodoManager.DB_KEY);
        const todo = TodoManager.add({ title: 'Parent' });
        TodoManager.addChecklist(todo.id, 'First');
        TodoManager.addChecklist(todo.id, 'Second');
        const withThird = TodoManager.addChecklist(todo.id, 'Third');

        const ids = withThird.checklists.map(cl => cl.id);
        // Reorder: Third, First, Second
        TodoManager.reorderChecklists(todo.id, [ids[2], ids[0], ids[1]]);

        const final = TodoManager.getAll().find(t => t.id === todo.id);
        this.assertEqual(final.checklists[0].title, 'Third', 'Third is now first');
        this.assertEqual(final.checklists[1].title, 'First', 'First is now second');
        this.assertEqual(final.checklists[2].title, 'Second', 'Second is now third');
    },

    /**
     * Test: handles invalid data gracefully
     */
    testEdgeCases() {
        console.log('\n📋 TEST: Edge Cases');

        const updateResult = TodoManager.update('fake-id', { title: 'X' });
        this.assertEqual(updateResult, null, 'Update non-existent returns null');

        localStorage.setItem(TodoManager.DB_KEY, 'not-json');
        const loadResult = TodoManager.load();
        this.assertEqual(loadResult, [], 'Corrupted data returns empty array');
    },

    /**
     * Run all tests
     */
    runAll() {
        console.clear();
        console.log('═══════════════════════════════════════════');
        console.log('   🧪 TodoManager Unit Tests (Multi-List)');
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
            this.testAddChecklist();
            this.testUpdateChecklist();
            this.testDeleteChecklist();
            this.testAddSubtaskItem();
            this.testUpdateSubtaskItem();
            this.testDeleteSubtaskItem();
            this.testReorderSubtaskItems();
            this.testReorderChecklists();
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
