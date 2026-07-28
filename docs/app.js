'use strict';

// ============================
// Module: ThemeManager
// ============================
const ThemeManager = (() => {
  const toggleBtn = document.getElementById('theme-toggle');
  
  const init = () => {
    let theme = localStorage.getItem('theme');
    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    setTheme(theme);
    
    toggleBtn.addEventListener('click', () => {
      const current = document.body.getAttribute('data-theme');
      setTheme(current === 'dark' ? 'light' : 'dark');
    });
  };
  
  const setTheme = (theme) => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    toggleBtn.textContent = theme === 'dark' ? '☀' : '🌙';
  };
  
  return { init };
})();

// ============================
// Module: SettingsManager
// ============================
const SettingsManager = (() => {
  const defaults = {
    removeDuplicates: true, ignoreCase: false, ignoreTrimSpaces: true,
    ignoreMultipleSpaces: false, removeEmpty: true, trimSpaces: true,
    sortOutput: false, reverseOutput: false, caseSensitive: false, regexMode: false,
    removeUrls: false, removeUrlOnly: false, removeColonAfterUrl: false, removeEmails: false, removeWordsOnly: false,
    filterKeep: '', filterRemove: '',
    advStartsWith: '', advEndsWith: '', advContains: '', advNotContains: '',
    advMinLength: '', advMaxLength: '', advRegexInclude: '', advRegexExclude: '',
    exportFilename: 'output.txt'
  };

  let debounceTimer;

  const getDOMState = () => {
    return {
      removeDuplicates: document.getElementById('opt-removeDuplicates').checked,
      ignoreCase: document.getElementById('opt-ignoreCase').checked,
      ignoreTrimSpaces: document.getElementById('opt-ignoreTrimSpaces').checked,
      ignoreMultipleSpaces: document.getElementById('opt-ignoreMultipleSpaces').checked,
      removeEmpty: document.getElementById('opt-removeEmpty').checked,
      trimSpaces: document.getElementById('opt-trimSpaces').checked,
      sortOutput: document.getElementById('opt-sortOutput').checked,
      reverseOutput: document.getElementById('opt-reverseOutput').checked,
      caseSensitive: document.getElementById('opt-caseSensitive').checked,
      regexMode: document.getElementById('opt-regexMode').checked,
      removeUrls: document.getElementById('opt-removeUrls').checked,
      removeUrlOnly: document.getElementById('opt-removeUrlOnly').checked,
      removeColonAfterUrl: document.getElementById('opt-removeColonAfterUrl').checked,
      removeEmails: document.getElementById('opt-removeEmails').checked,
      removeWordsOnly: document.getElementById('opt-removeWordsOnly').checked,
      filterKeep: document.getElementById('filter-keep').value,
      filterRemove: document.getElementById('filter-remove').value,
      advStartsWith: document.getElementById('adv-startsWith').value,
      advEndsWith: document.getElementById('adv-endsWith').value,
      advContains: document.getElementById('adv-contains').value,
      advNotContains: document.getElementById('adv-notContains').value,
      advMinLength: document.getElementById('adv-minLength').value,
      advMaxLength: document.getElementById('adv-maxLength').value,
      advRegexInclude: document.getElementById('adv-regexInclude').value,
      advRegexExclude: document.getElementById('adv-regexExclude').value,
      exportFilename: document.getElementById('export-filename').value
    };
  };

  const setDOMState = (state) => {
    const s = { ...defaults, ...state };
    document.getElementById('opt-removeDuplicates').checked = s.removeDuplicates;
    document.getElementById('opt-ignoreCase').checked = s.ignoreCase;
    document.getElementById('opt-ignoreTrimSpaces').checked = s.ignoreTrimSpaces;
    document.getElementById('opt-ignoreMultipleSpaces').checked = s.ignoreMultipleSpaces;
    document.getElementById('opt-removeEmpty').checked = s.removeEmpty;
    document.getElementById('opt-trimSpaces').checked = s.trimSpaces;
    document.getElementById('opt-sortOutput').checked = s.sortOutput;
    document.getElementById('opt-reverseOutput').checked = s.reverseOutput;
    document.getElementById('opt-caseSensitive').checked = s.caseSensitive;
    document.getElementById('opt-regexMode').checked = s.regexMode;
    document.getElementById('opt-removeUrls').checked = s.removeUrls;
    document.getElementById('opt-removeUrlOnly').checked = s.removeUrlOnly;
    document.getElementById('opt-removeColonAfterUrl').checked = s.removeColonAfterUrl;
    document.getElementById('opt-removeEmails').checked = s.removeEmails;
    document.getElementById('opt-removeWordsOnly').checked = s.removeWordsOnly;
    document.getElementById('filter-keep').value = s.filterKeep;
    document.getElementById('filter-remove').value = s.filterRemove;
    document.getElementById('adv-startsWith').value = s.advStartsWith;
    document.getElementById('adv-endsWith').value = s.advEndsWith;
    document.getElementById('adv-contains').value = s.advContains;
    document.getElementById('adv-notContains').value = s.advNotContains;
    document.getElementById('adv-minLength').value = s.advMinLength;
    document.getElementById('adv-maxLength').value = s.advMaxLength;
    document.getElementById('adv-regexInclude').value = s.advRegexInclude;
    document.getElementById('adv-regexExclude').value = s.advRegexExclude;
    document.getElementById('export-filename').value = s.exportFilename;
  };

  const autoSave = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      localStorage.setItem('txt-processor-settings', JSON.stringify(getDOMState()));
    }, 500);
  };

  const load = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('txt-processor-settings'));
      if (saved) setDOMState(saved);
    } catch (e) {
      console.warn('Failed to load settings', e);
    }

    // Attach auto-save listeners
    document.querySelectorAll('input, textarea').forEach(el => {
      el.addEventListener('input', autoSave);
      el.addEventListener('change', autoSave);
    });
  };

  const getWorkerOptions = () => {
    const s = getDOMState();
    
    // Parse keywords
    const parseList = (text) => text.split('\n').map(t => t.trim()).filter(Boolean);
    
    return {
      removeDuplicates: s.removeDuplicates,
      ignoreCase: s.ignoreCase,
      ignoreTrimSpaces: s.ignoreTrimSpaces,
      ignoreMultipleSpaces: s.ignoreMultipleSpaces,
      removeEmpty: s.removeEmpty,
      trimSpaces: s.trimSpaces,
      sortOutput: s.sortOutput,
      reverseOutput: s.reverseOutput,
      caseSensitive: s.caseSensitive,
      regexMode: s.regexMode,
      removeUrls: s.removeUrls,
      removeUrlOnly: s.removeUrlOnly,
      removeColonAfterUrl: s.removeColonAfterUrl,
      removeEmails: s.removeEmails,
      removeWordsOnly: s.removeWordsOnly,
      keepKeywords: parseList(s.filterKeep),
      removeKeywords: parseList(s.filterRemove),
      startsWith: s.advStartsWith,
      endsWith: s.advEndsWith,
      contains: s.advContains,
      notContains: s.advNotContains,
      minLength: parseInt(s.advMinLength) || 0,
      maxLength: parseInt(s.advMaxLength) || 0,
      regexInclude: s.advRegexInclude,
      regexExclude: s.advRegexExclude
    };
  };

  return { load, getDOMState, setDOMState, getWorkerOptions };
})();

