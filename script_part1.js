// ===== GLASSOS v1.3 - SCRIPT.JS COMPLETO =====
// Módulos: SoundManager (com temas), GlassIcons, Storage, ThemeManager, WindowManager, FileSystem (com criptografia), NotificationSystem, ClipboardManager, GlobalSearch (semântico), LoginScreen, SnapManager, ParticleEngine, TaskManagerApp, ArcadeGames, EncryptionHelper, Apps, AppRegistry, GlassOS, QuickSettingsManager

// ===== HELPER DE CRIPTOGRAFIA =====
const EncryptionHelper = {
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },
    
    async verifyPassword(password, hash) {
        const computedHash = await this.hashPassword(password);
        return computedHash === hash;
    }
};

// ===== GERENCIADOR DE EFEITOS SONOROS COM TEMAS =====
const SoundManager = {
    ctx: null,
    masterGain: null,
    isMuted: false,
    volume: 0.3,
    initialized: false,
    currentTheme: 'default',
    
    soundThemes: {
        default: {
            click: { type: 'triangle', freq: 800, duration: 0.05, gain: 0.08 },
            openWindow: { type: 'sine', freqStart: 200, freqEnd: 600, duration: 0.2, gain: 0.12 },
            closeWindow: { type: 'sine', freqStart: 600, freqEnd: 200, duration: 0.2, gain: 0.12 },
            minimize: { type: 'sine', freqStart: 500, freqEnd: 150, duration: 0.15, gain: 0.1 },
            error: { type: 'sawtooth', freq: 150, duration: 0.3, gain: 0.08 },
            notification: { type: 'sine', freq: 880, duration: 0.6, gain: 0.15 },
            typing: { type: 'square', freq: 2000, duration: 0.03, gain: 0.02 },
            boot: { chords: [261.63, 329.63, 392.00], duration: 1.5 },
            shutdown: { chords: [392.00, 329.63, 261.63], duration: 1.2 }
        },
        mechanical: {
            click: { type: 'square', freq: 400, duration: 0.03, gain: 0.06 },
            openWindow: { type: 'sawtooth', freqStart: 150, freqEnd: 400, duration: 0.25, gain: 0.1 },
            closeWindow: { type: 'sawtooth', freqStart: 400, freqEnd: 150, duration: 0.25, gain: 0.1 },
            minimize: { type: 'square', freqStart: 300, freqEnd: 100, duration: 0.1, gain: 0.08 },
            error: { type: 'sawtooth', freq: 100, duration: 0.4, gain: 0.1 },
            notification: { type: 'square', freq: 600, duration: 0.4, gain: 0.12 },
            typing: { type: 'square', freq: 1500, duration: 0.02, gain: 0.03 },
            boot: { chords: [220, 277.18, 329.63], duration: 1.5 },
            shutdown: { chords: [329.63, 277.18, 220], duration: 1.2 }
        },
        scifi: {
            click: { type: 'sine', freq: 1200, duration: 0.04, gain: 0.05 },
            openWindow: { type: 'sine', freqStart: 400, freqEnd: 1200, duration: 0.3, gain: 0.1 },
            closeWindow: { type: 'sine', freqStart: 1200, freqEnd: 400, duration: 0.3, gain: 0.1 },
            minimize: { type: 'sine', freqStart: 800, freqEnd: 200, duration: 0.15, gain: 0.08 },
            error: { type: 'sawtooth', freq: 200, duration: 0.35, gain: 0.09 },
            notification: { type: 'sine', freq: 1000, duration: 0.5, gain: 0.12 },
            typing: { type: 'sine', freq: 2500, duration: 0.025, gain: 0.02 },
            boot: { chords: [329.63, 415.30, 523.25], duration: 1.5 },
            shutdown: { chords: [523.25, 415.30, 329.63], duration: 1.2 }
        },
        nature: {
            click: { type: 'sine', freq: 1000, duration: 0.03, gain: 0.04 },
            openWindow: { type: 'sine', freqStart: 300, freqEnd: 800, duration: 0.35, gain: 0.08 },
            closeWindow: { type: 'sine', freqStart: 800, freqEnd: 300, duration: 0.35, gain: 0.08 },
            minimize: { type: 'sine', freqStart: 600, freqEnd: 200, duration: 0.2, gain: 0.06 },
            error: { type: 'sine', freq: 180, duration: 0.4, gain: 0.07 },
            notification: { type: 'sine', freq: 700, duration: 0.55, gain: 0.1 },
            typing: { type: 'sine', freq: 1800, duration: 0.02, gain: 0.015 },
            boot: { chords: [261.63, 392.00, 523.25], duration: 1.5 },
            shutdown: { chords: [523.25, 392.00, 261.63], duration: 1.2 }
        },
        silent: {
            click: null, openWindow: null, closeWindow: null, minimize: null,
            error: { type: 'sine', freq: 100, duration: 0.1, gain: 0.02 },
            notification: { type: 'sine', freq: 440, duration: 0.2, gain: 0.03 },
            typing: null, boot: null, shutdown: null
        }
    },

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            this.masterGain.gain.value = this.volume;
            this.initialized = true;
            this.loadTheme();
        } catch (e) {
            console.warn('Web Audio API não suportada:', e);
        }
    },

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    setVolume(level) {
        this.volume = Math.max(0, Math.min(1, level));
        this.isMuted = this.volume === 0;
        if (this.masterGain) this.masterGain.gain.value = this.volume;
        localStorage.setItem('glassos_volume', this.volume.toString());
        localStorage.setItem('glassos_muted', this.isMuted.toString());
    },

    toggleMute() {
        if (this.isMuted) {
            this.setVolume(parseFloat(localStorage.getItem('glassos_volume')) || 0.3);
        } else {
            localStorage.setItem('glassos_last_volume', this.volume.toString());
            this.setVolume(0);
        }
        return this.isMuted;
    },

    setTheme(themeName) {
        this.currentTheme = themeName;
        localStorage.setItem('glassos_sound_theme', themeName);
    },

    loadTheme() {
        const saved = localStorage.getItem('glassos_sound_theme');
        if (saved && this.soundThemes[saved]) {
            this.currentTheme = saved;
        }
    },

    getThemeSounds() {
        return this.soundThemes[this.currentTheme] || this.soundThemes.default;
    },

    play(soundName) {
        if (!this.initialized || this.isMuted || !this.ctx) return;
        this.resume();
        const theme = this.getThemeSounds();
        const sound = theme[soundName];
        if (!sound) return;

        const now = this.ctx.currentTime;

        if (sound.chords) {
            // Sons de boot/shutdown com acordes
            sound.chords.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.15, now + 0.3 + i * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, now + sound.duration);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(now + i * 0.1);
                osc.stop(now + sound.duration);
            });
        } else if (sound.freqStart !== undefined) {
            // Sons com sweep de frequência
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = sound.type || 'sine';
            osc.frequency.setValueAtTime(sound.freqStart, now);
            osc.frequency.linearRampToValueAtTime(sound.freqEnd, now + sound.duration);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(sound.gain, now + sound.duration * 0.3);
            gain.gain.exponentialRampToValueAtTime(0.001, now + sound.duration);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + sound.duration);
        } else {
            // Sons simples
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = sound.type || 'sine';
            osc.frequency.value = sound.freq;
            gain.gain.setValueAtTime(sound.gain, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + sound.duration);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + sound.duration);
        }
    }
};

// Carregar configurações salvas
(function loadAudioSettings() {
    const savedVol = localStorage.getItem('glassos_volume');
    const savedMuted = localStorage.getItem('glassos_muted');
    if (savedVol) SoundManager.volume = parseFloat(savedVol);
    if (savedMuted === 'true') { SoundManager.isMuted = true; SoundManager.volume = 0; }
})();
