// True Shuffle Monetization Module
// Handles usage tracking, premium features, and payment integration

class TrueShuffleMonetization {
  constructor() {
    this.config = {
      FREE_TRACK_LIMIT: 30,
      FREE_SHUFFLE_LIMIT: 10,
      PREMIUM_FEATURES: ['moodBased', 'genreBalanced', 'neverPlayed'],
      TRIAL_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      PLANS: {
        basic: {
          name: 'Basic',
          price: 2.99,
          features: ['unlimited_shuffles', 'basic_modes'],
          trackLimit: 100
        },
        pro: {
          name: 'Pro', 
          price: 5.99,
          features: ['all_shuffle_modes', 'playlist_export', 'analytics'],
          trackLimit: 500
        },
        premium: {
          name: 'Premium',
          price: 9.99,
          features: ['ai_curation', 'early_access', 'priority_support'],
          trackLimit: -1 // unlimited
        }
      }
    };
    
    this.init();
  }

  init() {
    this.loadUserData();
    this.setupPaymentHandlers();
    this.trackPageView();
  }

  // Usage Tracking
  loadUserData() {
    const today = new Date().toDateString();
    const storedData = localStorage.getItem('trueShuffleUsage');
    
    if (storedData) {
      this.userData = JSON.parse(storedData);
      if (this.userData.lastUsed !== today) {
        // Reset daily counters
        this.userData.dailyTracks = 0;
        this.userData.dailyShuffles = 0;
        this.userData.lastUsed = today;
      }
    } else {
      // New user
      this.userData = {
        userId: this.generateUserId(),
        signupDate: Date.now(),
        plan: 'free',
        trialEndsAt: Date.now() + this.config.TRIAL_DURATION,
        totalTracks: 0,
        totalShuffles: 0,
        dailyTracks: 0,
        dailyShuffles: 0,
        lastUsed: today,
        favoriteShuffleMode: null,
        sessionsCount: 1
      };
      
      this.showWelcomeOffer();
    }
    
    this.saveUserData();
  }

  saveUserData() {
    localStorage.setItem('trueShuffleUsage', JSON.stringify(this.userData));
  }

  trackShuffleUsage(shuffleType, trackCount) {
    this.userData.dailyShuffles++;
    this.userData.totalShuffles++;
    this.userData.dailyTracks += trackCount;
    this.userData.totalTracks += trackCount;
    
    // Track favorite shuffle mode
    if (!this.userData.favoriteShuffleMode) {
      this.userData.favoriteShuffleMode = shuffleType;
    }
    
    this.saveUserData();
    this.checkUsageLimits();
    
    // Analytics
    this.trackEvent('shuffle_used', {
      type: shuffleType,
      track_count: trackCount,
      user_plan: this.userData.plan
    });
  }

  checkUsageLimits() {
    const { FREE_TRACK_LIMIT, FREE_SHUFFLE_LIMIT } = this.config;
    
    if (this.userData.plan === 'free' && !this.isInTrial()) {
      if (this.userData.dailyTracks >= FREE_TRACK_LIMIT) {
        this.showUpgradePrompt('track_limit');
        return false;
      }
      
      if (this.userData.dailyShuffles >= FREE_SHUFFLE_LIMIT) {
        this.showUpgradePrompt('shuffle_limit');
        return false;
      }
    }
    
    return true;
  }

  canUseFeature(feature) {
    if (this.userData.plan !== 'free') return true;
    if (this.isInTrial()) return true;
    
    return !this.config.PREMIUM_FEATURES.includes(feature);
  }

  isInTrial() {
    return Date.now() < this.userData.trialEndsAt;
  }

  getRemainingTrialDays() {
    if (!this.isInTrial()) return 0;
    return Math.ceil((this.userData.trialEndsAt - Date.now()) / (24 * 60 * 60 * 1000));
  }

