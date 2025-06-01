// Enhanced True Shuffle Settings System
// Handles all user preferences, state management, and integration with core features

class TrueShuffleSettings {
    constructor() {
        this.currentUserId = null;
        this.isLoaded = false;
        
        // Default settings with comprehensive options
        this.defaultSettings = {
            // User Preferences
            genres: ['pop', 'rock', 'hip-hop', 'electronic', 'jazz', 'classical'],
            moods: ['happy', 'energetic', 'chill', 'melancholic'],
            shuffleType: 'true-random',
            
            // Audio & Discovery Settings
            popularity: 50, // 0-100, lower = more underground
            libraryRatio: 50, // 0-100, 0 = all new, 100 = all library
            yearFrom: 1950,
            yearTo: 2024,
            maxQueueSize: 50,
            
            // App Behavior
            autoPlaylist: true,
            backgroundEffects: true,
            skipShortTracks: false,
            enableNotifications: true,
            enableVisualization: true,
            crossfadeEnabled: false,
            
            // Advanced Features
            smartShuffle: true,
            trackAnalysis: true,
            moodDetection: true,
            genreWeighting: false,
            
            // UI Preferences
            compactMode: false,
            darkMode: true,
            showLyrics: false,
            showQueue: true,
            
            // Audio Settings
            volume: 0.8,
            fadeInOut: true,
            normalizeVolume: false,
            bassBoost: false,
            
            // Discovery Behavior
            discoverySensitivity: 'medium', // low, medium, high
            repeatProtection: 'session', // none, session, persistent
            moodAdaptation: true,
            genreDiversity: 0.7, // 0-1, higher = more diverse
            
            // Premium Features
            aiCuration: false,
            advancedAnalytics: false,
            exportPlaylists: false,
            prioritySupport: false
        };
        
        this.currentSettings = { ...this.defaultSettings };
        this.init();
    }

    async init() {
        console.log('⚙️ Initializing Enhanced Settings System...');
        
        // Load current user ID if available
        this.currentUserId = window.currentUserId || null;
        
        // Load settings
        await this.loadSettings();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Apply initial settings
        this.applyAllSettings();
        
        console.log('✅ Enhanced Settings System initialized');
        this.isLoaded = true;
    }

    async loadSettings() {
        console.log('📖 Loading user settings...');
        
        try {
            // Try server first if user is logged in
            if (this.currentUserId) {
                const serverSettings = await this.loadFromServer();
                if (serverSettings) {
                    this.currentSettings = { ...this.defaultSettings, ...serverSettings };
                    console.log('✅ Settings loaded from server');
                    return;
                }
            }
            
            // Fallback to localStorage
            const localSettings = this.loadFromLocalStorage();
            if (localSettings) {
                this.currentSettings = { ...this.defaultSettings, ...localSettings };
                console.log('✅ Settings loaded from localStorage');
                return;
            }
            
            // Use defaults
            this.currentSettings = { ...this.defaultSettings };
            console.log('🔧 Using default settings');
            
        } catch (error) {
            console.error('❌ Error loading settings:', error);
            this.currentSettings = { ...this.defaultSettings };
        }
    }