// ============================
// Module: FileManager
// ============================
const FileManager = (() => {
  let currentFile = null;

  const init = () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const btnBrowse = document.getElementById('btn-browse');

    btnBrowse.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) handleFile(e.target.files[0]);
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
  };

  const handleFile = (file) => {
    if (!file.name.toLowerCase().endsWith('.txt') && file.type !== 'text/plain') {
      ToastManager.show('Please select a valid TXT file.', 'error');
      return;
    }

    currentFile = file;
    
    // Update UI
    document.getElementById('info-filename').textContent = file.name;
    document.getElementById('info-size').textContent = formatBytes(file.size);
    document.getElementById('info-lines').textContent = `~${(file.size / 50).toLocaleString()} (est)`;
    
    document.getElementById('file-info').classList.remove('hidden');
    document.getElementById('btn-start').disabled = false;
    
    // Auto-fill export filename
    let name = file.name;
    if (name.toLowerCase().endsWith('.txt')) name = name.slice(0, -4);
    document.getElementById('export-filename').value = `${name}_processed.txt`;
    
    ToastManager.show('File loaded successfully', 'success');
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return { init, getFile: () => currentFile };
})();

// ============================
// Module: SpeedGraph
// ============================
const SpeedGraph = (() => {
  let canvas, ctx;
  let data = [];
  const maxBars = 120;

  const init = () => {
    canvas = document.getElementById('speed-graph');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  };

  const resize = () => {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 80;
    draw();
  };

  const push = (speed) => {
    data.push(speed);
    if (data.length > maxBars) data.shift();
    draw();
  };
  
  const reset = () => {
    data = [];
    draw();
  };

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (data.length === 0) return;

    const maxSpeed = Math.max(...data, 10);
    const barWidth = Math.max(2, (canvas.width / maxBars) - 1);
    
    const isDark = document.body.getAttribute('data-theme') !== 'light';
    ctx.fillStyle = isDark ? '#2f81f7' : '#0969da';

    for (let i = 0; i < data.length; i++) {
      const val = data[i];
      const h = (val / maxSpeed) * canvas.height;
      const x = canvas.width - ((data.length - i) * (barWidth + 1));
      const y = canvas.height - h;
      
      ctx.fillRect(x, y, barWidth, h);
    }
  };

  return { init, push, reset };
})();

