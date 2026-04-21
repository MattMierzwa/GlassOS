// script.js - COMPLETO COM TODAS AS NOVAS FUNCIONALIDADES

// ===== SISTEMA DE ARMAZENAMENTO =====
const Storage = {
    set(key, value) {
        try { localStorage.setItem(`glassos_${key}`, JSON.stringify(value)); }
        catch (e) { console.warn('Storage.set erro:', e); }
    },
    get(key, fallback = null) {
        try {
            const data = localStorage.getItem(`glassos_${key}`);
            return data ? JSON.parse(data) : fallback;
        } catch (e) { return fallback; }
    },
    remove(key) { localStorage.removeItem(`glassos_${key}`); }
};

// ===== GERENCIADOR DE TEMAS =====
const ThemeManager = {
    themes: ['dark', 'light', 'glass', 'retro', 'cyberpunk'],
    wallpapers: {
        'Gradiente Azul': 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
        'Gradiente Roxo': 'linear-gradient(135deg, #1a0533, #4a1a6b, #7b2d8e)',
        'Gradiente Oceano': 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
        'Gradiente Aurora': 'linear-gradient(135deg, #0d1b2a, #1b263b, #415a77, #778da9)',
        'Gradiente Pôr do Sol': 'linear-gradient(135deg, #1a0a2e, #4a1942, #c2185b, #ff6f00)',
        'Gradiente Floresta': 'linear-gradient(135deg, #0a1a0a, #1a3a1a, #2d5a2d, #4a7a4a)',
        'Gradiente Neon': 'linear-gradient(135deg, #0a0a2e, #1a0a3e, #0a2a4e, #2a0a3e)',
        'Sólido Escuro': 'linear-gradient(135deg, #1a1a2e, #16213e)',
    },
    apply(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        Storage.set('theme', theme);
    },
    applyWallpaper(wallpaper) {
        const desktop = document.getElementById('desktop');
        if (wallpaper.startsWith('http') || wallpaper.startsWith('data:') || wallpaper.startsWith('/')) {
            desktop.style.backgroundImage = `url('${wallpaper}')`;
        } else { desktop.style.backgroundImage = wallpaper; }
        Storage.set('wallpaper', wallpaper);
    },
    getSettings() {
        return {
            theme: Storage.get('theme', 'dark'),
            wallpaper: Storage.get('wallpaper', 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)'),
            transparency: Storage.get('transparency', 0.85),
            blur: Storage.get('blur', 20),
        };
    }
};

// ===== GERENCIADOR DE JANELAS =====
const WindowManager = {
    windows: new Map(),
    zIndex: 100,
    activeWindowId: null,
    dragState: null,
    resizeState: null,

    create(appId, title, icon, contentHTML, options = {}) {
        const id = `win_${appId}_${Date.now()}`;
        const defaultWidth = options.width || 700;
        const defaultHeight = options.height || 480;
        const startX = 60 + (this.windows.size * 30) % 200;
        const startY = 40 + (this.windows.size * 30) % 150;

        const winEl = document.createElement('div');
        winEl.className = 'window';
        winEl.id = id;
        winEl.style.width = `${defaultWidth}px`;
        winEl.style.height = `${defaultHeight}px`;
        winEl.style.left = `${startX}px`;
        winEl.style.top = `${startY}px`;
        winEl.style.zIndex = ++this.zIndex;

        winEl.innerHTML = `
            <div class="window-titlebar">
                <span class="title-icon">${icon}</span>
                <span class="title-text">${title}</span>
                <div class="window-controls">
                    <button class="btn-minimize" title="Minimizar">─</button>
                    <button class="btn-maximize" title="Maximizar">☐</button>
                    <button class="btn-close" title="Fechar">✕</button>
                </div>
            </div>
            <div class="window-body">${contentHTML}</div>
            <div class="resize-handle top"></div>
            <div class="resize-handle bottom"></div>
            <div class="resize-handle left"></div>
            <div class="resize-handle right"></div>
            <div class="resize-handle top-left"></div>
            <div class="resize-handle top-right"></div>
            <div class="resize-handle bottom-left"></div>
            <div class="resize-handle bottom-right"></div>
        `;

        document.getElementById('window-container').appendChild(winEl);

        const winData = {
            id, appId, title, icon, element: winEl,
            minimized: false, maximized: false,
            prevBounds: null,
            onClose: options.onClose || null,
            onSave: options.onSave || null,
        };

        this.windows.set(id, winData);
        this.focus(id);
        this.updateTaskbar();
        this.setupWindowEvents(winEl, winData);

        if (options.onCreated) options.onCreated(winEl, winData);
        return winData;
    },

    setupWindowEvents(winEl, winData) {
        const titlebar = winEl.querySelector('.window-titlebar');
        const btnMin = winEl.querySelector('.btn-minimize');
        const btnMax = winEl.querySelector('.btn-maximize');
        const btnClose = winEl.querySelector('.btn-close');

        winEl.addEventListener('mousedown', () => this.focus(winData.id));
        btnMin.addEventListener('click', (e) => { e.stopPropagation(); this.minimize(winData.id); });
        btnMax.addEventListener('click', (e) => { e.stopPropagation(); this.toggleMaximize(winData.id); });
        btnClose.addEventListener('click', (e) => { e.stopPropagation(); this.close(winData.id); });

        titlebar.addEventListener('mousedown', (e) => {
            if (e.target.closest('.window-controls')) return;
            if (winData.maximized) return;
            this.focus(winData.id);
            const rect = winEl.getBoundingClientRect();
            this.dragState = { winId: winData.id, startX: e.clientX, startY: e.clientY, origLeft: rect.left, origTop: rect.top };
            e.preventDefault();
        });

        winEl.querySelectorAll('.resize-handle').forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                if (winData.maximized) return;
                this.focus(winData.id);
                const rect = winEl.getBoundingClientRect();
                const direction = handle.className.split(' ').find(c => ['top','bottom','left','right','top-left','top-right','bottom-left','bottom-right'].includes(c));
                this.resizeState = { winId: winData.id, direction, startX: e.clientX, startY: e.clientY, origLeft: rect.left, origTop: rect.top, origWidth: rect.width, origHeight: rect.height };
                e.preventDefault(); e.stopPropagation();
            });
        });

        titlebar.addEventListener('dblclick', (e) => { if (!e.target.closest('.window-controls')) this.toggleMaximize(winData.id); });
    },

    focus(winId) {
        const winData = this.windows.get(winId);
        if (!winData) return;
        this.windows.forEach(w => w.element.classList.remove('focused'));
        winData.element.style.zIndex = ++this.zIndex;
        winData.element.classList.add('focused');
        winData.element.classList.remove('minimized');
        winData.minimized = false;
        this.activeWindowId = winId;
        this.updateTaskbar();
    },

    minimize(winId) {
        const winData = this.windows.get(winId);
        if (!winData) return;
        winData.element.classList.add('minimized');
        winData.minimized = true;
        if (this.activeWindowId === winId) this.activeWindowId = null;
        this.updateTaskbar();
    },

    toggleMaximize(winId) {
        const winData = this.windows.get(winId);
        if (!winData) return;
        if (winData.maximized) {
            winData.element.classList.remove('maximized');
            if (winData.prevBounds) {
                winData.element.style.left = winData.prevBounds.left;
                winData.element.style.top = winData.prevBounds.top;
                winData.element.style.width = winData.prevBounds.width;
                winData.element.style.height = winData.prevBounds.height;
            }
            winData.maximized = false;
        } else {
            winData.prevBounds = { left: winData.element.style.left, top: winData.element.style.top, width: winData.element.style.width, height: winData.element.style.height };
            winData.element.classList.add('maximized');
            winData.element.style.left = '0';
            winData.element.style.top = '0';
            winData.element.style.width = '100%';
            winData.element.style.height = `calc(100vh - ${getComputedStyle(document.documentElement).getPropertyValue('--taskbar-height')})`;
            winData.maximized = true;
        }
    },

    close(winId) {
        const winData = this.windows.get(winId);
        if (!winData) return;
        if (winData.onClose) winData.onClose();
        winData.element.remove();
        this.windows.delete(winId);
        if (this.activeWindowId === winId) this.activeWindowId = null;
        this.updateTaskbar();
    },

    closeByAppId(appId) {
        const toClose = [];
        this.windows.forEach((w, id) => { if (w.appId === appId) toClose.push(id); });
        toClose.forEach(id => this.close(id));
    },

    updateTaskbar() {
        const container = document.getElementById('taskbar-apps');
        container.innerHTML = '';
        this.windows.forEach((winData, id) => {
            const btn = document.createElement('button');
            btn.className = 'taskbar-item' + (this.activeWindowId === id && !winData.minimized ? ' active' : '');
            btn.innerHTML = `<span class="taskbar-icon">${winData.icon}</span><span>${winData.title}</span>`;
            btn.addEventListener('click', () => {
                if (winData.minimized) this.focus(id);
                else if (this.activeWindowId === id) this.minimize(id);
                else this.focus(id);
            });
            container.appendChild(btn);
        });
    },

    handleDragMove(e) {
        if (!this.dragState) return;
        const dx = e.clientX - this.dragState.startX;
        const dy = e.clientY - this.dragState.startY;
        const winData = this.windows.get(this.dragState.winId);
        if (!winData) return;
        winData.element.style.left = `${this.dragState.origLeft + dx}px`;
        winData.element.style.top = `${this.dragState.origTop + dy}px`;
    },

    handleDragEnd() { this.dragState = null; },

    handleResizeMove(e) {
        if (!this.resizeState) return;
        const s = this.resizeState;
        const dx = e.clientX - s.startX;
        const dy = e.clientY - s.startY;
        const winData = this.windows.get(s.winId);
        if (!winData) return;
        let newLeft = s.origLeft, newTop = s.origTop, newWidth = s.origWidth, newHeight = s.origHeight;
        if (s.direction.includes('right')) newWidth = s.origWidth + dx;
        if (s.direction.includes('left')) { newWidth = s.origWidth - dx; newLeft = s.origLeft + dx; }
        if (s.direction.includes('bottom')) newHeight = s.origHeight + dy;
        if (s.direction.includes('top')) { newHeight = s.origHeight - dy; newTop = s.origTop + dy; }
        newWidth = Math.max(320, newWidth); newHeight = Math.max(200, newHeight);
        winData.element.style.left = `${newLeft}px`; winData.element.style.top = `${newTop}px`;
        winData.element.style.width = `${newWidth}px`; winData.element.style.height = `${newHeight}px`;
    },

    handleResizeEnd() { this.resizeState = null; }
};

