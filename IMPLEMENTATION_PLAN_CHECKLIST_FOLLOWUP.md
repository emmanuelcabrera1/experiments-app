# Implementation Plan: Checklist Item → Hidden Follow-up Task

## Executive Summary

**Feature Request**: When a subtask/checklist item is checked within a task, automatically create a corresponding follow-up task in the main Todo view's HIDDEN section.

**Business Value**: Enables workflow automation where completed subtasks trigger follow-up activities, improving task continuity and preventing dropped items.

**Complexity**: Medium (Score: 6/10)
- Data model extension required
- Event flow modification
- Bi-directional relationship management
- UI feedback considerations

---

## 1. Requirements Analysis

### 1.1 Functional Requirements

**PRIMARY BEHAVIOR**:
- ✅ **FR-1**: When a checklist item is checked → create a new task in HIDDEN section
- ✅ **FR-2**: Follow-up task title = subtask text
- ✅ **FR-3**: Follow-up task starts in `hidden: true` state
- ✅ **FR-4**: Relationship tracking between source subtask and follow-up task

**SECONDARY BEHAVIOR**:
- ⚠️ **FR-5**: When subtask is unchecked → delete the follow-up task
- ⚠️ **FR-6**: Visual indicator in subtask showing follow-up exists
- ⚠️ **FR-7**: Clicking indicator navigates to follow-up task
- ⚠️ **FR-8**: Configuration to enable/disable feature globally

### 1.2 Non-Functional Requirements

- **NFR-1**: Performance - No noticeable lag when checking items (<100ms)
- **NFR-2**: Data Integrity - No orphaned references after deletions
- **NFR-3**: Backward Compatibility - Existing tasks continue to work
- **NFR-4**: Accessibility - Screen readers announce follow-up creation
- **NFR-5**: Mobile-First - Works on touch devices (tested in screenshots)

### 1.3 Edge Cases & Constraints

| Edge Case | Handling Strategy |
|-----------|-------------------|
| Subtask checked while parent task is completed | ✅ Allow - follow-up is independent |
| Parent task deleted | 🔴 **CRITICAL**: Cleanup follow-up tasks |
| Follow-up task manually deleted | ✅ Break reference, keep subtask checked |
| Duplicate subtask text across checklists | ✅ Each gets separate follow-up |
| Network/storage failure during creation | ⚠️ Rollback subtask check state |
| Rapid checking/unchecking (debounce) | ✅ Use 300ms debounce window |

---

## 2. Technical Design

### 2.1 Data Model Changes

#### **Modified TodoManager Data Structure** (`js/todo.js`)

```javascript
// BEFORE (Current SubtaskItem model)
{
  id: "sub-{id}",
  text: "Subtask text",
  completed: false
}

// AFTER (Enhanced SubtaskItem model)
{
  id: "sub-{id}",
  text: "Subtask text",
  completed: false,
  followUpTaskId: null  // NEW: ID of created follow-up task (if any)
}
```

```javascript
// BEFORE (Current Task model)
{
  id: "todo-{id}",
  title: "Task Title",
  // ... other properties
}

// AFTER (Enhanced Task model)
{
  id: "todo-{id}",
  title: "Task Title",
  // ... other properties
  sourceSubtaskId: null,    // NEW: If this is a follow-up task
  sourceTaskId: null         // NEW: Parent task that contains source subtask
}
```

#### **Migration Strategy**

```javascript
// Add to TodoManager.load() - lines 47-86
function migrateToFollowUpSchema(todos) {
  let needsSave = false;

  todos.forEach(todo => {
    // Add sourceSubtaskId/sourceTaskId if missing
    if (!todo.hasOwnProperty('sourceSubtaskId')) {
      todo.sourceSubtaskId = null;
      todo.sourceTaskId = null;
      needsSave = true;
    }

    // Add followUpTaskId to all subtask items
    if (todo.checklists) {
      todo.checklists.forEach(checklist => {
        checklist.items.forEach(item => {
          if (!item.hasOwnProperty('followUpTaskId')) {
            item.followUpTaskId = null;
            needsSave = true;
          }
        });
      });
    }
  });

  if (needsSave) {
    TodoManager.save(todos);
  }

  return todos;
}
```

### 2.2 Core Algorithm

#### **Pseudocode: Toggle Subtask with Follow-up Logic**