// ============================
// Module: StatsDisplay
// ============================
const StatsDisplay = (() => {
  const init = () => {};

  const update = (stats) => {
    document.getElementById('card-stats').classList.remove('hidden');
    
    document.getElementById('stat-original').textContent = stats.originalLines.toLocaleString();
    document.getElementById('stat-processed').textContent = stats.processedLines.toLocaleString();
    document.getElementById('stat-duplicates').textContent = stats.duplicatesRemoved.toLocaleString();
    document.getElementById('stat-empty').textContent = stats.emptyRemoved.toLocaleString();
    document.getElementById('stat-filtered').textContent = stats.filteredOut.toLocaleString();
    document.getElementById('stat-exported').textContent = stats.exportedLines.toLocaleString();
    
    document.getElementById('stat-elapsed').textContent = formatTime(stats.elapsed);
    document.getElementById('stat-speed').textContent = `${stats.speed.toLocaleString()} /s`;
    
    document.getElementById('stat-eta').textContent = stats.progress === 100 ? '-' : formatEta(stats.eta);
    
    // Memory
    if (performance && performance.memory) {
      const mb = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
      document.getElementById('stat-memory').textContent = `${mb} MB`;
    } else {
      document.getElementById('stat-memory').textContent = 'N/A';
    }

    // Progress
    document.getElementById('progress-fill').style.width = `${stats.progress}%`;
    document.getElementById('progress-text').textContent = `${stats.progress}%`;
    
    if (stats.phase === 'sorting') {
      document.getElementById('progress-text').textContent = 'Sorting output...';
    }
  };

  const formatTime = (sec) => {
    if (!sec) return '00:00:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
  };

  const formatEta = (sec) => {
    if (!sec) return '-';
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return { init, update };
})();

// ============================
// Module: ToastManager
// ============================
const ToastManager = (() => {
  let container;

  const init = () => {
    container = document.getElementById('toast-container');
  };

  const show = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
  };

  return { init, show };
})();

// ============================
// Module: HistoryManager
// ============================
const HistoryManager = (() => {
  const load = () => {
    const list = document.getElementById('history-list');
    const toggle = document.getElementById('history-toggle');
    const chevron = document.getElementById('history-chevron');
    
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem('txt-processor-history')) || [];
    } catch {}

    toggle.addEventListener('click', () => {
      list.classList.toggle('hidden');
      chevron.classList.toggle('up');
    });

    render(history);
  };

  const add = (entry) => {
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem('txt-processor-history')) || [];
    } catch {}

    history.unshift(entry);
    if (history.length > 10) history = history.slice(0, 10);
    
    localStorage.setItem('txt-processor-history', JSON.stringify(history));
    render(history);
  };

  const render = (history) => {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    
    if (history.length === 0) {
      list.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.875rem;">No previous runs found.</p>';
      return;
    }

    history.forEach(item => {
      const div = document.createElement('div');
      div.className = 'history-item';
      const date = new Date(item.date).toLocaleString();
      div.innerHTML = `
        <div class="history-item-left">
          <strong>${item.filename}</strong>
          <span style="color: var(--text-secondary)">${date}</span>
        </div>
        <div class="history-item-right">
          <span>In: ${item.original.toLocaleString()} | Out: ${item.processed.toLocaleString()}</span>
          <span style="color: var(--text-secondary)">${item.elapsed}</span>
        </div>
      `;
      list.appendChild(div);
    });
  };

  return { load, add };
})();

