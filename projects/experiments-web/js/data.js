/**
 * Experiments - Data Layer
 * LocalStorage-based persistence with Tiny Experiments models
 */

const DB_KEY = 'experiments_db';

// Default templates
const TEMPLATES = [
    {
        id: 'meditation-30',
        title: '30 Days of Meditation',
        purpose: 'Reduce stress and improve focus',
        successCriteria: 'Meditate for at least 10 minutes each day',
        durationDays: 30,
        frequency: 'daily',
        category: 'Health',
        icon: '🧘'
    },
    {
        id: 'no-social-7',
        title: '7-Day Digital Detox',
        purpose: 'Reclaim time and attention',
        successCriteria: 'No social media apps for 7 days',
        durationDays: 7,
        frequency: 'daily',
        category: 'Focus',
        icon: '📵'
    },
    {
        id: 'reading-30',
        title: 'Read 30 Minutes Daily',
        purpose: 'Build a consistent reading habit',
        successCriteria: 'Read for 30 minutes before bed',
        durationDays: 30,
        frequency: 'daily',
        category: 'Growth',
        icon: '📚'
    },
    {
        id: 'gratitude-21',
        title: '21-Day Gratitude Journal',
        purpose: 'Shift perspective toward positivity',
        successCriteria: 'Write 3 things grateful for each day',
        durationDays: 21,
        frequency: 'daily',
        category: 'Relationships',
        icon: '💝'
    },
    {
        id: 'cold-shower-14',
        title: 'Cold Shower Challenge',
        purpose: 'Build mental resilience',
        successCriteria: 'End shower with 30 seconds cold',
        durationDays: 14,
        frequency: 'daily',
        category: 'Health',
        icon: '❄️'
    },
    {
        id: 'walking-30',
        title: '30-Minute Daily Walk',
        purpose: 'Improve physical health',
        successCriteria: 'Walk without phone distractions',
        durationDays: 30,
        frequency: 'daily',
        category: 'Health',
        icon: '🚶'
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
        const defaultCategories = ['Health', 'Focus', 'Growth'];

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