    async loadFromServer() {
        try {
            const response = await fetch(`/api/settings/${this.currentUserId}`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.warn('⚠️ Server load failed:', error);
        }
        return null;
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('trueShuffleSettings');
            if (saved && saved !== 'undefined') {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.warn('⚠️ localStorage load failed:', error);
        }
        return null;
    }

    async saveSettings() {
        console.log('💾 Saving settings...', this.currentSettings);
        
        try {
            // Save to server if logged in
            if (this.currentUserId) {
                try {
                    await this.saveToServer();
                    this.showNotification('Settings saved to your account!', 'success');
                } catch (error) {
                    // Fallback to localStorage
                    this.saveToLocalStorage();
                    this.showNotification('Settings saved locally (server unavailable)', 'warning');
                }
            } else {
                this.saveToLocalStorage();
                this.showNotification('Settings saved locally', 'info');
            }
            
            // Apply settings immediately
            this.applyAllSettings();
            
        } catch (error) {
            console.error('❌ Save failed:', error);
            this.showNotification('Failed to save settings', 'error');
        }
    }

    async saveToServer() {
        const response = await fetch(`/api/settings/${this.currentUserId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.currentSettings)
        });
        
        if (!response.ok) {
            throw new Error('Server save failed');
        }
    }

    saveToLocalStorage() {
        localStorage.setItem('trueShuffleSettings', JSON.stringify(this.currentSettings));
    }

    // Apply all settings to the app
    applyAllSettings() {
        console.log('🔧 Applying all settings...');
        
        this.applyAudioSettings();
        this.applyUISettings();
        this.applyBehaviorSettings();
        this.applyDiscoverySettings();
        this.updateSettingsModal();
        this.updateMainInterface();
        
        // Trigger custom event for other modules
        window.dispatchEvent(new CustomEvent('settingsApplied', { 
            detail: this.currentSettings 
        }));
    }

    applyAudioSettings() {
        // Volume control
        if (window.player && this.currentSettings.volume !== undefined) {
            window.player.setVolume(this.currentSettings.volume);
        }
        
        // Background effects
        document.body.classList.toggle('no-bg-effects', !this.currentSettings.backgroundEffects);
        
        // Visualization
        document.body.classList.toggle('no-visualization', !this.currentSettings.enableVisualization);
    }

    applyUISettings() {
        // Dark/light mode
        document.body.classList.toggle('light-mode', !this.currentSettings.darkMode);
        
        // Compact mode
        document.body.classList.toggle('compact-mode', this.currentSettings.compactMode);
        
        // Queue visibility
        const queueElement = document.getElementById('queue-section');
        if (queueElement) {
            queueElement.style.display = this.currentSettings.showQueue ? 'block' : 'none';
        }
    }

    applyBehaviorSettings() {
        // Update global variables that other parts of the app use
        if (window.app) {
            window.app.settings = this.currentSettings;
        }
        
        // Set shuffle type
        if (window.currentShuffleType !== this.currentSettings.shuffleType) {
            window.currentShuffleType = this.currentSettings.shuffleType;
            
            // Update UI selectors
            const shuffleSelects = document.querySelectorAll('#shuffle-type, .shuffle-type-select');
            shuffleSelects.forEach(select => {
                select.value = this.currentSettings.shuffleType;
            });
        }
    }

    applyDiscoverySettings() {
        // Update discovery parameters
        if (window.customSettings) {
            window.customSettings.yearFrom = this.currentSettings.yearFrom;
            window.customSettings.yearTo = this.currentSettings.yearTo;
            window.customSettings.maxPopularity = this.currentSettings.popularity;
        }
    }

    updateSettingsModal() {
        if (!document.getElementById('settings-modal')) return;
        
        // Update genre buttons
        document.querySelectorAll('.settings-genre-btn').forEach(btn => {
            const isActive = this.currentSettings.genres.includes(btn.dataset.genre);
            btn.classList.toggle('active', isActive);
        });
        
        // Update mood buttons
        document.querySelectorAll('.settings-mood-option').forEach(option => {
            const isActive = this.currentSettings.moods.includes(option.dataset.mood);
            option.classList.toggle('active', isActive);
        });
        
        // Update sliders
        this.updateSlider('settings-popularity', this.currentSettings.popularity, 'settings-popularity-label');
        this.updateSlider('settings-library-ratio', this.currentSettings.libraryRatio, 'settings-library-label');
        this.updateSlider('max-queue-size', this.currentSettings.maxQueueSize, 'max-queue-label');
        
        // Update checkboxes
        this.updateCheckbox('auto-playlist', this.currentSettings.autoPlaylist);
        this.updateCheckbox('background-effects', this.currentSettings.backgroundEffects);
        this.updateCheckbox('skip-short-tracks', this.currentSettings.skipShortTracks);
        this.updateCheckbox('enable-notifications', this.currentSettings.enableNotifications);
        this.updateCheckbox('enable-visualization', this.currentSettings.enableVisualization);
        this.updateCheckbox('crossfade-enabled', this.currentSettings.crossfadeEnabled);
        
        // Update year inputs
        this.updateInput('year-from', this.currentSettings.yearFrom);
        this.updateInput('year-to', this.currentSettings.yearTo);
        
        // Update shuffle type select
        this.updateSelect('shuffle-type', this.currentSettings.shuffleType);
    }

    updateMainInterface() {
        // Update usage stats if monetization is available
        if (window.monetization) {
            const stats = window.monetization.getUsageStats();
            
            // Update plan display
            const planDisplay = document.getElementById('user-plan-display');
            if (planDisplay) {
                planDisplay.textContent = stats.plan.charAt(0).toUpperCase() + stats.plan.slice(1);
            }
            
            // Update daily tracks
            const tracksDisplay = document.getElementById('daily-tracks-count');
            if (tracksDisplay) {
                tracksDisplay.textContent = stats.dailyTracks;
            }
            
            // Show upgrade button for free users
            const upgradeBtn = document.getElementById('upgrade-btn');
            if (upgradeBtn) {
                upgradeBtn.classList.toggle('hidden', stats.plan !== 'free');
            }
            
            // Show trial banner
            const trialBanner = document.getElementById('trial-banner');
            if (trialBanner && stats.isInTrial) {
                trialBanner.classList.remove('hidden');
                const daysElement = document.getElementById('trial-days-remaining');
                if (daysElement) {
                    daysElement.textContent = stats.remainingTrialDays;
                }
            }
            
            // Show usage stats display
            const usageDisplay = document.getElementById('usage-stats-display');
            if (usageDisplay) {
                usageDisplay.classList.remove('hidden');
            }
        }
    }

    updateSlider(id, value, labelId) {
        const slider = document.getElementById(id);
        const label = document.getElementById(labelId);
        
        if (slider) {
            slider.value = value;
            
            if (label) {
                if (id === 'settings-popularity') {
                    const labelText = value < 30 ? 'Underground' : value > 70 ? 'Mainstream' : 'Balanced';
                    label.textContent = `${labelText} (${value}%)`;
                } else if (id === 'settings-library-ratio') {
                    label.textContent = `${value}% / ${100 - value}%`;
                } else if (id === 'max-queue-size') {
                    label.textContent = `${value} tracks`;
                }
            }
        }
    }

    updateCheckbox(id, checked) {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.checked = checked;
        }
    }

    updateInput(id, value) {
        const input = document.getElementById(id);
        if (input) {
            input.value = value;
        }
    }

    updateSelect(id, value) {
        const select = document.getElementById(id);
        if (select) {
            select.value = value;
        }
    }

    setupEventListeners() {
        // Settings modal events
        document.addEventListener('click', (e) => {
            if (e.target.id === 'settings-button') {
                this.showModal();
            } else if (e.target.id === 'close-settings') {
                this.hideModal();
            } else if (e.target.id === 'save-settings') {
                this.collectAndSave();
            } else if (e.target.id === 'reset-settings') {
                this.resetToDefaults();
            }
        });

        // Genre selection
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('settings-genre-btn')) {
                e.target.classList.toggle('active');
                this.updateLiveSettings();
            }
        });

        // Mood selection
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('settings-mood-option')) {
                e.target.classList.toggle('active');
                this.updateLiveSettings();
            }
        });

        // Slider changes
        document.addEventListener('input', (e) => {
            if (e.target.matches('#settings-popularity, #settings-library-ratio, #max-queue-size')) {
                this.handleSliderChange(e.target);
                this.updateLiveSettings();
            }
        });

        // Checkbox changes
        document.addEventListener('change', (e) => {
            if (e.target.matches('input[type="checkbox"]')) {
                this.handleCheckboxChange(e.target);
                this.updateLiveSettings();
            }
        });

        // Year input changes
        document.addEventListener('input', (e) => {
            if (e.target.matches('#year-from, #year-to')) {
                this.updateLiveSettings();
            }
        });

        // Shuffle type changes
        document.addEventListener('change', (e) => {
            if (e.target.id === 'shuffle-type') {
                this.updateLiveSettings();
            }
        });

        // Genre control buttons
        document.addEventListener('click', (e) => {
            if (e.target.id === 'settings-select-all') {
                document.querySelectorAll('.settings-genre-btn').forEach(btn => {
                    btn.classList.add('active');
                });
                this.updateLiveSettings();
            } else if (e.target.id === 'settings-deselect-all') {
                document.querySelectorAll('.settings-genre-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                this.updateLiveSettings();
            }
        });
    }

    handleSliderChange(slider) {
        const value = parseInt(slider.value);
        const id = slider.id;
        
        // Update label
        if (id === 'settings-popularity') {
            const label = document.getElementById('settings-popularity-label');
            if (label) {
                const labelText = value < 30 ? 'Underground' : value > 70 ? 'Mainstream' : 'Balanced';
                label.textContent = `${labelText} (${value}%)`;
            }
        } else if (id === 'settings-library-ratio') {
            const label = document.getElementById('settings-library-label');
            if (label) {
                label.textContent = `${value}% / ${100 - value}%`;
            }
        } else if (id === 'max-queue-size') {
            const label = document.getElementById('max-queue-label');
            if (label) {
                label.textContent = `${value} tracks`;
            }
        }
    }

    handleCheckboxChange(checkbox) {
        const setting = checkbox.id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        
        // Apply immediate effects for certain settings
        if (checkbox.id === 'background-effects') {
            document.body.classList.toggle('no-bg-effects', !checkbox.checked);
        } else if (checkbox.id === 'enable-visualization') {
            document.body.classList.toggle('no-visualization', !checkbox.checked);
        } else if (checkbox.id === 'enable-notifications') {
            if (checkbox.checked) {
                this.showNotification('Notifications enabled!', 'success');
            }
        }
    }

    updateLiveSettings() {
        // Collect current settings from UI without saving
        this.currentSettings = this.collectFromModal();
        
        // Apply some settings immediately for live preview
        this.applyUISettings();
        this.applyBehaviorSettings();
    }

    collectFromModal() {
        const settings = { ...this.currentSettings };
        
        // Collect genres
        const activeGenres = document.querySelectorAll('.settings-genre-btn.active');
        settings.genres = Array.from(activeGenres).map(btn => btn.dataset.genre);
        
        // Collect moods
        const activeMoods = document.querySelectorAll('.settings-mood-option.active');
        settings.moods = Array.from(activeMoods).map(option => option.dataset.mood);
        
        // Collect sliders
        const popularitySlider = document.getElementById('settings-popularity');
        const librarySlider = document.getElementById('settings-library-ratio');
        const queueSlider = document.getElementById('max-queue-size');
        
        if (popularitySlider) settings.popularity = parseInt(popularitySlider.value);
        if (librarySlider) settings.libraryRatio = parseInt(librarySlider.value);
        if (queueSlider) settings.maxQueueSize = parseInt(queueSlider.value);
        
        // Collect checkboxes
        const checkboxes = [
            'auto-playlist', 'background-effects', 'skip-short-tracks',
            'enable-notifications', 'enable-visualization', 'crossfade-enabled'
        ];
        
        checkboxes.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                const setting = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                settings[setting] = checkbox.checked;
            }
        });
        
        // Collect year inputs
        const yearFrom = document.getElementById('year-from');
        const yearTo = document.getElementById('year-to');
        if (yearFrom) settings.yearFrom = parseInt(yearFrom.value);
        if (yearTo) settings.yearTo = parseInt(yearTo.value);
        
        // Collect shuffle type
        const shuffleSelect = document.getElementById('shuffle-type');
        if (shuffleSelect) settings.shuffleType = shuffleSelect.value;
        
        return settings;
    }

    async collectAndSave() {
        this.currentSettings = this.collectFromModal();
        await this.saveSettings();
        this.hideModal();
    }

    resetToDefaults() {
        this.currentSettings = { ...this.defaultSettings };
        this.updateSettingsModal();
        this.applyAllSettings();
        this.showNotification('Settings reset to defaults', 'info');
    }

    showModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.remove('hidden');
            this.updateSettingsModal();
        }
    }

    hideModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    showNotification(message, type = 'info') {
        // Use existing notification system or create one
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Public API methods
    getSetting(key) {
        return this.currentSettings[key];
    }

    setSetting(key, value) {
        this.currentSettings[key] = value;
        this.applyAllSettings();
    }

    getSettings() {
        return { ...this.currentSettings };
    }

    setSettings(settings) {
        this.currentSettings = { ...this.defaultSettings, ...settings };
        this.applyAllSettings();
    }

    // Feature access control (integrates with monetization)
    canUseFeature(feature) {
        if (!window.monetization) return true;
        return window.monetization.canUseFeature(feature);
    }

    // Export settings for backup
    exportSettings() {
        return JSON.stringify(this.currentSettings, null, 2);
    }

    // Import settings from backup
    importSettings(settingsJson) {
        try {
            const settings = JSON.parse(settingsJson);
            this.setSettings(settings);
            this.showNotification('Settings imported successfully!', 'success');
            return true;
        } catch (error) {
            this.showNotification('Failed to import settings', 'error');
            return false;
        }
    }
}

// Initialize settings system
const trueShuffleSettings = new TrueShuffleSettings();

// Export for global access
window.trueShuffleSettings = trueShuffleSettings; 