// ============================
// Module: WorkerController
// ============================
const WorkerController = (() => {
  let worker = null;
  let outputChunks = [];
  let isDone = false;
  let finalStats = null;

  const init = () => {
    HistoryManager.load();
  };

  const start = () => {
    const file = FileManager.getFile();
    if (!file) return;

    const options = SettingsManager.getWorkerOptions();
    
    if (worker) worker.terminate();
    worker = new Worker('./worker.js');
    outputChunks = [];
    isDone = false;
    finalStats = null;
    SpeedGraph.reset();
    
    // UI Update
    document.getElementById('btn-import').disabled = true;
    document.getElementById('btn-start').disabled = true;
    document.getElementById('btn-pause').disabled = false;
    document.getElementById('btn-cancel').disabled = false;
    document.getElementById('btn-export').disabled = true;
    document.getElementById('btn-resume').classList.add('hidden');
    document.getElementById('btn-pause').classList.remove('hidden');
    
    worker.onmessage = handleMessage;
    worker.postMessage({ type: 'start', file, options });
    ToastManager.show('Processing started...');
  };

  const handleMessage = (e) => {
    const { type, stats, chunk, message, isFinal } = e.data;
    
    if (type === 'progress') {
      StatsDisplay.update(stats);
      if (stats.speed) SpeedGraph.push(stats.speed);
    } 
    else if (type === 'chunk') {
      if (chunk.byteLength > 0) outputChunks.push(chunk);
    } 
    else if (type === 'done') {
      isDone = true;
      finalStats = stats;
      StatsDisplay.update(stats);
      
      // History
      HistoryManager.add({
        filename: FileManager.getFile().name,
        date: Date.now(),
        original: stats.originalLines,
        processed: stats.exportedLines,
        elapsed: document.getElementById('stat-elapsed').textContent
      });

      // UI Update
      document.getElementById('btn-import').disabled = false;
      document.getElementById('btn-start').disabled = false;
      document.getElementById('btn-pause').disabled = true;
      document.getElementById('btn-cancel').disabled = true;
      document.getElementById('btn-export').disabled = false;
      
      // Auto-populate export summary
      const summary = document.getElementById('export-summary');
      summary.classList.remove('hidden');
      summary.innerHTML = `
        <strong>Processing Complete!</strong><br>
        Lines Processed: ${stats.originalLines.toLocaleString()}<br>
        Lines Exported: ${stats.exportedLines.toLocaleString()}<br>
        Time: ${document.getElementById('stat-elapsed').textContent}
      `;
      
      showExportModal();
      
      worker.terminate();
      worker = null;
      ToastManager.show('Processing complete!', 'success');
    } 
    else if (type === 'error') {
      ToastManager.show(message || 'Worker error', 'error');
      resetUI();
    }
    else if (type === 'cancelled') {
      ToastManager.show('Processing cancelled.', 'warning');
      resetUI();
    }
  };

  const pause = () => {
    if (worker) worker.postMessage({ type: 'pause' });
    document.getElementById('btn-pause').classList.add('hidden');
    document.getElementById('btn-resume').classList.remove('hidden');
  };

  const resume = () => {
    if (worker) worker.postMessage({ type: 'resume' });
    document.getElementById('btn-resume').classList.add('hidden');
    document.getElementById('btn-pause').classList.remove('hidden');
  };

  const cancel = () => {
    if (worker) worker.postMessage({ type: 'cancel' });
  };

  const resetUI = () => {
    if (worker) {
      worker.terminate();
      worker = null;
    }
    document.getElementById('btn-import').disabled = false;
    document.getElementById('btn-start').disabled = FileManager.getFile() === null;
    document.getElementById('btn-pause').disabled = true;
    document.getElementById('btn-cancel').disabled = true;
    document.getElementById('btn-pause').classList.remove('hidden');
    document.getElementById('btn-resume').classList.add('hidden');
  };

  const exportData = () => {
    if (!isDone || outputChunks.length === 0) return;
    const filename = document.getElementById('export-filename').value || 'output.txt';
    window.Exporter.download(outputChunks, filename);
    ToastManager.show('Download started', 'success');
  };

  const showExportModal = () => {
    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    
    content.innerHTML = `
      <p>Your file has been successfully processed.</p>
      <ul style="margin-top: 12px; margin-left: 20px;">
        <li><strong>Original:</strong> ${finalStats.originalLines.toLocaleString()} lines</li>
        <li><strong>Output:</strong> ${finalStats.exportedLines.toLocaleString()} lines</li>
        <li><strong>Removed:</strong> ${(finalStats.duplicatesRemoved + finalStats.emptyRemoved + finalStats.filteredOut).toLocaleString()} lines</li>
      </ul>
      <p style="margin-top: 12px;">Click Download to save the result.</p>
    `;
    
    modal.classList.remove('hidden');
  };

  return { init, start, pause, resume, cancel, resetUI, exportData };
})();