```javascript
function toggleSubtaskWithFollowUp(todoId, subtaskId) {
  // 1. Load current state
  const todos = TodoManager.load();
  const todo = todos.find(t => t.id === todoId);
  const { checklist, item } = findSubtaskItem(todo, subtaskId);

  // 2. Toggle completion state
  const newCompletedState = !item.completed;
  item.completed = newCompletedState;

  // 3. FOLLOW-UP CREATION LOGIC
  if (newCompletedState === true) {
    // ✅ Subtask just checked → Create follow-up task

    // 3a. Create new task
    const followUpTask = {
      id: generateId('todo'),
      title: item.text,  // Use subtask text as title
      notes: `Follow-up from: ${todo.title} → ${checklist.title}`,
      checklists: [],
      completed: false,
      hidden: true,  // 🎯 KEY: Start in hidden section
      createdAt: new Date().toISOString(),
      sourceSubtaskId: subtaskId,
      sourceTaskId: todoId
    };

    // 3b. Add to todos array
    todos.push(followUpTask);

    // 3c. Link back from subtask
    item.followUpTaskId = followUpTask.id;

    // 3d. Show toast notification
    showToast(`Follow-up created: ${item.text}`, 'success');

  } else if (newCompletedState === false && item.followUpTaskId) {
    // ❌ Subtask unchecked → Delete follow-up task

    // 3e. Find and remove follow-up task
    const followUpIndex = todos.findIndex(t => t.id === item.followUpTaskId);
    if (followUpIndex !== -1) {
      todos.splice(followUpIndex, 1);
      showToast('Follow-up task removed', 'info');
    }

    // 3f. Clear reference
    item.followUpTaskId = null;
  }

  // 4. Save and refresh UI
  TodoManager.save(todos);
  App.render();
}
```

### 2.3 Integration Points

#### **File: `js/todo.js`**

| Method | Changes | Line Est. |
|--------|---------|-----------|
| `TodoManager.load()` | Add migration function | +25 |
| `TodoManager.toggleSubtaskItem()` | Add follow-up creation/deletion logic | +50 |
| `TodoManager.delete()` | Add cascade delete for follow-ups | +15 |
| New: `TodoManager.getFollowUpTask()` | Fetch follow-up for subtask | +10 |
| New: `TodoManager.getSourceSubtask()` | Fetch source subtask for follow-up | +20 |

**Total**: ~120 lines modified/added

#### **File: `js/app.js`**

| Section | Changes | Line Est. |
|---------|---------|-----------|
| Event Handler: `toggle-subtask` (line 2273) | Call new toggle method with follow-up logic | +5 |
| `renderTodoDetailModal()` (line 717) | Add visual indicator for linked subtasks | +30 |
| `renderTodoScreen()` (line 610) | Add badge for follow-up tasks | +15 |
| New: Visual indicator click handler | Navigate to follow-up task | +20 |

**Total**: ~70 lines modified/added

#### **File: `js/ui.js`**

| Component | Changes | Line Est. |
|-----------|---------|-----------|
| `createSubtaskItemElement()` | Add follow-up indicator icon | +15 |
| `createTodoCard()` | Add "Follow-up" badge | +10 |

**Total**: ~25 lines modified/added

#### **File: `css/todo.css`**

| Style | Purpose | Line Est. |
|-------|---------|-----------|
| `.subtask-item-followup-indicator` | Icon styling for linked subtasks | +15 |
| `.todo-item-followup-badge` | Badge styling for follow-up tasks | +12 |
| Animations | Fade-in effect for new follow-ups | +8 |

**Total**: ~35 lines added

---

## 3. Implementation Phases

### **PHASE 1: Data Layer Foundation** (Est: 2-3 hours)

**Goal**: Extend data model and add migration

**Tasks**:
1. ✅ Add `followUpTaskId` to SubtaskItem model
2. ✅ Add `sourceSubtaskId` and `sourceTaskId` to Task model
3. ✅ Implement migration function in `TodoManager.load()`
4. ✅ Test migration with existing localStorage data
5. ✅ Add helper methods:
   - `TodoManager.getFollowUpTask(subtaskId)`
   - `TodoManager.getSourceSubtask(taskId)`

**Acceptance Criteria**:
- Existing tasks load without errors
- New properties appear in localStorage
- Helper methods return correct results

**Testing Checklist**:
- [ ] Load app with existing data → No errors
- [ ] Check localStorage → New properties exist
- [ ] Create new subtask → Has `followUpTaskId: null`

---

### **PHASE 2: Core Follow-up Logic** (Est: 3-4 hours)

**Goal**: Implement create/delete follow-up on subtask toggle

**Tasks**:
1. ✅ Modify `TodoManager.toggleSubtaskItem()` to:
   - Detect completion state change
   - Create follow-up task when checked
   - Delete follow-up task when unchecked
   - Update references in both directions
