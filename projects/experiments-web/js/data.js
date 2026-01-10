/**
 * Experiments - Data Layer
 * LocalStorage-based persistence with Tiny Experiments models
 */

const DB_KEY = 'experiments_db';

// Default templates - organized by category
const TEMPLATES = [
    // HEALTH
    {
        id: 'meditation-30',
        title: '30 Days of Meditation',
        purpose: 'Reduce stress and improve mental clarity',
        successCriteria: 'Meditate for at least 10 minutes each day',
        durationDays: 30,
        frequency: 'daily',
        category: 'Health',
        icon: '🧘'
    },
    {
        id: 'cold-shower-14',
        title: 'Cold Shower Challenge',
        purpose: 'Build mental resilience and boost energy',
        successCriteria: 'End shower with 30 seconds cold water',
        durationDays: 14,
        frequency: 'daily',
        category: 'Health',
        icon: '❄️'
    },
    {
        id: 'walking-30',
        title: '10,000 Steps Daily',
        purpose: 'Improve cardiovascular health and energy levels',
        successCriteria: 'Reach 10,000 steps before bedtime',
        durationDays: 30,
        frequency: 'daily',
        category: 'Health',
        icon: '🚶'
    },
    {
        id: 'sleep-schedule-21',
        title: 'Sleep by 10pm Challenge',
        purpose: 'Improve sleep quality and morning energy',
        successCriteria: 'Be in bed with lights off by 10pm',
        durationDays: 21,
        frequency: 'daily',
        category: 'Health',
        icon: '😴'
    },

    // WORK
    {
        id: 'deep-work-30',
        title: 'Deep Work Sessions',
        purpose: 'Increase productivity and focus at work',
        successCriteria: 'Complete 2 hours of uninterrupted deep work',
        durationDays: 30,
        frequency: 'daily',
        category: 'Work',
        icon: '💻'
    },
    {
        id: 'inbox-zero-14',
        title: 'Inbox Zero Challenge',
        purpose: 'Reduce email stress and improve organization',
        successCriteria: 'Process all emails to zero by end of day',
        durationDays: 14,
        frequency: 'daily',
        category: 'Work',
        icon: '📧'
    },
    {
        id: 'no-meeting-mornings-21',
        title: 'No-Meeting Mornings',
        purpose: 'Protect creative time for important work',
        successCriteria: 'Keep mornings meeting-free until noon',
        durationDays: 21,
        frequency: 'daily',
        category: 'Work',
        icon: '🚫'
    },

    // PARENTING
    {
        id: 'quality-time-30',
        title: 'Daily Quality Time',
        purpose: 'Strengthen bond with your children',
        successCriteria: 'Spend 30 minutes of undivided attention with kids',
        durationDays: 30,
        frequency: 'daily',
        category: 'Parenting',
        icon: '👨‍👧'
    },
    {
        id: 'bedtime-stories-21',
        title: 'Bedtime Story Routine',
        purpose: 'Create meaningful bedtime rituals',
        successCriteria: 'Read a story together before bed',
        durationDays: 21,
        frequency: 'daily',
        category: 'Parenting',
        icon: '📖'
    },
    {
        id: 'patience-practice-14',
        title: 'Patience Practice',
        purpose: 'Respond calmly in challenging moments',
        successCriteria: 'Pause and breathe before reacting to frustration',
        durationDays: 14,
        frequency: 'daily',
        category: 'Parenting',
        icon: '🧘‍♂️'
    },

    // RELATIONSHIPS
    {
        id: 'date-night-12',
        title: 'Weekly Date Night',
        purpose: 'Nurture your romantic relationship',
        successCriteria: 'Have a dedicated date (home or out)',
        durationDays: 84,
        frequency: 'weekly',
        category: 'Relationships',
        icon: '💑'
    },
    {
        id: 'gratitude-partner-30',
        title: 'Daily Partner Appreciation',
        purpose: 'Express gratitude and strengthen connection',
        successCriteria: 'Tell your partner one thing you appreciate about them',
        durationDays: 30,
        frequency: 'daily',
        category: 'Relationships',
        icon: '💝'
    },
    {
        id: 'active-listening-21',
        title: 'Active Listening Practice',
        purpose: 'Improve communication in relationships',
        successCriteria: 'Practice listening without interrupting in one conversation',
        durationDays: 21,
        frequency: 'daily',
        category: 'Relationships',
        icon: '👂'
    },

    // LEARNING
    {
        id: 'reading-30',
        title: 'Read 30 Minutes Daily',
        purpose: 'Expand knowledge and build reading habit',
        successCriteria: 'Read for 30 minutes (books, not social media)',
        durationDays: 30,
        frequency: 'daily',
        category: 'Learning',
        icon: '📚'
    },
    {
        id: 'language-learning-30',
        title: 'Daily Language Practice',
        purpose: 'Learn or improve a new language',
        successCriteria: 'Complete one language lesson or 15 min practice',
        durationDays: 30,
        frequency: 'daily',
        category: 'Learning',
        icon: '🗣️'
    },
    {
        id: 'skill-building-21',
        title: 'New Skill Challenge',
        purpose: 'Develop a new professional or personal skill',
        successCriteria: 'Practice or study the new skill for 30 minutes',
        durationDays: 21,
        frequency: 'daily',
        category: 'Learning',
        icon: '🎯'
    },

    // HOBBIES
    {
        id: 'creative-practice-30',
        title: 'Daily Creative Practice',
        purpose: 'Nurture creativity and self-expression',
        successCriteria: 'Spend 20 minutes on creative activity (art, music, writing)',
        durationDays: 30,
        frequency: 'daily',
        category: 'Hobbies',
        icon: '🎨'
    },
    {
        id: 'hobby-exploration-8',
        title: 'Try 8 New Hobbies',
        purpose: 'Discover new interests and passions',
        successCriteria: 'Try a different hobby each week',
        durationDays: 56,
        frequency: 'weekly',
        category: 'Hobbies',
        icon: '🔍'
    },
    {
        id: 'digital-detox-7',
        title: '7-Day Digital Detox',
        purpose: 'Reclaim time for offline hobbies',
        successCriteria: 'No social media or streaming after 7pm',
        durationDays: 7,
        frequency: 'daily',
        category: 'Hobbies',
        icon: '📵'
    },

    // EMOTIONS
    {
        id: 'journaling-30',
        title: 'Daily Journaling',
        purpose: 'Process emotions and gain self-awareness',
        successCriteria: 'Write in journal for at least 10 minutes',
        durationDays: 30,
        frequency: 'daily',
        category: 'Emotions',
        icon: '📝'
    },
    {
        id: 'gratitude-21',
        title: '21-Day Gratitude Practice',
        purpose: 'Shift perspective toward positivity',
        successCriteria: 'Write 3 things you are grateful for',
        durationDays: 21,
        frequency: 'daily',
        category: 'Emotions',
        icon: '🙏'
    },
    {
        id: 'mindfulness-14',
        title: 'Mindfulness Moments',
        purpose: 'Reduce anxiety and increase presence',
        successCriteria: 'Take 3 mindful breathing breaks throughout the day',
        durationDays: 14,
        frequency: 'daily',
        category: 'Emotions',
        icon: '🌿'
    },

    // MONEY
    {
        id: 'no-spend-7',
        title: 'No-Spend Week',
        purpose: 'Reset spending habits and save money',
        successCriteria: 'No discretionary purchases (only essentials)',
        durationDays: 7,
        frequency: 'daily',
        category: 'Money',
        icon: '💰'
    },
    {
        id: 'expense-tracking-30',
        title: 'Daily Expense Tracking',
        purpose: 'Gain awareness of spending patterns',
        successCriteria: 'Log every expense at end of day',
        durationDays: 30,
        frequency: 'daily',
        category: 'Money',
        icon: '📊'
    },
    {
        id: 'savings-streak-30',
        title: 'Daily Savings Challenge',
        purpose: 'Build a savings habit',
        successCriteria: 'Transfer any amount to savings account',
        durationDays: 30,
        frequency: 'daily',
        category: 'Money',
        icon: '🐷'
    }
];