// ===== SISTEMA DE ARQUIVOS =====
const FileSystem = {
    defaultFS: {
        '/': {
            type: 'folder',
            children: {
                'Documentos': { type: 'folder', children: {
                    'leia-me.txt': { type: 'file', content: 'Bem-vindo ao GlassOS v1.1!\nEste é o seu primeiro arquivo.' },
                    'notas.txt': { type: 'file', content: 'Minhas anotações:\n- Aprender JavaScript\n- Criar projetos' }
                }},
                'Imagens': { type: 'folder', children: {} },
                'Downloads': { type: 'folder', children: {} },
            }
        }
    },
    getFS() { const saved = Storage.get('filesystem', null); return saved || JSON.parse(JSON.stringify(this.defaultFS)); },
    saveFS(fs) { Storage.set('filesystem', fs); },
    getNode(fs, path) {
        if (path === '/') return fs['/'];
        const parts = path.split('/').filter(Boolean);
        let node = fs['/'];
        for (const part of parts) {
            if (node.children && node.children[part]) node = node.children[part];
            else return null;
        }
        return node;
    },
    getParentPath(path) {
        if (path === '/') return '/';
        const parts = path.split('/').filter(Boolean);
        parts.pop();
        return '/' + parts.join('/') || '/';
    },
    createItem(fs, path, name, type, content = '') {
        const node = this.getNode(fs, path);
        if (!node || node.type !== 'folder') return false;
        if (node.children[name]) return false;
        node.children[name] = type === 'folder' ? { type: 'folder', children: {} } : { type: 'file', content };
        this.saveFS(fs);
        return true;
    },
    renameItem(fs, path, oldName, newName) {
        const node = this.getNode(fs, path);
        if (!node || node.type !== 'folder' || !node.children[oldName] || node.children[newName]) return false;
        node.children[newName] = node.children[oldName];
        delete node.children[oldName];
        this.saveFS(fs);
        return true;
    },
    deleteItem(fs, path, name) {
        const node = this.getNode(fs, path);
        if (!node || node.type !== 'folder' || !node.children[name]) return false;
        delete node.children[name];
        this.saveFS(fs);
        return true;
    }
};