  // UI Components
  showUpgradePrompt(reason) {
    const messages = {
      track_limit: `You've reached your daily limit of ${this.config.FREE_TRACK_LIMIT} tracks. Upgrade for unlimited music discovery!`,
      shuffle_limit: `Daily shuffle limit reached! Upgrade to shuffle unlimited playlists.`,
      premium_feature: 'This feature is available for premium users. Start your free trial!'
    };

    this.showModal({
      title: '🎵 Upgrade to Premium',
      message: messages[reason] || messages.premium_feature,
      buttons: [
        { text: 'Start Free Trial', action: () => this.startFreeTrial(), primary: true },
        { text: 'See Plans', action: () => this.showPricingModal() },
        { text: 'Later', action: () => this.closeModal() }
      ]
    });
  }

  showWelcomeOffer() {
    setTimeout(() => {
      this.showModal({
        title: '🎉 Welcome to True Shuffle!',
        message: `Start your 7-day free trial and experience all premium features!<br><br>
        ✨ Unlimited shuffles<br>
        🎭 All mood-based discovery<br>
        🎨 Advanced genre mixing<br>
        📊 Listening analytics`,
        buttons: [
          { text: 'Start Free Trial', action: () => this.startFreeTrial(), primary: true },
          { text: 'Continue Free', action: () => this.closeModal() }
        ]
      });
    }, 2000); // Show after 2 seconds
  }

