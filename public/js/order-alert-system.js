/**
 * Order Alert System - Sound Notification & Text-to-Speech for Admins
 * Triggers when an order is confirmed with customer details
 */

class OrderAlertSystem {
  constructor() {
    this.isEnabled = localStorage.getItem('orderAlertEnabled') !== 'false';
    this.volume = Number.parseFloat(localStorage.getItem('orderAlertVolume')) || 1;
    this.selectedVoiceIndex = Number.parseInt(localStorage.getItem('orderAlertVoice'), 10) || 0;
    this.alertSound = null;
    this.synthesis = globalThis.speechSynthesis;
    this.alertAudio = new Audio();
    this.voices = [];
    this.initAlertSound();
    this.loadVoices();
  }

  // Load available voices
  loadVoices() {
    if (this.synthesis?.getVoices) {
      this.voices = this.synthesis.getVoices();
      console.log('📢 Available voices:', this.voices.length, this.voices);
    }
    
    // Listen for voices to be loaded (some browsers load asynchronously)
    if (this.synthesis) {
      this.synthesis.onvoiceschanged = () => {
        this.voices = this.synthesis.getVoices();
        console.log('📢 Voices updated:', this.voices.length);
      };
    }
  }

  // Initialize alert sound (using Web Audio API or notification sound)
  initAlertSound() {
    // Create a beep sound using Web Audio API
    const audioContext = new (globalThis.AudioContext || globalThis.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Store for later use
    this.audioContext = audioContext;
    this.createBeepSound = (frequency = 1000, duration = 500) => {
      const ctx = new (globalThis.AudioContext || globalThis.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.3 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration / 1000);
    };
  }

  // Play alert sound
  playAlertSound() {
    if (!this.isEnabled) return;
    
    try {
      // Create a double beep (ding-ding sound)
      this.createBeepSound(1200, 300);
      setTimeout(() => this.createBeepSound(1400, 300), 350);
    } catch (err) {
      console.error('Error playing alert sound:', err);
    }
  }

  // Text-to-speech function
  speakOrderConfirmation(customerData) {
    if (!this.isEnabled || !this.synthesis) return;
    
    // Cancel any ongoing speech
    this.synthesis.cancel();
    
    const { name, phone, address } = customerData;
    
    // Build the message
    const message = `Order confirmed. Customer name: ${name}. Phone number: ${phone}. Delivery address: ${address}`;
    
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1;
    utterance.volume = this.volume;
    utterance.lang = 'en-US';
    
    // Set selected voice
    if (this.voices.length > 0 && this.selectedVoiceIndex < this.voices.length) {
      utterance.voice = this.voices[this.selectedVoiceIndex];
    }
    
    // Speak the message
    this.synthesis.speak(utterance);
    
    return utterance;
  }

  // Complete order alert (sound + speech)
  triggerOrderAlert(customerData) {
    if (!this.isEnabled) {
      console.log('Order alerts are disabled');
      return;
    }

    console.log('🔔 Order Alert Triggered:', customerData);
    
    // Play sound first
    this.playAlertSound();
    
    // Give sound a moment to play, then start speech
    setTimeout(() => {
      this.speakOrderConfirmation(customerData);
    }, 600);
    
    // Visual notification
    this.showVisualNotification(customerData);
  }

  // Visual notification popup
  showVisualNotification(customerData) {
    const notification = document.createElement('div');
    notification.className = 'order-alert-notification';
    notification.innerHTML = `
      <div class="alert-content">
        <div class="alert-icon">🔔</div>
        <div class="alert-details">
          <h3>New Order Confirmed!</h3>
          <p><strong>Customer:</strong> ${customerData.name}</p>
          <p><strong>Phone:</strong> ${customerData.phone}</p>
          <p><strong>Address:</strong> ${customerData.address}</p>
          <small>${new Date().toLocaleTimeString()}</small>
        </div>
        <button class="alert-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      notification.remove();
    }, 10000);
  }

  // Toggle alerts on/off
  toggleAlerts(enabled) {
    this.isEnabled = enabled;
    localStorage.setItem('orderAlertEnabled', enabled ? 'true' : 'false');
    console.log(`Order alerts ${enabled ? 'enabled' : 'disabled'}`);
    return this.isEnabled;
  }

  // Set volume (0-1)
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('orderAlertVolume', this.volume.toString());
    return this.volume;
  }

  // Get available voices with gender detection
  getAvailableVoices() {
    return this.voices.map((voice, index) => {
      // Detect gender from voice name
      let gender = 'unknown';
      const voiceName = voice.name.toLowerCase();
      
      if (voiceName.includes('female') || voiceName.includes('woman') || 
          voiceName.includes('girl') || voiceName.includes('victoria') ||
          voiceName.includes('moira') || voiceName.includes('samantha') ||
          voiceName.includes('siri') || voiceName.includes('alexa') ||
          voiceName.includes('cortana') || voiceName.includes('zira') ||
          voiceName.includes('aria') || voiceName.includes('susan') ||
          voiceName.includes('jenny') || voiceName.includes('emma')) {
        gender = 'female';
      } else if (voiceName.includes('male') || voiceName.includes('man') || 
                 voiceName.includes('boy') || voiceName.includes('david') ||
                 voiceName.includes('alex') || voiceName.includes('daniel') ||
                 voiceName.includes('mark') || voiceName.includes('tom')) {
        gender = 'male';
      }
      
      return {
        index,
        name: voice.name,
        lang: voice.lang,
        gender,
        default: voice.default,
        voiceObj: voice
      };
    });
  }

  // Set selected voice
  setVoice(voiceIndex) {
    this.selectedVoiceIndex = voiceIndex;
    localStorage.setItem('orderAlertVoice', voiceIndex.toString());
    console.log(`Voice changed to: ${this.voices[voiceIndex]?.name || 'Default'}`);
    return this.selectedVoiceIndex;
  }

  // Test alert
  testAlert() {
    const testCustomer = {
      name: 'Test Customer',
      phone: '+234 123 456 7890',
      address: '123 Test Street, Test City'
    };
    console.log('🧪 Testing order alert system...');
    this.triggerOrderAlert(testCustomer);
  }

  // Get current settings
  getSettings() {
    return {
      enabled: this.isEnabled,
      volume: this.volume
    };
  }
}

// Initialize globally
const orderAlertSystem = new OrderAlertSystem();

// Log initialization
console.log('✅ Order Alert System initialized');