/**
 * Data Manager - handles all CRUD operations
 */
const DataManager = {

    /**
     * Load all data from localStorage
     */
    load() {
        const raw = localStorage.getItem(DB_KEY);
        if (!raw) {
            return { experiments: [], labs: [] };
        }
        try {
            return JSON.parse(raw);
        } catch {
            return { experiments: [], labs: [] };
        }
    },

    /**
     * Save all data to localStorage
     */
    save(data) {
        localStorage.setItem(DB_KEY, JSON.stringify(data));
    },

    /**
     * Get all active experiments
     */
    getExperiments() {
        const data = this.load();
        return data.experiments.filter(e => e.status === 'active');
    },

    /**
     * Get a single experiment by ID
     */
    getExperiment(id) {
        const data = this.load();
        return data.experiments.find(e => e.id === id);
    },

    /**
     * Create a new experiment
     */
    createExperiment(experiment) {
        const data = this.load();
        const newExp = {
            id: this.generateId(),
            ...experiment,
            status: 'active',
            entries: [],
            reflections: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        data.experiments.push(newExp);
        this.save(data);
        return newExp;
    },

    /**
     * Update an experiment
     */
    updateExperiment(id, updates) {
        const data = this.load();
        const index = data.experiments.findIndex(e => e.id === id);
        if (index !== -1) {
            data.experiments[index] = {
                ...data.experiments[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.save(data);
            return data.experiments[index];
        }
        return null;
    },

    /**
     * Archive an experiment
     */
    archiveExperiment(id) {
        return this.updateExperiment(id, { status: 'archived' });
    },

    /**
     * Delete an experiment
     */
    deleteExperiment(id) {
        const data = this.load();
        data.experiments = data.experiments.filter(e => e.id !== id);
        this.save(data);
    },

    /**
     * Add a check-in entry
     */
    addEntry(experimentId, entry) {
        const data = this.load();
        const exp = data.experiments.find(e => e.id === experimentId);
        if (exp) {
            // Remove existing entry for same date
            exp.entries = exp.entries.filter(e => e.date !== entry.date);
            exp.entries.push({
                id: this.generateId(),
                ...entry,
                createdAt: new Date().toISOString()
            });
            this.save(data);
            return exp;
        }
        return null;
    },

    /**
     * Update an existing entry
     */
    updateEntry(experimentId, entryId, updates) {
        const data = this.load();
        const exp = data.experiments.find(e => e.id === experimentId);
        if (exp) {
            const entryIndex = exp.entries.findIndex(e => e.id === entryId);
            if (entryIndex !== -1) {
                exp.entries[entryIndex] = {
                    ...exp.entries[entryIndex],
                    ...updates,
                    updatedAt: new Date().toISOString()
                };
                this.save(data);
                return exp.entries[entryIndex];
            }
        }
        return null;
    },

    /**
     * Delete an entry
     */
    deleteEntry(experimentId, entryId) {
        const data = this.load();
        const exp = data.experiments.find(e => e.id === experimentId);
        if (exp) {
            exp.entries = exp.entries.filter(e => e.id !== entryId);
            this.save(data);
            return true;
        }
        return false;
    },

    /**
     * Add a reflection
     */
    addReflection(experimentId, reflection) {
        const data = this.load();
        const exp = data.experiments.find(e => e.id === experimentId);
        if (exp) {
            exp.reflections.push({
                id: this.generateId(),
                ...reflection,
                createdAt: new Date().toISOString()
            });
            this.save(data);
            return exp;
        }
        return null;
    },

    /**
     * Get all labs
     */
    getLabs() {
        const data = this.load();
        return data.labs || [];
    },

    /**
     * Create a lab
     */
    createLab(name) {
        const data = this.load();
        if (!data.labs) data.labs = [];
        const lab = { id: this.generateId(), name };
        data.labs.push(lab);
        this.save(data);
        return lab;
    },

    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
    },

    /**
     * Get templates
     */
    getTemplates() {
        return TEMPLATES;
    },

    /**
     * Get all categories (default + custom)
     */
    getCategories() {
        const custom = JSON.parse(localStorage.getItem('experiments_categories') || '[]');
        const defaultCategories = ['Health', 'Work', 'Parenting', 'Relationships', 'Learning', 'Hobbies', 'Emotions', 'Money'];

        // Merge and deduplicate
        const allCategories = [...new Set([...defaultCategories, ...custom])];
        return allCategories;
    },

    /**
     * Add a custom category
     */
    addCategory(name) {
        const custom = JSON.parse(localStorage.getItem('experiments_categories') || '[]');
        const trimmed = name.trim();

        if (!trimmed || custom.includes(trimmed)) {
            return false;
        }

        custom.push(trimmed);
        localStorage.setItem('experiments_categories', JSON.stringify(custom));
        return true;
    },

    /**
     * Delete a custom category
     */
    deleteCategory(name) {
        const custom = JSON.parse(localStorage.getItem('experiments_categories') || '[]');
        const filtered = custom.filter(c => c !== name);
        localStorage.setItem('experiments_categories', JSON.stringify(filtered));
        return true;
    }
};

/**
 * Streak Calculator
 */
const StreakCalculator = {

    /**
     * Calculate current streak for an experiment
     */
    calculate(experiment) {
        if (!experiment.entries || experiment.entries.length === 0) {
            return 0;
        }

        const scheduledDates = this.getScheduledDates(experiment);
        const completedDates = new Set(
            experiment.entries
                .filter(e => e.isCompleted)
                .map(e => e.date)
        );

        const today = this.toDateString(new Date());
        let streak = 0;

        for (let i = scheduledDates.length - 1; i >= 0; i--) {
            const date = scheduledDates[i];
            if (completedDates.has(date)) {
                streak++;
            } else if (date === today) {
                // Today incomplete doesn't break streak
                continue;
            } else {
                break;
            }
        }

        return streak;
    },

    /**
     * Get all scheduled dates for an experiment
     */
    getScheduledDates(experiment) {
        const dates = [];
        const start = new Date(experiment.startDate);
        const end = new Date();
        const endDate = new Date(experiment.startDate);
        endDate.setDate(endDate.getDate() + experiment.durationDays);

        const finalEnd = end < endDate ? end : endDate;

        let current = new Date(start);
        const interval = experiment.frequency === 'weekly' ? 7 : 1;

        while (current <= finalEnd) {
            dates.push(this.toDateString(current));
            current.setDate(current.getDate() + interval);
        }

        return dates;
    },

    /**
     * Calculate completion rate
     */
    completionRate(experiment) {
        const scheduled = this.getScheduledDates(experiment);
        if (scheduled.length === 0) return 0;

        const completed = experiment.entries.filter(e => e.isCompleted).length;
        return Math.round((completed / scheduled.length) * 100);
    },

    /**
     * Calculate progress percentage
     */
    progress(experiment) {
        // Change to actual completion progress (Days Completed / Duration)
        // This feels more rewarding and "advances" as you do things.
        const completed = this.daysCompleted(experiment);
        return Math.min(Math.max(completed / experiment.durationDays, 0), 1);
    },

    /**
     * Get days remaining
     */
    daysRemaining(experiment) {
        const end = new Date(experiment.startDate);
        end.setDate(end.getDate() + experiment.durationDays);
        const remaining = Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24));
        return Math.max(remaining, 0);
    },

    /**
     * Get days completed
     */
    daysCompleted(experiment) {
        return experiment.entries.filter(e => e.isCompleted).length;
    },

    /**
     * Convert date to YYYY-MM-DD string
     */
    toDateString(date) {
        return date.toISOString().split('T')[0];
    }
};