  showPricingModal() {
    const { PLANS } = this.config;
    const planHTML = Object.entries(PLANS).map(([key, plan]) => `
      <div class="pricing-plan ${key === 'pro' ? 'featured' : ''}" data-plan="${key}">
        <h3>${plan.name}</h3>
        <div class="price">$${plan.price}<span>/month</span></div>
        <ul class="features">
          ${plan.features.map(f => `<li>${this.formatFeature(f)}</li>`).join('')}
        </ul>
        <button class="select-plan-btn" data-plan="${key}">
          ${this.userData.plan === key ? 'Current Plan' : 'Select Plan'}
        </button>
      </div>
    `).join('');

    this.showModal({
      title: '🎵 Choose Your Plan',
      content: `
        <div class="pricing-grid">
          ${planHTML}
        </div>
        <div class="pricing-footer">
          <p>✅ 7-day free trial • ✅ Cancel anytime • ✅ All plans include core features</p>
        </div>
      `,
      customClass: 'pricing-modal'
    });

    // Add plan selection handlers
    document.querySelectorAll('.select-plan-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const plan = e.target.dataset.plan;
        this.selectPlan(plan);
      });
    });
  }

  formatFeature(feature) {
    const features = {
      'unlimited_shuffles': '∞ Unlimited shuffles',
      'basic_modes': '🎲 Basic shuffle modes',
      'all_shuffle_modes': '🎭 All shuffle modes',
      'playlist_export': '📤 Export playlists',
      'analytics': '📊 Listening analytics',
      'ai_curation': '🤖 AI curation',
      'early_access': '🚀 Early access features',
      'priority_support': '💬 Priority support'
    };
    return features[feature] || feature;
  }

  // Payment Integration
  setupPaymentHandlers() {
    // Stripe integration placeholder
    if (window.Stripe) {
      this.stripe = Stripe('pk_test_your_stripe_key_here');
    }
  }

  async selectPlan(planKey) {
    const plan = this.config.PLANS[planKey];
    
    this.trackEvent('plan_selected', { plan: planKey, price: plan.price });
    
    // Simulate payment flow - replace with actual Stripe integration
    this.showModal({
      title: '💳 Complete Your Purchase',
      content: `
        <div class="payment-form">
          <h3>Subscribe to ${plan.name} Plan</h3>
          <p class="plan-price">$${plan.price}/month</p>
          
          <div class="payment-methods">
            <button class="payment-btn stripe-btn" onclick="monetization.processPayment('${planKey}', 'stripe')">
              <i class="fab fa-cc-stripe"></i> Pay with Card
            </button>
            <button class="payment-btn paypal-btn" onclick="monetization.processPayment('${planKey}', 'paypal')">
              <i class="fab fa-paypal"></i> PayPal
            </button>
          </div>
          
          <p class="payment-terms">
            7-day free trial, then $${plan.price}/month. Cancel anytime.
          </p>
        </div>
      `,
      customClass: 'payment-modal'
    });
  }

  async processPayment(planKey, method) {
    // Placeholder for payment processing
    this.showLoading('Processing payment...');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update user plan
      this.userData.plan = planKey;
      this.userData.subscriptionStart = Date.now();
      this.saveUserData();
      
      this.hideLoading();
      this.showSuccessMessage(planKey);
      
      this.trackEvent('subscription_created', { 
        plan: planKey, 
        method: method,
        user_id: this.userData.userId 
      });
      
    } catch (error) {
      this.hideLoading();
      this.showErrorMessage('Payment failed. Please try again.');
    }
  }

  startFreeTrial() {
    this.userData.plan = 'trial';
    this.userData.trialStart = Date.now();
    this.saveUserData();
    
    this.showSuccessMessage('trial');
    this.trackEvent('trial_started', { user_id: this.userData.userId });
  }

  showSuccessMessage(type) {
    const messages = {
      trial: '🎉 Your free trial has started! Enjoy all premium features for 7 days.',
      basic: '✅ Welcome to True Shuffle Basic! Your subscription is now active.',
      pro: '✅ Welcome to True Shuffle Pro! All features unlocked.',
      premium: '✅ Welcome to True Shuffle Premium! You have access to everything.'
    };

    this.showModal({
      title: 'Success!',
      message: messages[type],
      buttons: [{ text: 'Continue', action: () => this.closeModal(), primary: true }]
    });
  }

  // Analytics
  trackEvent(eventName, properties = {}) {
    // Google Analytics
    if (window.gtag) {
      gtag('event', eventName, {
        ...properties,
        app_name: 'true_shuffle',
        app_version: '2.1.0'
      });
    }
    
    // Custom analytics
    console.log('Analytics Event:', eventName, properties);
  }

  trackPageView() {
    if (window.gtag) {
      gtag('config', 'GA_MEASUREMENT_ID', {
        page_title: 'True Shuffle',
        page_location: window.location.href
      });
    }
  }

  // Utility Functions
  generateUserId() {
    return 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  showModal({ title, message, content, buttons, customClass = '' }) {
    const modal = document.createElement('div');
    modal.className = `monetization-modal ${customClass}`;
    modal.innerHTML = `
      <div class="modal-overlay" onclick="monetization.closeModal()"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>${title}</h2>
          <button class="modal-close" onclick="monetization.closeModal()">×</button>
        </div>
        <div class="modal-body">
          ${content || `<p>${message}</p>`}
        </div>
        ${buttons ? `
          <div class="modal-footer">
            ${buttons.map(btn => `
              <button class="modal-btn ${btn.primary ? 'primary' : ''}" 
                      onclick="${btn.action.toString().replace('function ', '').replace('() => ', '').replace('()', '')}">
                ${btn.text}
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
    
    document.body.appendChild(modal);
    this.currentModal = modal;
  }

  closeModal() {
    if (this.currentModal) {
      this.currentModal.remove();
      this.currentModal = null;
    }
  }

  showLoading(message) {
    this.showModal({
      title: 'Processing...',
      content: `<div class="loading-spinner"></div><p>${message}</p>`,
      customClass: 'loading-modal'
    });
  }

  hideLoading() {
    this.closeModal();
  }

  showErrorMessage(message) {
    this.showModal({
      title: 'Error',
      message: message,
      buttons: [{ text: 'OK', action: () => this.closeModal() }]
    });
  }

  // Public API
  getUsageStats() {
    return {
      plan: this.userData.plan,
      totalTracks: this.userData.totalTracks,
      totalShuffles: this.userData.totalShuffles,
      dailyTracks: this.userData.dailyTracks,
      dailyShuffles: this.userData.dailyShuffles,
      remainingTrialDays: this.getRemainingTrialDays(),
      isInTrial: this.isInTrial()
    };
  }
}

// Initialize monetization
const monetization = new TrueShuffleMonetization();

// Export for use in main app
window.monetization = monetization; 