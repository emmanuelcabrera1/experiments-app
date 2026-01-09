/**
 * Experiments - Main App Controller
 * Handles navigation, state, and user interactions
 */

const App = {

    // Current state
    state: {
        currentTab: 'experiments',
        currentExperiment: null,
        calendarMonth: new Date()
    },

    /**
     * Initialize the app
     */
    init() {
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
        const experiments = DataManager.getExperiments();
        const today = new Date();
        const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
        const dateStr = today.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase();

        let content = '';
        if (experiments.length === 0) {
            content = UI.emptyState('Idle Station', 'No active protocols running.');
        } else {
            content = experiments.map(e => UI.experimentRow(e)).join('');
        }

        return `
            <div class="screen active" id="screen-experiments">
                <div class="header">
                    <h1>Today</h1>
                    <p class="subheader">${dayName} ${dateStr}</p>
                </div>
                
                <div class="filter-pills">
                    <button class="pill active">ALL</button>
                    <button class="pill">HEALTH</button>
                    <button class="pill">FOCUS</button>
                    <button class="pill">GROWTH</button>
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
    renderSettingsScreen() {
        const experiments = DataManager.getExperiments();

        return `
            <div class="screen active" id="screen-settings">
                <div class="header">
                    <h1>Settings</h1>
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
                        <div class="settings-value">1.0.0</div>
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
            <nav class="tab-bar">
                ${tabs.map(tab => `
                    <button class="tab-bar-item ${this.state.currentTab === tab.id ? 'active' : ''}" data-tab="${tab.id}">
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
                        <h2>New Experiment</h2>
                        <button class="modal-close" aria-label="Close modal" data-close="modal-create">${UI.icons.x}</button>
                    </div>
                    <form id="form-create">
                        <div class="form-group">
                            <label class="form-label">Purpose — Why?</label>
                            <textarea class="form-input" name="purpose" placeholder="e.g., Reduce stress and feel calmer" required></textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Action — What?</label>
                            <input class="form-input" name="title" placeholder="e.g., Meditate for 10 minutes" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Frequency</label>
                            <div class="segmented-control">
                                <button type="button" class="segmented-option active" data-freq="daily">Daily</button>
                                <button type="button" class="segmented-option" data-freq="weekly">Weekly</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Duration (days)</label>
                            <input class="form-input" type="number" name="duration" value="30" min="7" max="365">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Success Criteria (Optional)</label>
                            <input class="form-input" name="criteria" placeholder="e.g., Complete before 8 AM">
                        </div>
                        <button type="submit" class="btn btn-primary">Start Experiment</button>
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
                            <label class="form-label">Status</label>
                            <div class="segmented-control">
                                <button type="button" class="segmented-option active" data-status="completed">Completed ✓</button>
                                <button type="button" class="segmented-option" data-status="missed">Missed ✗</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Note (Optional)</label>
                            <textarea class="form-input" name="note" placeholder="How did it go?"></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary">Save</button>
                    </form>
                </div>
            </div>
        `;
    },

    /**
     * Bind all event handlers
     */
    bindEvents() {
        const app = document.getElementById('app');

        // Tab navigation
        app.addEventListener('click', (e) => {
            const tabItem = e.target.closest('.tab-bar-item');
            if (tabItem) {
                this.state.currentTab = tabItem.dataset.tab;
                this.state.currentExperiment = null;
                this.render();
                this.bindEvents();
            }
        });

        // FAB click
        app.addEventListener('click', (e) => {
            if (e.target.closest('#fab-add')) {
                this.openModal('modal-create');
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
                this.bindEvents();
            }
        });

        // Back button
        app.addEventListener('click', (e) => {
            if (e.target.closest('#btn-back')) {
                this.state.currentExperiment = null;
                this.render();
                this.bindEvents();
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

        // Segmented control
        app.addEventListener('click', (e) => {
            const option = e.target.closest('.segmented-option');
            if (option && !option.closest('form')) {
                const section = option.dataset.section;
                if (section) {
                    // Detail view sections
                    document.querySelectorAll('.segmented-option').forEach(o => o.classList.remove('active'));
                    option.classList.add('active');

                    document.getElementById('detail-section-entries').classList.toggle('hidden', section !== 'entries');
                    document.getElementById('detail-section-calendar').classList.toggle('hidden', section !== 'calendar');
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

        // Filter pills
        app.addEventListener('click', (e) => {
            const pill = e.target.closest('.pill');
            if (pill) {
                document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
            }
        });

        // Create experiment form
        const createForm = document.getElementById('form-create');
        if (createForm) {
            createForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateExperiment(e.target);
            });
        }

        // Check-in form
        const checkinForm = document.getElementById('form-checkin');
        if (checkinForm) {
            checkinForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCheckin(e.target);
            });
        }
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
     * Handle create experiment
     */
    handleCreateExperiment(form) {
        const data = new FormData(form);
        const freqOption = form.querySelector('[data-freq].active');

        DataManager.createExperiment({
            title: data.get('title'),
            purpose: data.get('purpose'),
            successCriteria: data.get('criteria') || null,
            durationDays: parseInt(data.get('duration')) || 30,
            frequency: freqOption?.dataset.freq || 'daily',
            startDate: new Date().toISOString()
        });

        this.closeModal('modal-create');
        form.reset();
        this.render();
        this.bindEvents();
    },

    /**
     * Handle check-in
     */
    handleCheckin(form) {
        const data = new FormData(form);
        const statusOption = form.querySelector('[data-status].active');
        const isCompleted = statusOption?.dataset.status === 'completed';

        DataManager.addEntry(this.state.currentExperiment, {
            date: StreakCalculator.toDateString(new Date()),
            isCompleted: isCompleted,
            note: data.get('note') || null
        });

        this.closeModal('modal-checkin');
        form.reset();
        this.render();
        this.bindEvents();
    },

    /**
     * Create experiment from template
     */
    createFromTemplate(template) {
        DataManager.createExperiment({
            title: template.title,
            purpose: template.purpose,
            successCriteria: template.successCriteria,
            durationDays: template.durationDays,
            frequency: template.frequency,
            startDate: new Date().toISOString()
        });

        this.state.currentTab = 'experiments';
        this.render();
        this.bindEvents();
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