// ===== SISTEMA DE NOTIFICAÇÕES =====
const NotificationSystem = {
    notifications: [], focusMode: false,
    show(title, message, type = 'info', duration = 5000) {
        if (this.focusMode && type !== 'urgent') return;
        const id = Date.now();
        this.notifications.unshift({ id, title, message, type, time: new Date() });
        this.render(); this.showToast(title, message, type); this.updateBadge();
        if (duration > 0) setTimeout(() => this.dismiss(id), duration);
        return id;
    },
    dismiss(id) { this.notifications = this.notifications.filter(n => n.id !== id); this.render(); this.updateBadge(); },
    clearAll() { this.notifications = []; this.render(); this.updateBadge(); },
    toggleFocusMode() {
        this.focusMode = !this.focusMode;
        document.body.classList.toggle('focus-mode', this.focusMode);
        document.getElementById('notif-focus-mode')?.classList.toggle('active', this.focusMode);
        this.show('Modo Foco', this.focusMode ? 'Notificações silenciadas' : 'Notificações ativadas', 'info', 3000);
    },
    render() {
        const list = document.getElementById('notification-list');
        if (!list) return;
        if (this.notifications.length === 0) {
            list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">Nenhuma notificação</div>';
            return;
        }
        list.innerHTML = this.notifications.map(n => `
            <div class="notification-item ${n.type}" data-id="${n.id}">
                <div class="notification-title">${n.title}</div>
                <div class="notification-text">${n.message}</div>
                <div class="notification-time">${n.time.toLocaleTimeString('pt-BR')}</div>
            </div>
        `).join('');
        list.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => this.dismiss(parseInt(item.dataset.id)));
        });
    },
    updateBadge() {
        const count = this.notifications.length;
        const badge = document.getElementById('tray-notifications');
        if (badge) badge.textContent = count > 0 ? `🔔 ${count}` : '🔔';
    },
    showToast(title, message, type) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌', urgent: '🚨' };
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><div class="toast-content"><div class="toast-title">${title}</div><div class="toast-message">${message}</div></div>`;
        container.appendChild(toast);
        setTimeout(() => { toast.classList.add('hiding'); setTimeout(() => toast.remove(), 300); }, 4000);
    },
    setupEvents() {
        const notifBtn = document.getElementById('tray-notifications');
        const center = document.getElementById('notification-center');
        const clearBtn = document.getElementById('notif-clear-all');
        const focusBtn = document.getElementById('notif-focus-mode');
        if (notifBtn) notifBtn.addEventListener('click', (e) => { e.stopPropagation(); center.classList.toggle('hidden'); });
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearAll());
        if (focusBtn) focusBtn.addEventListener('click', () => this.toggleFocusMode());
        document.addEventListener('click', (e) => { if (!e.target.closest('#notification-center') && !e.target.closest('#tray-notifications')) center.classList.add('hidden'); });
    }
};

// ===== ÁREA DE TRANSFERÊNCIA =====
const ClipboardManager = {
    items: [], maxItems: 20,
    init() { this.items = Storage.get('clipboard', []); this.render(); this.setupEvents(); },
    add(text) {
        if (!text || typeof text !== 'string') return;
        this.items = this.items.filter(item => item.text !== text);
        this.items.unshift({ text: text.substring(0, 500), time: new Date() });
        if (this.items.length > this.maxItems) this.items = this.items.slice(0, this.maxItems);
        Storage.set('clipboard', this.items);
        this.render();
    },
    clear() { this.items = []; Storage.set('clipboard', []); this.render(); },
    copy(text) {
        navigator.clipboard.writeText(text).then(() => { this.add(text); NotificationSystem.show('Copiado', 'Texto copiado para a área de transferência', 'success', 2000); });
    },
    render() {
        const list = document.getElementById('clipboard-list');
        if (!list) return;
        if (this.items.length === 0) { list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">Área de transferência vazia</div>'; return; }
        list.innerHTML = this.items.map((item, i) => `
            <div class="clipboard-item" data-index="${i}">
                <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">${item.time.toLocaleTimeString('pt-BR')}</div>
                <div style="word-break:break-word;">${item.text.substring(0, 100)}${item.text.length > 100 ? '...' : ''}</div>
            </div>
        `).join('');
        list.querySelectorAll('.clipboard-item').forEach(item => {
            item.addEventListener('click', () => { const index = parseInt(item.dataset.index); this.copy(this.items[index].text); });
        });
    },
    setupEvents() {
        document.addEventListener('copy', (e) => { const text = window.getSelection().toString(); if (text) setTimeout(() => this.add(text), 100); });
        const clipboardBtn = document.getElementById('tray-clipboard');
        const manager = document.getElementById('clipboard-manager');
        if (clipboardBtn) clipboardBtn.addEventListener('click', (e) => { e.stopPropagation(); manager.classList.toggle('hidden'); });
        document.getElementById('clipboard-clear')?.addEventListener('click', () => this.clear());
        document.addEventListener('click', (e) => { if (!e.target.closest('#clipboard-manager') && !e.target.closest('#tray-clipboard')) manager.classList.add('hidden'); });
    }
};

// ===== BUSCA GLOBAL =====
const GlobalSearch = {
    isOpen: false,
    init() { this.setupEvents(); },
    open() {
        this.isOpen = true;
        const search = document.getElementById('global-search');
        const input = document.getElementById('global-search-input');
        if (search) search.classList.remove('hidden');
        if (input) { input.value = ''; input.focus(); }
        document.getElementById('global-search-results').innerHTML = '';
    },
    close() { this.isOpen = false; document.getElementById('global-search').classList.add('hidden'); },
    toggle() { if (this.isOpen) this.close(); else this.open(); },
    search(query) {
        if (!query || query.length < 2) { document.getElementById('global-search-results').innerHTML = ''; return; }
        const results = []; const q = query.toLowerCase();
        AppRegistry.apps.forEach(app => { if (app.name.toLowerCase().includes(q)) results.push({ type: 'app', title: app.name, desc: 'Aplicativo', icon: app.icon, action: () => AppRegistry.open(app.id) }); });
        const fs = FileSystem.getFS(); this.searchFiles(fs['/'], '/', q, results);
        const settings = ['tema', 'wallpaper', 'papel de parede', 'transparência', 'blur', 'desfoque'];
        settings.forEach(s => { if (s.includes(q)) results.push({ type: 'setting', title: 'Configurações - ' + s.charAt(0).toUpperCase() + s.slice(1), desc: 'Configuração do sistema', icon: '⚙️', action: () => AppRegistry.open('settings') }); });
        this.renderResults(results);
    },
    searchFiles(node, path, query, results) {
        if (!node || !node.children) return;
        Object.entries(node.children).forEach(([name, item]) => {
            if (name.toLowerCase().includes(query)) results.push({ type: 'file', title: name, desc: path + ' • ' + (item.type === 'folder' ? 'Pasta' : 'Arquivo'), icon: item.type === 'folder' ? '📁' : '📄', action: () => AppRegistry.open('files') });
            if (item.type === 'folder') this.searchFiles(item, path === '/' ? `/${name}` : `${path}/${name}`, query, results);
        });
    },
    renderResults(results) {
        const container = document.getElementById('global-search-results');
        if (!container) return;
        if (results.length === 0) { container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);">Nenhum resultado encontrado</div>'; return; }
        container.innerHTML = results.map(r => `<div class="search-result-item"><span class="search-result-icon">${r.icon}</span><div class="search-result-info"><div class="search-result-title">${r.title}</div><div class="search-result-desc">${r.desc}</div></div></div>`).join('');
        container.querySelectorAll('.search-result-item').forEach((item, i) => { item.addEventListener('click', () => { results[i].action(); this.close(); }); });
    },
    setupEvents() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey && e.shiftKey && e.key === 'F') || (e.key === 'Meta' && !e.repeat)) { e.preventDefault(); this.toggle(); }
            if (e.key === 'Escape' && this.isOpen) this.close();
        });
        const input = document.getElementById('global-search-input');
        if (input) input.addEventListener('input', (e) => this.search(e.target.value));
        document.getElementById('global-search')?.addEventListener('click', (e) => { if (e.target.id === 'global-search') this.close(); });
    }
};

// ===== TELA DE BLOQUEIO =====
const LockScreen = {
    password: '1234', isLocked: false,
    init() { this.setupEvents(); this.updateClock(); setInterval(() => this.updateClock(), 1000); },
    lock() {
        this.isLocked = true;
        document.getElementById('lock-screen').classList.remove('hidden');
        document.getElementById('lock-password').value = '';
        document.getElementById('lock-error').classList.add('hidden');
        NotificationSystem.show('Sistema Bloqueado', 'Digite a senha para desbloquear', 'info', 0);
    },
    unlock(password) {
        if (password === this.password) {
            this.isLocked = false;
            document.getElementById('lock-screen').classList.add('hidden');
            NotificationSystem.show('Sistema Desbloqueado', 'Bem-vindo de volta!', 'success', 3000);
        } else { document.getElementById('lock-error').classList.remove('hidden'); setTimeout(() => document.getElementById('lock-error').classList.add('hidden'), 3000); }
    },
    updateClock() {
        const clock = document.getElementById('lock-clock'); const date = document.getElementById('lock-date');
        if (!clock || !date) return;
        const now = new Date();
        clock.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        date.textContent = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    },
    setupEvents() {
        document.getElementById('lock-unlock')?.addEventListener('click', () => { const pwd = document.getElementById('lock-password').value; this.unlock(pwd); });
        document.getElementById('lock-password')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.unlock(e.target.value); });
        document.getElementById('lock-shutdown')?.addEventListener('click', () => GlassOS.shutdown('Desligando...'));
        let idleTimer;
        const resetTimer = () => { clearTimeout(idleTimer); if (!this.isLocked) idleTimer = setTimeout(() => this.lock(), 300000); };
        document.addEventListener('mousemove', resetTimer); document.addEventListener('keypress', resetTimer); document.addEventListener('click', resetTimer); resetTimer();
    }
};

// ===== WIDGETS =====
const WidgetSystem = {
    widgets: [],
    init() { this.loadWidgets(); this.setupEvents(); },
    loadWidgets() {
        this.widgets = Storage.get('widgets', [{ id: 'clock', type: 'clock', x: 20, y: 20, width: 200, height: 150 }, { id: 'sysmon', type: 'sysmon', x: 240, y: 20, width: 220, height: 200 }]);
        this.render();
    },
    create(type, x = 100, y = 100) {
        const id = `widget_${Date.now()}`;
        const widget = { id, type, x, y, width: type === 'clock' ? 200 : 220, height: type === 'clock' ? 150 : 200 };
        this.widgets.push(widget); Storage.set('widgets', this.widgets); this.render();
    },
    remove(id) { this.widgets = this.widgets.filter(w => w.id !== id); Storage.set('widgets', this.widgets); this.render(); },
    render() {
        const container = document.getElementById('widgets-container');
        if (!container) return;
        container.innerHTML = this.widgets.map(w => `
            <div class="widget widget-${w.type}" data-id="${w.id}" style="left:${w.x}px;top:${w.y}px;width:${w.width}px;min-height:${w.height}px">
                <div class="widget-header"><span class="widget-title">${this.getWidgetTitle(w.type)}</span><div class="widget-controls"><button onclick="WidgetSystem.remove('${w.id}')">✕</button></div></div>
                <div class="widget-content">${this.getWidgetContent(w.type)}</div>
            </div>
        `).join('');
        this.setupWidgetDrag(); this.startWidgetUpdates();
    },
    getWidgetTitle(type) { const titles = { clock: '🕐 Relógio', sysmon: '📊 Sistema', weather: '🌤️ Clima' }; return titles[type] || type; },
    getWidgetContent(type) {
        if (type === 'clock') { const now = new Date(); return `<div class="time">${now.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}</div><div class="date">${now.toLocaleDateString('pt-BR')}</div>`; }
        else if (type === 'sysmon') return `<div class="label"><span>CPU</span><span id="widget-cpu">0%</span></div><div class="bar"><div class="bar-fill" id="widget-cpu-bar" style="width:0%"></div></div><div class="label"><span>Memória</span><span id="widget-ram">0%</span></div><div class="bar"><div class="bar-fill" id="widget-ram-bar" style="width:0%"></div></div>`;
        return '';
    },
    setupWidgetDrag() {
        document.querySelectorAll('.widget').forEach(widget => {
            const header = widget.querySelector('.widget-header');
            let isDragging = false, startX, startY, initialX, initialY;
            header.addEventListener('mousedown', (e) => {
                if (e.target.closest('button')) return;
                isDragging = true; widget.classList.add('dragging');
                startX = e.clientX; startY = e.clientY; initialX = widget.offsetLeft; initialY = widget.offsetTop;
            });
            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                widget.style.left = `${initialX + e.clientX - startX}px`; widget.style.top = `${initialY + e.clientY - startY}px`;
            });
            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false; widget.classList.remove('dragging');
                    const id = widget.dataset.id; const w = this.widgets.find(x => x.id === id);
                    if (w) { w.x = widget.offsetLeft; w.y = widget.offsetTop; Storage.set('widgets', this.widgets); }
                }
            });
        });
    },
    startWidgetUpdates() {
        setInterval(() => {
            document.querySelectorAll('.widget-clock .time').forEach(el => { const now = new Date(); el.textContent = now.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'}); });
            document.querySelectorAll('.widget-clock .date').forEach(el => { el.textContent = new Date().toLocaleDateString('pt-BR'); });
        }, 1000);
        setInterval(() => {
            document.querySelectorAll('.widget-sysmon').forEach(widget => {
                const cpu = Math.floor(Math.random() * 40) + 10, ram = Math.floor(Math.random() * 30) + 30;
                const cpuBar = widget.querySelector('#widget-cpu-bar'), ramBar = widget.querySelector('#widget-ram-bar');
                const cpuText = widget.querySelector('#widget-cpu'), ramText = widget.querySelector('#widget-ram');
                if (cpuBar) cpuBar.style.width = `${cpu}%`; if (ramBar) ramBar.style.width = `${ram}%`;
                if (cpuText) cpuText.textContent = `${cpu}%`; if (ramText) ramText.textContent = `${ram}%`;
            });
        }, 2000);
    },
    setupEvents() {
        const desktop = document.getElementById('desktop');
        if (desktop) {
            desktop.addEventListener('contextmenu', (e) => {
                if (e.target.closest('.window') || e.target.closest('#taskbar')) return;
                const menu = document.getElementById('context-menu');
                const addWidgetItem = document.createElement('div');
                addWidgetItem.className = 'context-item';
                addWidgetItem.innerHTML = '➕ Adicionar Widget';
                addWidgetItem.addEventListener('click', () => { const type = prompt('Tipo de widget (clock, sysmon, weather):', 'clock'); if (type) this.create(type); });
                const divider = menu.querySelector('.context-divider');
                if (divider) menu.insertBefore(addWidgetItem, divider);
            });
        }
    }
};

// ===== ATUALIZAÇÕES SIMULADAS =====
const UpdateSystem = {
    currentVersion: '1.1', latestVersion: '1.2', updateAvailable: false,
    init() {
        const lastCheck = Storage.get('lastUpdateCheck', 0);
        if (Date.now() - lastCheck > 86400000) { this.checkForUpdates(); Storage.set('lastUpdateCheck', Date.now()); }
    },
    checkForUpdates() {
        setTimeout(() => {
            if (Math.random() > 0.5) { this.updateAvailable = true; this.showUpdateModal(); }
        }, 2000);
    },
    showUpdateModal() {
        const modal = document.getElementById('update-modal'); const content = document.getElementById('update-content');
        if (!modal || !content) return;
        content.innerHTML = `<strong>GlassOS ${this.latestVersion}</strong><br><br>Novidades:<br>• Melhoria de performance<br>• Novos recursos<br>• Correção de bugs<br><br>Tamanho: 2.4 MB`;
        modal.classList.remove('hidden');
        document.getElementById('update-later').onclick = () => modal.classList.add('hidden');
        document.getElementById('update-install').onclick = () => this.installUpdate();
    },
    installUpdate() {
        const content = document.getElementById('update-content');
        content.innerHTML = 'Baixando atualização...<br><div class="bar" style="height:6px;background:var(--bg-tertiary);border-radius:3px;margin:12px 0;"><div class="bar-fill" id="update-progress" style="width:0%"></div></div>';
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10; const bar = document.getElementById('update-progress');
            if (bar) bar.style.width = `${progress}%`;
            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    this.currentVersion = this.latestVersion; Storage.set('version', this.currentVersion);
                    document.getElementById('update-modal').classList.add('hidden');
                    NotificationSystem.show('Atualização Instalada', 'GlassOS atualizado com sucesso!', 'success', 5000);
                    location.reload();
                }, 500);
            }
        }, 200);
    }
};

// ===== OTIMIZAÇÃO DE PERFORMANCE =====
const PerformanceOptimizer = {
    mode: 'normal', cache: new Map(),
    init() { this.mode = Storage.get('perfMode', 'normal'); if (this.mode === 'light') this.enableLightMode(); },
    enableLightMode() { document.body.classList.add('light-mode'); document.querySelectorAll('.window').forEach(w => w.style.animation = 'none'); },
    disableLightMode() { document.body.classList.remove('light-mode'); },
    toggleLightMode() { if (this.mode === 'light') { this.mode = 'normal'; this.disableLightMode(); } else { this.mode = 'light'; this.enableLightMode(); } Storage.set('perfMode', this.mode); },
    get(key) { return this.cache.get(key); },
    set(key, value, ttl = 300000) { this.cache.set(key, { value, expiry: Date.now() + ttl }); },
    getCached(key) { const item = this.cache.get(key); if (!item) return null; if (Date.now() > item.expiry) { this.cache.delete(key); return null; } return item.value; },
    compress(data) { try { return btoa(JSON.stringify(data)); } catch { return null; } },
    decompress(compressed) { try { return JSON.parse(atob(compressed)); } catch { return null; } }
};

// ===== SNAP LAYOUTS =====
const SnapLayouts = {
    activeWindow: null, overlay: null,
    init() { this.createOverlay(); this.setupEvents(); },
    createOverlay() {
        this.overlay = document.getElementById('snap-overlay');
        this.overlay.querySelectorAll('.snap-zone').forEach(zone => {
            zone.addEventListener('click', () => {
                if (this.activeWindow) { this.applySnap(this.activeWindow, zone.dataset.layout); }
                this.hide();
            });
        });
    },
    show(winElement) { this.activeWindow = winElement; this.overlay.classList.add('active'); },
    hide() { this.overlay.classList.remove('active'); this.activeWindow = null; },
    applySnap(winElement, layout) {
        const taskbarHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--taskbar-height'));
        const winData = Array.from(WindowManager.windows.values()).find(w => w.element === winElement);
        if (!winData) return;
        WindowManager.toggleMaximize(winData.id);
        const width = window.innerWidth / 2 - 4, height = window.innerHeight - taskbarHeight - 8;
        if (layout === 'half-left') { winElement.style.left = '4px'; winElement.style.top = '4px'; winElement.style.width = `${width}px`; winElement.style.height = `${height}px`; }
        else if (layout === 'half-right') { winElement.style.left = `${window.innerWidth / 2 + 4}px`; winElement.style.top = '4px'; winElement.style.width = `${width}px`; winElement.style.height = `${height}px`; }
    },
    setupEvents() {
        let dragTimeout;
        document.addEventListener('mousemove', (e) => {
            if (WindowManager.dragState) {
                clearTimeout(dragTimeout);
                dragTimeout = setTimeout(() => {
                    const winData = WindowManager.windows.get(WindowManager.dragState.winId);
                    if (!winData) return;
                    if (e.clientY < 20) this.show(winData.element); else this.hide();
                }, 500);
            }
        });
        document.addEventListener('mouseup', () => { clearTimeout(dragTimeout); this.hide(); });
    }
};

// ===== PICTURE-IN-PICTURE MODE =====
const PiPMode = {
    toggle(winId) {
        const winData = WindowManager.windows.get(winId);
        if (!winData) return;
        winData.element.classList.toggle('pinp');
        if (winData.element.classList.contains('pinp')) {
            winData.element.style.width = '320px'; winData.element.style.height = '240px';
            winData.element.style.zIndex = '9999';
            NotificationSystem.show('Modo PiP', 'Janela em modo Picture-in-Picture', 'info', 2000);
        }
    }
};

// ===== APLICATIVOS =====
const Apps = {};

// Apps originais (preservados)
Apps.Notepad = function() {
    const html = `<div class="notepad-container"><div class="notepad-toolbar"><button data-action="new" title="Novo">📄 Novo</button><button data-action="open" title="Abrir">📂 Abrir</button><button data-action="save" title="Salvar">💾 Salvar</button><button data-action="save-as" title="Salvar como">📋 Salvar como</button></div><textarea class="notepad-textarea" placeholder="Digite seu texto aqui..." spellcheck="false"></textarea><div class="notepad-status"><span class="char-count">Caracteres: 0</span><span class="line-count">Linhas: 1</span></div></div>`;
    const winData = WindowManager.create('notepad', 'Bloco de Notas', '📝', html, { width: 650, height: 450 });
    const textarea = winData.element.querySelector('.notepad-textarea');
    const charCount = winData.element.querySelector('.char-count');
    const lineCount = winData.element.querySelector('.line-count');
    let currentFileName = 'sem-nome.txt';
    function updateCounts() { const text = textarea.value; charCount.textContent = `Caracteres: ${text.length}`; lineCount.textContent = `Linhas: ${text.split('\n').length}`; }
    textarea.addEventListener('input', updateCounts);
    function saveFile() { const blob = new Blob([textarea.value], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = currentFileName; a.click(); URL.revokeObjectURL(url); }
    function openFile() { const input = document.createElement('input'); input.type = 'file'; input.accept = '.txt,.text,.md,.log,.json,.csv,.html,.css,.js'; input.addEventListener('change', (e) => { const file = e.target.files[0]; if (!file) return; currentFileName = file.name; winData.element.querySelector('.title-text').textContent = `Bloco de Notas - ${file.name}`; const reader = new FileReader(); reader.onload = (ev) => { textarea.value = ev.target.result; updateCounts(); }; reader.readAsText(file); }); input.click(); }
    function saveAs() { const name = prompt('Nome do arquivo:', currentFileName); if (name) { currentFileName = name.endsWith('.txt') ? name : name + '.txt'; saveFile(); } }
    winData.element.querySelector('.notepad-toolbar').addEventListener('click', (e) => { const btn = e.target.closest('[data-action]'); if (!btn) return; switch (btn.dataset.action) { case 'new': textarea.value = ''; currentFileName = 'sem-nome.txt'; winData.element.querySelector('.title-text').textContent = 'Bloco de Notas - sem-nome.txt'; updateCounts(); break; case 'open': openFile(); break; case 'save': saveFile(); break; case 'save-as': saveAs(); break; } });
    textarea.addEventListener('keydown', (e) => { if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveFile(); } });
    updateCounts(); textarea.focus();
};

Apps.Calculator = function() {
    const html = `<div class="calculator-container"><div class="calc-display"><div class="calc-expression"></div><div class="calc-result">0</div></div><div class="calc-buttons"><button class="calc-btn operator" data-val="clear">C</button><button class="calc-btn operator" data-val="backspace">⌫</button><button class="calc-btn operator" data-val="%">%</button><button class="calc-btn operator" data-val="/">÷</button><button class="calc-btn" data-val="7">7</button><button class="calc-btn" data-val="8">8</button><button class="calc-btn" data-val="9">9</button><button class="calc-btn operator" data-val="*">×</button><button class="calc-btn" data-val="4">4</button><button class="calc-btn" data-val="5">5</button><button class="calc-btn" data-val="6">6</button><button class="calc-btn operator" data-val="-">−</button><button class="calc-btn" data-val="1">1</button><button class="calc-btn" data-val="2">2</button><button class="calc-btn" data-val="3">3</button><button class="calc-btn operator" data-val="+">+</button><button class="calc-btn operator" data-val="sqrt">√</button><button class="calc-btn" data-val="0">0</button><button class="calc-btn" data-val=".">.</button><button class="calc-btn equals" data-val="=">=</button><button class="calc-btn operator wide" data-val="^">x^y</button><button class="calc-btn operator" data-val="(">(</button><button class="calc-btn operator" data-val=")">)</button></div><div class="calc-history"></div></div>`;
    const winData = WindowManager.create('calculator', 'Calculadora', '🧮', html, { width: 340, height: 520 });
    let expression = '', lastResult = '0', history = [];
    const displayExpr = winData.element.querySelector('.calc-expression'), displayResult = winData.element.querySelector('.calc-result'), historyEl = winData.element.querySelector('.calc-history');
    function updateDisplay() { displayExpr.textContent = expression || ''; displayResult.textContent = lastResult; }
    function addToHistory(expr, result) { history.unshift(`${expr} = ${result}`); if (history.length > 20) history.pop(); historyEl.innerHTML = history.map(h => `<div>${h}</div>`).join(''); }
    function safeEval(expr) { let sanitized = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\^/g, '**'); if (/[^0-9+\-*/().%\s**]/.test(sanitized)) throw new Error('Expressão inválida'); if (/\/\s*0(?!\d)/.test(sanitized)) throw new Error('Divisão por zero'); const result = Function('"use strict"; return (' + sanitized + ')')(); if (!isFinite(result)) throw new Error('Resultado inválido'); if (isNaN(result)) throw new Error('Expressão inválida'); return result; }
    winData.element.querySelector('.calc-buttons').addEventListener('click', (e) => { const btn = e.target.closest('[data-val]'); if (!btn) return; const val = btn.dataset.val; if (val === 'clear') { expression = ''; lastResult = '0'; } else if (val === 'backspace') { expression = expression.slice(0, -1); lastResult = '0'; } else if (val === 'sqrt') { try { const current = expression || lastResult; const num = safeEval(current); if (num < 0) throw new Error('Raiz de número negativo'); const result = Math.sqrt(num); const rounded = Math.round(result * 1e10) / 1e10; expression = String(rounded); lastResult = String(rounded); addToHistory(`√(${current})`, rounded); } catch { lastResult = 'Erro'; } } else if (val === '=') { if (!expression) return; try { const result = safeEval(expression); const rounded = Math.round(result * 1e10) / 1e10; addToHistory(expression, rounded); expression = String(rounded); lastResult = String(rounded); } catch { lastResult = 'Erro'; expression = ''; } } else { expression += val; lastResult = '0'; } updateDisplay(); });
    updateDisplay();
};

Apps.FileManager = function() {
    const html = `<div class="file-manager"><div class="fm-toolbar"><button data-action="new-folder">📁 Nova Pasta</button><button data-action="new-file">📄 Novo Arquivo</button><button data-action="rename">✏️ Renomear</button><button data-action="delete">🗑️ Excluir</button><div class="fm-breadcrumbs" data-path="/"></div></div><div class="fm-content"><div class="fm-grid"></div></div></div>`;
    const winData = WindowManager.create('files', 'Arquivos', '📁', html, { width: 700, height: 450 });
    let currentPath = '/', selectedName = null, fs = FileSystem.getFS();
    const grid = winData.element.querySelector('.fm-grid'), breadcrumbs = winData.element.querySelector('.fm-breadcrumbs');
    function render() {
        fs = FileSystem.getFS(); const node = FileSystem.getNode(fs, currentPath); grid.innerHTML = '';
        if (!node || node.type !== 'folder') { grid.innerHTML = '<div class="fm-empty">Pasta não encontrada</div>'; return; }
        const children = node.children || {}, entries = Object.entries(children);
        if (entries.length === 0) { grid.innerHTML = '<div class="fm-empty">Esta pasta está vazia</div>'; }
        else {
            entries.sort((a, b) => { if (a[1].type === 'folder' && b[1].type !== 'folder') return -1; if (a[1].type !== 'folder' && b[1].type === 'folder') return 1; return a[0].localeCompare(b[0]); });
            entries.forEach(([name, item]) => {
                const el = document.createElement('div');
                el.className = 'fm-item' + (selectedName === name ? ' selected' : '');
                el.dataset.name = name;
                el.innerHTML = `<span class="fm-icon">${item.type === 'folder' ? '📁' : '📄'}</span><span class="fm-name">${name}</span>`;
                el.addEventListener('click', (e) => { e.stopPropagation(); selectedName = name; render(); });
                el.addEventListener('dblclick', () => {
                    if (item.type === 'folder') { currentPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`; selectedName = null; render(); renderBreadcrumbs(); }
                    else { const content = item.content || ''; const blob = new Blob([content], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); }
                });
                grid.appendChild(el);
            });
        }
        renderBreadcrumbs();
    }
    function renderBreadcrumbs() {
        breadcrumbs.innerHTML = ''; breadcrumbs.dataset.path = currentPath;
        if (currentPath === '/') { const el = document.createElement('span'); el.className = 'fm-breadcrumb'; el.textContent = '📁 Raiz'; el.addEventListener('click', () => { currentPath = '/'; selectedName = null; render(); }); breadcrumbs.appendChild(el); }
        else {
            const parts = currentPath.split('/').filter(Boolean); let buildPath = '';
            const rootEl = document.createElement('span'); rootEl.className = 'fm-breadcrumb'; rootEl.textContent = '📁 Raiz'; rootEl.addEventListener('click', () => { currentPath = '/'; selectedName = null; render(); }); breadcrumbs.appendChild(rootEl);
            parts.forEach((part, i) => { const sep = document.createElement('span'); sep.className = 'fm-breadcrumb-sep'; sep.textContent = '›'; breadcrumbs.appendChild(sep); buildPath += `/${part}`; const el = document.createElement('span'); el.className = 'fm-breadcrumb'; el.textContent = part; const cp = buildPath; el.addEventListener('click', () => { currentPath = cp; selectedName = null; render(); }); if (i === parts.length - 1) el.style.fontWeight = '600'; breadcrumbs.appendChild(el); });
        }
    }
    winData.element.querySelector('.fm-toolbar').addEventListener('click', (e) => { const btn = e.target.closest('[data-action]'); if (!btn) return; switch (btn.dataset.action) { case 'new-folder': { const name = prompt('Nome da nova pasta:'); if (name && name.trim()) { if (FileSystem.createItem(fs, currentPath, name.trim(), 'folder')) { selectedName = null; render(); } else alert('Não foi possível criar a pasta.'); } break; } case 'new-file': { const name = prompt('Nome do arquivo (ex: arquivo.txt):'); if (name && name.trim()) { if (FileSystem.createItem(fs, currentPath, name.trim(), 'file', '')) { selectedName = null; render(); } else alert('Não foi possível criar o arquivo.'); } break; } case 'rename': { if (!selectedName) { alert('Selecione um item.'); return; } const newName = prompt('Novo nome:', selectedName); if (newName && newName.trim()) { if (FileSystem.renameItem(fs, currentPath, selectedName, newName.trim())) { selectedName = newName.trim(); render(); } else alert('Não foi possível renomear.'); } break; } case 'delete': { if (!selectedName) { alert('Selecione um item.'); return; } if (confirm(`Excluir "${selectedName}"?`)) { FileSystem.deleteItem(fs, currentPath, selectedName); selectedName = null; render(); } break; } } });
    winData.element.querySelector('.fm-content').addEventListener('click', (e) => { if (!e.target.closest('.fm-item')) { selectedName = null; render(); } });
    render();
};

