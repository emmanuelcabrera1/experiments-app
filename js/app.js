/**
 * Experiments - Main App Controller
 * Handles navigation, state, and user interactions
 */

const App = {

    // Current state
    state: {
        currentTab: 'experiments',
        currentExperiment: null,
        calendarMonth: new Date(),
        currentFilter: 'NOW', // Track active filter
        dockConfig: ['experiments', 'gallery', 'insights', 'todo'], // Configurable tabs
        currentTodo: null, // Currently viewed todo in detail modal
        isEditingTodoNotes: false, // Track if notes are in edit mode
        showCompleted: true, // Show/hide completed tasks (collapsible)
        showHidden: localStorage.getItem('experiments_show_hidden') === 'true', // Load state from storage
        deletedTodo: null, // Temporarily store deleted todo for undo
        undoTimeout: null // Timeout ID for undo operation
    },

    // Flag to prevent duplicate event bindings
    eventsInitialized: false,

    // Debounce utility for performance optimization
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Selective DOM Update Functions (Performance Optimization)
     * These methods update specific elements without full re-renders
     */

    /**
     * Update a single todo item's DOM without re-rendering
     * @param {string} todoId - The todo ID to update
     */
    updateTodoItemDOM(todoId) {
        const todo = TodoManager.getAll().find(t => t.id === todoId);
        const element = document.querySelector(`[data-todo-id="${todoId}"]`);

        if (!element || !todo) return;

        // Update checkbox state with animation
        const checkbox = element.querySelector('.todo-checkbox');
        if (checkbox) {
            checkbox.classList.toggle('completed', todo.completed);
            checkbox.setAttribute('aria-checked', todo.completed);
            checkbox.innerHTML = todo.completed ? UI.icons.check : '';
        }

        // Update title with completion state
        const title = element.querySelector('.todo-title');
        if (title) {
            title.classList.toggle('completed', todo.completed);
            if (title.textContent !== todo.title) {
                title.textContent = todo.title;
            }
        }

        // Update subtask count
        // FIX: Use helper to get subtasks from checklists (supports migrated data)
        const allSubtasks = TodoManager.getAllSubtasks(todo);
        const subtaskCount = allSubtasks.length;
        const completedSubtasks = allSubtasks.filter(s => s.completed).length;

        const metaEl = element.querySelector('.todo-meta');
        if (subtaskCount > 0) {
            if (metaEl) {
                metaEl.textContent = `${completedSubtasks}/${subtaskCount} subtasks`;
            }
        } else if (metaEl) {
            metaEl.remove();
        }

        const countBadge = element.querySelector('.todo-subtask-count');
        if (subtaskCount > 0) {
            if (countBadge) {
                countBadge.textContent = `${completedSubtasks}/${subtaskCount}`;
                countBadge.setAttribute('aria-label', `${completedSubtasks} of ${subtaskCount} subtasks completed`);
            }
        } else if (countBadge) {
            countBadge.remove();
        }
    },

    /**
     * Update character counter without re-rendering
     * @param {HTMLInputElement} input - The input element
     */
    updateCharacterCounter(input) {
        const maxLength = parseInt(input.getAttribute('maxlength')) || 100;
        const currentLength = input.value.length;
        const remaining = maxLength - currentLength;

        // Show counter when 20 characters or less remaining
        if (remaining <= 20) {
            let counterEl = input.parentElement.querySelector('.char-counter');
            if (!counterEl) {
                counterEl = document.createElement('div');
                counterEl.className = 'char-counter';
                counterEl.style.cssText = 'position: absolute; bottom: -20px; right: 0; font-size: var(--text-xs); transition: color 0.2s, opacity 0.2s; opacity: 0;';
                input.parentElement.style.position = 'relative';
                input.parentElement.appendChild(counterEl);
                // Trigger fade in
                requestAnimationFrame(() => {
                    counterEl.style.opacity = '1';
                });
            }
            counterEl.textContent = `${remaining} characters remaining`;
            counterEl.style.color = remaining <= 10 ? '#EF4444' : 'var(--text-tertiary)';
        } else {
            // Fade out and remove counter
            const counterEl = input.parentElement.querySelector('.char-counter');
            if (counterEl) {
                counterEl.style.opacity = '0';
                setTimeout(() => {
                    if (counterEl.parentElement) counterEl.remove();
                }, 200);
            }
        }
    },

    /**
     * Initialize the app
     */
    init() {
        this.loadAppVersion();
        this.loadTheme();
        this.loadDockConfig();
        this.setupServiceWorker();
        this.render();
        this.bindEvents();

        // Check for weekly summary on Mondays
        setTimeout(() => this.checkWeeklySummary(), 500);
    },

    /**
     * Check if we should show the weekly summary
     */
    checkWeeklySummary() {
        if (SummaryManager.shouldShowWeeklySummary()) {
            const experiments = DataManager.getExperiments();
            const lastWeekStart = SummaryManager.getWeekStart(new Date());
            lastWeekStart.setDate(lastWeekStart.getDate() - 7);

            const summary = SummaryManager.generateWeeklySummary(experiments, lastWeekStart);
            this.showWeeklySummaryModal(summary);
        }
    },

    /**
     * Show weekly summary modal with content
     */
    showWeeklySummaryModal(summary) {
        const content = document.getElementById('weekly-summary-content');
        if (!content) return;

        // Calculate totals from experiments array
        const totalCompleted = summary.experiments.reduce((sum, e) => sum + e.completed + e.minimum, 0);
        const longestStreak = Math.max(...summary.experiments.map(e => e.streak), 0);

        content.innerHTML = `
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="font-size: 48px; margin-bottom: 8px;">🎯</div>
                <h3 style="margin-bottom: 4px;">${summary.overallScore}% Completion</h3>
                <p style="color: var(--text-secondary);">Week of ${new Date(summary.weekOf).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;">
                <div style="text-align: center; padding: 12px; background: var(--inactive-bg); border-radius: 12px;">
                    <div style="font-size: 24px; font-weight: 700; color: var(--primary-color);">${totalCompleted}</div>
                    <div style="font-size: 12px; color: var(--text-tertiary);">Check-ins</div>
                </div>
                <div style="text-align: center; padding: 12px; background: var(--inactive-bg); border-radius: 12px;">
                    <div style="font-size: 24px; font-weight: 700; color: #F59E0B;">${longestStreak}</div>
                    <div style="font-size: 12px; color: var(--text-tertiary);">Best Streak</div>
                </div>
                <div style="text-align: center; padding: 12px; background: var(--inactive-bg); border-radius: 12px;">
                    <div style="font-size: 24px; font-weight: 700; color: #10B981;">${summary.stats.perfectWeeks}</div>
                    <div style="font-size: 12px; color: var(--text-tertiary);">Perfect</div>
                </div>
            </div>

            ${summary.experiments.length > 0 ? `
                <div style="margin-bottom: 16px;">
                    <p style="font-weight: 600; margin-bottom: 8px;">Experiment Progress</p>
                    ${summary.experiments.map(exp => `
                        <div style="display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--inactive-bg);">
                            <div style="width: 40px; text-align: center; font-size: 16px;">
                                ${exp.completed === 7 ? '🌟' : exp.completed >= 5 ? '✅' : exp.completed >= 3 ? '📈' : '💪'}
                            </div>
                            <div style="flex: 1;">
                                <div style="font-weight: 500;">${escapeHtml(exp.title)}</div>
                                <div style="font-size: 12px; color: var(--text-tertiary);">${exp.completed}/7 days</div>
                            </div>
                            <div style="font-weight: 600; color: ${exp.completed >= 5 ? 'var(--primary-color)' : 'var(--text-secondary)'};">
                                ${exp.completionRate}%
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${summary.topInsight ? `
                <div style="background: #EDE9FE; padding: 12px 16px; border-radius: 12px;">
                    <p style="font-weight: 600; color: #7C3AED; margin-bottom: 8px;">💡 Top Insight</p>
                    <p style="font-size: 14px; color: #5B21B6;">${escapeHtml(summary.topInsight)}</p>
                </div>
            ` : ''}
        `;

        // Save that we showed this summary
        SummaryManager.saveWeeklySummary(summary);

        this.openModal('modal-weekly-summary');
    },

    /**
     * Main render function
     */
    render() {
        // Capture focus before re-render
        const activeEl = document.activeElement;
        let focusedSelector = null;
        if (activeEl && activeEl !== document.body) {
            // Try to find a unique selector
            if (activeEl.id) {
                focusedSelector = `#${activeEl.id}`;
            } else if (activeEl.dataset.filter) {
                focusedSelector = `[data-filter="${activeEl.dataset.filter}"]`;
            } else if (activeEl.dataset.tab) {
                focusedSelector = `[data-tab="${activeEl.dataset.tab}"]`;
            } else if (activeEl.dataset.swipeId) {
                // Focus is inside a list item, maybe restore to the row itself?
                // The swipe container is destroyed, so we might lose sub-focus.
            }
        }

        const app = document.getElementById('app');
        app.innerHTML = `
            <main role="main">
                ${this.renderCurrentScreen()}
            </main>
            ${this.renderTabBar()}
            ${this.renderFAB()}
            ${this.renderModals()}
            ${this.renderTodoDetailModal()}
            <div id="aria-live-region" class="sr-only" aria-live="polite" aria-atomic="true"></div>
        `;

        // Restore focus
        if (focusedSelector) {
            const el = document.querySelector(focusedSelector);
            if (el) {
                el.focus();
            }
        }
    },

    /**
     * Render current screen based on state
     */
    renderCurrentScreen() {
        if (this.state.currentExperiment) {
            return this.renderExperimentDetail();
        }

        switch (this.state.currentTab) {
            case 'experiments':
                return this.renderExperimentsScreen();
            case 'gallery':
                return this.renderGalleryScreen();
            case 'insights':
                return this.renderInsightsScreen();
            case 'todo':
                return this.renderTodoScreen();
            case 'settings':
                return this.renderSettingsScreen();
            default:
                return this.renderExperimentsScreen();
        }
    },

    /**
     * Render Experiments tab
     */
    renderExperimentsScreen() {
        // Determine list of experiments to show based on filter
        let experiments;
        const filter = this.state.currentFilter;

        if (filter === 'NOW') {
            // "NOW" filter shows ACTIVE experiments
            experiments = DataManager.getExperimentsByStatus('active');
        } else {
            // Category filters show DRAFT experiments (waiting to be started)
            experiments = DataManager.getExperimentsByStatus('draft').filter(e =>
                e.category && e.category.toUpperCase() === filter
            );
        }

        const today = new Date();
        const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
        const dateStr = today.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase();

        // Sort experiments: those without scheduled time first, then by time
        experiments.sort((a, b) => {
            // If neither has scheduledTime, maintain original order
            if (!a.scheduledTime && !b.scheduledTime) return 0;
            // If only a has no scheduledTime, a comes first
            if (!a.scheduledTime) return -1;
            // If only b has no scheduledTime, b comes first
            if (!b.scheduledTime) return 1;
            // Both have scheduledTime, sort by time
            return a.scheduledTime.localeCompare(b.scheduledTime);
        });

        let content = '';
        if (experiments.length === 0) {
            if (filter === 'NOW') {
                content = UI.emptyState('No Active Experiments', 'Select a category to start a new experiment.');
            } else {
                content = UI.emptyState('No Drafts', `No pending experiments in ${filter.toLowerCase()}. Add one!`);
            }
        } else {
            content = experiments.map(e => UI.experimentRow(e)).join('');
        }

        // Helper to determine active pill
        const isActive = (filter) => this.state.currentFilter === filter ? 'active' : '';
        const categories = DataManager.getCategories();



        return `
            <div class="screen active" id="screen-experiments">
                <div class="header">
                    <h1>Experiments</h1>
                    <p class="subheader">The lab of your life.</p>
                </div>
                
                <div class="filter-pills" role="group" aria-label="Filter experiments">
                    <button class="pill ${isActive('NOW')}" data-filter="NOW" aria-pressed="${this.state.currentFilter === 'NOW'}">NOW</button>
                    ${categories.map(cat => `
                        <button class="pill ${isActive(cat.toUpperCase())}" data-filter="${cat.toUpperCase()}" aria-pressed="${this.state.currentFilter === cat.toUpperCase()}">${cat.toUpperCase()}</button>
                    `).join('')}
                </div>
                
                <div id="experiments-list">
                    ${content}
                </div>
            </div>
        `;
    },

    /**
     * Render Experiment Detail
     */
    renderExperimentDetail() {
        const exp = DataManager.getExperiment(this.state.currentExperiment);
        if (!exp) {
            this.state.currentExperiment = null;
            return this.renderExperimentsScreen();
        }

        const progress = StreakCalculator.progress(exp);
        const streak = StreakCalculator.calculate(exp);
        const daysCompleted = StreakCalculator.daysCompleted(exp);
        const daysRemaining = StreakCalculator.daysRemaining(exp);

        const entries = (exp.entries || [])
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);

        return `
            <div class="screen active" id="screen-detail">
                <div style="display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-lg);">
                    <button id="btn-back" aria-label="Go back" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: var(--inactive-bg); border-radius: 50%; color: var(--text-primary);">
                        <span style="width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;">${UI.icons.back}</span>
                    </button>
                    <h2 style="flex: 1;">${escapeHtml(exp.title)}</h2>
                    <button id="btn-edit" aria-label="Edit experiment" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: var(--inactive-bg); border-radius: 50%; color: var(--text-primary);">
                        <span style="width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;">${UI.icons.edit}</span>
                    </button>
                </div>
                
                <div class="card" style="text-align: center; padding: var(--space-xl);">
                    <div style="display: flex; justify-content: center; margin-bottom: var(--space-lg);">
                        ${UI.progressRing(progress, 'large')}
                    </div>
                    
                    <h2>${exp.title}</h2>
                    <p style="color: var(--text-secondary); margin-bottom: var(--space-lg);">${exp.purpose}</p>
                    
                    <div class="stats-row">
                        <div class="stat-item">
                            <div class="stat-value">${UI.icons.flame} ${streak}</div>
                            <div class="stat-label">Streak</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${UI.icons.check} ${daysCompleted}</div>
                            <div class="stat-label">Done</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${UI.icons.clock} ${daysRemaining}</div>
                            <div class="stat-label">Left</div>
                        </div>
                    </div>

                    ${this.renderStreakStatusBanner(exp)}

                    <button class="btn btn-primary" id="btn-checkin" style="margin-top: var(--space-lg);">
                        Check In
                    </button>
                </div>
                
                <div class="segmented-control" style="margin-bottom: var(--space-lg);">
                    <button class="segmented-option active" data-section="entries">Entries</button>
                    <button class="segmented-option" data-section="calendar">Calendar</button>
                </div>
                
                <div id="detail-section-entries">
                    ${entries.length > 0
                ? entries.map(e => UI.entryRow(e)).join('')
                : UI.emptyState('No entries yet', 'Check in to record your first entry.')}
                </div>
                
                <div id="detail-section-calendar" class="hidden">
                    ${UI.calendar(exp, this.state.calendarMonth)}
                </div>
            </div>
        `;
    },

    /**
     * Render Gallery tab
     */
    renderGalleryScreen() {
        const templates = DataManager.getTemplates();
        const grouped = {};
        templates.forEach(t => {
            if (!grouped[t.category]) grouped[t.category] = [];
            grouped[t.category].push(t);
        });

        let content = '';
        Object.keys(grouped).forEach(category => {
            content += `
                <div style="margin-bottom: var(--space-lg);">
                    <p class="subheader" style="margin-bottom: var(--space-sm);">${category.toUpperCase()}</p>
                    ${grouped[category].map(t => UI.templateCard(t)).join('')}
                </div>
            `;
        });

        return `
            <div class="screen active" id="screen-gallery">
                <div class="header">
                    <h1>Ideas</h1>
                    <p class="subheader">Start from a template</p>
                </div>
                ${content}
            </div>
        `;
    },

    /**
     * Render Insights Screen - patterns, correlations, recommendations
     */
    renderInsightsScreen() {
        const experiments = DataManager.getExperiments();
        const moodTrend = MoodTracker.getMoodTrend(7);
        const todayMood = MoodTracker.getMoodForDate(StreakCalculator.toDateString(new Date()));
        const recommendations = InsightsEngine.getRecommendations(experiments);
        const correlations = MoodTracker.getAllCorrelations(experiments);
        const weeklyInsights = InsightsEngine.generateWeeklyInsights(experiments);

        // Mood tracking section
        const moodSection = `
            <div class="card" style="margin-bottom: var(--space-lg);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
                    <h3 style="margin: 0;">Today's Mood</h3>
                    ${todayMood ? `<span style="font-size: 24px;">${MoodTracker.getMoodEmoji(todayMood.mood)}</span>` : ''}
                </div>
                ${!todayMood ? `
                    <p style="color: var(--text-secondary); font-size: var(--text-sm); margin-bottom: var(--space-md);">How are you feeling?</p>
                    <div class="mood-picker" style="display: flex; justify-content: space-between; gap: var(--space-sm);">
                        ${MoodTracker.MOODS.map(m => `
                            <button class="mood-btn" data-mood="${m.value}" style="flex: 1; padding: var(--space-md); font-size: 24px; background: var(--inactive-bg); border-radius: var(--radius-md); text-align: center;">
                                ${m.emoji}
                            </button>
                        `).join('')}
                    </div>
                ` : `
                    <div style="display: flex; gap: var(--space-lg); align-items: center;">
                        <div>
                            <div style="font-size: var(--text-sm); color: var(--text-secondary);">Mood</div>
                            <div style="font-size: var(--text-lg); font-weight: var(--weight-semibold);">${todayMood.mood}/5</div>
                        </div>
                        <div>
                            <div style="font-size: var(--text-sm); color: var(--text-secondary);">Energy</div>
                            <div style="font-size: var(--text-lg); font-weight: var(--weight-semibold);">${todayMood.energy}/5</div>
                        </div>
                        <div style="flex: 1; text-align: right;">
                            <div style="font-size: var(--text-sm); color: var(--text-secondary);">7-day trend</div>
                            <div style="font-size: var(--text-lg);">${moodTrend.trend === 'improving' ? '📈 Improving' : moodTrend.trend === 'declining' ? '📉 Declining' : '➡️ Stable'}</div>
                        </div>
                    </div>
                `}
            </div>
        `;

        // Weekly insights section
        let insightsSection = '';
        if (weeklyInsights.length > 0) {
            insightsSection = `
                <div style="margin-bottom: var(--space-lg);">
                    <h3 style="margin-bottom: var(--space-md);">This Week</h3>
                    ${weeklyInsights.map(insight => `
                        <div class="card" style="margin-bottom: var(--space-sm); display: flex; gap: var(--space-md); align-items: center;">
                            <span style="font-size: 24px;">${insight.emoji}</span>
                            <div>
                                <div style="font-weight: var(--weight-semibold);">${insight.title}</div>
                                <div style="font-size: var(--text-sm); color: var(--text-secondary);">${insight.message}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Recommendations section
        let recommendationsSection = '';
        if (recommendations.length > 0) {
            recommendationsSection = `
                <div style="margin-bottom: var(--space-lg);">
                    <h3 style="margin-bottom: var(--space-md);">Recommendations</h3>
                    ${recommendations.slice(0, 3).map(rec => `
                        <div class="card" style="margin-bottom: var(--space-sm); border-left: 3px solid ${rec.priority === 1 ? 'var(--error-color)' : rec.priority === 2 ? '#FFA500' : 'var(--text-tertiary)'};">
                            <div style="font-weight: var(--weight-semibold);">${rec.experimentTitle}</div>
                            <div style="font-size: var(--text-sm); color: var(--text-secondary); margin: var(--space-xs) 0;">${rec.message}</div>
                            <div style="font-size: var(--text-sm); color: var(--text-primary);">💡 ${rec.action}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Correlations section
        let correlationsSection = '';
        if (correlations.length > 0) {
            correlationsSection = `
                <div style="margin-bottom: var(--space-lg);">
                    <h3 style="margin-bottom: var(--space-md);">Mood Correlations</h3>
                    ${correlations.slice(0, 3).map(cor => `
                        <div class="card" style="margin-bottom: var(--space-sm);">
                            <div style="font-weight: var(--weight-semibold);">${cor.experimentTitle}</div>
                            <div style="font-size: var(--text-sm); color: var(--text-secondary);">${cor.insight}</div>
                            <div style="display: flex; gap: var(--space-lg); margin-top: var(--space-sm);">
                                <div style="font-size: var(--text-sm);">
                                    <span style="color: var(--success-color);">✓</span> ${cor.avgMoodWithCompletion}/5 avg
                                </div>
                                <div style="font-size: var(--text-sm);">
                                    <span style="color: var(--text-tertiary);">✗</span> ${cor.avgMoodWithoutCompletion}/5 avg
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Empty state
        const hasData = experiments.length > 0;
        const emptyState = !hasData ? `
            <div class="empty-state">
                <h3>No Data Yet</h3>
                <p>Start tracking experiments and moods to see insights here.</p>
            </div>
        ` : '';

        return `
            <div class="screen active" id="screen-insights">
                <div class="header">
                    <h1>Insights</h1>
                    <p class="subheader">Patterns & Recommendations</p>
                </div>
                ${moodSection}
                ${hasData ? insightsSection + recommendationsSection + correlationsSection : emptyState}
            </div>
        `;
    },

    /**
     * Render Todo Screen - Full-featured task management
     */
    renderTodoScreen() {
        const todos = TodoManager.getAll();

        // Filter: visible vs hidden
        const visibleTodos = todos.filter(t => !t.hidden);
        const hiddenTodos = todos.filter(t => t.hidden);

        // Active and completed from visible only
        const activeTodos = visibleTodos.filter(t => !t.completed);
        const completedTodos = visibleTodos.filter(t => t.completed);

        let content = '';
        if (todos.length === 0) {
            content = UI.emptyState('No Tasks Yet', 'Tap the + button to create your first task and start getting things done.');
        } else if (visibleTodos.length === 0 && hiddenTodos.length > 0) {
            content = UI.emptyState('All Tasks Hidden', 'Open the Hidden section below to see your hidden tasks.');
        } else {
            content = `
                <div class="todo-list" id="todo-list" role="list" aria-label="Active tasks">
                    ${activeTodos.map(t => this.renderTodoItem(t)).join('')}
                </div>
                ${completedTodos.length > 0 ? `
                    <div style="margin-top: var(--space-lg);">
                        <button style="display: flex; width: 100%; align-items: center; justify-content: space-between; margin-bottom: var(--space-sm); cursor: pointer; background: none; border: none; padding: 0; text-align: left;" data-action="toggle-completed" aria-expanded="${this.state.showCompleted}" aria-label="${this.state.showCompleted ? 'Hide' : 'Show'} completed tasks">
                            <p class="subheader" style="margin: 0;">COMPLETED (${completedTodos.length})</p>
                            <span class="completed-chevron" style="color: var(--text-tertiary); font-size: 20px; transform: rotate(${this.state.showCompleted ? '180deg' : '0deg'}); transition: transform 0.2s;" aria-hidden="true">▼</span>
                        </button>
                        <div class="completed-list-container" style="max-height: ${this.state.showCompleted ? '10000px' : '0'}; opacity: ${this.state.showCompleted ? '1' : '0'}; ${!this.state.showCompleted ? 'display: none;' : ''}">
                            <div class="todo-list" role="list" aria-label="Completed tasks">
                                ${completedTodos.map(t => this.renderTodoItem(t)).join('')}
                            </div>
                        </div>
                    </div>
                ` : ''}
            `;
        }

        // Hidden section (always show if there are hidden todos)
        const hiddenSection = hiddenTodos.length > 0 ? `
            <div style="margin-top: var(--space-lg);">
                <button style="display: flex; width: 100%; align-items: center; justify-content: space-between; margin-bottom: var(--space-sm); cursor: pointer; background: none; border: none; padding: 0; text-align: left;" data-action="toggle-hidden" aria-expanded="${this.state.showHidden}" aria-label="${this.state.showHidden ? 'Hide' : 'Show'} hidden tasks">
                    <p class="subheader" style="margin: 0; color: var(--text-tertiary);">HIDDEN (${hiddenTodos.length})</p>
                    <span style="color: var(--text-tertiary); font-size: 20px; transform: rotate(${this.state.showHidden ? '180deg' : '0deg'}); transition: transform 0.2s;" aria-hidden="true">▼</span>
                </button>
                <div style="max-height: ${this.state.showHidden ? '10000px' : '0'}; opacity: ${this.state.showHidden ? '1' : '0'}; ${!this.state.showHidden ? 'display: none;' : ''}">
                    <div class="todo-list" role="list" aria-label="Hidden tasks" style="opacity: 0.7;">
                        ${hiddenTodos.map(t => this.renderTodoItem(t)).join('')}
                    </div>
                </div>
            </div>
        ` : '';

        const today = new Date();
        const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
        const dateStr = today.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase();

        return `
            <div class="screen ${this.state.currentTab === 'todo' ? 'active' : ''}" id="screen-todo">
                <div class="header">
                    <h1>Today</h1>
                    <p class="subheader">${dayName} ${dateStr}</p>
                </div>
                ${content}
                ${hiddenSection}
            </div>
        `;
    },

    /**
     * Render Todo Detail Modal - Redesigned with CHECKLIST and DETAILS sections
     */
    renderTodoDetailModal() {
        if (!this.state.currentTodo) return '';

        const todo = TodoManager.getAll().find(t => t.id === this.state.currentTodo);
        if (!todo) return '';

        // Use checklists, defaulting to empty if migration hasn't run yet (handled by load)
        const checklists = todo.checklists || [];

        // Format creation date like "CREATED JANUARY 14TH, 2026"
        const createdDate = new Date(todo.createdAt);
        const day = createdDate.getDate();
        const suffix = day === 1 || day === 21 || day === 31 ? 'ST' :
            day === 2 || day === 22 ? 'ND' :
                day === 3 || day === 23 ? 'RD' : 'TH';
        const formattedDate = `CREATED ${createdDate.toLocaleDateString('en-US', { month: 'long' }).toUpperCase()} ${day}${suffix}, ${createdDate.getFullYear()}`;

        return `
            <div class="modal-overlay active" id="modal-todo-detail">
                <div class="modal-sheet" style="max-height: 75vh; overflow-y: auto; display: flex; flex-direction: column; padding-top: var(--space-xl);">

                    <!-- Header: Checkbox + Title + Close -->
                    <div style="display: flex; align-items: flex-start; gap: var(--space-md); margin-bottom: var(--space-lg); flex-shrink: 0;">
                        <div class="todo-checkbox ${todo.completed ? 'completed' : ''}" data-action="toggle-detail-todo" style="width: 32px; height: 32px; flex-shrink: 0; margin-top: 4px;">
                            ${todo.completed ? UI.icons.check : ''}
                        </div>
                        <div style="flex: 1;">
                            <input type="text" id="todo-detail-title" class="todo-detail-title" value="${escapeHtml(todo.title)}" placeholder="What do you want to accomplish?" maxlength="100" style="width: 100%; font-size: var(--text-xl); font-weight: var(--weight-bold); border: none; background: transparent; padding: 0; color: inherit;">
                            <div style="font-size: var(--text-xs); color: var(--text-tertiary); letter-spacing: 0.5px; margin-top: 4px;">${formattedDate}</div>
                        </div>
                        <button class="modal-close" aria-label="Close modal" data-close="modal-todo-detail" style="flex-shrink: 0;">${UI.icons.x}</button>
                    </div>

                    <!-- Scrollable Content Container -->
                    <div style="flex: 1; overflow-y: auto; margin-bottom: var(--space-lg);">
                        
                        <!-- CHECKLISTS Section -->
                        <div style="margin-bottom: var(--space-lg);">
                            <div style="display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-sm);">
                                <span style="color: var(--text-tertiary);">${UI.icons.list || '☰'}</span>
                                <span style="font-size: var(--text-xs); color: var(--text-tertiary); font-weight: var(--weight-semibold); letter-spacing: 0.5px;">CHECKLISTS</span>
                            </div>
                            
                            <!-- Checklists Container -->
                            <div id="checklists-container">
                                ${checklists.map(cl => `
                                    <div class="checklist-section" data-checklist-id="${cl.id}" draggable="true" style="margin-bottom: var(--space-md); background: var(--inactive-bg); border-radius: var(--radius-md); overflow: hidden;">
                                        
                                        <!-- Checklist Header -->
                                        <div class="checklist-header" style="display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-sm) var(--space-md); background: rgba(0,0,0,0.03);">
                                            <div class="checklist-grip" style="cursor: grab; color: var(--text-tertiary); display: flex; align-items: center;">${UI.icons.grip}</div>
                                            <span class="checklist-toggle" data-action="toggle-checklist-collapse" style="font-family: monospace; font-weight: bold; color: var(--text-secondary); width: 20px; text-align: center; font-size: 16px; cursor: pointer;">
                                                ${cl.isCollapsed ? '+' : '−'}
                                            </span>
                                            <span class="checklist-title" contenteditable="true" data-action="edit-checklist-title" style="flex: 1; font-weight: 600; font-size: var(--text-sm); color: var(--text-secondary); outline: none; padding: 2px 4px; border-radius: 4px; border: 1px solid transparent;">${escapeHtml(cl.title)}</span>
                                            <button class="checklist-delete" data-action="delete-checklist" style="opacity: 0.3; padding: 4px; border: none; background: transparent; cursor: pointer;">${UI.icons.x}</button>
                                        </div>
                                        
                                        <!-- Checklist Content (Items + Add Row) -->
                                        <div class="checklist-content" style="display: ${cl.isCollapsed ? 'none' : 'block'}; padding: var(--space-xs);">
                                            
                                            <!-- Subtask List -->
                                            <div class="subtask-list" id="list-${cl.id}">
                                                ${(cl.items || []).map(subtask => `
                                                    <div class="subtask-item" data-subtask-id="${subtask.id}" draggable="true" style="display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-sm); background: var(--surface-color); border-radius: var(--radius-sm); margin-bottom: var(--space-xs);">
                                                        <div class="todo-grip subtask-grip" style="cursor: grab; color: var(--text-tertiary);">${UI.icons.grip}</div>
                                                        <div class="subtask-checkbox ${subtask.completed ? 'completed' : ''}" data-action="toggle-subtask" style="width: 18px; height: 18px;">
                                                            ${subtask.completed ? UI.icons.check : ''}
                                                        </div>
                                                        <span class="subtask-text" data-action="edit-subtask-inline" style="flex: 1; cursor: text; ${subtask.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${escapeHtml(subtask.text)}</span>
                                                        <button class="subtask-delete" data-action="delete-subtask" style="opacity: 0.5;">${UI.icons.x}</button>
                                                    </div>
                                                `).join('')}
                                            </div>
                                            
                                            <!-- Add Subtask Row -->
                                            <div style="display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-sm); background: var(--surface-color); border-radius: var(--radius-sm); margin-top: var(--space-xs);">
                                                <span style="color: var(--text-tertiary); font-weight: bold;">+</span>
                                                <input type="text" class="add-subtask-text" placeholder="Add item..." maxlength="200" style="flex: 1; border: none; background: transparent; font-size: var(--text-sm); color: inherit; padding: 0; outline: none;">
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>

                            <!-- Add New Checklist Button -->
                            <button id="btn-add-checklist" style="width: 100%; padding: var(--space-md); background: var(--inactive-bg); border: 2px dashed var(--border-color); border-radius: var(--radius-md); color: var(--text-tertiary); cursor: pointer; font-size: var(--text-sm); margin-top: var(--space-sm); transition: all 0.2s;">
                                + Add New Checklist
                            </button>
                        </div>

                        <!-- DETAILS & ANNOTATIONS Section -->
                        <div style="margin-bottom: var(--space-lg);">
                            <div style="display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-sm);">
                                <span style="color: var(--text-tertiary);">${UI.icons.edit || '≡'}</span>
                                <span style="font-size: var(--text-xs); color: var(--text-tertiary); font-weight: var(--weight-semibold); letter-spacing: 0.5px;">DETAILS & ANNOTATIONS</span>
                            </div>
                            ${this.state.isEditingTodoNotes ? `
                                <textarea id="todo-notes-edit" placeholder="Add notes, links, or details..." style="width: 100%; min-height: 500px; padding: var(--space-md); background: var(--inactive-bg); border: 2px solid var(--accent-color); border-radius: var(--radius-md); font-size: var(--text-sm); resize: vertical; color: inherit;">${escapeHtml(todo.notes || '')}</textarea>
                            ` : `
                                <div id="notes-view" style="min-height: 60px; padding: var(--space-md); background: var(--inactive-bg); border-radius: var(--radius-md); cursor: pointer; font-size: var(--text-sm); color: inherit; text-align: left;">
                                    ${todo.notes ? formatTextWithLinks(todo.notes) : '<span style="color: var(--text-tertiary); font-style: italic;">Add notes, links, or details...</span>'}
                                </div>
                            `}
                        </div>
                    </div>

                    <!-- Footer Actions - Fixed at bottom -->
                    <div style="display: flex; gap: var(--space-sm); padding-top: var(--space-md); flex-shrink: 0; border-top: 1px solid var(--border-color);">
                        <button class="btn btn-primary" id="btn-save-todo" style="flex: 1;">Save</button>
                        <button class="btn" id="btn-delete-todo" style="background: #FFEBEE; color: #D32F2F;">Delete</button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Helper to render a single todo item
     */
    renderTodoItem(todo) {
        // Use helper to get flat list of subtasks from all checklists
        const allSubtasks = TodoManager.getAllSubtasks(todo);
        const subtaskCount = allSubtasks.length;
        const completedSubtasks = allSubtasks.filter(s => s.completed).length;

        const statusText = todo.completed ? 'completed' : 'not completed';
        const subtaskText = subtaskCount > 0 ? `, ${completedSubtasks} of ${subtaskCount} subtasks completed` : '';
        const hideLabel = todo.hidden ? 'Unhide' : 'Hide';
        const hideIcon = todo.hidden ? '👁️' : '👁️‍🗨️';

        return `
            <div class="swipe-container" data-swipe-id="${escapeHtml(todo.id)}" data-swipe-type="todo" aria-label="Swipe to reveal actions">
                <!-- Left actions (swipe right reveals) -->
                <div class="swipe-actions-left">
                    <button class="swipe-btn swipe-btn-hide" data-action="hide" aria-label="${hideLabel} task">
                        <span class="swipe-btn-icon">${hideIcon}</span>
                        <span class="swipe-btn-label">${hideLabel}</span>
                    </button>
                </div>
                <!-- Todo row -->
                <div class="todo-item todo-row" data-todo-id="${escapeHtml(todo.id)}" role="listitem" aria-label="${escapeHtml(todo.title)}, ${statusText}${subtaskText}">
                    <div class="todo-grip" draggable="true" aria-label="Drag to reorder" role="button" tabindex="0">${UI.icons.grip}</div>
                    <div class="todo-checkbox ${todo.completed ? 'completed' : ''}" data-action="toggle-todo" role="checkbox" aria-checked="${todo.completed}" aria-label="Mark as ${todo.completed ? 'incomplete' : 'complete'}" tabindex="0">
                        ${todo.completed ? UI.icons.check : ''}
                    </div>
                    <div class="todo-content" data-action="open-detail" role="button" tabindex="0">
                        <div class="todo-title ${todo.completed ? 'completed' : ''}">${escapeHtml(todo.title)}</div>
                    </div>
                    ${subtaskCount > 0 ? `<span class="todo-subtask-count" aria-label="${completedSubtasks} of ${subtaskCount} subtasks completed">${completedSubtasks}/${subtaskCount}</span>` : ''}
                </div>
            </div>
        `;
    },

    /**
     * Update a specific todo item in the DOM without full re-render
     */
    updateTodoItemDOM(todoId) {
        const todo = TodoManager.getAll().find(t => t.id === todoId);
        if (!todo) return;

        const oldItem = document.querySelector(`.todo-item[data-todo-id="${todoId}"]`);
        if (oldItem) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = this.renderTodoItem(todo);
            const newItem = tempDiv.firstElementChild;
            oldItem.replaceWith(newItem);
        }
    },

    /**
     * Render Settings Screen - with Updates section
     */
    renderSettingsScreen() {
        const experiments = DataManager.getExperiments();
        const version = this.state.appVersion || '1.0.0';

        return `
            <div class="screen ${this.state.currentTab === 'settings' ? 'active' : ''}" id="screen-settings">
                <div class="header">
                    <h1>Settings</h1>
                </div>
                <div class="content-scrollable">
                    <div class="settings-group">
                        <p class="settings-group-title">Updates</p>
                        <div class="settings-row" style="cursor: pointer;" id="btn-check-updates">
                            <div class="settings-icon" style="background: #E8F5E9;">🔄</div>
                            <div class="settings-label">Check for Updates</div>
                            <div class="settings-value">v${this.state.appVersion}</div>
                        </div>
                    </div>

                    <div class="settings-group">
                        <p class="settings-group-title">Appearance</p>
                        <div class="settings-row">
                            <div class="settings-icon" style="background: var(--inactive-bg);">🎨</div>
                            <div class="settings-label">Theme</div>
                            <div class="segmented-control" role="group" style="width: auto;">
                                <button type="button" class="segmented-option ${this.state.theme === 'system' ? 'active' : ''}" data-theme-opt="system">Auto</button>
                                <button type="button" class="segmented-option ${this.state.theme === 'light' ? 'active' : ''}" data-theme-opt="light">Light</button>
                                <button type="button" class="segmented-option ${this.state.theme === 'dark' ? 'active' : ''}" data-theme-opt="dark">Dark</button>
                            </div>
                        </div>
                    </div>

                    <div class="settings-group">
                        <p class="settings-group-title">Navigation</p>
                        <div class="settings-row">
                            <div class="settings-icon" style="background: #E3F2FD;">🧪</div>
                            <div class="settings-label">Lab</div>
                            <div class="ios-toggle active" style="opacity: 0.5; pointer-events: none;"></div>
                        </div>
                        <div class="settings-row" style="cursor: pointer;" data-dock-toggle="gallery">
                            <div class="settings-icon" style="background: #FFF3E0;">✨</div>
                            <div class="settings-label">Gallery</div>
                            <div class="ios-toggle ${this.state.dockConfig.includes('gallery') ? 'active' : ''}"></div>
                        </div>
                        <div class="settings-row" style="cursor: pointer;" data-dock-toggle="insights">
                            <div class="settings-icon" style="background: #E8F5E9;">📊</div>
                            <div class="settings-label">Insights</div>
                            <div class="ios-toggle ${this.state.dockConfig.includes('insights') ? 'active' : ''}"></div>
                        </div>
                        <div class="settings-row" style="cursor: pointer;" data-dock-toggle="todo">
                            <div class="settings-icon" style="background: #F3E5F5;">✓</div>
                            <div class="settings-label">Todo</div>
                            <div class="ios-toggle ${this.state.dockConfig.includes('todo') ? 'active' : ''}"></div>
                        </div>
                        <div class="settings-row">
                            <div class="settings-icon" style="background: var(--inactive-bg);">⚙️</div>
                            <div class="settings-label">Settings</div>
                            <div class="ios-toggle active" style="opacity: 0.5; pointer-events: none;"></div>
                        </div>
                    </div>
                    
                    <div class="settings-group">
                        <p class="settings-group-title">Account</p>
                        <div class="settings-row">
                            <div class="settings-icon" style="background: var(--inactive-bg);">👤</div>
                            <div class="settings-label">Experimenter</div>
                            <div class="settings-value">Free</div>
                        </div>
                    </div>
                    
                    <div class="settings-group">
                        <p class="settings-group-title">Data</p>
                        <div class="settings-row">
                            <div class="settings-icon" style="background: #E8F5E9;">📊</div>
                            <div class="settings-label">Active Experiments</div>
                            <div class="settings-value">${experiments.length}</div>
                        </div>
                        <div class="settings-row" style="cursor: pointer;" id="btn-view-archive">
                            <div class="settings-icon" style="background: #FFF3E0;">📦</div>
                            <div class="settings-label">View Archived</div>
                            <div class="settings-chevron">${UI.icons.chevronRight}</div>
                        </div>
                        <div class="settings-row">
                            <div class="settings-icon" style="background: #FFF3E0;">💾</div>
                            <div class="settings-label">Storage</div>
                            <div class="settings-value">Local</div>
                        </div>
                    </div>

                    <div class="settings-group">
                        <p class="settings-group-title">Accountability Partners</p>
                        <div class="settings-row" style="cursor: pointer;" id="btn-copy-share-code">
                            <div class="settings-icon" style="background: #E3F2FD;">🔗</div>
                            <div class="settings-label">My Share Code</div>
                            <div class="settings-value">${PartnersManager.getMyShareCode()}</div>
                        </div>
                        <div class="settings-row" style="cursor: pointer;" id="btn-share-progress">
                            <div class="settings-icon" style="background: #F3E5F5;">📤</div>
                            <div class="settings-label">Share Progress</div>
                            <div class="settings-chevron">${UI.icons.chevronRight}</div>
                        </div>
                        <div class="settings-row" style="cursor: pointer;" id="btn-add-partner">
                            <div class="settings-icon" style="background: #E8F5E9;">➕</div>
                            <div class="settings-label">Add Partner</div>
                            <div class="settings-chevron">${UI.icons.chevronRight}</div>
                        </div>
                        ${this.renderPartnersList()}
                    </div>

                    <div class="settings-group">
                        <p class="settings-group-title">Challenges</p>
                        <div class="settings-row" style="cursor: pointer;" id="btn-create-challenge">
                            <div class="settings-icon" style="background: #FFF8E1;">🏆</div>
                            <div class="settings-label">Start Challenge</div>
                            <div class="settings-chevron">${UI.icons.chevronRight}</div>
                        </div>
                        ${this.renderChallengesList()}
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Render partners list in Settings
     */
    renderPartnersList() {
        const partners = PartnersManager.getPartners();
        if (partners.length === 0) return '';

        return partners.map(p => {
            const status = PartnersManager.getPartnerStatus(p);
            return `
                <div class="settings-row" style="padding: 12px 16px;">
                    <div class="settings-icon" style="background: var(--inactive-bg);">${status.emoji}</div>
                    <div style="flex: 1;">
                        <div class="settings-label">${escapeHtml(p.name)}</div>
                        <div style="font-size: 12px; color: var(--text-tertiary);">${status.message}</div>
                    </div>
                    <button class="btn-remove-partner" data-partner-id="${p.id}" data-partner-name="${escapeHtml(p.name)}"
                            style="background: none; border: none; color: var(--error-color); padding: 8px; cursor: pointer;">
                        ${UI.icons.x}
                    </button>
                </div>
            `;
        }).join('');
    },

    /**
     * Render challenges list in Settings
     */
    renderChallengesList() {
        const challenges = ChallengesManager.getActiveChallenges();
        if (challenges.length === 0) return '';

        return challenges.map(c => {
            const summary = ChallengesManager.getProgressSummary(c.id);
            const leader = summary.leaderboard[0];
            return `
                <div class="settings-row" style="padding: 12px 16px;">
                    <div class="settings-icon" style="background: #FFF8E1;">🏃</div>
                    <div style="flex: 1;">
                        <div class="settings-label">${escapeHtml(c.name)}</div>
                        <div style="font-size: 12px; color: var(--text-tertiary);">
                            ${summary.daysRemaining} days left • Leader: ${leader ? escapeHtml(leader.name) : 'N/A'}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 600; color: var(--primary-color);">${summary.percentComplete}%</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Render streak status banner with skip day option
     */
    renderStreakStatusBanner(exp) {
        const streakStatus = StreakCalculator.getStreakStatus(exp);
        const earnedSkipDays = StreakCalculator.calculateEarnedSkipDays(exp);
        const usedSkipDays = (exp.entries || []).filter(e => e.type === 'skipped').length;
        const availableSkipDays = earnedSkipDays - usedSkipDays;
        const canUseSkipDay = StreakCalculator.canUseSkipDay(exp);
        const isAtRisk = StreakCalculator.isStreakAtRisk(exp);
        const inGracePeriod = StreakCalculator.isInGracePeriod(exp);

        let bannerHtml = '';

        // Show streak at risk warning
        if (isAtRisk && !inGracePeriod) {
            bannerHtml += `
                <div style="background: #FFF3E0; color: #E65100; padding: 12px 16px; border-radius: 12px; margin-top: 16px; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 20px;">⚠️</span>
                    <div style="flex: 1;">
                        <div style="font-weight: 600;">Streak at risk!</div>
                        <div style="font-size: 13px; opacity: 0.8;">Check in today to maintain your streak</div>
                    </div>
                </div>
            `;
        }

        // Show grace period banner
        if (inGracePeriod) {
            bannerHtml += `
                <div style="background: #E3F2FD; color: #1565C0; padding: 12px 16px; border-radius: 12px; margin-top: 16px; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 20px;">🛡️</span>
                    <div style="flex: 1;">
                        <div style="font-weight: 600;">Grace Period Active</div>
                        <div style="font-size: 13px; opacity: 0.8;">Your streak is protected - check in when ready</div>
                    </div>
                </div>
            `;
        }

        // Show skip day option
        if (availableSkipDays > 0) {
            bannerHtml += `
                <div style="background: var(--inactive-bg); padding: 12px 16px; border-radius: 12px; margin-top: 16px; display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 20px;">🎯</span>
                    <div style="flex: 1;">
                        <div style="font-weight: 500;">Skip Days Available</div>
                        <div style="font-size: 13px; color: var(--text-tertiary);">${availableSkipDays} of ${earnedSkipDays} remaining</div>
                    </div>
                    ${canUseSkipDay ? `
                        <button id="btn-use-skip-day" class="btn" style="background: var(--primary-color); color: white; padding: 8px 16px; font-size: 14px;">
                            Use Skip Day
                        </button>
                    ` : ''}
                </div>
            `;
        }

        return bannerHtml;
    },

    /**
     * Render Tab Bar - Dynamic based on dockConfig
     */
    renderTabBar() {
        const allTabs = [
            { id: 'todo', label: 'Todo', icon: UI.icons.todo },
            { id: 'experiments', label: 'Lab', icon: UI.icons.flask },
            { id: 'gallery', label: 'Gallery', icon: UI.icons.sparkles },
            { id: 'insights', label: 'Insights', icon: UI.icons.chart },
            { id: 'settings', label: 'Settings', icon: UI.icons.settings }
        ];

        // Filter tabs: show configured tabs + always show settings
        const visibleTabs = allTabs.filter(tab =>
            tab.id === 'experiments' || // Lab is always visible
            tab.id === 'settings' ||     // Settings is always visible
            this.state.dockConfig.includes(tab.id)
        );

        return `
            <nav class="tab-bar" role="tablist" aria-label="Main navigation">
                ${visibleTabs.map(tab => `
                    <button class="tab-bar-item ${this.state.currentTab === tab.id ? 'active' : ''}" 
                            data-tab="${tab.id}" 
                            role="tab" 
                            aria-selected="${this.state.currentTab === tab.id}"
                            aria-controls="screen-${tab.id}">
                        ${tab.icon}
                        <span>${tab.label}</span>
                    </button>
                `).join('')}
            </nav>
        `;
    },

    /**
     * Render FAB - Shows on Lab and Todo screens
     */
    renderFAB() {
        if (this.state.currentExperiment) {
            return '';
        }
        if (this.state.currentTab === 'experiments') {
            return `<button class="fab" id="fab-add" aria-label="Add new experiment">${UI.icons.plus}</button>`;
        }
        if (this.state.currentTab === 'todo') {
            return `<button class="fab" id="fab-add-todo" aria-label="Add new task">${UI.icons.plus}</button>`;
        }
        return '';
    },

    /**
     * Render Modals
     */
    renderModals() {
        return `
            <!-- Create Experiment Modal -->
            <div class="modal-overlay" id="modal-create">
                <div class="modal-sheet">
                    <div class="modal-header">
                        <h2 id="modal-create-title">New Experiment</h2>
                        <button class="modal-close" aria-label="Close modal" data-close="modal-create">${UI.icons.x}</button>
                    </div>
                    <form id="form-create">
                        <input type="hidden" name="id" id="create-id">
                        <div class="form-group">
                            <label class="form-label" for="create-title">Action — What?</label>
                            <input class="form-input" id="create-title" name="title" placeholder="e.g., Meditate for 10 minutes" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="create-purpose">Purpose — Why?</label>
                            <textarea class="form-input" id="create-purpose" name="purpose" placeholder="e.g., Reduce stress and feel calmer" required></textarea>
                        </div>
                        <div class="form-group">
                    <label class="form-label" id="create-category-label">Category</label>
                    <div class="segmented-control" role="group" aria-labelledby="create-category-label">
                        ${DataManager.getCategories().map((cat, i) => `
                            <button type="button" class="segmented-option ${i === 0 ? 'active' : ''}" data-category="${cat}">${cat}</button>
                        `).join('')}
                        <button type="button" class="segmented-option btn-add-category-mini" id="btn-add-category">+</button>
                    </div>
                </div>
                        <div class="form-group">
                            <label class="form-label" id="create-freq-label">Frequency</label>
                            <div class="segmented-control" role="group" aria-labelledby="create-freq-label">
                                <button type="button" class="segmented-option active" data-freq="daily">Daily</button>
                                <button type="button" class="segmented-option" data-freq="weekly">Weekly</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="create-duration">Duration (days)</label>
                            <input class="form-input" id="create-duration" type="number" name="duration" value="30" min="7" max="365">
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="create-time">Preferred Time (Optional)</label>
                            <input class="form-input" id="create-time" type="time" name="scheduledTime">
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="create-criteria">Success Criteria (Optional)</label>
                            <input class="form-input" id="create-criteria" name="criteria" placeholder="e.g., Complete before 8 AM">
                        </div>
                        <div class="form-actions" style="display: flex; gap: 8px; flex-direction: column;">
                            <button type="button" id="btn-start-experiment" class="btn btn-primary">Start Experiment</button>
                            <button type="button" id="btn-delete" class="btn" style="background: #FFEBEE; color: #D32F2F; display: none;">Delete Experiment</button>
                        </div>
                    </form>
                </div>
            </div>
            
            <!-- Check-in Modal -->
            <div class="modal-overlay" id="modal-checkin">
                <div class="modal-sheet">
                    <div class="modal-header">
                        <h2>Check In</h2>
                        <button class="modal-close" aria-label="Close modal" data-close="modal-checkin">${UI.icons.x}</button>
                    </div>
                    <form id="form-checkin">
                        <div class="form-group">
                            <label class="form-label" id="checkin-status-label">Status</label>
                            <div class="segmented-control" role="group" aria-labelledby="checkin-status-label">
                                <button type="button" class="segmented-option active" data-status="completed">Completed ✓</button>
                                <button type="button" class="segmented-option" data-status="missed">Missed ✗</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="checkin-note">Note (Optional)</label>
                            <textarea class="form-input" id="checkin-note" name="note" placeholder="How did it go?"></textarea>
                        </div>

                        <div class="form-group">
                            <button type="button" class="reflection-toggle">
                                <span style="font-size: 16px;">+</span> <span>Add Weekly Reflection</span>
                            </button>
                            <div class="reflection-fields">
                                <label class="form-label">What worked?</label>
                                <textarea class="form-input" name="ref_plus" rows="2" placeholder="Wins & progress"></textarea>
                                
                                <label class="form-label" style="margin-top: 12px;">What didn't?</label>
                                <textarea class="form-input" name="ref_minus" rows="2" placeholder="Obstacles & distractions"></textarea>
                                
                                <label class="form-label" style="margin-top: 12px;">What's next?</label>
                                <textarea class="form-input" name="ref_next" rows="2" placeholder="Focus for next week"></textarea>
                            </div>
                        </div>
                        <button type="button" id="btn-save-checkin" class="btn btn-primary">Save</button>
                    </form>
                </div>
            </div>

            <!-- Confirm Modal -->
            <div class="modal-overlay" id="modal-confirm" style="z-index: 2000;">
                <div class="modal-sheet confirm-modal-content">
                    <h3 id="confirm-title" style="margin-bottom: 8px;">Are you sure?</h3>
                    <p id="confirm-message" style="color: var(--text-secondary); margin-bottom: 24px;">This action cannot be undone.</p>
                    <div class="confirm-actions">
                        <button class="btn" id="confirm-cancel" style="background: var(--inactive-bg); color: var(--text-primary);">Cancel</button>
                        <button class="btn" id="confirm-ok" style="background: var(--error-color); color: white;">Confirm</button>
                    </div>
                </div>
            </div>
            <!-- Prompt Modal -->
            <div class="modal-overlay" id="modal-prompt" style="z-index: 2001;">
                <div class="modal-sheet">
                    <h3 id="prompt-title" style="margin-bottom: 16px;">Enter Value</h3>
                    <div class="form-group">
                        <input class="form-input" id="prompt-input" type="text" placeholder="Name">
                    </div>
                    <div class="form-actions" style="display: flex; gap: 16px;">
                        <button class="btn btn-secondary" id="prompt-cancel" style="flex: 1;">Cancel</button>
                        <button class="btn btn-primary" id="prompt-ok" style="flex: 1;">Save</button>
                    </div>
                </div>
            </div>

            <!-- Edit Entry Modal -->
            <div class="modal-overlay" id="modal-edit-entry">
                <div class="modal-sheet">
                    <div class="modal-header">
                        <h2>Edit Entry</h2>
                        <button class="modal-close" aria-label="Close modal" data-close="modal-edit-entry">${UI.icons.x}</button>
                    </div>
                    <form id="form-edit-entry">
                        <input type="hidden" name="entryId" id="edit-entry-id">
                        <div class="form-group">
                            <label class="form-label" id="edit-entry-status-label">Status</label>
                            <div class="segmented-control" role="group" aria-labelledby="edit-entry-status-label">
                                <button type="button" class="segmented-option active" data-status="completed">Completed ✓</button>
                                <button type="button" class="segmented-option" data-status="missed">Missed ✗</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="edit-entry-note">Note</label>
                            <textarea class="form-input" id="edit-entry-note" name="note" placeholder="How did it go?"></textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Reflection (Optional)</label>
                            <div style="margin-top: 8px;">
                                <label class="form-label" style="font-size: 12px; margin-bottom: 4px;">What worked?</label>
                                <textarea class="form-input" id="edit-entry-ref-plus" name="ref_plus" rows="2" placeholder="Wins & progress"></textarea>

                                <label class="form-label" style="font-size: 12px; margin-top: 12px; margin-bottom: 4px;">What didn't?</label>
                                <textarea class="form-input" id="edit-entry-ref-minus" name="ref_minus" rows="2" placeholder="Obstacles & distractions"></textarea>

                                <label class="form-label" style="font-size: 12px; margin-top: 12px; margin-bottom: 4px;">What's next?</label>
                                <textarea class="form-input" id="edit-entry-ref-next" name="ref_next" rows="2" placeholder="Focus for next week"></textarea>
                            </div>
                        </div>
                        <div class="form-actions" style="display: flex; gap: 8px; flex-direction: column;">
                            <button type="button" id="btn-save-entry" class="btn btn-primary">Save Changes</button>
                            <button type="button" id="btn-delete-entry" class="btn" style="background: #FFEBEE; color: #D32F2F;">Delete Entry</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Energy Picker Modal -->
            <div class="modal-overlay" id="modal-energy" style="z-index: 2002;">
                <div class="modal-sheet" style="text-align: center;">
                    <h3 style="margin-bottom: 8px;">How's your energy?</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 24px;">Select your energy level</p>
                    <div class="mood-grid" style="display: flex; gap: 8px; justify-content: center; margin-bottom: 24px;">
                        ${MoodTracker.ENERGY_LEVELS.map(e => `
                            <button class="mood-btn energy-btn" data-energy="${e.value}" style="display: flex; flex-direction: column; align-items: center; padding: 12px; background: var(--inactive-bg); border: none; border-radius: 12px; cursor: pointer; min-width: 50px;">
                                <span style="font-size: 24px;">${e.emoji}</span>
                                <span style="font-size: 10px; color: var(--text-secondary); margin-top: 4px;">${e.label}</span>
                            </button>
                        `).join('')}
                    </div>
                    <button class="btn btn-secondary" data-close="modal-energy" style="width: 100%;">Cancel</button>
                </div>
            </div>

            <!-- Weekly Summary Modal -->
            <div class="modal-overlay" id="modal-weekly-summary">
                <div class="modal-sheet">
                    <div class="modal-header">
                        <h2>Weekly Summary</h2>
                        <button class="modal-close" aria-label="Close modal" data-close="modal-weekly-summary">${UI.icons.x}</button>
                    </div>
                    <div id="weekly-summary-content">
                        <!-- Populated dynamically -->
                    </div>
                    <div class="form-actions" style="margin-top: 16px;">
                        <button class="btn btn-primary" data-close="modal-weekly-summary" style="width: 100%;">Got it!</button>
                    </div>
                </div>
            </div>

            <!-- Recovery Modal -->
            <div class="modal-overlay" id="modal-recovery">
                <div class="modal-sheet">
                    <div class="modal-header">
                        <h2>Get Back on Track</h2>
                        <button class="modal-close" aria-label="Close modal" data-close="modal-recovery">${UI.icons.x}</button>
                    </div>
                    <p style="color: var(--text-secondary); margin-bottom: 16px;">We noticed you missed a few days. No worries - here are some options:</p>
                    <div id="recovery-options">
                        <!-- Populated dynamically -->
                    </div>
                </div>
            </div>

            <!-- Add Partner Modal -->
            <div class="modal-overlay" id="modal-add-partner">
                <div class="modal-sheet">
                    <div class="modal-header">
                        <h2>Add Partner</h2>
                        <button class="modal-close" aria-label="Close modal" data-close="modal-add-partner">${UI.icons.x}</button>
                    </div>
                    <form id="form-add-partner">
                        <div class="form-group">
                            <label class="form-label" for="partner-name">Partner Name</label>
                            <input class="form-input" id="partner-name" name="name" placeholder="e.g., Sarah" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="partner-code">Their Share Code</label>
                            <input class="form-input" id="partner-code" name="code" placeholder="e.g., ABC123" required maxlength="6" style="text-transform: uppercase;">
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary" style="width: 100%;">Add Partner</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Create Challenge Modal -->
            <div class="modal-overlay" id="modal-create-challenge">
                <div class="modal-sheet">
                    <div class="modal-header">
                        <h2>Start Challenge</h2>
                        <button class="modal-close" aria-label="Close modal" data-close="modal-create-challenge">${UI.icons.x}</button>
                    </div>
                    <form id="form-create-challenge">
                        <div class="form-group">
                            <label class="form-label" for="challenge-name">Challenge Name</label>
                            <input class="form-input" id="challenge-name" name="name" placeholder="e.g., January Wellness Challenge" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="challenge-template">Template</label>
                            <select class="form-input" id="challenge-template" name="template" required>
                                <option value="">Select a template...</option>
                                ${DataManager.getTemplates().map(t => `<option value="${t.id}">${t.title}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="challenge-duration">Duration (days)</label>
                            <input class="form-input" id="challenge-duration" name="duration" type="number" value="30" min="7" max="90" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Invite Partners</label>
                            <div id="challenge-partners-list" style="margin-top: 8px;">
                                <!-- Populated dynamically -->
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary" style="width: 100%;">Start Challenge</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Archived Experiments Modal -->
            <div class="modal-overlay" id="modal-archived">
                <div class="modal-sheet">
                    <div class="modal-header">
                        <h2>Archived Experiments</h2>
                        <button class="modal-close" aria-label="Close modal" data-close="modal-archived">${UI.icons.x}</button>
                    </div>
                    <div class="modal-content">
                        ${this.renderArchivedList()}
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Render archived experiments list
     */
    renderArchivedList() {
        const data = DataManager.load();
        const archivedExps = data.experiments.filter(e => e.status === 'archived');

        if (archivedExps.length === 0) {
            return '<p style="text-align: center; color: var(--text-secondary); padding: 32px;">No archived experiments</p>';
        }

        return archivedExps.map(exp => `
            <div class="settings-row" style="padding: 16px; margin-bottom: 8px; background: var(--surface-color); border-radius: 12px;">
                <div style="flex: 1;">
                    <div style="font-weight: var(--weight-semibold); margin-bottom: 4px;">${escapeHtml(exp.title)}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">${exp.category || 'No category'} • ${exp.durationDays} days</div>
                </div>
                <button class="btn-unarchive-exp" data-exp-id="${exp.id}"
                        style="background: var(--inactive-bg); color: var(--text-primary); border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: var(--weight-semibold);">
                    Restore
                </button>
            </div>
        `).join('');
    },

    /**
     * Bind all event handlers (called ONCE on init)
     */
    bindEvents() {
        // CRITICAL: Prevent duplicate event bindings that cause freezing
        if (this.eventsInitialized) return;
        this.eventsInitialized = true;

        const app = document.getElementById('app');

        // Tab navigation
        app.addEventListener('click', (e) => {
            const tabItem = e.target.closest('.tab-bar-item');
            if (tabItem) {
                e.stopPropagation();
                this.state.currentTab = tabItem.dataset.tab;
                this.state.currentExperiment = null;
                this.state.currentFilter = 'NOW';
                this.render();
                return;
            }
        });

        // FAB click
        app.addEventListener('click', (e) => {
            if (e.target.closest('#fab-add')) {
                e.stopPropagation();
                // Reset form for new experiment creation
                const form = document.getElementById('form-create');
                if (form) {
                    form.reset();
                    this.resetCreateForm(form);
                }
                this.openModal('modal-create');
                return;
            }
        });

        // Check for Updates button
        app.addEventListener('click', (e) => {
            if (e.target.closest('#btn-check-updates')) {
                e.stopPropagation();
                this.checkForUpdates();
                return;
            }
        });

        // View Archived button
        app.addEventListener('click', (e) => {
            if (e.target.closest('#btn-view-archive')) {
                e.stopPropagation();
                this.openModal('modal-archived');
                return;
            }
        });

        // Unarchive experiment button
        app.addEventListener('click', (e) => {
            const unarchiveBtn = e.target.closest('.btn-unarchive-exp');
            if (unarchiveBtn) {
                const expId = unarchiveBtn.dataset.expId;
                DataManager.updateExperiment(expId, { status: 'active' });
                this.showToast('Experiment restored');
                this.render();
                return;
            }
        });

        // Theme selector
        app.addEventListener('click', (e) => {
            const themeBtn = e.target.closest('[data-theme-opt]');
            if (themeBtn) {
                e.stopPropagation();
                this.setTheme(themeBtn.dataset.themeOpt);
                return;
            }
        });

        // Dock toggle (Settings)
        app.addEventListener('click', (e) => {
            const dockToggle = e.target.closest('[data-dock-toggle]');
            if (dockToggle) {
                e.stopPropagation();
                const viewId = dockToggle.dataset.dockToggle;
                this.toggleDockView(viewId);
                return;
            }
        });

        // Toggle completed section visibility (NO full re-render!)
        app.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="toggle-completed"]')) {
                e.stopPropagation();
                // Use selective update for smooth animation
                const section = document.querySelector('.completed-list-container');
                const button = e.target.closest('[data-action="toggle-completed"]');

                this.state.showCompleted = !this.state.showCompleted;

                if (button) {
                    button.setAttribute('aria-expanded', this.state.showCompleted);
                    const chevron = button.querySelector('[aria-hidden="true"]');
                    if (chevron) {
                        chevron.style.transform = this.state.showCompleted ? 'rotate(180deg)' : 'rotate(0deg)';
                    }
                }

                if (section) {
                    if (this.state.showCompleted) {
                        section.style.display = 'block';
                        requestAnimationFrame(() => {
                            section.style.maxHeight = section.scrollHeight + 'px';
                            section.style.opacity = '1';
                        });
                    } else {
                        section.style.maxHeight = '0';
                        section.style.opacity = '0';
                        setTimeout(() => {
                            if (!this.state.showCompleted) {
                                section.style.display = 'none';
                            }
                        }, 300);
                    }
                }
                return;
            }
        });

        // Toggle hidden section visibility
        app.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="toggle-hidden"]')) {
                e.stopPropagation();
                this.state.showHidden = !this.state.showHidden;
                localStorage.setItem('experiments_show_hidden', this.state.showHidden);
                this.render();
                return;
            }
        });

        // Todo FAB - Add new task
        app.addEventListener('click', (e) => {
            if (e.target.closest('#fab-add-todo')) {
                e.stopPropagation();

                // iOS WORKAROUND: Create temporary input to capture focus during tap event
                // This tricks iOS into showing the keyboard
                const tempInput = document.createElement('input');
                tempInput.type = 'text';
                tempInput.style.cssText = 'position: absolute; opacity: 0; height: 0; width: 0; padding: 0; border: 0;';
                document.body.appendChild(tempInput);
                tempInput.focus(); // Synchronous focus within tap event

                // Create new task with empty title and open detail view
                const newTodo = TodoManager.add({ title: '' });
                this.state.currentTodo = newTodo.id;
                this.state.isEditingTodoNotes = false;
                this.render();

                // Transfer focus to the real title input
                requestAnimationFrame(() => {
                    const titleInput = document.getElementById('todo-detail-title');
                    if (titleInput) {
                        titleInput.focus();
                        titleInput.select();
                    }
                    // Clean up temp input
                    tempInput.remove();
                });
                return;
            }
        });

        // Todo checkbox toggle (OPTIMIZED: No full re-render!)
        app.addEventListener('click', (e) => {
            const todoItem = e.target.closest('.todo-item');
            const toggleAction = e.target.closest('[data-action="toggle-todo"]');
            if (todoItem && toggleAction) {
                e.stopPropagation();
                const todoId = todoItem.dataset.todoId;
                TodoManager.toggle(todoId);
                // Use selective DOM update instead of full re-render
                this.updateTodoItemDOM(todoId);
                return;
            }
        });

        // Todo item click - open detail modal (full row, except checkbox and grip)
        app.addEventListener('click', (e) => {
            const todoItem = e.target.closest('.todo-item');
            // Ignore clicks on checkbox, grip, or other interactive elements
            const isCheckbox = e.target.closest('[data-action="toggle-todo"]');
            const isGrip = e.target.closest('.todo-grip');

            if (todoItem && !isCheckbox && !isGrip) {
                e.stopPropagation();
                const todoId = todoItem.dataset.todoId;
                this.state.currentTodo = todoId;
                this.state.isEditingTodoNotes = false;
                this.render();
                return;
            }
        });

        // Todo detail modal: Close button
        app.addEventListener('click', (e) => {
            if (e.target.closest('[data-close="modal-todo-detail"]')) {
                e.stopPropagation();
                // Save title if changed, or delete task if title is empty
                const titleInput = document.getElementById('todo-detail-title');
                if (titleInput && this.state.currentTodo) {
                    const trimmedTitle = titleInput.value.trim();
                    if (trimmedTitle) {
                        TodoManager.update(this.state.currentTodo, { title: trimmedTitle });
                    } else {
                        // Delete task if no title was entered
                        TodoManager.delete(this.state.currentTodo);
                    }
                }
                this.state.currentTodo = null;
                this.state.isEditingTodoNotes = false;
                this.render();
                return;
            }
        });

        // Todo detail modal: Toggle completion from detail
        app.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="toggle-detail-todo"]')) {
                e.stopPropagation();
                if (this.state.currentTodo) {
                    TodoManager.toggle(this.state.currentTodo);
                    this.render();
                }
                return;
            }
        });

        // Todo detail modal: Click notes to edit (OPTIMIZED: No re-render!)
        app.addEventListener('click', (e) => {
            const notesView = e.target.closest('#notes-view');
            if (notesView && this.state.currentTodo) {
                e.stopPropagation();

                // Get current notes from data
                const todo = TodoManager.getAll().find(t => t.id === this.state.currentTodo);
                const currentNotes = todo?.notes || '';

                // Create textarea to replace the view div
                const textarea = document.createElement('textarea');
                textarea.id = 'todo-notes-edit';
                textarea.placeholder = 'Add notes, links, or details...';
                textarea.style.cssText = 'width: 100%; min-height: 500px; padding: var(--space-md); background: var(--inactive-bg); border: 2px solid var(--accent-color); border-radius: var(--radius-md); font-size: var(--text-sm); resize: vertical; color: inherit; outline: none;';
                textarea.value = currentNotes;

                // Replace view with textarea
                notesView.replaceWith(textarea);
                textarea.focus();

                // Update state (for save button logic)
                this.state.isEditingTodoNotes = true;

                return;
            }
        });

        // Todo detail modal: Save notes
        app.addEventListener('click', (e) => {
            if (e.target.closest('#btn-save-notes')) {
                e.stopPropagation();
                const textarea = document.getElementById('todo-notes-edit');
                if (textarea && this.state.currentTodo) {
                    TodoManager.update(this.state.currentTodo, { notes: textarea.value });
                    this.showToast('Notes saved');
                }
                this.state.isEditingTodoNotes = false;
                this.render();
                return;
            }
        });

        // Todo detail modal: Cancel notes edit
        app.addEventListener('click', (e) => {
            if (e.target.closest('#btn-cancel-notes')) {
                e.stopPropagation();
                this.state.isEditingTodoNotes = false;
                this.render();
                return;
            }
        });

        // --- Checklist System Listeners ---

        // Toggle Checklist Collapse
        app.addEventListener('click', (e) => {
            const header = e.target.closest('.checklist-header');
            // Ignore if clicking delete button or editable title
            if (header && !e.target.closest('.checklist-delete') && !e.target.closest('.checklist-title')) {
                const section = header.closest('[data-checklist-id]');
                if (section && this.state.currentTodo) {
                    const checklistId = section.dataset.checklistId;
                    const todo = TodoManager.getAll().find(t => t.id === this.state.currentTodo);
                    const cl = todo.checklists.find(c => c.id === checklistId);
                    if (cl) {
                        const newCollapsed = !cl.isCollapsed;
                        TodoManager.updateChecklist(this.state.currentTodo, checklistId, { isCollapsed: newCollapsed });

                        // Selective DOM update (No full re-render)
                        const content = section.querySelector('.checklist-content');
                        // Toggle icon is the first span
                        const toggleIcon = header.querySelector('span');

                        if (content) {
                            content.style.display = newCollapsed ? 'none' : 'block';
                        }
                        if (toggleIcon) {
                            toggleIcon.textContent = newCollapsed ? '+' : '−';
                        }
                    }
                }
            }
        });

        // Add New Checklist - Optimized to append directly to DOM
        app.addEventListener('click', (e) => {
            if (e.target.closest('#btn-add-checklist')) {
                const updatedTodo = TodoManager.addChecklist(this.state.currentTodo, 'New Checklist');

                if (updatedTodo) {
                    const newChecklist = updatedTodo.checklists[updatedTodo.checklists.length - 1]; // Get last added
                    const container = document.getElementById('checklists-container');

                    if (container) {
                        const div = document.createElement('div');
                        div.className = 'checklist-section';
                        div.dataset.checklistId = newChecklist.id;
                        div.style.cssText = 'margin-bottom: var(--space-md); background: var(--inactive-bg); border-radius: var(--radius-md); overflow: hidden; opacity: 0; transition: opacity 0.3s ease;';

                        div.innerHTML = `
                            <!-- Checklist Header -->
                            <div class="checklist-header" style="display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-sm) var(--space-md); background: rgba(0,0,0,0.03); cursor: pointer;" data-action="toggle-checklist-collapse">
                                <span style="font-family: monospace; font-weight: bold; color: var(--text-secondary); width: 20px; text-align: center; font-size: 16px;">−</span>
                                <span class="checklist-title" contenteditable="true" data-action="edit-checklist-title" style="flex: 1; font-weight: 600; font-size: var(--text-sm); color: var(--text-secondary); outline: none; padding: 2px 4px; border-radius: 4px; border: 1px solid transparent;">${escapeHtml(newChecklist.title)}</span>
                                <button class="checklist-delete" data-action="delete-checklist" style="opacity: 0.3; padding: 4px; border: none; background: transparent; cursor: pointer;">${UI.icons.x}</button>
                            </div>
                            
                            <!-- Checklist Content (Items + Add Row) -->
                            <div class="checklist-content" style="display: block; padding: var(--space-xs);">
                                
                                <!-- Subtask List -->
                                <div class="subtask-list" id="list-${newChecklist.id}"></div>
                                
                                <!-- Add Subtask Row -->
                                <div style="display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-sm); background: var(--surface-color); border-radius: var(--radius-sm); margin-top: var(--space-xs);">
                                    <span style="color: var(--text-tertiary); font-weight: bold;">+</span>
                                    <input type="text" class="add-subtask-text" placeholder="Add item..." maxlength="200" style="flex: 1; border: none; background: transparent; font-size: var(--text-sm); color: inherit; padding: 0; outline: none;">
                                </div>
                            </div>
                        `;

                        container.appendChild(div);

                        // Animate in and Focus
                        requestAnimationFrame(() => {
                            div.style.opacity = '1';
                            const title = div.querySelector('.checklist-title');
                            if (title) {
                                title.focus();
                                // Select all text
                                const range = document.createRange();
                                range.selectNodeContents(title);
                                const sel = window.getSelection();
                                sel.removeAllRanges();
                                sel.addRange(range);
                            }
                        });
                    }
                }
            }
        });

        // Delete Checklist
        app.addEventListener('click', (e) => {
            const btn = e.target.closest('.checklist-delete');
            if (btn && confirm('Delete this checklist?')) {
                const section = btn.closest('[data-checklist-id]');
                const checklistId = section.dataset.checklistId;
                TodoManager.deleteChecklist(this.state.currentTodo, checklistId);
                this.render();
            }
        });

        // Edit Checklist Title (Blur) for auto-save
        app.addEventListener('blur', (e) => {
            const titleSpan = e.target.closest('.checklist-title');
            if (titleSpan) {
                const section = titleSpan.closest('[data-checklist-id]');
                const checklistId = section.dataset.checklistId;
                const newTitle = titleSpan.innerText.trim() || 'Checklist';
                TodoManager.updateChecklist(this.state.currentTodo, checklistId, { title: newTitle });
            }
        }, true);

        // Prevent newlines in Checklist Title
        app.addEventListener('keydown', (e) => {
            const titleSpan = e.target.closest('.checklist-title');
            if (titleSpan && e.key === 'Enter') {
                e.preventDefault();
                titleSpan.blur();
            }
        });

        // Add Subtask (Enter) - Optimized to append directly to DOM
        app.addEventListener('keydown', (e) => {
            const input = e.target.closest('.add-subtask-text');
            if (input && e.key === 'Enter' && input.value.trim() && this.state.currentTodo) {
                e.preventDefault();
                const text = input.value.trim();
                const section = input.closest('[data-checklist-id]');
                const checklistId = section.dataset.checklistId;

                const updatedTodo = TodoManager.addSubtaskItem(this.state.currentTodo, checklistId, text);

                if (updatedTodo) {
                    const cl = updatedTodo.checklists.find(c => c.id === checklistId);
                    const newSubtask = cl.items[cl.items.length - 1]; // Get last item

                    const listContainer = section.querySelector('.subtask-list');
                    if (listContainer) {
                        const div = document.createElement('div');
                        div.className = 'subtask-item';
                        div.dataset.subtaskId = newSubtask.id;
                        div.draggable = true;
                        div.style.cssText = 'display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-sm); background: var(--surface-color); border-radius: var(--radius-sm); margin-bottom: var(--space-xs); opacity: 0; transition: opacity 0.2s ease-out, transform 0.2s ease-out; transform: translateY(10px);';

                        div.innerHTML = `
                            <div class="todo-grip subtask-grip" style="cursor: grab; color: var(--text-tertiary);">${UI.icons.grip}</div>
                            <div class="subtask-checkbox" data-action="toggle-subtask" style="width: 18px; height: 18px;"></div>
                            <span class="subtask-text" data-action="edit-subtask-inline" style="flex: 1; cursor: text;">${escapeHtml(newSubtask.text)}</span>
                            <button class="subtask-delete" data-action="delete-subtask" style="opacity: 0.5;">${UI.icons.x}</button>
                        `;

                        listContainer.appendChild(div);

                        // Animate In
                        requestAnimationFrame(() => {
                            div.style.opacity = '1';
                            div.style.transform = 'translateY(0)';
                        });
                    }
                }

                input.value = '';
                // Focus remains on input since we didn't re-render
            }
        });

        // Toggle Subtask Item
        app.addEventListener('click', (e) => {
            const checkbox = e.target.closest('[data-action="toggle-subtask"]');
            if (checkbox && this.state.currentTodo) {
                const item = checkbox.closest('.subtask-item');
                const subtaskId = item.dataset.subtaskId;
                TodoManager.toggleSubtaskItem(this.state.currentTodo, subtaskId);
                this.render();
            }
        });

        // Delete Subtask Item
        app.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action="delete-subtask"]');
            if (btn && this.state.currentTodo) {
                const item = btn.closest('.subtask-item');
                const subtaskId = item.dataset.subtaskId;
                TodoManager.deleteSubtaskItem(this.state.currentTodo, subtaskId);
                this.render();
            }
        });

        // Keyboard shortcuts for todo modal (power user features)
        app.addEventListener('keydown', (e) => {
            // Only apply when todo modal is open
            const todoModal = document.getElementById('modal-todo-detail');
            if (!todoModal || !todoModal.classList.contains('active')) return;

            // Don't interfere with input fields (except for save shortcuts)
            const isInInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

            // Escape: Close modal (trigger close button to ensure save logic runs)
            if (e.key === 'Escape' && !isInInput) {
                e.preventDefault();
                const closeBtn = todoModal.querySelector('[data-close="modal-todo-detail"]');
                if (closeBtn) closeBtn.click();
                return;
            }

            // Ctrl/Cmd + Enter: Quick save and close
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                const saveBtn = document.getElementById('btn-save-todo');
                if (saveBtn) saveBtn.click();
                return;
            }

            // Ctrl/Cmd + Backspace: Delete task
            if ((e.ctrlKey || e.metaKey) && e.key === 'Backspace') {
                e.preventDefault();
                const deleteBtn = document.getElementById('btn-delete-todo');
                if (deleteBtn) deleteBtn.click();
                return;
            }
        });

        // Todo detail modal: Save all changes
        app.addEventListener('click', (e) => {
            if (e.target.closest('#btn-save-todo')) {
                e.stopPropagation();
                if (this.state.currentTodo) {
                    const titleInput = document.getElementById('todo-detail-title');
                    const notesInput = document.getElementById('todo-notes-edit');

                    // Check if title is empty - delete task if so
                    if (titleInput && !titleInput.value.trim()) {
                        TodoManager.delete(this.state.currentTodo);
                        this.showToast('Task deleted - no title entered');
                        this.state.currentTodo = null;
                        this.render();
                        return;
                    }

                    const updates = {};
                    if (titleInput) updates.title = titleInput.value.trim();
                    if (notesInput) updates.notes = notesInput.value;

                    TodoManager.update(this.state.currentTodo, updates);
                    this.showToast('Changes saved');
                    this.state.currentTodo = null;
                    this.render();
                }
                return;
            }
        });

        // Subtask Drag-and-Drop: dragstart (Updated)
        app.addEventListener('dragstart', (e) => {
            const subtaskItem = e.target.closest('.subtask-item');
            if (subtaskItem && this.state.currentTodo) {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', subtaskItem.dataset.subtaskId);
                subtaskItem.classList.add('dragging');
            }
        });

        // Subtask Drag-and-Drop: dragover (Updated)
        app.addEventListener('dragover', (e) => {
            const subtaskList = e.target.closest('.subtask-list');
            if (subtaskList && this.state.currentTodo) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';

                const dragging = document.querySelector('.subtask-item.dragging');
                if (dragging) {
                    const afterElement = this.getDragAfterElement(subtaskList, e.clientY);
                    if (afterElement == null) {
                        subtaskList.appendChild(dragging);
                    } else {
                        subtaskList.insertBefore(dragging, afterElement);
                    }
                }
            }
        });

        // Subtask Drag-and-Drop: dragend (Updated)
        app.addEventListener('dragend', (e) => {
            const subtaskItem = e.target.closest('.subtask-item');
            if (subtaskItem && this.state.currentTodo) {
                subtaskItem.classList.remove('dragging');

                const subtaskList = subtaskItem.closest('.subtask-list');
                if (subtaskList) {
                    const section = subtaskList.closest('[data-checklist-id]');
                    if (section) {
                        const checklistId = section.dataset.checklistId;
                        const orderedIds = Array.from(subtaskList.querySelectorAll('.subtask-item[data-subtask-id]'))
                            .map(item => item.dataset.subtaskId);

                        if (orderedIds.length > 0) {
                            TodoManager.reorderSubtaskItems(this.state.currentTodo, checklistId, orderedIds);
                        }
                    }
                }
            }
        });

        // Checklist Drag-and-Drop: dragstart
        app.addEventListener('dragstart', (e) => {
            const section = e.target.closest('.checklist-section');
            // Only handle if it's a checklist section and NOT a subtask item
            if (section && this.state.currentTodo && !e.target.closest('.subtask-item')) {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('application/checklist-id', section.dataset.checklistId);
                section.classList.add('checklist-dragging');
            }
        });

        // Checklist Drag-and-Drop: dragover
        app.addEventListener('dragover', (e) => {
            const container = e.target.closest('#checklists-container');
            const draggingChecklist = document.querySelector('.checklist-section.checklist-dragging');
            if (container && this.state.currentTodo && draggingChecklist) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';

                const afterElement = this.getChecklistDragAfterElement(container, e.clientY);
                if (afterElement == null) {
                    container.appendChild(draggingChecklist);
                } else {
                    container.insertBefore(draggingChecklist, afterElement);
                }
            }
        });

        // Checklist Drag-and-Drop: dragend
        app.addEventListener('dragend', (e) => {
            // Find the dragging checklist by class, not by e.target
            const section = document.querySelector('.checklist-section.checklist-dragging');
            if (section) {
                section.classList.remove('checklist-dragging');

                const container = document.getElementById('checklists-container');
                if (container && this.state.currentTodo) {
                    const orderedIds = Array.from(container.querySelectorAll('.checklist-section[data-checklist-id]'))
                        .map(s => s.dataset.checklistId);

                    if (orderedIds.length > 0) {
                        TodoManager.reorderChecklists(this.state.currentTodo, orderedIds);
                    }
                }
            }
        });

        // Edit Subtask: Switch to Input (Click)
        app.addEventListener('click', (e) => {
            const span = e.target.closest('[data-action="edit-subtask-inline"]');
            if (span && this.state.currentTodo) {
                const text = span.textContent;
                const input = document.createElement('input');
                input.className = 'subtask-edit-input';
                input.value = text;
                input.style.cssText = 'flex: 1; font-size: inherit; color: inherit; background: transparent; border: none; outline: none; padding: 0;';
                span.replaceWith(input);
                input.focus();
            }
        });

        // Edit Subtask: Save (Blur/Enter)
        const saveSubtaskEdit = (input) => {
            const item = input.closest('.subtask-item');
            if (item && this.state.currentTodo) {
                const subtaskId = item.dataset.subtaskId;
                const newText = input.value.trim();

                if (newText) {
                    TodoManager.updateSubtaskItem(this.state.currentTodo, subtaskId, { text: newText });

                    // Manual DOM Update: Revert to span
                    const span = document.createElement('span');
                    span.className = 'subtask-text';
                    span.dataset.action = 'edit-subtask-inline';

                    // Check completion status for styling
                    const checkbox = item.querySelector('.subtask-checkbox');
                    const isCompleted = checkbox && checkbox.classList.contains('completed'); // Check visual state

                    span.style.cssText = 'flex: 1; cursor: text;';
                    if (isCompleted) {
                        span.style.textDecoration = 'line-through';
                        span.style.opacity = '0.6';
                    }

                    span.textContent = newText;
                    input.replaceWith(span);
                } else {
                    // Delete if empty
                    TodoManager.deleteSubtaskItem(this.state.currentTodo, subtaskId);
                    // Animate and Remove
                    item.style.transition = 'all 0.2s ease';
                    item.style.opacity = '0';
                    setTimeout(() => item.remove(), 200);
                }
            }
        };

        app.addEventListener('blur', (e) => {
            if (e.target.matches('.subtask-edit-input')) {
                saveSubtaskEdit(e.target);
            }
        }, true);

        app.addEventListener('keydown', (e) => {
            if (e.target.matches('.subtask-edit-input') && e.key === 'Enter') {
                e.preventDefault();
                saveSubtaskEdit(e.target);
            }
        });

        // Todo detail modal: Save notes on blur (OPTIMIZED: No re-render!)
        app.addEventListener('blur', (e) => {
            const notesTextarea = e.target.closest('#todo-notes-edit');
            if (notesTextarea && this.state.currentTodo) {
                const newNotes = notesTextarea.value;

                // Save to data layer
                TodoManager.update(this.state.currentTodo, { notes: newNotes });

                // Create view div to replace textarea
                const viewDiv = document.createElement('div');
                viewDiv.id = 'notes-view';
                viewDiv.style.cssText = 'min-height: 60px; padding: var(--space-md); background: var(--inactive-bg); border-radius: var(--radius-md); cursor: pointer; font-size: var(--text-sm); color: inherit; text-align: left;';
                viewDiv.innerHTML = newNotes
                    ? formatTextWithLinks(newNotes)
                    : '<span style="color: var(--text-tertiary); font-style: italic;">Add notes, links, or details...</span>';

                // Replace textarea with view
                notesTextarea.replaceWith(viewDiv);

                // Update state
                this.state.isEditingTodoNotes = false;
            }
        }, true); // Use capture phase for blur

        // Todo detail modal: Input handlers (OPTIMIZED: No re-renders!)
        app.addEventListener('input', (e) => {
            // Notes link preview
            if (e.target.id === 'todo-notes-edit') {
                const preview = document.getElementById('notes-preview');
                if (preview) {
                    const text = e.target.value;
                    if (text && text.includes('http')) {
                        preview.style.display = 'block';
                        preview.innerHTML = `<div style="font-size: var(--text-xs); color: var(--text-tertiary); margin-bottom: var(--space-xs);">PREVIEW:</div>${formatTextWithLinks(text)}`;
                    } else {
                        preview.style.display = 'none';
                    }
                }
            }

            // Title character counter - Use selective update method
            if (e.target.id === 'todo-detail-title') {
                this.updateCharacterCounter(e.target);
            }
        });

        // Todo detail modal: Click on subtask text to edit inline
        app.addEventListener('click', (e) => {
            const subtaskText = e.target.closest('[data-action="edit-subtask-inline"]');
            if (subtaskText && this.state.currentTodo) {
                e.stopPropagation();
                const subtaskItem = subtaskText.closest('.subtask-item');
                if (!subtaskItem) return;

                const currentText = subtaskText.textContent;

                // Replace span with input for editing
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'subtask-edit-input';
                input.value = currentText;
                input.maxLength = 200;
                input.style.cssText = 'flex: 1; border: none; background: transparent; color: inherit; font-size: inherit; outline: none;';

                subtaskText.replaceWith(input);
                input.focus();
                input.select();

                return;
            }
        });

        // Todo detail modal: Toggle subtask
        app.addEventListener('click', (e) => {
            const subtaskItem = e.target.closest('.subtask-item');
            const toggleAction = e.target.closest('[data-action="toggle-subtask"]');
            if (subtaskItem && toggleAction && this.state.currentTodo) {
                e.stopPropagation();
                const subtaskId = subtaskItem.dataset.subtaskId;
                TodoManager.toggleSubtask(this.state.currentTodo, subtaskId);
                this.render();
                return;
            }
        });

        // Todo detail modal: Delete subtask (with exit animation)
        app.addEventListener('click', (e) => {
            const subtaskItem = e.target.closest('.subtask-item');
            const deleteAction = e.target.closest('[data-action="delete-subtask"]');
            if (subtaskItem && deleteAction && this.state.currentTodo) {
                e.stopPropagation();
                const subtaskId = subtaskItem.dataset.subtaskId;

                // Add exiting class for animation
                subtaskItem.classList.add('exiting');

                // Wait for animation to complete, then delete
                setTimeout(() => {
                    TodoManager.deleteSubtask(this.state.currentTodo, subtaskId);
                    this.render();
                }, 250); // Match animation duration in CSS

                return;
            }
        });

        // Todo detail modal: Delete task with undo
        app.addEventListener('click', (e) => {
            if (e.target.closest('#btn-delete-todo')) {
                e.stopPropagation();
                if (this.state.currentTodo) {
                    // Get full todo object before deleting
                    const deletedTodo = TodoManager.getAll().find(t => t.id === this.state.currentTodo);
                    const todoId = this.state.currentTodo;

                    // Delete the task
                    TodoManager.delete(todoId);
                    this.state.currentTodo = null;
                    this.render();

                    // Show undo toast
                    this.showToast('Task deleted', {
                        duration: 5000, // 5 seconds to undo
                        undo: () => {
                            // Restore the deleted todo
                            if (deletedTodo) {
                                const todos = TodoManager.getAll();
                                todos.push(deletedTodo);
                                TodoManager.save(todos);
                                this.showToast('Task restored');
                                this.render();
                            }
                        }
                    });
                }
                return;
            }
        });

        // Todo Drag-and-Drop: dragstart
        // Todo Drag-and-Drop: dragstart
        app.addEventListener('dragstart', (e) => {
            // FIX: Get the container, not just the item
            const container = e.target.closest('.swipe-container');
            // Ensure we are dragging by the grip
            if (container && e.target.closest('.todo-grip')) {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', container.dataset.swipeId);

                // Set drag image to the container
                if (e.dataTransfer.setDragImage) {
                    e.dataTransfer.setDragImage(container, 0, 0);
                }
                container.classList.add('dragging');
            }
        });

        // Todo Drag-and-Drop: dragover (allow drop)
        // Todo Drag-and-Drop: dragover (allow drop)
        app.addEventListener('dragover', (e) => {
            const todoList = e.target.closest('.todo-list');
            // Only allow if we are dragging a generic todo (swipe-container)
            // and NOT if dragging a subtask or other item type
            const dragging = document.querySelector('.swipe-container.dragging');

            if (todoList && dragging) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';

                const afterElement = this.getSwipeContainerDragAfterElement(todoList, e.clientY);

                if (afterElement == null) {
                    todoList.appendChild(dragging);
                } else {
                    todoList.insertBefore(dragging, afterElement);
                }
            }
        });

        // Todo Drag-and-Drop: dragend (cleanup)
        // Todo Drag-and-Drop: dragend (cleanup)
        app.addEventListener('dragend', (e) => {
            const container = e.target.closest('.swipe-container');
            if (container) {
                container.classList.remove('dragging');

                // Save new order
                const todoList = document.getElementById('todo-list');
                if (todoList) {
                    // FIX: Validate IDs before saving order
                    // Note: We query the items inside the reordered containers
                    const orderedIds = Array.from(todoList.querySelectorAll('.todo-item[data-todo-id]'))
                        .map(item => item.dataset.todoId)
                        .filter(id => id && id.startsWith('todo-')); // Validate ID format
                    if (orderedIds.length > 0) {
                        TodoManager.reorder(orderedIds);
                    }
                }
            }
        });

        // Edit button
        app.addEventListener('click', (e) => {
            if (e.target.closest('#btn-edit')) {
                e.stopPropagation();
                this.handleEditExperiment();
                return;
            }
        });

        // Start Experiment button (using click instead of form submit to avoid CSP issues)
        app.addEventListener('click', (e) => {
            if (e.target.closest('#btn-start-experiment')) {
                e.stopPropagation();
                const form = document.getElementById('form-create');
                if (form) {
                    this.handleCreateExperiment(form);
                }
                return;
            }
        });

        // Save Checkin button (using click instead of form submit to avoid CSP issues)
        app.addEventListener('click', (e) => {
            if (e.target.closest('#btn-save-checkin')) {
                e.stopPropagation();
                const form = document.getElementById('form-checkin');
                if (form) {
                    this.handleCheckin(form);
                }
                return;
            }
        });

        // Delete button
        app.addEventListener('click', (e) => {
            if (e.target.closest('#btn-delete')) {
                e.stopPropagation();
                this.confirmAction(
                    'Delete Experiment?',
                    'This will permanently delete this experiment and all its history. This cannot be undone.',
                    () => {
                        const id = document.getElementById('create-id').value;
                        DataManager.deleteExperiment(id);
                        this.state.currentExperiment = null;
                        this.closeModal('modal-create');
                        this.render();
                        this.showToast('Experiment deleted');
                    }
                );
                return;
            }
        });

        // Reflection toggle
        app.addEventListener('click', (e) => {
            const toggle = e.target.closest('.reflection-toggle');
            if (toggle) {
                e.stopPropagation();
                const fields = toggle.nextElementSibling;
                const isVisible = fields.classList.contains('visible');
                const symbol = toggle.querySelector('span:first-child');
                fields.classList.toggle('visible');
                if (symbol) symbol.textContent = isVisible ? '+' : '−';
                return;
            }
        });

        // Modal close
        app.addEventListener('click', (e) => {
            const closeBtn = e.target.closest('[data-close]');
            if (closeBtn) {
                e.stopPropagation();
                this.closeModal(closeBtn.dataset.close);
                return;
            }
            // Click on overlay to close
            if (e.target.classList.contains('modal-overlay')) {
                this.closeModal(e.target.id);
                return;
            }
        });

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal-overlay.active');
                if (activeModal) {
                    this.closeModal(activeModal.id);
                }
            }
        });

        // Experiment row click (with swipe protection)
        app.addEventListener('click', (e) => {
            const row = e.target.closest('.experiment-row');
            if (row) {
                // Prevent click if we just swiped
                if (this.swipeState && this.swipeState.didSwipe) {
                    this.swipeState.didSwipe = false;
                    return;
                }
                // Prevent click if row is revealed (close it instead, handled elsewhere)
                if (row.dataset.revealed) {
                    return;
                }
                e.stopPropagation();
                this.state.currentExperiment = row.dataset.id;
                this.render();
                return;
            }
        });

        // Back button
        app.addEventListener('click', (e) => {
            if (e.target.closest('#btn-back')) {
                e.stopPropagation();
                this.state.currentExperiment = null;
                this.render();
                return;
            }
        });

        // Check-in button
        app.addEventListener('click', (e) => {
            if (e.target.closest('#btn-checkin')) {
                e.stopPropagation();
                this.openModal('modal-checkin');
                return;
            }
        });

        // Template card click
        app.addEventListener('click', (e) => {
            const card = e.target.closest('.template-card');
            if (card) {
                e.stopPropagation();
                const template = DataManager.getTemplates().find(t => t.id === card.dataset.id);
                if (template) {
                    this.createFromTemplate(template);
                }
                return;
            }
        });

        // Segmented control (non-form) - detail view tabs
        app.addEventListener('click', (e) => {
            const option = e.target.closest('.segmented-option');
            if (option && !option.closest('form')) {
                const section = option.dataset.section;
                if (section) {
                    e.stopPropagation();
                    const control = option.closest('.segmented-control');
                    control.querySelectorAll('.segmented-option').forEach(o => o.classList.remove('active'));
                    option.classList.add('active');
                    document.getElementById('detail-section-entries')?.classList.toggle('hidden', section !== 'entries');
                    document.getElementById('detail-section-calendar')?.classList.toggle('hidden', section !== 'calendar');
                    return;
                }
            }
        });

        // Form segmented controls
        app.addEventListener('click', (e) => {
            const option = e.target.closest('.segmented-option');
            if (option && option.closest('form')) {
                e.stopPropagation();
                const parent = option.parentElement;
                parent.querySelectorAll('.segmented-option').forEach(o => o.classList.remove('active'));
                option.classList.add('active');
                return;
            }
        });

        // Filter pills - uses state-based filtering
        app.addEventListener('click', (e) => {
            const pill = e.target.closest('.pill[data-filter]');
            if (pill) {
                e.stopPropagation();
                const filter = pill.dataset.filter;
                this.state.currentFilter = filter;
                this.render();
                return;
            }
        });

        // ========================================
        // SWIPE-TO-REVEAL GESTURE HANDLING
        // ========================================

        // Initialize swipe state
        this.swipeState = {
            active: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            direction: null, // 'horizontal' or 'vertical'
            container: null,
            row: null,
            didSwipe: false,
            startTime: 0,
            hapticTriggered: false
        };

        const PEEK_THRESHOLD = 30;        // Start showing buttons
        const COMMIT_THRESHOLD = 60;      // Lock buttons open (easier to trigger)
        const BUTTONS_WIDTH = 152;        // 2 buttons × 60px + gaps + padding
        const DIRECTION_LOCK_THRESHOLD = 15;
        const VELOCITY_THRESHOLD = 0.25;  // Auto-open if fast swipe (more responsive)

        // Haptic feedback helper
        const triggerHaptic = (style = 'medium') => {
            if (navigator.vibrate) {
                const patterns = {
                    light: 10,
                    medium: 20,
                    strong: 30,
                    success: [10, 50, 10]
                };
                navigator.vibrate(patterns[style] || patterns.medium);
            }
        };

        // Touch start
        app.addEventListener('touchstart', (e) => {
            const container = e.target.closest('.swipe-container');
            if (!container) return;

            // Don't start swipe if tapping a button
            if (e.target.closest('.swipe-btn')) return;

            // Prevent swipe if touching the drag grip
            if (e.target.closest('.todo-grip, .grip-handler')) return;

            const touch = e.touches[0];
            const row = container.querySelector('.experiment-row, .todo-row');

            // Close any other open swipes (both experiments and todos)
            document.querySelectorAll('.experiment-row[data-revealed], .todo-row[data-revealed]').forEach(otherRow => {
                if (otherRow !== row) {
                    otherRow.style.transform = '';
                    delete otherRow.dataset.revealed;
                }
            });

            // Calculate widths dynamically
            const leftActions = container.querySelector('.swipe-actions-left');
            const rightActions = container.querySelector('.swipe-actions-right');

            const swipeType = container.dataset.swipeType;
            let leftWidth = leftActions ? leftActions.offsetWidth : 0;
            let rightWidth = rightActions ? rightActions.offsetWidth : 0;
            let hasLeft = !!leftActions;
            let hasRight = !!rightActions;

            // FIX: Explicitly enforce config for known types to avoid DOM/layout race conditions
            if (swipeType === 'todo') {
                hasLeft = true;
                leftWidth = 80; // Button (60) + gap (8) + padding (8) + buffer
                hasRight = false; // Todos don't have right actions currently
            }

            // Determine initial state
            const currentTransform = new WebKitCSSMatrix(window.getComputedStyle(row).transform);
            const initialTranslateX = currentTransform.m41;

            this.swipeState = {
                active: true,
                startX: touch.clientX,
                startY: touch.clientY,
                initialTranslateX: initialTranslateX,
                currentX: initialTranslateX,
                direction: null,
                container: container,
                row: row,
                leftWidth: leftWidth || 80,
                rightWidth: rightWidth || 152,
                hasLeft: hasLeft,
                hasRight: hasRight,
                didSwipe: false,
                startTime: Date.now(),
                hapticTriggered: false
            };

            // Remove transition for instant drag
            row.style.transition = 'none';
        }, { passive: true });

        // Touch move
        app.addEventListener('touchmove', (e) => {
            if (!this.swipeState.active) return;

            const touch = e.touches[0];
            const deltaX = touch.clientX - this.swipeState.startX;
            const deltaY = touch.clientY - this.swipeState.startY;

            // Determine direction if not locked
            if (!this.swipeState.direction) {
                if (Math.abs(deltaX) > DIRECTION_LOCK_THRESHOLD || Math.abs(deltaY) > DIRECTION_LOCK_THRESHOLD) {
                    this.swipeState.direction = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
                }
            }

            // Only handle horizontal swipes
            if (this.swipeState.direction !== 'horizontal') return;

            // Prevent scroll during horizontal swipe
            e.preventDefault();

            // 1:1 Movement logic
            const { startX, initialTranslateX, leftWidth, rightWidth, hasLeft, hasRight } = this.swipeState;
            const currentDelta = touch.clientX - startX;
            let newX = initialTranslateX + currentDelta;

            // Constrain movement based on available actions
            // Allow slight resistance overshoot but generally stick to 1:1
            if (newX > 0 && !hasLeft) newX = newX * 0.2; // Resistance if no left actions
            if (newX < 0 && !hasRight) newX = newX * 0.2; // Resistance if no right actions

            // Hard limits with slight elasticity (optional, but good for feel)
            // For now, sticking to 1:1 until max width, then resistance
            // Rubber banding: heavier resistance (0.15) past snap points
            if (newX > leftWidth) newX = leftWidth + (newX - leftWidth) * 0.15;
            if (newX < -rightWidth) newX = -rightWidth + (newX + rightWidth) * 0.15;

            this.swipeState.currentX = newX;

            // Apply transform 1:1
            const row = this.swipeState.row;
            row.classList.add('swiping');
            row.style.transform = `translateX(${newX}px)`;

            this.swipeState.didSwipe = Math.abs(currentDelta) > 5;
        }, { passive: false });

        // Touch end
        app.addEventListener('touchend', (e) => {
            if (!this.swipeState.active) return;

            const { currentX, row, initialTranslateX, leftWidth, rightWidth } = this.swipeState;
            const distanceMoved = currentX - initialTranslateX;
            const HAIR_TRIGGER = 15;

            row.classList.remove('swiping');

            // Quintic Ease Out: faster start, very soft landing
            row.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)';

            let targetX = 0;
            let revealedState = null;

            if (initialTranslateX === 0) {
                // STARTING CLOSED
                if (distanceMoved > HAIR_TRIGGER && this.swipeState.hasLeft) {
                    // Open Left
                    targetX = leftWidth;
                    revealedState = 'right'; // Content moves right to reveal left actions
                } else if (distanceMoved < -HAIR_TRIGGER && this.swipeState.hasRight) {
                    // Open Right
                    targetX = -rightWidth;
                    revealedState = 'left'; // Content moves left to reveal right actions
                } else {
                    // Revert
                    targetX = 0;
                }
            } else {
                // STARTING OPEN
                // If moved backwards > 15px, close it. Otherwise stay open.
                // Note: "Backwards" means towards 0.

                if (initialTranslateX > 0) {
                    // Was Open Left (Positive X). Backwards is Negative movement.
                    if (distanceMoved < -HAIR_TRIGGER) {
                        targetX = 0; // Close
                    } else {
                        targetX = leftWidth; // Stay Open
                        revealedState = 'right';
                    }
                } else {
                    // Was Open Right (Negative X). Backwards is Positive movement.
                    if (distanceMoved > HAIR_TRIGGER) {
                        targetX = 0; // Close
                    } else {
                        targetX = -rightWidth; // Stay Open
                        revealedState = 'left';
                    }
                }
            }

            // Apply Final State
            row.style.transform = targetX === 0 ? '' : `translateX(${targetX}px)`;

            if (revealedState) {
                row.dataset.revealed = revealedState;
                if (targetX !== initialTranslateX) triggerHaptic('medium');
            } else {
                delete row.dataset.revealed;
                if (targetX !== initialTranslateX) triggerHaptic('light');
            }

            this.swipeState.active = false;
        }, { passive: true });

        // ========================================
        // SWIPE ACTION BUTTON HANDLERS
        // ========================================

        // Button click handler
        app.addEventListener('click', (e) => {
            const btn = e.target.closest('.swipe-btn');
            if (!btn) return;

            e.stopPropagation();

            const action = btn.dataset.action;
            const container = btn.closest('.swipe-container');
            const swipeId = container?.dataset.swipeId;
            const swipeType = container?.dataset.swipeType; // 'todo' or undefined (experiment)
            const row = container?.querySelector('.experiment-row, .todo-row');

            if (!swipeId || !row) return;

            // Close the swipe first
            row.style.transform = '';
            delete row.dataset.revealed;

            // Trigger haptic feedback
            triggerHaptic('success');

            // Handle todo actions
            if (swipeType === 'todo') {
                if (action === 'hide') {
                    const todo = TodoManager.getAll().find(t => t.id === swipeId);
                    const isHidden = todo?.hidden;
                    const updated = TodoManager.toggleHidden(swipeId);

                    // UX Fix: Auto-expand hidden section when hiding a task
                    // so it doesn't just "disappear"
                    if (!isHidden) { // Was not hidden, now is hidden
                        this.state.showHidden = true;
                        localStorage.setItem('experiments_show_hidden', 'true');
                    }

                    this.render();
                    this.showToast(isHidden ? 'Task unhidden' : 'Task hidden');
                }
                return;
            }

            // Execute experiment action
            switch (action) {
                case 'delete':
                    this.handleSwipeDelete(swipeId, container);
                    break;
                case 'archive':
                    this.handleSwipeArchive(swipeId, container);
                    break;
                case 'edit':
                    this.handleEditExperiment(swipeId);
                    break;
                case 'complete':
                    {
                        const exp = DataManager.getExperiment(swipeId);
                        if (exp && exp.status === 'draft') {
                            DataManager.activateExperiment(swipeId);
                            this.render();
                            this.showToast('Experiment moved to NOW');
                        } else {
                            this.handleCompleteExperiment(swipeId);
                        }
                    }
                    break;
            }
        });

        // Dismiss swipe on tap outside
        app.addEventListener('click', (e) => {
            // CRITICAL: Don't close if we just finished a swipe gesture
            // (click event fires after touchend)
            if (this.swipeState && this.swipeState.didSwipe) {
                this.swipeState.didSwipe = false;
                return;
            }

            // Check if click is on experiment row itself (not buttons)
            const row = e.target.closest('.experiment-row, .todo-row');
            if (row && row.dataset.revealed) {
                // Close this revealed swipe
                e.stopPropagation();
                row.style.transform = '';
                delete row.dataset.revealed;
                return;
            }

            // Close all revealed swipes if clicking anywhere else
            if (!e.target.closest('.swipe-container')) {
                document.querySelectorAll('.experiment-row[data-revealed], .todo-row[data-revealed]').forEach(row => {
                    row.style.transform = '';
                    delete row.dataset.revealed;
                });
            }
        });

        // Close other swipes when opening a new one (already handled in touchstart)
        // Add helper to close all swipes
        this.closeAllSwipes = () => {
            document.querySelectorAll('.experiment-row[data-revealed], .todo-row[data-revealed]').forEach(row => {
                row.style.transform = '';
                delete row.dataset.revealed;
            });
        };

        // Mood button click - log mood
        app.addEventListener('click', (e) => {
            const moodBtn = e.target.closest('.mood-btn[data-mood]');
            if (moodBtn) {
                const mood = parseInt(moodBtn.dataset.mood);
                this.state.pendingMood = mood;
                // Show energy picker modal
                this.openModal('modal-energy');
            }
        });

        // Energy button click - complete mood logging
        app.addEventListener('click', (e) => {
            const energyBtn = e.target.closest('.energy-btn[data-energy]');
            if (energyBtn) {
                const energy = parseInt(energyBtn.dataset.energy);
                const mood = this.state.pendingMood || 3;
                MoodTracker.logMood(new Date(), mood, energy);
                this.closeModal('modal-energy');
                this.showToast('Mood logged!');
                this.render();
            }
        });

        // Form submissions - FIXED: Use event delegation for forms
        app.addEventListener('submit', (e) => {
            const form = e.target;
            if (form.id === 'form-create') {
                e.preventDefault();
                this.handleCreateExperiment(form);
            } else if (form.id === 'form-checkin') {
                e.preventDefault();
                this.handleCheckin(form);
            } else if (form.id === 'form-edit-entry') {
                e.preventDefault();
                this.handleSaveEntry(form);
            }
        });

        // Calendar navigation - FIXED: Add missing calendar nav handlers
        app.addEventListener('click', (e) => {
            const navBtn = e.target.closest('.calendar-nav[data-dir]');
            if (navBtn) {
                const dir = parseInt(navBtn.dataset.dir);
                this.state.calendarMonth = new Date(
                    this.state.calendarMonth.getFullYear(),
                    this.state.calendarMonth.getMonth() + dir,
                    1
                );
                this.render();
            }
        });

        // Add Category Button
        app.addEventListener('click', (e) => {
            if (e.target.closest('#btn-add-category')) {
                this.promptAction('New Category Name', (name) => {
                    if (name && DataManager.addCategory(name)) {
                        const container = document.querySelector('#form-create .segmented-control[aria-labelledby="create-category-label"]');
                        if (container) {
                            const cats = DataManager.getCategories();
                            const html = cats.map((cat) => `
                                <button type="button" class="segmented-option ${cat === name ? 'active' : ''}" data-category="${cat}">${cat}</button>
                            `).join('') + `<button type="button" class="segmented-option" id="btn-add-category" style="flex: 0 0 auto; padding: 0 12px; font-size: 18px;">+</button>`;
                            container.innerHTML = html;
                        }
                        this.showToast(`Category "${name}" added`);
                    } else {
                        this.showToast('Invalid or duplicate category');
                    }
                });
            }
        });

        // Entry row click - Edit entry
        app.addEventListener('click', (e) => {
            const row = e.target.closest('.entry-row');
            if (row && this.state.currentExperiment) {
                const entryId = row.dataset.id;
                this.handleEditEntry(entryId);
            }
        });

        // Edit entry form submission
        app.addEventListener('submit', (e) => {
            const form = e.target;
            if (form.id === 'form-edit-entry') {
                e.preventDefault();
                this.handleSaveEntry(form);
            }
        });

        // Save Entry button (using click instead of form submit to avoid CSP issues)
        app.addEventListener('click', (e) => {
            if (e.target.closest('#btn-save-entry')) {
                e.stopPropagation();
                const form = document.getElementById('form-edit-entry');
                if (form) {
                    this.handleSaveEntry(form);
                }
                return;
            }
        });

        // Delete entry button
        app.addEventListener('click', (e) => {
            if (e.target.closest('#btn-delete-entry')) {
                this.confirmAction(
                    'Delete Entry?',
                    'This will permanently delete this entry. This cannot be undone.',
                    () => {
                        const entryId = document.getElementById('edit-entry-id').value;
                        DataManager.deleteEntry(this.state.currentExperiment, entryId);
                        this.closeModal('modal-edit-entry');
                        this.render();
                        this.showToast('Entry deleted');
                    }
                );
            }
        });

        // Add Partner form submission
        app.addEventListener('submit', (e) => {
            const form = e.target;
            if (form.id === 'form-add-partner') {
                e.preventDefault();
                const name = form.querySelector('#partner-name').value.trim();
                const code = form.querySelector('#partner-code').value.trim().toUpperCase();

                if (name && code) {
                    const result = PartnersManager.addPartner(name, code);
                    if (result.success) {
                        this.closeModal('modal-add-partner');
                        form.reset();
                        this.render();
                        this.showToast(`${name} added as partner!`);
                    } else {
                        this.showToast(result.error || 'Failed to add partner');
                    }
                }
            }
        });

        // Create Challenge form submission
        app.addEventListener('submit', (e) => {
            const form = e.target;
            if (form.id === 'form-create-challenge') {
                e.preventDefault();
                const name = form.querySelector('#challenge-name').value.trim();
                const templateId = form.querySelector('#challenge-template').value;
                const duration = parseInt(form.querySelector('#challenge-duration').value);

                // Get selected partners
                const partnerCheckboxes = form.querySelectorAll('input[name="challenge-partner"]:checked');
                const participants = Array.from(partnerCheckboxes).map(cb => ({
                    id: cb.value,
                    name: cb.dataset.name
                }));

                if (name && templateId && duration) {
                    const today = StreakCalculator.toDateString(new Date());
                    ChallengesManager.createChallenge(templateId, name, today, duration, participants);
                    this.closeModal('modal-create-challenge');
                    form.reset();
                    this.render();
                    this.showToast('Challenge started!');
                }
            }
        });

        // Open Add Partner modal
        app.addEventListener('click', (e) => {
            if (e.target.closest('#btn-add-partner')) {
                this.openModal('modal-add-partner');
            }
        });

        // Open Create Challenge modal
        app.addEventListener('click', (e) => {
            if (e.target.closest('#btn-create-challenge')) {
                // Populate partners list in modal
                const listContainer = document.getElementById('challenge-partners-list');
                if (listContainer) {
                    const partners = PartnersManager.getPartners();
                    if (partners.length === 0) {
                        listContainer.innerHTML = '<p style="color: var(--text-tertiary); font-size: 14px;">No partners added yet. Add partners in Settings first.</p>';
                    } else {
                        listContainer.innerHTML = partners.map(p => `
                            <label style="display: flex; align-items: center; gap: 8px; padding: 8px 0; cursor: pointer;">
                                <input type="checkbox" name="challenge-partner" value="${p.id}" data-name="${p.name}">
                                <span>${p.name}</span>
                            </label>
                        `).join('');
                    }
                }
                this.openModal('modal-create-challenge');
            }
        });

        // Copy share code
        app.addEventListener('click', (e) => {
            if (e.target.closest('#btn-copy-share-code')) {
                const code = PartnersManager.getMyShareCode();
                navigator.clipboard.writeText(code).then(() => {
                    this.showToast('Share code copied!');
                }).catch(() => {
                    this.showToast('Failed to copy');
                });
            }
        });

        // Share progress
        app.addEventListener('click', (e) => {
            if (e.target.closest('#btn-share-progress')) {
                const experiments = DataManager.loadExperiments();
                const shareText = PartnersManager.generateShareText(experiments);

                if (navigator.share) {
                    navigator.share({ text: shareText }).catch(() => { });
                } else {
                    navigator.clipboard.writeText(shareText).then(() => {
                        this.showToast('Progress copied to clipboard!');
                    }).catch(() => {
                        this.showToast('Failed to copy');
                    });
                }
            }
        });

        // Remove partner
        app.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.btn-remove-partner');
            if (removeBtn) {
                const partnerId = removeBtn.dataset.partnerId;
                const partnerName = removeBtn.dataset.partnerName;
                this.confirmAction(
                    'Remove Partner?',
                    `Are you sure you want to remove ${partnerName}?`,
                    () => {
                        PartnersManager.removePartner(partnerId);
                        this.render();
                        this.showToast('Partner removed');
                    }
                );
            }
        });

        // Use skip day
        app.addEventListener('click', (e) => {
            if (e.target.closest('#btn-use-skip-day')) {
                const exp = DataManager.loadExperiments().find(x => x.id === this.state.currentExperiment);
                if (exp && StreakCalculator.canUseSkipDay(exp)) {
                    const today = StreakCalculator.toDateString(new Date());
                    DataManager.addEntry(exp.id, {
                        date: today,
                        type: 'skipped',
                        isCompleted: false,
                        note: 'Skip day used'
                    });
                    this.render();
                    this.showToast('Skip day used - streak protected!');
                }
            }
        });
    },

    /**
     * Open modal
     */
    openModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.add('active');
            // Save last focused element to restore later
            this.lastFocusedElement = document.activeElement;
            this.trapFocus(modal);
        }
    },

    /**
     * Close modal
     */
    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove('active');

            // Handle cancel callback for confirm modal
            if (id === 'modal-confirm' && this.onConfirmCancel) {
                this.onConfirmCancel();
                this.onConfirmCancel = null;
            }

            // Restore focus
            if (this.lastFocusedElement) {
                this.lastFocusedElement.focus();
            }
        }
    },

    /**
     * Handle create experiment - FIXED: Include category from selector
     */
    handleCreateExperiment(form) {
        const data = new FormData(form);
        const freqOption = form.querySelector('[data-freq].active');
        const categoryOption = form.querySelector('[data-category].active');

        const id = data.get('id');
        const experimentData = {
            title: data.get('title'),
            purpose: data.get('purpose'),
            successCriteria: data.get('criteria') || null,
            durationDays: parseInt(data.get('duration')) || 30,
            frequency: freqOption?.dataset.freq || 'daily',
            category: categoryOption?.dataset.category || 'Health',
            scheduledTime: data.get('scheduledTime') || null,
        };

        if (id) {
            // Update existing
            DataManager.updateExperiment(id, experimentData);
            this.showToast('Experiment updated');
            // Return to lab list after editing
            this.state.currentExperiment = null;
        } else {
            // Create new
            DataManager.createExperiment({
                ...experimentData,
                startDate: new Date().toISOString()
            });
            this.showToast('Experiment created!');
            // Reset filter to ALL so the new experiment is visible
            this.state.currentFilter = 'ALL';
        }

        this.closeModal('modal-create');
        form.reset();
        this.resetCreateForm(form); // Helper to reset UI state
        this.render();
    },

    /**
     * Handle check-in - with toast feedback
     */
    handleCheckin(form) {
        const data = new FormData(form);
        const statusOption = form.querySelector('[data-status].active');
        const isCompleted = statusOption?.dataset.status === 'completed';
        const today = StreakCalculator.toDateString(new Date());

        // Check if already checked in today
        const exp = DataManager.getExperiment(this.state.currentExperiment);
        const existingEntry = exp?.entries?.find(e => e.date === today);

        const reflection = {
            plus: data.get('ref_plus')?.trim(),
            minus: data.get('ref_minus')?.trim(),
            next: data.get('ref_next')?.trim()
        };
        const hasReflection = reflection.plus || reflection.minus || reflection.next;

        DataManager.addEntry(this.state.currentExperiment, {
            date: today,
            isCompleted: isCompleted,
            note: data.get('note') || null,
            reflection: hasReflection ? reflection : null
        });

        this.closeModal('modal-checkin');
        form.reset();
        // Reset segmented controls
        form.querySelectorAll('.segmented-control').forEach(control => {
            control.querySelectorAll('.segmented-option').forEach((opt, i) => {
                opt.classList.toggle('active', i === 0);
            });
        });

        if (existingEntry) {
            this.showToast('Entry updated!');
        } else {
            this.showToast(isCompleted ? 'Great job! 🎉' : 'Entry saved');
        }
        this.render();
    },

    /**
     * Reset create form UI
     */
    resetCreateForm(form) {
        document.getElementById('modal-create-title').textContent = 'New Experiment';
        document.getElementById('create-id').value = '';
        document.getElementById('btn-delete').style.display = 'none';

        // Reset button text to "Start Experiment"
        const startBtn = document.getElementById('btn-start-experiment');
        if (startBtn) startBtn.textContent = 'Start Experiment';

        // Reset segmented controls to default state
        form.querySelectorAll('.segmented-control').forEach(control => {
            control.querySelectorAll('.segmented-option').forEach((opt, i) => {
                opt.classList.toggle('active', i === 0);
            });
        });
    },

    /**
     * Create experiment from template - with toast feedback
     */
    createFromTemplate(template) {
        DataManager.createExperiment({
            title: template.title,
            purpose: template.purpose,
            successCriteria: template.successCriteria,
            durationDays: template.durationDays,
            frequency: template.frequency,
            category: template.category,
            startDate: new Date().toISOString()
        });

        this.state.currentTab = 'experiments';
        this.state.currentFilter = 'NOW';
        this.showToast(`Started: ${template.title}`);
        this.render();
    },

    /**
     * Handle swipe-to-delete action
     */
    handleSwipeDelete(experimentId, container) {
        const experiment = DataManager.getExperiment(experimentId);
        if (!experiment) return;

        // IMPORTANT: Hide action buttons immediately to prevent visual glitch
        const actionsLeft = container.querySelector('.swipe-actions-left');
        const actionsRight = container.querySelector('.swipe-actions-right');
        if (actionsLeft) actionsLeft.style.opacity = '0';
        if (actionsRight) actionsRight.style.opacity = '0';

        // Animate row off screen
        const row = container.querySelector('.experiment-row');
        row.style.transform = 'translateX(-100%)';
        row.style.transition = 'transform 0.25s ease-out';

        // Confirm after animation using custom modal
        setTimeout(() => {
            this.confirmAction(
                'Delete Experiment?',
                `Delete "${experiment.title}"? This cannot be undone.`,
                () => {
                    // Confirmed: Collapse container
                    container.style.height = container.offsetHeight + 'px';
                    container.style.overflow = 'hidden';
                    requestAnimationFrame(() => {
                        container.style.transition = 'height 0.3s ease, opacity 0.3s ease';
                        container.style.height = '0';
                        container.style.opacity = '0';
                    });

                    setTimeout(() => {
                        DataManager.deleteExperiment(experimentId);
                        this.showToast('Experiment deleted');
                        this.render();
                    }, 300);
                },
                () => {
                    // Cancelled: Snap back and restore buttons
                    if (actionsLeft) actionsLeft.style.opacity = '1';
                    if (actionsRight) actionsRight.style.opacity = '1';
                    row.classList.remove('swiping');
                    row.style.transform = '';
                }
            );
        }, 250);
    },

    /**
     * Handle swipe-to-archive action (Move to Draft/Later)
     */
    handleSwipeArchive(experimentId, container) {
        const experiment = DataManager.getExperiment(experimentId);
        if (!experiment) return;

        // IMPORTANT: Hide action buttons immediately to prevent visual glitch
        const actionsLeft = container.querySelector('.swipe-actions-left');
        const actionsRight = container.querySelector('.swipe-actions-right');
        if (actionsLeft) actionsLeft.style.opacity = '0';
        if (actionsRight) actionsRight.style.opacity = '0';

        // Animate row off screen
        const row = container.querySelector('.experiment-row');
        row.style.transform = 'translateX(100%)';
        row.style.transition = 'transform 0.25s ease-out';

        // Collapse container
        setTimeout(() => {
            container.style.height = container.offsetHeight + 'px';
            container.style.overflow = 'hidden';
            requestAnimationFrame(() => {
                container.style.transition = 'height 0.3s ease, opacity 0.3s ease';
                container.style.height = '0';
                container.style.opacity = '0';
            });
        }, 200);

        // Deactivate (Draft) after animation
        setTimeout(() => {
            DataManager.deactivateExperiment(experimentId);
            this.render();

            // Show toast with undo
            this.showToast('Experiment moved to Later', {
                undo: () => {
                    DataManager.activateExperiment(experimentId);
                    this.render();
                }
            });
        }, 500);
    },

    /**
     * Get the element to insert before during drag-and-drop
     * @param {HTMLElement} container - The container element
     * @param {number} y - The mouse Y position
     * @returns {HTMLElement|null} - The element to insert before, or null to append
     */
    getDragAfterElement(container, y) {
        // Support both .todo-item and .subtask-item (any draggable element)
        const draggableElements = [...container.querySelectorAll('[draggable="true"]:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    },

    /**
     * Get swipe container to insert before during drag
     * @param {HTMLElement} container - The list container
     * @param {number} y - The mouse Y position
     * @returns {HTMLElement|null} - The element to insert before, or null to append
     */
    getSwipeContainerDragAfterElement(container, y) {
        const sections = [...container.querySelectorAll('.swipe-container:not(.dragging)')];
        return sections.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    },

    /**
     * Get checklist element to insert before during drag
     * @param {HTMLElement} container - The checklists container
     * @param {number} y - The mouse Y position
     * @returns {HTMLElement|null} - The element to insert before, or null to append
     */
    getChecklistDragAfterElement(container, y) {
        const sections = [...container.querySelectorAll('.checklist-section:not(.checklist-dragging)')];

        return sections.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset, element: child };
            }
            return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    },

    /**
     * Handle edit experiment action (from swipe button or detail view edit button)
     */
    handleEditExperiment(experimentId) {
        // Use provided experimentId or fall back to current experiment in state
        const expId = experimentId || this.state.currentExperiment;
        const experiment = DataManager.getExperiment(expId);
        if (!experiment) return;

        // Open the create modal for editing
        this.openModal('modal-create');

        // Populate form with experiment data
        const form = document.getElementById('form-create');
        if (!form) return;

        // Set modal title and show delete button for edit mode
        const modalTitle = document.getElementById('modal-create-title');
        if (modalTitle) modalTitle.textContent = 'Edit Experiment';

        const deleteBtn = document.getElementById('btn-delete');
        if (deleteBtn) deleteBtn.style.display = 'block';

        // Change button text to "Save Changes" for edit mode
        const startBtn = document.getElementById('btn-start-experiment');
        if (startBtn) startBtn.textContent = 'Save Changes';

        // Set hidden ID field for update
        const idField = document.getElementById('create-id');
        if (idField) idField.value = expId;

        // Fill in title and purpose
        const titleField = document.getElementById('create-title');
        if (titleField) titleField.value = experiment.title || '';

        const purposeField = document.getElementById('create-purpose');
        if (purposeField) purposeField.value = experiment.purpose || '';

        // Fill in duration
        const durationField = document.getElementById('create-duration');
        if (durationField) durationField.value = experiment.durationDays || 30;

        // Set frequency
        form.querySelectorAll('[data-freq]').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.freq === experiment.frequency);
        });

        // Set category
        form.querySelectorAll('[data-category]').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.category === experiment.category);
        });

        // Fill in optional fields
        const criteriaField = document.getElementById('create-criteria');
        if (criteriaField) criteriaField.value = experiment.successCriteria || '';

        const timeField = document.getElementById('create-time');
        if (timeField) timeField.value = experiment.scheduledTime || '';
    },

    /**
     * Handle complete experiment action (from swipe button)
     */
    handleCompleteExperiment(experimentId) {
        const experiment = DataManager.getExperiment(experimentId);
        if (!experiment) return;

        const today = StreakCalculator.toDateString(new Date());

        // Check if already checked in today
        const existingEntry = experiment.entries?.find(e => e.date === today);

        if (existingEntry) {
            this.showToast('Already checked in today!');
            return;
        }

        // Add check-in entry for today
        DataManager.addEntry(experimentId, {
            date: today,
            type: 'checkin',
            isCompleted: true,
            note: null,
            reflection: null
        });

        this.showToast('Great job! 🎉');
        this.render();
    },

    /**
     * Load theme from storage
     */
    loadTheme() {
        this.state.theme = localStorage.getItem('theme') || 'system';
        this.applyTheme();

        // Listen for system changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (this.state.theme === 'system') {
                this.applyTheme();
            }
        });
    },

    /**
     * Set theme
     */
    setTheme(theme) {
        this.state.theme = theme;
        localStorage.setItem('theme', theme);
        this.applyTheme();
        this.render(); // Re-render to update setting toggle
    },

    /**
     * Load dock configuration from storage
     */
    loadDockConfig() {
        const stored = localStorage.getItem('experiments_dock');
        if (stored) {
            try {
                this.state.dockConfig = JSON.parse(stored);
            } catch {
                // Use default
            }
        }
    },

    /**
     * Save dock configuration to storage
     */
    saveDockConfig() {
        localStorage.setItem('experiments_dock', JSON.stringify(this.state.dockConfig));
    },

    /**
     * Toggle a view in the dock configuration
     * @param {string} viewId - The view ID to toggle (e.g., 'gallery', 'insights', 'todo')
     */
    toggleDockView(viewId) {
        // Prevent toggling pinned tabs
        const pinnedTabs = ['experiments', 'settings'];
        if (pinnedTabs.includes(viewId)) return;

        const index = this.state.dockConfig.indexOf(viewId);
        if (index > -1) {
            this.state.dockConfig.splice(index, 1);
        } else {
            this.state.dockConfig.push(viewId);
        }
        this.saveDockConfig();
        this.render();
    },

    /**
     * Apply theme to document
     */
    applyTheme() {
        const root = document.documentElement;
        let isDark = this.state.theme === 'dark';

        if (this.state.theme === 'system') {
            isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }

        if (isDark) {
            root.setAttribute('data-theme', 'dark');
            document.querySelector("meta[name='theme-color']").setAttribute("content", "#000000");
        } else {
            root.removeAttribute('data-theme');
            document.querySelector("meta[name='theme-color']").setAttribute("content", "#FAFAFA");
        }
    },

    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {Object} options - Optional: { undo: callback, duration: ms }
     */
    showToast(message, options = {}) {
        // Remove existing toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) existingToast.remove();

        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <span>${message}</span>
            ${options.undo ? '<button class="toast-undo">Undo</button>' : ''}
        `;

        document.body.appendChild(toast);

        // Undo handler
        if (options.undo) {
            toast.querySelector('.toast-undo').addEventListener('click', () => {
                options.undo();
                toast.classList.remove('visible');
                setTimeout(() => toast.remove(), 200);
            });
        }

        // Show toast
        requestAnimationFrame(() => {
            toast.classList.add('visible');
        });

        // Auto-hide
        const duration = options.duration || 3000;
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 200);
        }, duration);
    },

    /**
     * Load app version from manifest
     */
    async loadAppVersion() {
        try {
            const response = await fetch(`./manifest.json?v=${Date.now()}`);
            const manifest = await response.json();
            this.state.appVersion = manifest.version || '1.0.0';
        } catch {
            this.state.appVersion = '1.0.0';
        }
    },

    /**
     * Log to console (Debug console removed for production)
     */
    log(msg) {
        console.log(msg); // Standard console only
    },

    /**
     * Setup Service Worker update listener
     */
    setupServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            this.log('SW: Not supported');
            return;
        }

        // Log initial state
        navigator.serviceWorker.ready.then(reg => {
            this.log(`SW: Ready. Scope: ${reg.scope}`);
            this.log(`SW: Controller state: ${navigator.serviceWorker.controller ? navigator.serviceWorker.controller.state : 'none'}`);
        });

        // Listen for controller changes (new SW activated)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            this.log('SW: Controller changed! Reloading...');
            this.showToast('App updated! Reloading...');
            setTimeout(() => window.location.href = window.location.href, 500);
        });
    },

    /**
     * Check for service worker updates
     */
    async checkForUpdates() {
        // Handle local file protocol specially (Service Workers don't work on file://)
        if (window.location.protocol === 'file:') {
            this.showToast('Local file mode: Reloading...');
            this.log('SW: file:// protocol detected. SW disabled. Reloading.');
            setTimeout(() => window.location.reload(), 1000);
            return;
        }

        if (!('serviceWorker' in navigator)) {
            this.showToast('Updates not supported. Reloading...');
            setTimeout(() => window.location.reload(), 1000);
            return;
        }

        this.showToast('Checking for updates...');
        this.log('SW: Forced update check started...');

        try {
            // Unregister existing to be clean (optional but safer for "Refresh" feel)
            // const regs = await navigator.serviceWorker.getRegistrations();
            // for(let reg of regs) { await reg.unregister(); }

            // Force re-register with timestamp to bypass Safari Cache
            const swUrl = `./sw.js?v=${Date.now()}`;
            this.log(`SW: Registering ${swUrl}`);

            const registration = await navigator.serviceWorker.register(swUrl);
            this.log('SW: Registration successful. Checking state...');

            // If a new worker is found, logic is handled by setupServiceWorker's registration.onupdatefound
            // But we can also manually check here:
            if (registration.installing) {
                this.log('SW: Installing worker detected.');
                // We rely on the updatefound listener setup below or in setupServiceWorker
            } else if (registration.waiting) {
                this.log('SW: Waiting worker found. Activating instantly.');
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            } else if (registration.active) {
                this.log('SW: Active worker. No immediate update found (or already active).');
                // If we re-registered and got same byte-content, it might just be active.
                // We will force reload if user pushed button, just in case? 
                // User said "Only thing button need to do is refresh".
                // Asking user to reload manually is safer if no update found.
                this.showToast('You are up to date.');
            }

            // Hook into updatefound for this specific new registration
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                this.log('SW: Update found! Installing...');
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed') {
                        this.log('SW: Installed. SKIP_WAITING');
                        newWorker.postMessage({ type: 'SKIP_WAITING' });
                    }
                });
            });

        } catch (error) {
            console.error('Force update failed:', error);
            this.log(`SW: Error: ${error.message}`);
            this.showToast('Update failed. Try restarting app.');
            // Fallback: Force reload anyway?
            setTimeout(() => window.location.href = window.location.href, 2000);
        }
    },

    /**
     * Show toast notification
     */
    showToast(message) {
        // Remove existing toast if any
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('visible');
        });

        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    },

    /**
     * Show Confirmation Dialog
     */
    confirmAction(title, message, onConfirm, onCancel = null) {
        const modal = document.getElementById('modal-confirm');
        const titleEl = document.getElementById('confirm-title');
        const msgEl = document.getElementById('confirm-message');
        const cancelBtn = document.getElementById('confirm-cancel');
        const okBtn = document.getElementById('confirm-ok');

        if (!modal) return;

        this.onConfirmCancel = onCancel;

        titleEl.textContent = title;
        msgEl.textContent = message;

        // Clone buttons to remove old listeners
        const newCancel = cancelBtn.cloneNode(true);
        const newOk = okBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
        okBtn.parentNode.replaceChild(newOk, okBtn);

        newCancel.textContent = 'Cancel';
        newOk.textContent = 'Confirm';

        newCancel.addEventListener('click', () => {
            this.closeModal('modal-confirm');
        });

        newOk.addEventListener('click', () => {
            this.onConfirmCancel = null; // Prevent cancel callback
            modal.classList.remove('active');
            onConfirm();
        });

        this.openModal('modal-confirm');
    },

    /**
     * Show Prompt Dialog
     */
    promptAction(title, onSave) {
        const modal = document.getElementById('modal-prompt');
        const titleEl = document.getElementById('prompt-title');
        const inputEl = document.getElementById('prompt-input');
        const cancelBtn = document.getElementById('prompt-cancel');
        const okBtn = document.getElementById('prompt-ok');

        if (!modal) return;

        titleEl.textContent = title;
        inputEl.value = '';

        // Clone buttons
        const newCancel = cancelBtn.cloneNode(true);
        const newOk = okBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
        okBtn.parentNode.replaceChild(newOk, okBtn);

        newCancel.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        newOk.addEventListener('click', () => {
            const val = inputEl.value.trim();
            if (val) {
                modal.classList.remove('active');
                onSave(val);
            }
        });

        this.openModal('modal-prompt');
        setTimeout(() => inputEl.focus(), 100);
    },

    /**
     * Focus Trap for Modals (Accessibility)
     */
    trapFocus(modal) {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        modal.addEventListener('keydown', function (e) {
            const isTabPressed = e.key === 'Tab' || e.keyCode === 9;

            if (!isTabPressed) {
                return;
            }

            if (e.shiftKey) { // if shift key pressed for shift + tab combination
                if (document.activeElement === firstElement) {
                    lastElement.focus();
                    e.preventDefault();
                }
            } else { // if tab key is pressed
                if (document.activeElement === lastElement) { // if focused has reached to last element then focus first element
                    firstElement.focus();
                    e.preventDefault();
                }
            }
        });

        // Focus first element
        setTimeout(() => firstElement.focus(), 50);
    },

    /**
     * Handle Edit Entry - populate and open edit entry modal
     */
    handleEditEntry(entryId) {
        const exp = DataManager.getExperiment(this.state.currentExperiment);
        if (!exp) return;

        const entry = exp.entries.find(e => e.id === entryId);
        if (!entry) return;

        this.openModal('modal-edit-entry');

        // Populate form
        const form = document.getElementById('form-edit-entry');
        document.getElementById('edit-entry-id').value = entry.id;
        document.getElementById('edit-entry-note').value = entry.note || '';

        // Set status segmented control
        const statusBtns = form.querySelectorAll('[data-status]');
        statusBtns.forEach(btn => {
            btn.classList.toggle('active',
                (entry.isCompleted && btn.dataset.status === 'completed') ||
                (!entry.isCompleted && btn.dataset.status === 'missed')
            );
        });

        // Set reflection fields
        if (entry.reflection) {
            document.getElementById('edit-entry-ref-plus').value = entry.reflection.plus || '';
            document.getElementById('edit-entry-ref-minus').value = entry.reflection.minus || '';
            document.getElementById('edit-entry-ref-next').value = entry.reflection.next || '';
        } else {
            document.getElementById('edit-entry-ref-plus').value = '';
            document.getElementById('edit-entry-ref-minus').value = '';
            document.getElementById('edit-entry-ref-next').value = '';
        }
    },

    /**
     * Handle Save Entry - save edited entry
     */
    handleSaveEntry(form) {
        const data = new FormData(form);
        const entryId = data.get('entryId');
        const statusOption = form.querySelector('[data-status].active');
        const isCompleted = statusOption?.dataset.status === 'completed';

        const reflection = {
            plus: data.get('ref_plus')?.trim(),
            minus: data.get('ref_minus')?.trim(),
            next: data.get('ref_next')?.trim()
        };
        const hasReflection = reflection.plus || reflection.minus || reflection.next;

        DataManager.updateEntry(this.state.currentExperiment, entryId, {
            isCompleted: isCompleted,
            note: data.get('note') || null,
            reflection: hasReflection ? reflection : null
        });

        this.closeModal('modal-edit-entry');
        this.showToast('Entry updated');
        this.render();
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
