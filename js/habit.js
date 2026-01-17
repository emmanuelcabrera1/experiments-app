/**
 * Experiments - Habit Manager
 * Data layer for habit tracking with daily entries
 */

const HabitManager = {
    DB_KEY: 'experiments_habits',

    // Time slot definitions
    TIME_SLOTS: ['morning', 'evening', 'night'],

    // Entry states
    STATES: {
        PENDING: 'pending',
        COMPLETED: 'completed',
        SKIPPED: 'skipped'
    },

    generateId(prefix = 'habit') {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        return `${prefix}-${timestamp}-${random}`;
    },

    /**
     * Get date key in YYYY-MM-DD format
     */
    getDateKey(date = new Date()) {
        return date.toISOString().split('T')[0];
    },

    /**
     * Get array of date keys for the current week (Mon-Sun)
     */
    getWeekDates(referenceDate = new Date()) {
        const dates = [];
        const current = new Date(referenceDate);

        // Get Monday of current week
        const day = current.getDay();
        const diff = current.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(current);
        monday.setDate(diff);

        // Generate 7 days starting from Monday
        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            dates.push(this.getDateKey(date));
        }

        return dates;
    },

    /**
     * Get weekday labels (localized short names)
     */
    getWeekdayLabels() {
        const monday = new Date();
        const day = monday.getDay();
        const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
        monday.setDate(diff);

        const labels = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            // Get first letter of weekday name
            labels.push(date.toLocaleDateString('en-US', { weekday: 'narrow' }));
        }
        return labels;
    },

    load() {
        try {
            const raw = localStorage.getItem(this.DB_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];

            let needsSave = false;

            // MIGRATION: Ensure all habits have required fields
            parsed.forEach(h => {
                // Ensure entries object exists
                if (!h.entries) {
                    h.entries = {};
                    needsSave = true;
                }
                // Ensure archived field exists
                if (!h.hasOwnProperty('archived')) {
                    h.archived = false;
                    needsSave = true;
                }
                // Ensure timeSlot exists
                if (!h.timeSlot) {
                    h.timeSlot = 'morning';
                    needsSave = true;
                }
            });

            if (needsSave) {
                this.save(parsed);
            }

            return parsed;
        } catch (error) {
            console.error('Failed to load habits:', error);
            return [];
        }
    },

    save(habits) {
        try {
            localStorage.setItem(this.DB_KEY, JSON.stringify(habits));
            return true;
        } catch (error) {
            console.error('Failed to save habits:', error);
            if (window.App && window.App.showToast) {
                window.App.showToast('Failed to save habits. Storage may be full.');
            }
            return false;
        }
    },

    getAll() {
        return this.load();
    },

    /**
     * Get habits grouped by time slot
     */
    getGroupedByTimeSlot() {
        const habits = this.load().filter(h => !h.archived);
        return {
            morning: habits.filter(h => h.timeSlot === 'morning'),
            evening: habits.filter(h => h.timeSlot === 'evening'),
            night: habits.filter(h => h.timeSlot === 'night')
        };
    },

    /**
     * Get archived habits
     */
    getArchived() {
        return this.load().filter(h => h.archived);
    },

    add(habitData) {
        const habits = this.load();
        const newHabit = {
            id: this.generateId('habit'),
            title: habitData.title || 'New Habit',
            timeSlot: habitData.timeSlot || 'morning',
            entries: {},
            createdAt: new Date().toISOString(),
            archived: false
        };

        habits.push(newHabit);
        this.save(habits);
        return newHabit;
    },

    update(id, updates) {
        const habits = this.load();
        const index = habits.findIndex(h => h.id === id);
        if (index === -1) return null;

        // Prevent overwriting entries entirely - use setEntry for that
        if (updates.entries) {
            habits[index].entries = { ...habits[index].entries, ...updates.entries };
            delete updates.entries;
        }

        habits[index] = { ...habits[index], ...updates };
        this.save(habits);
        return habits[index];
    },

    delete(id) {
        const habits = this.load();
        const filtered = habits.filter(h => h.id !== id);
        this.save(filtered);
        return true;
    },

    /**
     * Archive a habit instead of deleting
     */
    archive(id) {
        return this.update(id, { archived: true });
    },

    /**
     * Restore an archived habit
     */
    restore(id) {
        return this.update(id, { archived: false });
    },

    /**
     * Set entry state for a specific date
     * @param {string} habitId
     * @param {string} dateKey - YYYY-MM-DD format
     * @param {string} state - 'pending', 'completed', or 'skipped'
     */
    setEntry(habitId, dateKey, state) {
        const habits = this.load();
        const habit = habits.find(h => h.id === habitId);
        if (!habit) return null;

        if (!habit.entries) habit.entries = {};

        if (state === this.STATES.PENDING) {
            // Remove entry for pending state (default)
            delete habit.entries[dateKey];
        } else {
            habit.entries[dateKey] = state;
        }

        this.save(habits);
        return habit;
    },

    /**
     * Get entry state for a specific date
     */
    getEntry(habitId, dateKey) {
        const habits = this.load();
        const habit = habits.find(h => h.id === habitId);
        if (!habit || !habit.entries) return this.STATES.PENDING;
        return habit.entries[dateKey] || this.STATES.PENDING;
    },

    /**
     * Cycle entry state: pending -> completed -> skipped -> pending
     */
    cycleEntry(habitId, dateKey) {
        const currentState = this.getEntry(habitId, dateKey);
        let newState;

        switch (currentState) {
            case this.STATES.PENDING:
                newState = this.STATES.COMPLETED;
                break;
            case this.STATES.COMPLETED:
                newState = this.STATES.SKIPPED;
                break;
            case this.STATES.SKIPPED:
            default:
                newState = this.STATES.PENDING;
                break;
        }

        return this.setEntry(habitId, dateKey, newState);
    },

    /**
     * Get completion statistics for a habit
     */
    getStats(habitId, weekDates = null) {
        const habits = this.load();
        const habit = habits.find(h => h.id === habitId);
        if (!habit) return null;

        const dates = weekDates || this.getWeekDates();
        let completed = 0;
        let skipped = 0;
        let pending = 0;

        dates.forEach(dateKey => {
            const state = habit.entries?.[dateKey] || this.STATES.PENDING;
            if (state === this.STATES.COMPLETED) completed++;
            else if (state === this.STATES.SKIPPED) skipped++;
            else pending++;
        });

        return {
            completed,
            skipped,
            pending,
            total: dates.length,
            completionRate: Math.round((completed / dates.length) * 100)
        };
    },

    /**
     * Reorder habits within a time slot
     */
    reorder(orderedIds, timeSlot) {
        const habits = this.load();

        // Separate habits in this time slot from others
        const timeSlotHabits = habits.filter(h => h.timeSlot === timeSlot);
        const otherHabits = habits.filter(h => h.timeSlot !== timeSlot);

        // Reorder the time slot habits
        const reordered = orderedIds
            .map(id => timeSlotHabits.find(h => h.id === id))
            .filter(Boolean);

        // Add any habits that weren't in orderedIds
        const remaining = timeSlotHabits.filter(h => !orderedIds.includes(h.id));

        this.save([...reordered, ...remaining, ...otherHabits]);
    },

    /**
     * Get today's progress summary
     */
    getTodaysSummary() {
        const habits = this.load().filter(h => !h.archived);
        const today = this.getDateKey();

        let completed = 0;
        let total = habits.length;

        habits.forEach(habit => {
            const state = habit.entries?.[today] || this.STATES.PENDING;
            if (state === this.STATES.COMPLETED) completed++;
        });

        return {
            completed,
            total,
            remaining: total - completed,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    },

    /**
     * Calculate streak for a habit (consecutive completed days)
     */
    getStreak(habitId) {
        const habits = this.load();
        const habit = habits.find(h => h.id === habitId);
        if (!habit || !habit.entries) return 0;

        let streak = 0;
        const today = new Date();
        const current = new Date(today);

        // Count backwards from today
        while (true) {
            const dateKey = this.getDateKey(current);
            const state = habit.entries[dateKey];

            if (state === this.STATES.COMPLETED) {
                streak++;
                current.setDate(current.getDate() - 1);
            } else if (state === this.STATES.SKIPPED) {
                // Skip days don't break streak but don't count
                current.setDate(current.getDate() - 1);
            } else {
                // Pending (no entry) breaks streak, except for today
                if (dateKey === this.getDateKey(today)) {
                    current.setDate(current.getDate() - 1);
                } else {
                    break;
                }
            }

            // Safety limit - 365 days max
            if (streak > 365) break;
        }

        return streak;
    }
};

// Make available globally
window.HabitManager = HabitManager;