Apps.Browser = function() {
    const favorites = Storage.get('browser-favorites', [{ name: 'Wikipedia', url: 'https://www.wikipedia.org' }]);
    const html = `<div class="browser-container"><div class="browser-favorites"></div><div class="browser-toolbar"><button data-action="back" title="Voltar">◀</button><button data-action="forward" title="Avançar">▶</button><button data-action="reload" title="Recarregar">⟳</button><input type="text" class="browser-url" placeholder="Digite uma URL..." value=""><button class="browser-fav-btn" data-action="fav" title="Favorito">☆</button></div><iframe class="browser-frame" sandbox="allow-same-origin allow-scripts allow-forms allow-popups" src="about:blank"></iframe></div>`;
    const winData = WindowManager.create('browser', 'Navegador', '🌐', html, { width: 850, height: 550 });
    const iframe = winData.element.querySelector('.browser-frame'), urlInput = winData.element.querySelector('.browser-url'), favBtn = winData.element.querySelector('.browser-fav-btn'), favContainer = winData.element.querySelector('.browser-favorites');
    let history = [], historyIndex = -1, currentUrl = '';
    function navigate(url) { if (!url) return; if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url; currentUrl = url; urlInput.value = url; iframe.src = url; if (historyIndex < history.length - 1) history = history.slice(0, historyIndex + 1); history.push(url); historyIndex = history.length - 1; updateFavBtn(); }
    function updateFavBtn() { const isFav = favorites.some(f => f.url === currentUrl); favBtn.textContent = isFav ? '★' : '☆'; favBtn.classList.toggle('is-fav', isFav); }
    function renderFavorites() { favContainer.innerHTML = ''; favorites.forEach(fav => { const el = document.createElement('span'); el.className = 'browser-fav-item'; el.textContent = fav.name; el.addEventListener('click', () => navigate(fav.url)); favContainer.appendChild(el); }); }
    function toggleFavorite() { if (!currentUrl) return; const idx = favorites.findIndex(f => f.url === currentUrl); if (idx >= 0) favorites.splice(idx, 1); else { const name = prompt('Nome do favorito:', currentUrl.replace(/https?:\/\//, '').split('/')[0]); if (name) favorites.push({ name, url: currentUrl }); } Storage.set('browser-favorites', favorites); renderFavorites(); updateFavBtn(); }
    winData.element.querySelector('.browser-toolbar').addEventListener('click', (e) => { const btn = e.target.closest('[data-action]'); if (!btn) return; switch (btn.dataset.action) { case 'back': if (historyIndex > 0) { historyIndex--; currentUrl = history[historyIndex]; urlInput.value = currentUrl; iframe.src = currentUrl; updateFavBtn(); } break; case 'forward': if (historyIndex < history.length - 1) { historyIndex++; currentUrl = history[historyIndex]; urlInput.value = currentUrl; iframe.src = currentUrl; updateFavBtn(); } break; case 'reload': iframe.src = iframe.src; break; case 'fav': toggleFavorite(); break; } });
    urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') navigate(urlInput.value.trim()); });
    renderFavorites(); navigate('https://www.wikipedia.org');
};

Apps.Settings = function() {
    const settings = ThemeManager.getSettings();
    let wallpaperOptionsHTML = '';
    Object.entries(ThemeManager.wallpapers).forEach(([name, gradient]) => { wallpaperOptionsHTML += `<div class="wallpaper-option ${settings.wallpaper === gradient ? 'selected' : ''}" data-wallpaper="${gradient}" style="background: ${gradient};" title="${name}"></div>`; });
    const html = `<div class="settings-container"><div class="settings-section"><h3>🎨 Tema</h3><div class="settings-option"><label>Tema do sistema</label><select data-setting="theme"><option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Escuro</option><option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Claro</option><option value="glass" ${settings.theme === 'glass' ? 'selected' : ''}>Glass</option><option value="retro" ${settings.theme === 'retro' ? 'selected' : ''}>Retro</option><option value="cyberpunk" ${settings.theme === 'cyberpunk' ? 'selected' : ''}>Cyberpunk</option></select></div></div><div class="settings-section"><h3>🖼️ Papel de Parede</h3><div class="wallpaper-grid">${wallpaperOptionsHTML}</div><div class="wallpaper-custom-input"><input type="text" placeholder="URL de imagem personalizada..." id="custom-wallpaper-url"><button id="apply-custom-wallpaper">Aplicar</button></div></div><div class="settings-section"><h3>✨ Aparência</h3><div class="settings-option"><label>Transparência</label><input type="range" min="50" max="100" value="${Math.round(settings.transparency * 100)}" data-setting="transparency"></div><div class="settings-option"><label>Desfoque (Blur)</label><input type="range" min="0" max="40" value="${settings.blur}" data-setting="blur"></div><div class="settings-option"><label>Modo Leve</label><button id="toggle-light-mode" style="padding:6px 14px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);border-radius:6px;cursor:pointer;font-size:12px;">${PerformanceOptimizer.mode === 'light' ? 'Desativar' : 'Ativar'}</button></div></div><div class="settings-section"><h3>ℹ️ Sobre o GlassOS</h3><div class="settings-option"><label>Versão</label><span style="font-size:13px; color:var(--text-secondary);">GlassOS v1.1</span></div></div><div class="settings-section"><h3>🗃️ Dados</h3><div class="settings-option"><label>Limpar dados</label><button id="btn-clear-data" style="padding:6px 14px; border:1px solid var(--danger-color); background:transparent; color:var(--danger-color); border-radius:6px; cursor:pointer; font-size:12px;">Limpar</button></div></div></div>`;
    const winData = WindowManager.create('settings', 'Configurações', '⚙️', html, { width: 550, height: 580 });
    winData.element.querySelector('[data-setting="theme"]').addEventListener('change', (e) => { ThemeManager.apply(e.target.value); });
    winData.element.querySelectorAll('.wallpaper-option').forEach(opt => { opt.addEventListener('click', () => { winData.element.querySelectorAll('.wallpaper-option').forEach(o => o.classList.remove('selected')); opt.classList.add('selected'); ThemeManager.applyWallpaper(opt.dataset.wallpaper); }); });
    winData.element.querySelector('#apply-custom-wallpaper').addEventListener('click', () => { const url = winData.element.querySelector('#custom-wallpaper-url').value.trim(); if (url) { winData.element.querySelectorAll('.wallpaper-option').forEach(o => o.classList.remove('selected')); ThemeManager.applyWallpaper(url); } });
    winData.element.querySelector('[data-setting="transparency"]').addEventListener('input', (e) => { Storage.set('transparency', e.target.value / 100); });
    winData.element.querySelector('[data-setting="blur"]').addEventListener('input', (e) => { document.documentElement.style.setProperty('--glass-blur', `${e.target.value}px`); Storage.set('blur', parseInt(e.target.value)); });
    winData.element.querySelector('#toggle-light-mode').addEventListener('click', () => { PerformanceOptimizer.toggleLightMode(); winData.element.querySelector('#toggle-light-mode').textContent = PerformanceOptimizer.mode === 'light' ? 'Desativar' : 'Ativar'; });
    winData.element.querySelector('#btn-clear-data').addEventListener('click', () => { if (confirm('Limpar todos os dados?')) { Object.keys(localStorage).forEach(key => { if (key.startsWith('glassos_')) localStorage.removeItem(key); }); alert('Dados limpos. Recarregando...'); location.reload(); } });
};

Apps.Terminal = function() {
    const html = `<div class="terminal-container"><div class="terminal-output"></div><div class="terminal-input-line"><span class="terminal-prompt">user@glassos:~$</span><input type="text" class="terminal-input" autofocus spellcheck="false"></div></div>`;
    const winData = WindowManager.create('terminal', 'Terminal', '💻', html, { width: 650, height: 400 });
    const output = winData.element.querySelector('.terminal-output'), input = winData.element.querySelector('.terminal-input'), commandHistory = []; let historyIndex = -1;
    function print(text, className = 'cmd-line') { const line = document.createElement('div'); line.className = className; line.textContent = text; output.appendChild(line); output.scrollTop = output.scrollHeight; }
    print('GlassOS Terminal v1.1', 'cmd-info'); print('Digite "help" para ver os comandos.', 'cmd-warn'); print('');
    function processCommand(cmd) {
        const trimmed = cmd.trim(); if (!trimmed) return;
        print(`user@glassos:~$ ${trimmed}`); commandHistory.unshift(trimmed); if (commandHistory.length > 50) commandHistory.pop(); historyIndex = -1;
        const parts = trimmed.split(/\s+/), command = parts[0].toLowerCase(), args = parts.slice(1);
        switch (command) {
            case 'help': print('Comandos: help, clear, date, echo, ls, theme, sysinfo, reboot, calc, whoami, history, neofetch, lock, perf', 'cmd-info'); break;
            case 'clear': output.innerHTML = ''; break;
            case 'date': print(new Date().toLocaleString('pt-BR')); break;
            case 'echo': print(args.join(' ')); break;
            case 'ls': { const fs = FileSystem.getFS(); const path = args[0] || '/'; const node = FileSystem.getNode(fs, path); if (!node || node.type !== 'folder') { print(`ls: ${path}: Não existe`, 'cmd-error'); } else { const entries = Object.entries(node.children || {}); if (entries.length === 0) print('(vazio)'); else entries.forEach(([name, item]) => { const prefix = item.type === 'folder' ? '📁' : '📄'; print(`  ${prefix} ${name}`); }); } break; }
            case 'theme': { const theme = args[0]?.toLowerCase(); if (['dark', 'light', 'glass', 'retro', 'cyberpunk'].includes(theme)) { ThemeManager.apply(theme); print(`Tema: ${theme}`, 'cmd-info'); } else print('Uso: theme [dark|light|glass|retro|cyberpunk]', 'cmd-error'); break; }
            case 'sysinfo': print('GlassOS v1.1', 'cmd-info'); print(`Navegador: ${navigator.userAgent.split(' ').slice(-1)[0]}`); print(`Tema: ${document.documentElement.getAttribute('data-theme')}`); print(`Janelas: ${WindowManager.windows.size}`); break;
            case 'reboot': print('Reiniciando...', 'cmd-warn'); setTimeout(() => location.reload(), 1500); break;
            case 'calc': { const expr = args.join(' '); if (!expr) { print('Uso: calc <expressao>', 'cmd-error'); break; } try { let sanitized = expr.replace(/\^/g, '**'); if (/[^0-9+\-*/().%\s**]/.test(sanitized)) throw new Error('Inválido'); const result = Function('"use strict"; return (' + sanitized + ')')(); print(`= ${result}`); } catch { print('Erro na expressao', 'cmd-error'); } break; }
            case 'whoami': print('user'); break;
            case 'history': commandHistory.forEach((cmd, i) => { print(`  ${commandHistory.length - i}  ${cmd}`); }); break;
            case 'neofetch': print(`\n    ╔══════════════╗   user@glassos\n    ║   GlassOS  ║   OS: GlassOS v1.1\n    ║     v1.1    ║   Theme: ${document.documentElement.getAttribute('data-theme')}\n    ╚══════════════╝   Windows: ${WindowManager.windows.size}\n                `, 'cmd-info'); break;
            case 'lock': LockScreen.lock(); break;
            case 'perf': PerformanceOptimizer.toggleLightMode(); print(`Modo performance: ${PerformanceOptimizer.mode}`, 'cmd-info'); break;
            default: print(`Comando nao encontrado: ${command}. Digite "help".`, 'cmd-error');
        }
    }
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { processCommand(input.value); input.value = ''; } else if (e.key === 'ArrowUp') { e.preventDefault(); if (historyIndex < commandHistory.length - 1) { historyIndex++; input.value = commandHistory[historyIndex]; } } else if (e.key === 'ArrowDown') { e.preventDefault(); if (historyIndex > 0) { historyIndex--; input.value = commandHistory[historyIndex]; } else { historyIndex = -1; input.value = ''; } } });
    winData.element.querySelector('.terminal-container').addEventListener('click', () => input.focus()); input.focus();
};

// NOVOS APLICATIVOS
Apps.Clock = function() {
    const html = `<div class="clock-app-container"><div class="clock-tabs"><button class="clock-tab active" data-tab="clock">🕐 Relógio</button><button class="clock-tab" data-tab="alarm">⏰ Alarme</button><button class="clock-tab" data-tab="stopwatch">⏱️ Cronômetro</button></div><div class="clock-content" id="clock-content"><div class="clock-display" id="clock-display">00:00:00</div></div></div>`;
    const winData = WindowManager.create('clock', 'Relógio', '🕐', html, { width: 400, height: 350 });
    const content = winData.element.querySelector('#clock-content'), display = winData.element.querySelector('#clock-display');
    let alarms = Storage.get('alarms', []), stopwatchInterval = null, stopwatchSeconds = 0;
    winData.element.querySelectorAll('.clock-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            winData.element.querySelectorAll('.clock-tab').forEach(t => t.classList.remove('active')); tab.classList.add('active');
            const type = tab.dataset.tab;
            if (type === 'clock') { content.innerHTML = `<div class="clock-display" id="clock-display">00:00:00</div>`; startClock(); }
            else if (type === 'alarm') renderAlarms();
            else if (type === 'stopwatch') renderStopwatch();
        });
    });
    function startClock() { const disp = document.getElementById('clock-display'); if (!disp) return; setInterval(() => { disp.textContent = new Date().toLocaleTimeString('pt-BR'); }, 1000); }
    function renderAlarms() {
        content.innerHTML = `<div class="alarm-list">${alarms.map((alarm, i) => `<div class="alarm-item"><div><div class="alarm-time">${alarm.time}</div><div style="font-size:12px;color:var(--text-secondary)">${alarm.label || 'Alarme'}</div></div><div class="alarm-toggle ${alarm.active ? 'active' : ''}" data-index="${i}"></div></div>`).join('')}<button id="add-alarm" style="width:100%;padding:12px;margin-top:12px;border:1px dashed var(--border-color);background:transparent;color:var(--text-secondary);border-radius:8px;cursor:pointer;">+ Adicionar Alarme</button></div>`;
        content.querySelectorAll('.alarm-toggle').forEach(toggle => { toggle.addEventListener('click', () => { const idx = parseInt(toggle.dataset.index); alarms[idx].active = !alarms[idx].active; Storage.set('alarms', alarms); renderAlarms(); }); });
        document.getElementById('add-alarm').addEventListener('click', () => { const time = prompt('Horário (HH:MM):'); if (time) { alarms.push({ time, active: true, label: 'Alarme' }); Storage.set('alarms', alarms); renderAlarms(); } });
    }
    function renderStopwatch() {
        content.innerHTML = `<div class="stopwatch-controls" style="text-align:center;"><div class="clock-display" id="stopwatch-display" style="font-size:48px;margin-bottom:24px;">00:00</div><div style="display:flex;gap:12px;justify-content:center;"><button id="sw-start" style="padding:12px 24px;border:none;background:var(--accent-color);color:white;border-radius:8px;cursor:pointer;">Iniciar</button><button id="sw-reset" style="padding:12px 24px;border:1px solid var(--border-color);background:transparent;color:var(--text-primary);border-radius:8px;cursor:pointer;">Zerar</button></div></div>`;
        let running = false;
        document.getElementById('sw-start').addEventListener('click', () => {
            running = !running;
            if (running) { document.getElementById('sw-start').textContent = 'Pausar'; stopwatchInterval = setInterval(() => { stopwatchSeconds++; const mins = Math.floor(stopwatchSeconds / 60).toString().padStart(2, '0'); const secs = (stopwatchSeconds % 60).toString().padStart(2, '0'); document.getElementById('stopwatch-display').textContent = `${mins}:${secs}`; }, 1000); }
            else { document.getElementById('sw-start').textContent = 'Continuar'; clearInterval(stopwatchInterval); }
        });
        document.getElementById('sw-reset').addEventListener('click', () => { running = false; stopwatchSeconds = 0; clearInterval(stopwatchInterval); document.getElementById('sw-start').textContent = 'Iniciar'; document.getElementById('stopwatch-display').textContent = '00:00'; });
    }
    startClock();
};