2. ✅ Add cascade delete in `TodoManager.delete()`:
   - When deleting parent task → delete all follow-ups
   - When deleting follow-up → clear subtask reference
3. ✅ Add toast notifications for user feedback
4. ✅ Handle error cases (storage failure, etc.)

**Acceptance Criteria**:
- Checking subtask creates hidden task
- Unchecking subtask deletes follow-up
- Deleting parent task cleans up follow-ups
- Toast notifications appear

**Testing Checklist**:
- [ ] Check subtask → Follow-up appears in HIDDEN section
- [ ] Uncheck subtask → Follow-up disappears
- [ ] Delete parent task → Follow-ups removed
- [ ] Manually delete follow-up → Subtask reference cleared
- [ ] Check localStorage → References are correct

---

### **PHASE 3: Visual Indicators** (Est: 2-3 hours)

**Goal**: Add UI elements showing follow-up relationships

**Tasks**:
1. ✅ Add icon/badge to subtask items with follow-ups
   - Design: Small chain link icon (🔗) or arrow (→)
   - Position: Right side, next to delete button
   - Color: Accent color from design system
2. ✅ Add "Follow-up" badge to follow-up tasks
   - Design: Pill badge with "↪ Follow-up" text
   - Position: Next to task title
   - Style: Subtle, low opacity
3. ✅ Add CSS animations for creation
   - Fade-in + slide animation when follow-up appears
   - Expand hidden section automatically
4. ✅ Update styles in `css/todo.css`

**Acceptance Criteria**:
- Linked subtasks show indicator
- Follow-up tasks show badge
- Creation is visually smooth
- Hidden section auto-expands

**Testing Checklist**:
- [ ] Check subtask → Indicator appears
- [ ] Indicator visible in detail modal
- [ ] Follow-up has badge in main list
- [ ] Animation plays smoothly
- [ ] Dark mode compatibility

---

### **PHASE 4: Navigation & Interaction** (Est: 2 hours)

**Goal**: Enable navigation between related tasks

**Tasks**:
1. ✅ Make subtask indicator clickable
   - Click → Navigate to follow-up task
   - Action: Close detail modal, open follow-up detail
2. ✅ Make follow-up badge clickable
   - Click → Navigate to parent task and highlight source subtask
3. ✅ Add event handlers in `js/app.js`
4. ✅ Add aria-labels for accessibility

**Acceptance Criteria**:
- Clicking indicator opens follow-up task
- Clicking badge opens parent task
- Screen reader announces actions
- Works on mobile touch devices

**Testing Checklist**:
- [ ] Click subtask indicator → Opens follow-up
- [ ] Click follow-up badge → Opens parent task
- [ ] Screen reader announces relationships
- [ ] Touch interactions work on mobile
- [ ] Back button returns to previous view

---

### **PHASE 5: Error Handling & Edge Cases** (Est: 2 hours)

**Goal**: Ensure robustness and data integrity