// ============================
// Module: PresetsManager
// ============================
const PresetsManager = (() => {
  const init = () => {
    const select = document.getElementById('preset-select');
    const btnSave = document.getElementById('btn-save-preset');
    
    loadPresets();
    
    btnSave.addEventListener('click', () => {
      const name = prompt('Enter a name for this preset:');
      if (name) {
        let presets = JSON.parse(localStorage.getItem('txt-processor-presets')) || {};
        presets[name] = SettingsManager.getDOMState();
        localStorage.setItem('txt-processor-presets', JSON.stringify(presets));
        loadPresets();
        select.value = name;
        ToastManager.show('Preset saved', 'success');
      }
    });

    select.addEventListener('change', () => {
      if (!select.value) return;
      const presets = JSON.parse(localStorage.getItem('txt-processor-presets')) || {};
      if (presets[select.value]) {
        SettingsManager.setDOMState(presets[select.value]);
        ToastManager.show(`Loaded preset: ${select.value}`);
      }
    });
  };

  const loadPresets = () => {
    const select = document.getElementById('preset-select');
    const current = select.value;
    
    select.innerHTML = '<option value="">Load Preset...</option>';
    
    const presets = JSON.parse(localStorage.getItem('txt-processor-presets')) || {};
    Object.keys(presets).forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
    
    if (presets[current]) select.value = current;
  };

  return { init };
})();

// ============================
// Main UI Flow
// ============================
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  SettingsManager.load();
  FileManager.init();
  SpeedGraph.init();
  ToastManager.init();
  PresetsManager.init();
  WorkerController.init();

  // Buttons
  document.getElementById('btn-import').addEventListener('click', () => document.getElementById('btn-browse').click());
  document.getElementById('btn-start').addEventListener('click', WorkerController.start);
  document.getElementById('btn-pause').addEventListener('click', WorkerController.pause);
  document.getElementById('btn-resume').addEventListener('click', WorkerController.resume);
  document.getElementById('btn-cancel').addEventListener('click', WorkerController.cancel);
  document.getElementById('btn-reset').addEventListener('click', () => {
    if(confirm('Reset all settings to default?')) {
      localStorage.removeItem('txt-processor-settings');
      SettingsManager.load();
      WorkerController.resetUI();
    }
  });
  document.getElementById('btn-export').addEventListener('click', WorkerController.exportData);
  
  // Modals
  document.getElementById('btn-modal-close').addEventListener('click', () => {
    document.getElementById('modal-overlay').classList.add('hidden');
  });
  document.getElementById('btn-modal-download').addEventListener('click', () => {
    WorkerController.exportData();
    document.getElementById('modal-overlay').classList.add('hidden');
  });

  const shortcutsModal = document.getElementById('shortcuts-modal');
  document.querySelector('.hint').addEventListener('click', () => shortcutsModal.classList.remove('hidden'));
  document.getElementById('btn-close-shortcuts').addEventListener('click', () => shortcutsModal.classList.add('hidden'));
  
  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // Open file
    if (e.ctrlKey && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      document.getElementById('btn-browse').click();
    }
    // Start
    else if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      if (!document.getElementById('btn-start').disabled) WorkerController.start();
    }
    // Pause/Resume
    else if (e.ctrlKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      const pauseBtn = document.getElementById('btn-pause');
      const resumeBtn = document.getElementById('btn-resume');
      if (!pauseBtn.disabled) {
        if (!pauseBtn.classList.contains('hidden')) WorkerController.pause();
        else WorkerController.resume();
      }
    }
    // Export
    else if (e.ctrlKey && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      if (!document.getElementById('btn-export').disabled) WorkerController.exportData();
    }
    // Reset
    else if (e.ctrlKey && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      document.getElementById('btn-reset').click();
    }
    // Theme
    else if (e.ctrlKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      document.getElementById('theme-toggle').click();
    }
    // Cancel / Close modals
    else if (e.key === 'Escape') {
      if (!document.getElementById('modal-overlay').classList.contains('hidden')) {
        document.getElementById('modal-overlay').classList.add('hidden');
      } else if (!shortcutsModal.classList.contains('hidden')) {
        shortcutsModal.classList.add('hidden');
      } else if (!document.getElementById('btn-cancel').disabled) {
        WorkerController.cancel();
      }
    }
    // Help
    else if (e.key === '?' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      shortcutsModal.classList.remove('hidden');
    }
  });
});