Apps.Calendar = function() {
    const html = `<div class="calendar-container" id="calendar-app"></div>`;
    const winData = WindowManager.create('calendar', 'Calendário', '📅', html, { width: 500, height: 550 });
    const container = winData.element.querySelector('#calendar-app');
    let currentDate = new Date(), events = Storage.get('events', []);
    function render() {
        const year = currentDate.getFullYear(), month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay(), daysInMonth = new Date(year, month + 1, 0).getDate();
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        let html = `<div class="calendar-header"><button id="cal-prev" style="padding:6px 12px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);border-radius:6px;cursor:pointer;">◀</button><h3 style="font-size:16px;">${monthNames[month]} ${year}</h3><button id="cal-next" style="padding:6px 12px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);border-radius:6px;cursor:pointer;">▶</button></div><div class="calendar-grid">${dayNames.map(d => `<div class="calendar-day-header">${d}</div>`).join('')}${Array(firstDay).fill('<div></div>').join('')}${Array.from({length: daysInMonth}, (_, i) => { const day = i + 1; const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`; const hasEvent = events.some(e => e.date === dateStr); const isToday = new Date().toDateString() === new Date(year, month, day).toDateString(); return `<div class="calendar-day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}" data-date="${dateStr}">${day}</div>`; }).join('')}</div><div class="events-list" id="events-list"><h4 style="margin-bottom:12px;font-size:14px;">Eventos</h4><button id="add-event" style="width:100%;padding:10px;border:1px dashed var(--border-color);background:transparent;color:var(--text-secondary);border-radius:6px;cursor:pointer;">+ Adicionar Evento</button></div>`;
        container.innerHTML = html;
        document.getElementById('cal-prev').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); render(); });
        document.getElementById('cal-next').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); render(); });
        document.getElementById('add-event').addEventListener('click', () => { const desc = prompt('Descrição do evento:'); if (desc) { const dateStr = `${year}-${String(month+1).padStart(2,'0')}`; events.push({ date: dateStr, description: desc }); Storage.set('events', events); render(); } });
    }
    render();
};

Apps.SystemMonitor = function() {
    const html = `<div class="sysmon-container"><div class="sysmon-item"><div class="sysmon-label"><span>CPU</span><span id="sys-cpu-val">0%</span></div><div class="sysmon-bar"><div class="sysmon-fill" id="sys-cpu-bar" style="width:0%"></div></div></div><div class="sysmon-item"><div class="sysmon-label"><span>Memória RAM</span><span id="sys-ram-val">0%</span></div><div class="sysmon-bar"><div class="sysmon-fill" id="sys-ram-bar" style="width:0%"></div></div></div><div class="sysmon-item"><div class="sysmon-label"><span>Armazenamento</span><span id="sys-disk-val">0%</span></div><div class="sysmon-bar"><div class="sysmon-fill" id="sys-disk-bar" style="width:0%"></div></div></div><div class="sysmon-stats"><div class="sysmon-stat"><div class="sysmon-stat-value" id="sys-uptime">00:00:00</div><div class="sysmon-stat-label">Tempo Ativo</div></div><div class="sysmon-stat"><div class="sysmon-stat-value" id="sys-processes">0</div><div class="sysmon-stat-label">Processos</div></div></div></div>`;
    const winData = WindowManager.create('sysmon', 'Monitor de Sistema', '📊', html, { width: 450, height: 400 });
    let startTime = Date.now();
    function update() {
        const cpu = Math.floor(Math.random() * 50) + 10, ram = Math.floor(Math.random() * 40) + 30, disk = Math.min(Math.floor((Object.keys(localStorage).length / 100) * 100), 100);
        document.getElementById('sys-cpu-bar').style.width = `${cpu}%`; document.getElementById('sys-cpu-val').textContent = `${cpu}%`;
        document.getElementById('sys-ram-bar').style.width = `${ram}%`; document.getElementById('sys-ram-val').textContent = `${ram}%`;
        document.getElementById('sys-disk-bar').style.width = `${disk}%`; document.getElementById('sys-disk-val').textContent = `${disk}%`;
        const uptime = Math.floor((Date.now() - startTime) / 1000);
        const hours = Math.floor(uptime / 3600).toString().padStart(2, '0'), mins = Math.floor((uptime % 3600) / 60).toString().padStart(2, '0'), secs = (uptime % 60).toString().padStart(2, '0');
        document.getElementById('sys-uptime').textContent = `${hours}:${mins}:${secs}`;
        document.getElementById('sys-processes').textContent = WindowManager.windows.size;
    }
    update(); setInterval(update, 2000);
};

Apps.ImageEditor = function() {
    const html = `<div class="image-editor-container"><div class="image-editor-toolbar"><button id="img-upload" style="padding:6px 12px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);border-radius:4px;cursor:pointer;">📂 Abrir</button><button id="img-save" style="padding:6px 12px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);border-radius:4px;cursor:pointer;">💾 Salvar</button><select id="img-filter" style="padding:6px;border:1px solid var(--border-color);background:var(--input-bg);color:var(--text-primary);border-radius:4px;"><option value="none">Sem Filtro</option><option value="grayscale">Preto e Branco</option><option value="sepia">Sépia</option><option value="blur">Desfoque</option></select></div><div class="image-editor-canvas-container"><canvas id="img-canvas" class="image-editor-canvas" width="800" height="600"></canvas></div></div>`;
    const winData = WindowManager.create('imageeditor', 'Editor de Imagens', '🎨', html, { width: 900, height: 700 });
    const canvas = winData.element.querySelector('#img-canvas'), ctx = canvas.getContext('2d'); let originalImage = null;
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    document.getElementById('img-upload').addEventListener('click', () => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.addEventListener('change', (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = (event) => { const img = new Image(); img.onload = () => { originalImage = img; canvas.width = img.width; canvas.height = img.height; ctx.drawImage(img, 0, 0); }; img.src = event.target.result; }; reader.readAsDataURL(file); } }); input.click(); });
    document.getElementById('img-save').addEventListener('click', () => { const link = document.createElement('a'); link.download = 'imagem-editada.png'; link.href = canvas.toDataURL(); link.click(); });
    document.getElementById('img-filter').addEventListener('change', (e) => { if (!originalImage) return; ctx.drawImage(originalImage, 0, 0); const filter = e.target.value; const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height); const data = imageData.data; if (filter === 'grayscale') { for (let i = 0; i < data.length; i += 4) { const avg = (data[i] + data[i+1] + data[i+2]) / 3; data[i] = data[i+1] = data[i+2] = avg; } } else if (filter === 'sepia') { for (let i = 0; i < data.length; i += 4) { const r = data[i], g = data[i+1], b = data[i+2]; data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189); data[i+1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168); data[i+2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131); } } ctx.putImageData(imageData, 0, 0); });
};

Apps.MusicPlayer = function() {
    const html = `<div class="music-player-container"><div class="music-player-cover">🎵</div><div class="music-player-info"><div class="music-player-title">Nenhuma música</div><div class="music-player-artist">Selecione um arquivo</div></div><div class="music-player-controls"><button class="music-player-btn" id="mp-prev">⏮</button><button class="music-player-btn play" id="mp-play">▶</button><button class="music-player-btn" id="mp-next">⏭</button></div><div class="music-player-progress"><div class="music-player-bar" id="mp-bar"><div class="music-player-bar-fill" id="mp-bar-fill"></div></div><div class="music-player-time"><span id="mp-current">0:00</span><span id="mp-duration">0:00</span></div></div><button id="mp-upload" style="width:100%;padding:10px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);border-radius:6px;cursor:pointer;">📂 Abrir Música</button></div>`;
    const winData = WindowManager.create('musicplayer', 'Player de Música', '🎵', html, { width: 380, height: 550 });
    const audio = new Audio(); let isPlaying = false;
    document.getElementById('mp-upload').addEventListener('click', () => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'audio/*'; input.addEventListener('change', (e) => { const file = e.target.files[0]; if (file) { const url = URL.createObjectURL(file); audio.src = url; document.querySelector('.music-player-title').textContent = file.name.replace(/\.[^/.]+$/, ""); document.querySelector('.music-player-artist').textContent = 'Arquivo local'; } }); input.click(); });
    document.getElementById('mp-play').addEventListener('click', () => { if (!audio.src) return; if (isPlaying) { audio.pause(); document.getElementById('mp-play').textContent = '▶'; } else { audio.play(); document.getElementById('mp-play').textContent = '⏸'; } isPlaying = !isPlaying; });
    audio.addEventListener('timeupdate', () => { const progress = (audio.currentTime / audio.duration) * 100; document.getElementById('mp-bar-fill').style.width = `${progress}%`; const currMins = Math.floor(audio.currentTime / 60); const currSecs = Math.floor(audio.currentTime % 60); document.getElementById('mp-current').textContent = `${currMins}:${currSecs.toString().padStart(2,'0')}`; });
    audio.addEventListener('loadedmetadata', () => { const durMins = Math.floor(audio.duration / 60); const durSecs = Math.floor(audio.duration % 60); document.getElementById('mp-duration').textContent = `${durMins}:${durSecs.toString().padStart(2,'0')}`; });
    audio.addEventListener('ended', () => { isPlaying = false; document.getElementById('mp-play').textContent = '▶'; });
};

Apps.Paint = function() {
    const html = `<div class="paint-container"><div class="paint-toolbar"><input type="color" class="paint-color-picker" id="paint-color" value="#000000"><input type="range" class="paint-size-slider" id="paint-size" min="1" max="50" value="5"><button id="paint-brush" style="padding:6px 12px;border:1px solid var(--border-color);background:var(--accent-color);color:white;border-radius:4px;cursor:pointer;">🖌️ Pincel</button><button id="paint-eraser" style="padding:6px 12px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);border-radius:4px;cursor:pointer;">🧹 Borracha</button><button id="paint-clear" style="padding:6px 12px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);border-radius:4px;cursor:pointer;">🗑️ Limpar</button><button id="paint-save" style="padding:6px 12px;border:1px solid var(--border-color);background:var(--bg-tertiary);color:var(--text-primary);border-radius:4px;cursor:pointer;">💾 Salvar</button></div><div class="paint-canvas-container"><canvas id="paint-canvas" class="paint-canvas" width="800" height="600"></canvas></div></div>`;
    const winData = WindowManager.create('paint', 'Paint', '🖌️', html, { width: 900, height: 700 });
    const canvas = winData.element.querySelector('#paint-canvas'), ctx = canvas.getContext('2d'); let isDrawing = false, lastX = 0, lastY = 0, tool = 'brush';
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    function getPos(e) { const rect = canvas.getBoundingClientRect(); return { x: e.clientX - rect.left, y: e.clientY - rect.top }; }
    function startDrawing(e) { isDrawing = true; const pos = getPos(e); lastX = pos.x; lastY = pos.y; }
    function draw(e) { if (!isDrawing) return; const pos = getPos(e); const size = document.getElementById('paint-size').value; ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(pos.x, pos.y); ctx.lineWidth = size; ctx.strokeStyle = tool === 'eraser' ? 'white' : document.getElementById('paint-color').value; ctx.stroke(); lastX = pos.x; lastY = pos.y; }
    function stopDrawing() { isDrawing = false; }
    canvas.addEventListener('mousedown', startDrawing); canvas.addEventListener('mousemove', draw); canvas.addEventListener('mouseup', stopDrawing); canvas.addEventListener('mouseout', stopDrawing);
    document.getElementById('paint-brush').addEventListener('click', () => { tool = 'brush'; document.getElementById('paint-brush').style.background = 'var(--accent-color)'; document.getElementById('paint-brush').style.color = 'white'; document.getElementById('paint-eraser').style.background = 'var(--bg-tertiary)'; });
    document.getElementById('paint-eraser').addEventListener('click', () => { tool = 'eraser'; document.getElementById('paint-eraser').style.background = 'var(--accent-color)'; document.getElementById('paint-eraser').style.color = 'white'; document.getElementById('paint-brush').style.background = 'var(--bg-tertiary)'; });
    document.getElementById('paint-clear').addEventListener('click', () => { ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height); });
    document.getElementById('paint-save').addEventListener('click', () => { const link = document.createElement('a'); link.download = 'desenho.png'; link.href = canvas.toDataURL(); link.click(); });
};

// ===== REGISTRO DE APLICATIVOS =====
const AppRegistry = {
    apps: [
        { id: 'notepad', name: 'Bloco de Notas', icon: '📝', createApp: Apps.Notepad },
        { id: 'calculator', name: 'Calculadora', icon: '🧮', createApp: Apps.Calculator },
        { id: 'files', name: 'Arquivos', icon: '📁', createApp: Apps.FileManager },
        { id: 'browser', name: 'Navegador', icon: '🌐', createApp: Apps.Browser },
        { id: 'settings', name: 'Configurações', icon: '⚙️', createApp: Apps.Settings },
        { id: 'terminal', name: 'Terminal', icon: '💻', createApp: Apps.Terminal },
        { id: 'clock', name: 'Relógio', icon: '🕐', createApp: Apps.Clock },
        { id: 'calendar', name: 'Calendário', icon: '📅', createApp: Apps.Calendar },
        { id: 'sysmon', name: 'Monitor', icon: '📊', createApp: Apps.SystemMonitor },
        { id: 'imageeditor', name: 'Imagens', icon: '🎨', createApp: Apps.ImageEditor },
        { id: 'musicplayer', name: 'Música', icon: '🎵', createApp: Apps.MusicPlayer },
        { id: 'paint', name: 'Paint', icon: '🖌️', createApp: Apps.Paint },
    ],
    open(appId) {
        const app = this.apps.find(a => a.id === appId);
        if (!app) return;
        app.createApp();
        document.getElementById('start-menu').classList.add('hidden');
        document.getElementById('btn-start').classList.remove('active');
    },
    renderStartMenu(filter = '') {
        const container = document.getElementById('start-apps');
        container.innerHTML = '';
        const filtered = this.apps.filter(a => a.name.toLowerCase().includes(filter.toLowerCase()));
        filtered.forEach(app => {
            const el = document.createElement('div');
            el.className = 'start-app-item';
            el.innerHTML = `<span class="app-icon">${app.icon}</span><span class="app-name">${app.name}</span>`;
            el.addEventListener('click', () => this.open(app.id));
            container.appendChild(el);
        });
    },
    renderDesktopIcons() {
        const container = document.getElementById('desktop-icons');
        container.innerHTML = '';
        this.apps.forEach(app => {
            const el = document.createElement('div');
            el.className = 'desktop-icon';
            el.innerHTML = `<span class="icon">${app.icon}</span><span class="label">${app.name}</span>`;
            el.addEventListener('dblclick', () => this.open(app.id));
            container.appendChild(el);
        });
    }
};

// ===== SISTEMA PRINCIPAL =====
const GlassOS = {
    isStartOpen: false, isShutdown: false, altTabSelected: 0,
    init() {
        const settings = ThemeManager.getSettings();
        ThemeManager.apply(settings.theme);
        ThemeManager.applyWallpaper(settings.wallpaper);
        AppRegistry.renderDesktopIcons();
        AppRegistry.renderStartMenu();
        this.startClock();
        this.setupGlobalEvents();
        // Inicializar novos sistemas
        NotificationSystem.setupEvents();
        ClipboardManager.init();
        GlobalSearch.init();
        LockScreen.init();
        WidgetSystem.init();
        UpdateSystem.init();
        PerformanceOptimizer.init();
        SnapLayouts.init();
        console.log('GlassOS v1.1 inicializado com todas as funcionalidades.');
    },
    startClock() {
        const clockEl = document.getElementById('tray-clock'), dateEl = document.getElementById('tray-date');
        function update() { const now = new Date(); clockEl.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); dateEl.textContent = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
        update(); setInterval(update, 1000);
    },
    setupGlobalEvents() {
        document.getElementById('btn-start').addEventListener('click', (e) => { e.stopPropagation(); this.toggleStartMenu(); });
        document.getElementById('start-search-input').addEventListener('input', (e) => { AppRegistry.renderStartMenu(e.target.value); });
        document.addEventListener('click', (e) => { if (this.isStartOpen && !e.target.closest('#start-menu') && !e.target.closest('#btn-start')) this.closeStartMenu(); this.hideContextMenu(); });
        document.getElementById('desktop').addEventListener('contextmenu', (e) => { if (e.target.closest('.window') || e.target.closest('#taskbar') || e.target.closest('#start-menu')) return; e.preventDefault(); this.showContextMenu(e.clientX, e.clientY); });
        document.getElementById('context-menu').addEventListener('click', (e) => { const item = e.target.closest('[data-action]'); if (!item) return; switch (item.dataset.action) { case 'refresh': location.reload(); break; case 'wallpaper': AppRegistry.open('settings'); break; case 'settings': AppRegistry.open('settings'); break; case 'widget': const type = prompt('Tipo de widget (clock, sysmon, weather):', 'clock'); if (type) WidgetSystem.create(type); break; case 'about': this.showAboutModal(); break; } });
        document.getElementById('btn-restart').addEventListener('click', () => { this.closeStartMenu(); this.shutdown('Reiniciando...'); });
        document.getElementById('btn-shutdown').addEventListener('click', () => { this.closeStartMenu(); this.shutdown('Desligando...'); });
        document.addEventListener('mousemove', (e) => { WindowManager.handleDragMove(e); WindowManager.handleResizeMove(e); });
        document.addEventListener('mouseup', () => { WindowManager.handleDragEnd(); WindowManager.handleResizeEnd(); });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Meta' || e.key === 'OS') { e.preventDefault(); this.toggleStartMenu(); }
            if (e.altKey && e.key === 'Tab') { e.preventDefault(); if (!document.getElementById('alt-tab-overlay').classList.contains('hidden')) this.cycleAltTab(); else this.showAltTab(); }
            if ((e.ctrlKey && e.shiftKey && e.key === 'F') || (e.key === 'l' && (e.metaKey || e.ctrlKey))) { e.preventDefault(); GlobalSearch.toggle(); }
            if ((e.key === 'l' || e.key === 'L') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); LockScreen.lock(); }
            if (e.key === 'Escape') { this.closeStartMenu(); this.hideContextMenu(); this.hideAltTab(); this.closeAllModals(); }
        });
        document.addEventListener('keyup', (e) => { if (e.key === 'Alt') this.hideAltTab(); });
    },
    toggleStartMenu() { if (this.isStartOpen) this.closeStartMenu(); else this.openStartMenu(); },
    openStartMenu() { document.getElementById('start-menu').classList.remove('hidden'); document.getElementById('btn-start').classList.add('active'); document.getElementById('start-search-input').value = ''; AppRegistry.renderStartMenu(''); this.isStartOpen = true; setTimeout(() => document.getElementById('start-search-input').focus(), 100); },
    closeStartMenu() { document.getElementById('start-menu').classList.add('hidden'); document.getElementById('btn-start').classList.remove('active'); this.isStartOpen = false; },
    showContextMenu(x, y) {
        const menu = document.getElementById('context-menu'); menu.classList.remove('hidden');
        const rect = menu.getBoundingClientRect();
        if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 10;
        if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 10;
        menu.style.left = `${x}px`; menu.style.top = `${y}px`;
    },
    hideContextMenu() { document.getElementById('context-menu').classList.add('hidden'); },
    showAltTab() {
        if (WindowManager.windows.size === 0) return;
        const overlay = document.getElementById('alt-tab-overlay'), list = document.getElementById('alt-tab-list'); list.innerHTML = '';
        const windows = Array.from(WindowManager.windows.values());
        windows.forEach((win, i) => { const item = document.createElement('div'); item.className = 'alt-tab-item' + (i === this.altTabSelected ? ' selected' : ''); item.innerHTML = `<span class="alt-icon">${win.icon}</span><span class="alt-name">${win.title}</span>`; list.appendChild(item); });
        overlay.classList.remove('hidden');
    },
    hideAltTab() {
        const overlay = document.getElementById('alt-tab-overlay');
        if (overlay.classList.contains('hidden')) return;
        const windows = Array.from(WindowManager.windows.values());
        if (windows.length > 0 && this.altTabSelected >= 0 && this.altTabSelected < windows.length) WindowManager.focus(windows[this.altTabSelected].id);
        overlay.classList.add('hidden'); this.altTabSelected = 0;
    },
    cycleAltTab() {
        const count = WindowManager.windows.size; if (count === 0) return;
        this.altTabSelected = (this.altTabSelected + 1) % count;
        const items = document.querySelectorAll('.alt-tab-item'); items.forEach((item, i) => { item.classList.toggle('selected', i === this.altTabSelected); });
    },
    showAboutModal() {
        const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
        overlay.innerHTML = `<div class="modal-box"><h3>ℹ️ Sobre o GlassOS</h3><p><strong>GlassOS v1.1</strong><br>Sistema Operacional Web<br>JavaScript ES6+ puro<br>Glassmorphism avançado<br>Arquitetura modular<br><br>Funcionalidades: 12 apps, widgets, notificações, busca global, temas retro/cyberpunk, e muito mais.</p><div class="modal-actions"><button class="primary" onclick="this.closest('.modal-overlay').remove()">OK</button></div></div>`;
        document.body.appendChild(overlay); overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    },
    closeAllModals() { document.querySelectorAll('.modal-overlay').forEach(m => m.remove()); },
    shutdown(message) {
        if (this.isShutdown) return; this.isShutdown = true;
        const screen = document.getElementById('shutdown-screen'), text = document.getElementById('shutdown-text');
        screen.classList.remove('hidden'); text.textContent = message;
        setTimeout(() => {
            if (message.includes('Reiniciando')) location.reload();
            else { document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#fff;font-family:system-ui;text-align:center;"><div><p style="font-size:24px;margin-bottom:16px;">GlassOS desligado</p><p style="font-size:14px;color:#888;cursor:pointer;" onclick="location.reload()">Clique para ligar</p></div></div>`; }
        }, 2500);
    }
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => { GlassOS.init(); });