**Tasks**:
1. ✅ Add debouncing to rapid toggle events (300ms)
2. ✅ Handle storage quota exceeded errors
3. ✅ Add data integrity validation:
   - Orphaned follow-ups (parent deleted externally)
   - Broken references (IDs don't match)
4. ✅ Add cleanup function: `TodoManager.cleanupOrphanedFollowUps()`
5. ✅ Run cleanup on app init

**Acceptance Criteria**:
- Rapid toggling doesn't create duplicates
- Storage errors handled gracefully
- Orphaned references auto-cleaned
- No console errors

**Testing Checklist**:
- [ ] Rapidly check/uncheck → Only 1 follow-up exists
- [ ] Fill storage → Graceful error message
- [ ] Manually corrupt data → Cleanup fixes it
- [ ] No errors in console during normal use

---

### **PHASE 6: Testing & Documentation** (Est: 2 hours)

**Goal**: Ensure quality and maintainability

**Tasks**:
1. ✅ Manual testing on:
   - Desktop Chrome/Firefox/Safari
   - Mobile Safari (iOS)
   - Mobile Chrome (Android)
2. ✅ Accessibility testing:
   - Screen reader navigation (NVDA/VoiceOver)
   - Keyboard-only navigation
   - Color contrast checks
3. ✅ Update documentation:
   - Add section to `docs/DEVELOPER_GUIDE.md`
   - Update `docs/ARCHITECTURE.md` with new data flow
   - Add JSDoc comments to new functions
4. ✅ Create test cases document

**Acceptance Criteria**:
- Works across browsers/devices
- WCAG AA compliant
- Documentation updated
- Test plan documented

**Testing Checklist**:
- [ ] Desktop browsers work
- [ ] Mobile devices work
- [ ] Screen readers announce correctly
- [ ] Keyboard navigation works
- [ ] Documentation complete

---

## 4. Risk Assessment & Mitigation

| Risk | Severity | Probability | Mitigation Strategy |
|------|----------|-------------|---------------------|
| **Data corruption** from failed writes | 🔴 High | Low | Add try/catch, rollback on error |
| **Performance degradation** with many tasks | 🟡 Medium | Medium | Add pagination or virtualization |
| **User confusion** about auto-creation | 🟡 Medium | Medium | Add onboarding tooltip, "Follow-up" badge |
| **Orphaned references** after deletions | 🟡 Medium | Low | Add cleanup function on app init |
| **localStorage quota exceeded** | 🟢 Low | Low | Show warning, prevent new tasks |
| **Accessibility barriers** for screen readers | 🟡 Medium | Low | Add ARIA labels, announce actions |

---

## 5. Testing Strategy

### 5.1 Unit Tests (Manual - No Test Framework)

**Test Suite 1: Data Layer**
```javascript
// Test: Create follow-up task
1. Create task with checklist
2. Check subtask item
3. Verify follow-up task exists in hidden section
4. Verify followUpTaskId is set in subtask
5. Verify sourceTaskId/sourceSubtaskId in follow-up

// Test: Delete follow-up task
1. Check subtask (creates follow-up)
2. Uncheck subtask
3. Verify follow-up task deleted
4. Verify followUpTaskId is null in subtask

// Test: Cascade delete
1. Create task with checked subtasks (multiple follow-ups)
2. Delete parent task
3. Verify all follow-ups deleted
4. Verify no orphaned tasks
```

**Test Suite 2: UI Interactions**
```javascript
// Test: Visual indicators
1. Check subtask
2. Verify indicator icon appears
3. Verify follow-up has badge
4. Verify hidden section auto-expands

// Test: Navigation
1. Click subtask indicator
2. Verify follow-up task opens
3. Click follow-up badge
4. Verify parent task opens
```

### 5.2 Integration Test Scenarios

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| **Happy Path** | 1. Create task "Permisos"<br>2. Add checklist "Lote 14"<br>3. Add subtask "Terminación de Obra"<br>4. Check subtask | Follow-up "Terminación de Obra" appears in HIDDEN section |
| **Undo Flow** | 1. Follow happy path<br>2. Uncheck subtask | Follow-up task deleted, HIDDEN section may be empty |
| **Delete Parent** | 1. Create task with 3 checked subtasks<br>2. Delete parent task | All 3 follow-ups deleted |
| **Manual Delete Follow-up** | 1. Create follow-up<br>2. Manually delete follow-up task | Subtask indicator disappears, reference cleared |
| **Rapid Toggle** | 1. Check subtask<br>2. Immediately uncheck<br>3. Check again<br>4. Uncheck again (fast) | Only 1 follow-up exists or none, no duplicates |

### 5.3 Accessibility Testing

**WCAG AA Requirements**:
- [ ] **1.4.3 Contrast**: Indicator icon has 4.5:1 contrast ratio
- [ ] **2.1.1 Keyboard**: All new interactions keyboard accessible
- [ ] **2.4.3 Focus Order**: Logical focus order in detail modal
- [ ] **4.1.2 Name, Role, Value**: ARIA labels present
- [ ] **4.1.3 Status Messages**: Toast notifications announced

**Screen Reader Test Script**:
1. Navigate to task with checklist
2. Focus subtask checkbox
3. Check the checkbox
4. Verify SR announces: "Checked. Follow-up task created: [task name]"
5. Focus indicator icon
6. Verify SR reads: "Link to follow-up task"

---

## 6. Rollback Plan

**If Issues Arise During/After Deployment**:

1. **Immediate Rollback** (5 minutes):
   ```bash
   git revert <commit-hash>
   git push origin claude/analyze-readme-9pLK1
   ```

2. **Data Recovery** (15 minutes):
   - Migration is additive (only adds properties)
   - No data loss - old data still intact
   - Worst case: Clear localStorage, reimport from backup

3. **Feature Toggle** (Alternative):
   - Add setting: `enableFollowUpTasks` (default: false)
   - Users opt-in via Settings screen
   - Rollout gradually

---

## 7. Future Enhancements (Out of Scope)

**Phase 2 Features** (Post-MVP):
1. ⭐ **Templates**: Create follow-up with pre-filled checklists
2. ⭐ **Scheduling**: Set due dates on follow-ups
3. ⭐ **Batch Operations**: Check multiple subtasks → 1 follow-up
4. ⭐ **Undo/Redo**: Ctrl+Z to undo follow-up creation
5. ⭐ **Export/Import**: Include follow-up relationships in JSON export
6. ⭐ **Analytics**: Track follow-up completion rates

---

## 8. Success Metrics

**Definition of Done**:
- ✅ All 6 phases completed and tested
- ✅ No critical bugs in production
- ✅ Documentation updated
- ✅ WCAG AA compliance maintained
- ✅ Performance < 100ms for toggle operation
- ✅ Passes accessibility audit

**Post-Launch Monitoring**:
- Monitor localStorage size growth
- Track error rates in console
- Collect user feedback on UX
- Measure feature adoption (% of subtasks with follow-ups)

---

## 9. Implementation Checklist

### Pre-Implementation
- [ ] Review this plan with team/stakeholders
- [ ] Create feature branch: `feature/checklist-followup`
- [ ] Backup current localStorage data
- [ ] Set up testing environment

### Implementation (Phases 1-6)
- [ ] Phase 1: Data Layer Foundation
- [ ] Phase 2: Core Follow-up Logic
- [ ] Phase 3: Visual Indicators
- [ ] Phase 4: Navigation & Interaction
- [ ] Phase 5: Error Handling & Edge Cases
- [ ] Phase 6: Testing & Documentation

### Post-Implementation
- [ ] Code review (self-review or peer)
- [ ] Merge to main branch
- [ ] Deploy to production
- [ ] Monitor for errors (first 24h)
- [ ] Collect user feedback
- [ ] Plan Phase 2 enhancements

---

## 10. Code Review Checklist

**Before Submitting PR**:
- [ ] All new functions have JSDoc comments
- [ ] Console.logs removed (or behind debug flag)
- [ ] No hardcoded strings (use constants)
- [ ] Accessibility attributes added (aria-*)
- [ ] CSS follows existing design system
- [ ] No performance regressions (test with 100+ tasks)
- [ ] Error handling for all async operations
- [ ] Migration tested with real data
- [ ] Mobile tested on physical device
- [ ] Screen reader tested (VoiceOver or NVDA)

---

## 11. Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Data Layer | 2-3 hours | None |
| Phase 2: Core Logic | 3-4 hours | Phase 1 |
| Phase 3: Visual Indicators | 2-3 hours | Phase 2 |
| Phase 4: Navigation | 2 hours | Phase 3 |
| Phase 5: Error Handling | 2 hours | Phase 4 |
| Phase 6: Testing & Docs | 2 hours | Phase 5 |
| **TOTAL** | **13-17 hours** | Sequential |

**Recommended Schedule**:
- Day 1: Phases 1-2 (5-7 hours)
- Day 2: Phases 3-4 (4-5 hours)
- Day 3: Phases 5-6 (4-5 hours)

---

## 12. Contact & Support

**Questions During Implementation?**
- Review `docs/DEVELOPER_GUIDE.md` for codebase conventions
- Review `docs/ARCHITECTURE.md` for data flow patterns
- Check `docs/AGENT_CONTEXT.md` for AI agent guidelines

**Post-Implementation Issues?**
- Check browser console for errors
- Review localStorage data structure
- Run cleanup function: `TodoManager.cleanupOrphanedFollowUps()`

---

## Appendix A: Example Data Structures

### Example 1: Subtask with Follow-up Link
```json
{
  "id": "sub-1737049200000-abc123",
  "text": "Terminación de Obra",
  "completed": true,
  "followUpTaskId": "todo-1737049205000-xyz789"
}
```

### Example 2: Follow-up Task
```json
{
  "id": "todo-1737049205000-xyz789",
  "title": "Terminación de Obra",
  "notes": "Follow-up from: Permisos → Lote 14",
  "checklists": [],
  "completed": false,
  "hidden": true,
  "createdAt": "2026-01-16T08:14:05.000Z",
  "sourceSubtaskId": "sub-1737049200000-abc123",
  "sourceTaskId": "todo-1737048000000-parent123"
}
```

---

## Appendix B: Visual Mockups

### Subtask with Follow-up Indicator
```
┌─────────────────────────────────────────────┐
│ ☑ Terminación de Obra              🔗 ✕    │ ← New indicator
└─────────────────────────────────────────────┘
```

### Follow-up Task in HIDDEN Section
```
┌─────────────────────────────────────────────┐
│ ○ Terminación de Obra                  0/0  │
│   ↪ Follow-up                               │ ← New badge
└─────────────────────────────────────────────┘
```

---

**END OF IMPLEMENTATION PLAN**

*Last Updated: 2026-01-16*
*Version: 1.0*
*Status: READY FOR IMPLEMENTATION*
