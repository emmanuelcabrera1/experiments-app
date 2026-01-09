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
        currentFilter: 'ALL' // NEW: Track active filter
    },

    // Flag to prevent duplicate event bindings
    eventsInitialized: false,

    /**
     * Initialize the app
     */
    init() {
        this.loadAppVersion();
        this.loadTheme();
        this.setupServiceWorker();
        this.render();
        this.bindEvents();
    },

    /**
     * Main render function
     */
    render() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <main role="main">
                ${this.renderCurrentScreen()}
            </main>
            ${this.renderTabBar()}
            ${this.renderFAB()}
            ${this.renderModals()}
            <div id="aria-live-region" class="sr-only" aria-live="polite" aria-atomic="true"></div>
        `;
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
        let experiments = DataManager.getExperiments();
        const today = new Date();
        const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
        const dateStr = today.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase();

        // Apply filter if not "ALL"
        const filter = this.state.currentFilter;
        if (filter !== 'ALL') {
            experiments = experiments.filter(e =>
                e.category && e.category.toUpperCase() === filter
            );
        }

        let content = '';
        if (experiments.length === 0) {
            if (filter === 'ALL') {
                content = UI.emptyState('Idle Station', 'No active protocols running.');
            } else {
                content = UI.emptyState('No Results', `No ${filter.toLowerCase()} experiments found.`);
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
                    <h1>Today</h1>
                    <p class="subheader">${dayName} ${dateStr}</p>
                </div>
                
                <div class="filter-pills" role="group" aria-label="Filter experiments">
                    <button class="pill ${isActive('ALL')}" data-filter="ALL" aria-pressed="${this.state.currentFilter === 'ALL'}">ALL</button>
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
                    <button id="btn-back" aria-label="Go back" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                        ${UI.icons.back}
                    </button>
                    <h2 style="flex: 1;">${exp.title}</h2>
                    <button id="btn-edit" aria-label="Edit experiment" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                        ${UI.icons.edit}
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
     * Render Settings tab
     */
    /**
     * Render Settings Screen - with Updates section
     */
    renderSettingsScreen() {
        const experiments = DataManager.getExperiments();
        const version = this.state.appVersion || '1.0.0';

        return `
            <div class="screen active" id="screen-settings">
                <div class="header">
                    <h1>Settings</h1>
                </div>
                
                <div class="settings-group">
                    <p class="settings-group-title">Updates</p>
                    <div class="settings-row" style="cursor: pointer;" id="btn-check-updates">
                        <div class="settings-icon" style="background: #E8F5E9;">🔄</div>
                        <div class="settings-label">Check for Updates</div>
                        <div class="settings-value">→</div>
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
                    <div class="settings-row">
                        <div class="settings-icon" style="background: #FFF3E0;">💾</div>
                        <div class="settings-label">Storage</div>
                        <div class="settings-value">Local</div>
                    </div>
                </div>
                
                <div class="settings-group">
                    <p class="settings-group-title">About</p>
                    <div class="settings-row">
                        <div class="settings-icon" style="background: #E3F2FD;">📖</div>
                        <div class="settings-label">Tiny Experiments Framework</div>
                        <div class="settings-value">→</div>
                    </div>
                    <div class="settings-row">
                        <div class="settings-icon" style="background: #F3E5F5;">ℹ️</div>
                        <div class="settings-label">Version</div>
                        <div class="settings-value">${version}</div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Render Tab Bar
     */
    renderTabBar() {
        const tabs = [
            { id: 'experiments', label: 'Experiments', icon: UI.icons.flask },
            { id: 'gallery', label: 'Gallery', icon: UI.icons.sparkles },
            { id: 'settings', label: 'Settings', icon: UI.icons.settings }
        ];

        return `
            <nav class="tab-bar" role="tablist" aria-label="Main navigation">
                ${tabs.map(tab => `
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
     * Render FAB
     */
    renderFAB() {
        if (this.state.currentExperiment || this.state.currentTab !== 'experiments') {
            return '';
        }
        return `<button class="fab" id="fab-add" aria-label="Add new experiment">${UI.icons.plus}</button>`;
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
                            <label class="form-label" for="create-purpose">Purpose — Why?</label>
                            <textarea class="form-input" id="create-purpose" name="purpose" placeholder="e.g., Reduce stress and feel calmer" required></textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="create-title">Action — What?</label>
                            <input class="form-input" id="create-title" name="title" placeholder="e.g., Meditate for 10 minutes" required>
                        </div>
                        <div class="form-group">
                    <label class="form-label" id="create-category-label">Category</label>
                    <div class="segmented-control" role="group" aria-labelledby="create-category-label">
                        ${DataManager.getCategories().map((cat, i) => `
                            <button type="button" class="segmented-option ${i === 0 ? 'active' : ''}" data-category="${cat}">${cat}</button>
                        `).join('')}
                    </div>
                </div>        </div>
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
                            <button type="submit" class="btn btn-primary">Start Experiment</button>
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
                        <button type="submit" class="btn btn-primary">Save</button>
                    </form>
                </div>
            </div>
        `;
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
                this.state.currentTab = tabItem.dataset.tab;
                this.state.currentExperiment = null;
                this.state.currentFilter = 'ALL'; // Reset filter on tab change
                this.render();
            }
        });

        // FAB click
        app.addEventListener('click', (e) => {
            if (e.target.closest('#fab-add')) {
                this.openModal('modal-create');
            }
        });

        // Check for Updates button
        app.addEventListener('click', (e) => {
            if (e.target.closest('#btn-check-updates')) {
                this.checkForUpdates();
            }
        });

        // Theme selector
        app.addEventListener('click', (e) => {
            const themeBtn = e.target.closest('[data-theme-opt]');
            if (themeBtn) {
                this.setTheme(themeBtn.dataset.themeOpt);
            }
        });

        // Edit button
        app.addEventListener('click', (e) => {
            if (e.target.closest('#btn-edit')) {
                this.handleEditExperiment();
            }
        });

        // Delete button
        app.addEventListener('click', (e) => {
            if (e.target.closest('#btn-delete')) {
                if (confirm('Are you sure you want to delete this experiment? This cannot be undone.')) {
                    const id = document.getElementById('create-id').value;
                    DataManager.deleteExperiment(id);
                    this.state.currentExperiment = null;
                    this.closeModal('modal-create');
                    this.render();
                    this.showToast('Experiment deleted');
                }
            }
        });

        // Reflection toggle
        app.addEventListener('click', (e) => {
            const toggle = e.target.closest('.reflection-toggle');
            if (toggle) {
                const fields = toggle.nextElementSibling;
                const isVisible = fields.classList.contains('visible');
                const symbol = toggle.querySelector('span:first-child');

                fields.classList.toggle('visible');
                // Animate height would be better but simple visibility toggle is functional
                if (symbol) symbol.textContent = isVisible ? '+' : '−';
            }
        });

        // Modal close
        app.addEventListener('click', (e) => {
            const closeBtn = e.target.closest('[data-close]');
            if (closeBtn) {
                this.closeModal(closeBtn.dataset.close);
            }

            // Click on overlay to close
            if (e.target.classList.contains('modal-overlay')) {
                this.closeModal(e.target.id);
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

        // Experiment row click
        app.addEventListener('click', (e) => {
            const row = e.target.closest('.experiment-row');
            if (row) {
                this.state.currentExperiment = row.dataset.id;
                this.render();
            }
        });

        // Back button
        app.addEventListener('click', (e) => {
            if (e.target.closest('#btn-back')) {
                this.state.currentExperiment = null;
                this.render();
            }
        });

        // Check-in button
        app.addEventListener('click', (e) => {
            if (e.target.closest('#btn-checkin')) {
                this.openModal('modal-checkin');
            }
        });

        // Template card click
        app.addEventListener('click', (e) => {
            const card = e.target.closest('.template-card');
            if (card) {
                const template = DataManager.getTemplates().find(t => t.id === card.dataset.id);
                if (template) {
                    this.createFromTemplate(template);
                }
            }
        });

        // Segmented control (non-form) - FIXED: scope to parent control only
        app.addEventListener('click', (e) => {
            const option = e.target.closest('.segmented-option');
            if (option && !option.closest('form')) {
                const section = option.dataset.section;
                if (section) {
                    // Detail view sections - scope to closest segmented-control
                    const control = option.closest('.segmented-control');
                    control.querySelectorAll('.segmented-option').forEach(o => o.classList.remove('active'));
                    option.classList.add('active');

                    document.getElementById('detail-section-entries')?.classList.toggle('hidden', section !== 'entries');
                    document.getElementById('detail-section-calendar')?.classList.toggle('hidden', section !== 'calendar');
                }
            }
        });

        // Form segmented controls
        app.addEventListener('click', (e) => {
            const option = e.target.closest('.segmented-option');
            if (option && option.closest('form')) {
                const parent = option.parentElement;
                parent.querySelectorAll('.segmented-option').forEach(o => o.classList.remove('active'));
                option.classList.add('active');
            }
        });

        // Filter pills - uses state-based filtering
        app.addEventListener('click', (e) => {
            const pill = e.target.closest('.pill[data-filter]');
            if (pill) {
                const filter = pill.dataset.filter;
                if (this.state.currentFilter !== filter) {
                    this.state.currentFilter = filter;
                    this.render();
                }
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
    },

    /**
     * Open modal
     */
    openModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.add('active');
            // Focus the modal for accessibility
            modal.querySelector('.modal-sheet')?.focus();
        }
    },

    /**
     * Close modal
     */
    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove('active');
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
            this.state.currentExperiment = id; // Ensure we stay on detail view
        } else {
            // Create new
            DataManager.createExperiment({
                ...experimentData,
                startDate: new Date().toISOString()
            });
            this.showToast('Experiment created!');
        }

        this.closeModal('modal-create');
        form.reset();
        this.resetCreateForm(form); // Helper to reset UI state
        // Reset segmented controls to default state
        form.querySelectorAll('.segmented-control').forEach(control => {
            control.querySelectorAll('.segmented-option').forEach((opt, i) => {
                opt.classList.toggle('active', i === 0);
            });
        });
        this.showToast('Experiment created!');
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

        // Reset segmented controls to default state
        form.querySelectorAll('.segmented-control').forEach(control => {
            control.querySelectorAll('.segmented-option').forEach((opt, i) => {
                opt.classList.toggle('active', i === 0);
            });
        });
    },

    /**
     * Handle Edit Experiment
     */
    handleEditExperiment() {
        const exp = DataManager.getExperiment(this.state.currentExperiment);
        if (!exp) return;

        this.openModal('modal-create');

        // Populate form
        const form = document.getElementById('form-create');
        document.getElementById('modal-create-title').textContent = 'Edit Experiment';
        document.getElementById('create-id').value = exp.id;
        document.getElementById('btn-delete').style.display = 'block';

        form.elements['title'].value = exp.title;
        form.elements['purpose'].value = exp.purpose;
        form.elements['create-duration'].value = exp.durationDays;
        form.elements['create-time'].value = exp.scheduledTime || '';
        if (exp.successCriteria) form.elements['criteria'].value = exp.successCriteria;

        // Set segmented controls
        const categoryBtn = form.querySelector(`[data-category="${exp.category}"]`);
        if (categoryBtn) categoryBtn.click(); // Trigger click to update state (simple way)

        const freqBtn = form.querySelector(`[data-freq="${exp.frequency}"]`);
        if (freqBtn) freqBtn.click();
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
        this.state.currentFilter = 'ALL';
        this.showToast(`Started: ${template.title}`);
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
     * Load app version from manifest
     */
    async loadAppVersion() {
        try {
            const response = await fetch('./manifest.json');
            const manifest = await response.json();
            this.state.appVersion = manifest.version || '1.0.0';
        } catch {
            this.state.appVersion = '1.0.0';
        }
    },

    /**
     * Setup Service Worker update listener
     */
    setupServiceWorker() {
        if (!('serviceWorker' in navigator)) return;

        // Listen for controller changes (new SW activated)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            this.showToast('App updated! Reloading...');
            setTimeout(() => window.location.reload(), 1000);
        });
    },

    /**
     * Check for service worker updates
     */
    async checkForUpdates() {
        if (!('serviceWorker' in navigator)) {
            this.showToast('Updates not supported');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                this.showToast('Checking for updates...');
                await registration.update();

                if (registration.waiting) {
                    // New SW is waiting, skip waiting to activate
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                } else {
                    this.showToast('You\'re on the latest version!');
                }
            }
        } catch (error) {
            console.error('Update check failed:', error);
            this.showToast('Update check failed');
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
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
