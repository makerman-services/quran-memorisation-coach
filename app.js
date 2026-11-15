/* Islamic Beginners Introduction Guide — private preview.
   Progress stays on this phone in localStorage. No accounts, no tracking. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.IslamicGuide = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var STORAGE_KEY = 'islamicGuidePreview.v1';
  var INTERVALS = [0, 1, 3, 7, 14, 30];
  var DISCLAIMER = 'This guide is a general beginner\'s aid, not a religious ruling (fatwa). It has not been reviewed by a scholar. Practice differs between schools of thought (madhhabs), so please learn from a qualified teacher or imam at your local mosque.';
  var TRANSLIT_LINE = 'Transliteration is approximate. Learn the Arabic pronunciation from a teacher.';
  var SOURCES_LINE = 'Sources (educational references only). Naming a book, website, mosque or author does not mean they endorse, approve or are affiliated with this app or with Makerman Services.';
  var PRIVACY_LINE = 'Your progress, settings and any saved notes stay on this device only. Nothing is sent off the device. You can clear this data at any time.';
  var LAST_CHECKED = 'Last checked: 15 Nov 2026';
  var ARABIC_CREDIT = 'Arabic Quran text: Tanzil Quran Text (Simple, Version 1.1), © 2007–2026 Tanzil Project, used verbatim under the Tanzil text licence (Creative Commons Attribution 3.0, with no changes allowed). Source: Tanzil Project, https://tanzil.net. Updates: http://tanzil.net/updates/.';
  var ENGLISH_CREDIT = 'Translation by Talal Itani, ClearQuran.com';
  var DATA_CURRICULUM = 'data/curriculum.json';
  var DATA_TANZIL = 'tanzil/quran-simple.txt';
  var DATA_CLEARQURAN = 'clearquran/clearquran-allah-edition.txt';
  var DATA_TRANSLIT = 'data/transliteration-verses.json';
  var VIEWS = ['welcome', 'today', 'review', 'progress', 'saved'];

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function todayISO(now) {
    var d = now ? new Date(now) : new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function parseISODate(iso) {
    var p = String(iso).split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }

  function addDays(iso, days) {
    var d = parseISODate(iso);
    d.setDate(d.getDate() + days);
    return todayISO(d);
  }

  function isDue(nextReviewAt, today) {
    return !!nextReviewAt && nextReviewAt <= today;
  }

  function formatDate(iso) {
    if (!iso) return '';
    var d = parseISODate(iso);
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function memoryStore(map) {
    var data = map || {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
      setItem: function (k, v) { data[k] = String(v); },
      removeItem: function (k) { delete data[k]; }
    };
  }

  function storageOr(store) {
    return store || (typeof localStorage !== 'undefined' ? localStorage : null);
  }

  function defaultSettings() {
    return {
      fontSize: 'medium',
      showArabic: true,
      showTranslation: true,
      showTransliteration: true,
      transliterationChosen: false
    };
  }

  function emptyState(curriculum) {
    var groups = {};
    ((curriculum && curriculum.groups) || []).forEach(function (g) {
      groups[g.id] = {
        id: g.id,
        status: 'new',
        intervalIndex: null,
        lastReviewedAt: null,
        nextReviewAt: null,
        firstRememberedAt: null
      };
    });
    return {
      version: 1,
      onboarded: false,
      settings: defaultSettings(),
      groups: groups,
      combinedReviews: [],
      saved: []
    };
  }

  function loadState(curriculum, store) {
    var base = emptyState(curriculum);
    var s = storageOr(store);
    if (!s) return base;
    try {
      var raw = s.getItem(STORAGE_KEY);
      if (!raw) return base;
      var saved = JSON.parse(raw);
      if (!saved || typeof saved !== 'object') return base;
      base.onboarded = !!saved.onboarded;
      if (saved.settings && typeof saved.settings === 'object') {
        base.settings.fontSize = saved.settings.fontSize || 'medium';
        base.settings.showArabic = saved.settings.showArabic !== false;
        base.settings.showTranslation = saved.settings.showTranslation !== false;
        // Transliteration is on by default (Mal, 15 Nov 2026). Only an explicit choice made with the toggle keeps it off.
        base.settings.transliterationChosen = saved.settings.transliterationChosen === true;
        base.settings.showTransliteration = base.settings.transliterationChosen ? saved.settings.showTransliteration !== false : true;
      }
      Object.keys(base.groups).forEach(function (id) {
        if (saved.groups && saved.groups[id]) {
          var g = saved.groups[id];
          base.groups[id] = {
            id: id,
            status: g.status || 'new',
            intervalIndex: g.intervalIndex == null ? null : g.intervalIndex,
            lastReviewedAt: g.lastReviewedAt || null,
            nextReviewAt: g.nextReviewAt || null,
            firstRememberedAt: g.firstRememberedAt || null
          };
        }
      });
      base.combinedReviews = Array.isArray(saved.combinedReviews) ? saved.combinedReviews.map(function (c) {
        return {
          id: c.id,
          groupIds: (c.groupIds || []).slice(),
          unlocked: c.unlocked !== false,
          intervalStage: c.intervalStage || 0,
          nextReviewAt: c.nextReviewAt || null,
          lastReviewedAt: c.lastReviewedAt || null
        };
      }) : [];
      base.saved = Array.isArray(saved.saved) ? saved.saved.filter(function (item) {
        return item && item.type === 'group';
      }).slice() : [];
      return base;
    } catch (err) {
      return emptyState(curriculum);
    }
  }

  function saveState(state, store) {
    var s = storageOr(store);
    if (!s) return state;
    s.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
  }

  function clearState(curriculum, store) {
    var s = storageOr(store);
    if (s) s.removeItem(STORAGE_KEY);
    return emptyState(curriculum);
  }

  function groupsByOrder(curriculum) {
    return ((curriculum && curriculum.groups) || []).slice().sort(function (a, b) {
      return (a.order || 0) - (b.order || 0);
    });
  }

  function getGroup(curriculum, id) {
    return groupsByOrder(curriculum).filter(function (g) { return g.id === id; })[0] || null;
  }

  function unlockCombinedReviews(state, curriculum, today) {
    var firsts = groupsByOrder(curriculum).filter(function (g) {
      return state.groups[g.id] && state.groups[g.id].firstRememberedAt;
    }).sort(function (a, b) {
      var da = state.groups[a.id].firstRememberedAt;
      var db = state.groups[b.id].firstRememberedAt;
      if (da < db) return -1;
      if (da > db) return 1;
      return (a.order || 0) - (b.order || 0);
    });
    var batches = Math.floor(firsts.length / 3);
    for (var i = 0; i < batches; i++) {
      var ids = firsts.slice(i * 3, i * 3 + 3).map(function (g) { return g.id; });
      var exists = state.combinedReviews.some(function (c) {
        return c.groupIds && c.groupIds.join(',') === ids.join(',');
      });
      if (!exists) {
        state.combinedReviews.push({
          id: 'combined-' + (i + 1),
          groupIds: ids,
          unlocked: true,
          intervalStage: 0,
          nextReviewAt: today,
          lastReviewedAt: null
        });
      }
    }
    return state;
  }

  function markRememberedToday(state, curriculum, groupId, today) {
    var next = clone(state);
    var g = next.groups[groupId];
    if (!g) return next;
    if (g.firstRememberedAt) return next;
    g.status = 'remembered';
    g.intervalIndex = 0;
    g.lastReviewedAt = today;
    g.nextReviewAt = today;
    g.firstRememberedAt = today;
    unlockCombinedReviews(next, curriculum, today);
    return next;
  }

  function reviewGroup(state, groupId, remembered, today) {
    var next = clone(state);
    var g = next.groups[groupId];
    if (!g || g.intervalIndex == null) return next;
    if (remembered) {
      var nextIdx = Math.min((g.intervalIndex + 1), 5);
      g.intervalIndex = nextIdx;
      g.nextReviewAt = addDays(today, INTERVALS[nextIdx]);
      g.lastReviewedAt = today;
      g.status = 'remembered';
    } else {
      g.intervalIndex = Math.max(0, g.intervalIndex - 1);
      g.nextReviewAt = addDays(today, 1);
      g.lastReviewedAt = today;
      g.status = 'learning';
    }
    return next;
  }

  function reviewCombined(state, combinedId, remembered, today) {
    var next = clone(state);
    var c = null;
    next.combinedReviews.forEach(function (item) {
      if (item.id === combinedId) c = item;
    });
    if (!c) return next;
    c.lastReviewedAt = today;
    if (remembered) {
      if (c.intervalStage === 0) {
        c.intervalStage = 1;
        c.nextReviewAt = addDays(today, 7);
      } else {
        c.intervalStage = 2;
        c.nextReviewAt = addDays(today, 30);
      }
    } else {
      c.nextReviewAt = addDays(today, 1);
    }
    return next;
  }

  function setLearning(state, groupId) {
    var next = clone(state);
    var g = next.groups[groupId];
    if (g && g.status === 'new') g.status = 'learning';
    return next;
  }

  function practiseMore(state, groupId) {
    return setLearning(state, groupId);
  }

  function getCurrentNewGroup(state, curriculum) {
    var list = groupsByOrder(curriculum);
    for (var i = 0; i < list.length; i++) {
      var rec = state.groups[list[i].id];
      if (!rec || !rec.firstRememberedAt) return list[i];
    }
    return null;
  }

  function getDueIndividuals(state, curriculum, today) {
    return groupsByOrder(curriculum).filter(function (g) {
      var rec = state.groups[g.id];
      return rec && rec.firstRememberedAt && isDue(rec.nextReviewAt, today);
    });
  }

  function getDueCombined(state, today) {
    return (state.combinedReviews || []).filter(function (c) {
      return c.unlocked && isDue(c.nextReviewAt, today);
    });
  }

  function combinedStatus(c, today) {
    if (!c || !c.unlocked) return 'locked';
    if (isDue(c.nextReviewAt, today)) return 'due';
    return 'done';
  }

  function groupStatusLabel(rec) {
    if (!rec || rec.status === 'new') return 'Not started';
    if (rec.status === 'learning') return 'Learning';
    return 'Remembered';
  }

  function findSaved(state, type, id) {
    for (var i = 0; i < state.saved.length; i++) {
      if (state.saved[i].type === type && state.saved[i].id === id) return i;
    }
    return -1;
  }

  function addSaved(state, type, id, note, createdAt) {
    if (type !== 'group') return clone(state);
    var next = clone(state);
    var i = findSaved(next, type, id);
    var item = { type: type, id: id, note: note || '', createdAt: createdAt || todayISO() };
    if (i === -1) next.saved.push(item);
    else next.saved[i] = item;
    return next;
  }

  function removeSaved(state, type, id) {
    var next = clone(state);
    var i = findSaved(next, type, id);
    var removed = i === -1 ? null : next.saved[i];
    if (i !== -1) next.saved.splice(i, 1);
    return { state: next, removed: removed };
  }

  function restoreSaved(state, item) {
    if (!item) return clone(state);
    return addSaved(state, item.type, item.id, item.note, item.createdAt);
  }

  function updateSettings(state, patch) {
    var next = clone(state);
    Object.keys(patch || {}).forEach(function (k) { next.settings[k] = patch[k]; });
    return next;
  }

  function setOnboarded(state) {
    var next = clone(state);
    next.onboarded = true;
    return next;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function parsePipeVerses(text) {
    var map = {};
    String(text || '').split(/\r?\n/).forEach(function (ln) {
      if (!ln || ln.charAt(0) === '#') return;
      var parts = ln.split('|');
      if (parts.length >= 3 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
        map[parts[0] + '|' + parts[1]] = parts.slice(2).join('|');
      }
    });
    return map;
  }

  function translitMapFromList(list) {
    var map = {};
    (list || []).forEach(function (row) {
      if (!row || typeof row !== 'object') return;
      if (typeof row.surah !== 'number' || typeof row.ayah !== 'number') return;
      map[row.surah + '|' + row.ayah] = row.translit || '';
    });
    return map;
  }

  function hydrateCurriculum(curriculum, arabicMap, englishMap, translitList) {
    var next = clone(curriculum || { groups: [] });
    var tl = translitMapFromList(translitList);
    next.groups = (next.groups || []).map(function (g) {
      var group = clone(g);
      group.verses = (group.verses || []).map(function (v) {
        var key = v.surah + '|' + v.ayah;
        return {
          surah: v.surah,
          ayah: v.ayah,
          arabic: (arabicMap && arabicMap[key]) || '',
          english: (englishMap && englishMap[key]) || '',
          transliteration: tl[key] || ''
        };
      });
      return group;
    });
    if (!next.arabicCredit) next.arabicCredit = ARABIC_CREDIT;
    if (!next.englishCredit) next.englishCredit = ENGLISH_CREDIT;
    return next;
  }

  function verseBlocks(group, curriculum, settings, revealArabic) {
    var showAr = settings.showArabic;
    var showTr = settings.showTranslation;
    var showTl = settings.showTransliteration;
    var html = '';
    var anyTl = false;
    (group.verses || []).forEach(function (v) {
      html += '<div class="verse-group">';
      html += '<p class="muted small">' + escapeHtml(group.surah) + ' ' + escapeHtml(String(v.surah) + ':' + String(v.ayah)) + '</p>';
      if (showAr && (revealArabic !== false)) {
        html += '<div class="verse-slot arabic" dir="rtl" lang="ar"><span class="slot-label">Arabic</span>' + escapeHtml(v.arabic) + '</div>';
      } else if (showAr && revealArabic === false) {
        html += '<div class="verse-slot"><span class="slot-label">Arabic</span>Hidden for now. Use Reveal when you are ready.</div>';
      }
      if (showTl) {
        if (showAr && revealArabic === false) {
          html += '<div class="verse-slot transliteration"><span class="slot-label">Transliteration</span>Hidden with the Arabic. Use Reveal when you are ready.</div>';
        } else {
          anyTl = true;
          html += '<div class="verse-slot transliteration"><span class="slot-label">Transliteration</span>' + escapeHtml(v.transliteration || '') + '</div>';
        }
      }
      if (showTr) {
        html += '<div class="verse-slot"><span class="slot-label">Translation</span>' + escapeHtml(v.english) + '</div>';
      }
      html += '</div>';
    });
    if (anyTl) {
      html += '<p class="translit-note">' + escapeHtml(TRANSLIT_LINE) + '</p>';
    }
    return html;
  }

  function creditHtml(curriculum) {
    var ar = (curriculum && curriculum.arabicCredit) || ARABIC_CREDIT;
    var en = (curriculum && curriculum.englishCredit) || ENGLISH_CREDIT;
    var arHtml = escapeHtml(ar)
      .replace('https://tanzil.net', '<a href="https://tanzil.net" rel="noopener noreferrer">https://tanzil.net</a>')
      .replace('http://tanzil.net/updates/', '<a href="http://tanzil.net/updates/" rel="noopener noreferrer">http://tanzil.net/updates/</a>');
    var enHtml = escapeHtml(en).replace('ClearQuran.com', '<a href="https://clearquran.com" rel="noopener noreferrer">ClearQuran.com</a>');
    return '<div class="credit-block">' +
      '<p>' + arHtml + '</p>' +
      '<p>' + enHtml + '</p>' +
      '</div>';
  }

  // ---- UI (browser only) ----
  var ui = {
    curriculum: null,
    state: null,
    store: null,
    view: 'welcome',
    toastTimer: null,
    undoAction: null,
    reviewReveal: false
  };

  function persist() {
    saveState(ui.state, ui.store);
  }

  function applyFont() {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-font-size', ui.state.settings.fontSize || 'medium');
    document.querySelectorAll('.seg-btn[data-size]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-size') === ui.state.settings.fontSize ? 'true' : 'false');
    });
  }

  function setView(name) {
    if (VIEWS.indexOf(name) === -1) name = 'welcome';
    ui.view = name;
    if (name === 'today') {
      var current = getCurrentNewGroup(ui.state, ui.curriculum);
      if (current) ui.state = setLearning(ui.state, current.id);
      persist();
    }
    if (name === 'review') ui.reviewReveal = false;
    var dest = arguments[1] === 'about' ? 'about' : name;
    var hash = '#' + dest;
    if (typeof location !== 'undefined' && location.hash !== hash) {
      try { history.replaceState(null, '', hash); } catch (err) { location.hash = hash; }
    }
    render();
    if (arguments[1] === 'about' && typeof document !== 'undefined') {
      var about = document.getElementById('about');
      if (about) about.scrollIntoView();
    }
  }

  function parseHash() {
    var raw = (typeof location !== 'undefined' && location.hash) ? location.hash.replace(/^#/, '') : '';
    if (raw === 'about') return { view: 'welcome', about: true };
    if (VIEWS.indexOf(raw) !== -1) return { view: raw };
    return { view: ui.state && ui.state.onboarded ? 'today' : 'welcome' };
  }

  function showToast(text, undoFn) {
    var toast = document.getElementById('toast');
    var label = document.getElementById('toast-text');
    if (!toast || !label) return;
    label.textContent = text;
    toast.hidden = false;
    ui.undoAction = undoFn || null;
    document.getElementById('toast-undo').hidden = !ui.undoAction;
    if (ui.toastTimer) clearTimeout(ui.toastTimer);
    ui.toastTimer = setTimeout(function () {
      toast.hidden = true;
      ui.undoAction = null;
    }, 6000);
  }

  function renderTabs() {
    var today = todayISO();
    var due = getDueIndividuals(ui.state, ui.curriculum, today).length + getDueCombined(ui.state, today).length;
    var badge = document.getElementById('review-count');
    if (badge) {
      if (due > 0) { badge.hidden = false; badge.textContent = String(due); }
      else { badge.hidden = true; }
    }
    document.querySelectorAll('.tab').forEach(function (tab) {
      var on = tab.getAttribute('data-view') === ui.view;
      tab.classList.toggle('on', on);
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    VIEWS.forEach(function (name) {
      var el = document.getElementById('view-' + name);
      if (el) el.hidden = name !== ui.view;
    });
  }

  function renderWelcome() {
    var btn = document.getElementById('begin-btn');
    if (btn) btn.textContent = ui.state.onboarded ? 'Continue' : 'Begin';
  }

  function renderToday() {
    var box = document.getElementById('today-content');
    if (!box) return;
    var today = todayISO();
    var settings = ui.state.settings;
    var togA = document.getElementById('tog-arabic');
    var togT = document.getElementById('tog-translation');
    var togL = document.getElementById('tog-transliteration');
    if (togA) togA.checked = settings.showArabic;
    if (togT) togT.checked = settings.showTranslation;
    if (togL) togL.checked = settings.showTransliteration;
    var current = getCurrentNewGroup(ui.state, ui.curriculum);
    var dueG = getDueIndividuals(ui.state, ui.curriculum, today);
    var dueC = getDueCombined(ui.state, today);
    var html = '';
    if (current) {
      html += '<article class="card"><p class="kicker">New group</p><h3>' + escapeHtml(current.title) + '</h3>';
      html += '<p class="pill-row"><span class="pill example">' + escapeHtml(ui.curriculum.label || 'Example data') + '</span></p>';
      html += verseBlocks(current, ui.curriculum, settings, true);
      html += creditHtml(ui.curriculum);
      html += '<div class="row">' +
        '<button type="button" class="btn primary" id="remembered-today">Remembered today</button>' +
        '<button type="button" class="btn" id="practise-more">Practise a little more</button>' +
        '<button type="button" class="btn" data-save-type="group" data-save-id="' + escapeHtml(current.id) + '">Save this group</button>' +
        '</div></article>';
    }
    if (dueG.length || dueC.length) {
      html += '<article class="card"><h3>Reviews waiting today</h3><ul class="card-list">';
      dueC.forEach(function (c) {
        var titles = c.groupIds.map(function (id) {
          var g = getGroup(ui.curriculum, id);
          return g ? g.title : id;
        }).join(', ');
        html += '<li class="item-card"><span class="status-word due">Due today</span> Combined review: ' + escapeHtml(titles) + '</li>';
      });
      dueG.forEach(function (g) {
        html += '<li class="item-card"><span class="status-word due">Due today</span> ' + escapeHtml(g.title) + '</li>';
      });
      html += '</ul><div class="row"><button type="button" class="btn primary" id="go-review">Open the Review quiz</button></div></article>';
    }
    if (!current && !dueG.length && !dueC.length) {
      html += '<p class="empty">Nothing is waiting today. You can practise a saved verse, or rest.</p>';
    }
    box.innerHTML = html;
  }

  function reviewQueue(today) {
    var items = [];
    getDueCombined(ui.state, today).forEach(function (c) {
      items.push({ kind: 'combined', id: c.id, item: c });
    });
    getDueIndividuals(ui.state, ui.curriculum, today).forEach(function (g) {
      items.push({ kind: 'group', id: g.id, item: g });
    });
    return items;
  }

  function renderReview() {
    var box = document.getElementById('review-content');
    if (!box) return;
    var today = todayISO();
    var queue = reviewQueue(today);
    if (!queue.length) {
      ui.reviewReveal = false;
      box.innerHTML = '<p class="empty">Nothing to review just now.</p>';
      return;
    }
    var current = queue[0];
    var settings = ui.state.settings;
    var html = '<p class="muted small">One group at a time. There is no score.</p><article class="card">';
    if (current.kind === 'combined') {
      var titles = current.item.groupIds.map(function (id) {
        var g = getGroup(ui.curriculum, id);
        return g ? g.title : id;
      }).join(', ');
      html += '<p class="kicker">Combined review</p><h3>' + escapeHtml(titles) + '</h3>';
      html += '<p class="pill-row"><span class="status-word due">Due today</span></p>';
      current.item.groupIds.forEach(function (id) {
        var g = getGroup(ui.curriculum, id);
        if (g) html += '<h3>' + escapeHtml(g.title) + '</h3>' + verseBlocks(g, ui.curriculum, settings, ui.reviewReveal);
      });
    } else {
      html += '<p class="kicker">Review</p><h3>' + escapeHtml(current.item.title) + '</h3>';
      html += '<p class="pill-row"><span class="status-word due">Due today</span></p>';
      html += verseBlocks(current.item, ui.curriculum, settings, ui.reviewReveal);
    }
    html += creditHtml(ui.curriculum);
    if (settings.showArabic && !ui.reviewReveal) {
      html += '<button type="button" class="btn reveal-btn" id="reveal-arabic">Reveal the Arabic</button>';
    } else if (settings.showArabic && ui.reviewReveal) {
      html += '<button type="button" class="btn reveal-btn" id="reveal-arabic">Hide the Arabic</button>';
    }
    html += '<div class="row">' +
      '<button type="button" class="btn primary" id="review-remembered">Remembered</button>' +
      '<button type="button" class="btn" id="review-practice">Needs practice</button>' +
      '</div></article>';
    box.innerHTML = html;
  }

  function renderProgress() {
    var box = document.getElementById('progress-content');
    if (!box) return;
    var today = todayISO();
    var html = '<article class="card"><h3>Verse groups</h3>';
    groupsByOrder(ui.curriculum).forEach(function (g) {
      var rec = ui.state.groups[g.id];
      var label = groupStatusLabel(rec);
      var extra = '';
      if (rec && rec.nextReviewAt) extra = ' Next review: ' + formatDate(rec.nextReviewAt) + '.';
      html += '<div class="progress-row"><div><strong>' + escapeHtml(g.title) + '</strong><p class="muted small">' + escapeHtml(label) + '.' + extra + '</p></div>' +
        '<span class="status-word ' + escapeHtml(rec && rec.status === 'remembered' ? 'remembered' : rec && rec.status === 'learning' ? 'learning' : '') + '">' + escapeHtml(label) + '</span></div>';
    });
    html += '</article><article class="card"><h3>Combined reviews</h3>';
    var firstCount = groupsByOrder(ui.curriculum).filter(function (g) {
      return ui.state.groups[g.id] && ui.state.groups[g.id].firstRememberedAt;
    }).length;
    var until = 3 - (firstCount % 3);
    if (!ui.state.combinedReviews.length) {
      html += '<p>Next combined review: locked. It opens after three groups are first marked Remembered today (' + firstCount + ' of 3 so far).</p>';
    }
    ui.state.combinedReviews.forEach(function (c) {
      var st = combinedStatus(c, today);
      var titles = c.groupIds.map(function (id) {
        var g = getGroup(ui.curriculum, id);
        return g ? g.title : id;
      }).join(', ');
      var word = st === 'due' ? 'Due' : st === 'done' ? 'Done' : 'Locked';
      var extra = c.nextReviewAt ? ' Next date: ' + formatDate(c.nextReviewAt) + '.' : '';
      html += '<div class="progress-row"><div><strong>' + escapeHtml(titles) + '</strong><p class="muted small">' + word + '.' + extra + '</p></div>' +
        '<span class="status-word ' + (st === 'due' ? 'due' : st === 'done' ? 'remembered' : '') + '">' + word + '</span></div>';
    });
    if (ui.state.combinedReviews.length && until !== 3) {
      html += '<p class="muted">Another combined review unlocks after ' + until + ' more group' + (until === 1 ? '' : 's') + ' is first marked Remembered today.</p>';
    }
    html += '</article>';
    box.innerHTML = html;
  }

  function savedTitle(item) {
    var g = getGroup(ui.curriculum, item.id);
    return g ? g.title : item.id;
  }

  function renderSaved() {
    var box = document.getElementById('saved-content');
    if (!box) return;
    if (!ui.state.saved.length) {
      box.innerHTML = '<p class="empty">Nothing saved yet. Open a verse group and tap Save to find it later.</p>';
      return;
    }
    box.innerHTML = '<ul class="card-list">' + ui.state.saved.map(function (item) {
      return '<li class="item-card"><h3>' + escapeHtml(savedTitle(item)) + '</h3>' +
        (item.note ? '<p>' + escapeHtml(item.note) + '</p>' : '') +
        (getGroup(ui.curriculum, item.id) ? verseBlocks(getGroup(ui.curriculum, item.id), ui.curriculum, ui.state.settings, true) + creditHtml(ui.curriculum) : '') +
        '<p class="muted small">Verse group' + (item.createdAt ? ' · saved ' + formatDate(item.createdAt) : '') + '</p>' +
        '<label class="muted small" for="note-' + escapeHtml(item.type + '-' + item.id) + '">Private note</label>' +
        '<textarea class="note-field" id="note-' + escapeHtml(item.type + '-' + item.id) + '" data-note-type="' + escapeHtml(item.type) + '" data-note-id="' + escapeHtml(item.id) + '">' + escapeHtml(item.note || '') + '</textarea>' +
        '<div class="row"><button type="button" class="btn" data-open-saved-type="' + escapeHtml(item.type) + '" data-open-saved-id="' + escapeHtml(item.id) + '">Open</button>' +
        '<button type="button" class="btn" data-remove-type="' + escapeHtml(item.type) + '" data-remove-id="' + escapeHtml(item.id) + '">Remove</button></div></li>';
    }).join('') + '</ul>';
  }

  function render() {
    applyFont();
    renderTabs();
    if (ui.view === 'welcome') renderWelcome();
    if (ui.view === 'today') renderToday();
    if (ui.view === 'review') renderReview();
    if (ui.view === 'progress') renderProgress();
    if (ui.view === 'saved') renderSaved();
  }

  function bind() {
    document.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        setView(tab.getAttribute('data-view'));
      });
    });
    document.querySelectorAll('.seg-btn[data-size]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        ui.state = updateSettings(ui.state, { fontSize: btn.getAttribute('data-size') });
        persist();
        render();
      });
    });
    var begin = document.getElementById('begin-btn');
    if (begin) begin.addEventListener('click', function () {
      ui.state = setOnboarded(ui.state);
      persist();
      setView('today');
    });
    var clearBtn = document.getElementById('clear-data-btn');
    if (clearBtn) clearBtn.addEventListener('click', function () {
      ui.state = clearState(ui.curriculum, ui.store);
      persist();
      var status = document.getElementById('clear-status');
      if (status) status.textContent = 'Saved items and progress were cleared on this phone.';
      render();
    });
    ['tog-arabic', 'tog-translation', 'tog-transliteration'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', function () {
        var patch = {
          showArabic: document.getElementById('tog-arabic').checked,
          showTranslation: document.getElementById('tog-translation').checked,
          showTransliteration: document.getElementById('tog-transliteration').checked
        };
        if (id === 'tog-transliteration') patch.transliterationChosen = true;
        ui.state = updateSettings(ui.state, patch);
        persist();
        render();
      });
    });
    document.getElementById('main').addEventListener('click', function (ev) {
      var t = ev.target.closest('button');
      if (!t) return;
      if (t.id === 'remembered-today') {
        var current = getCurrentNewGroup(ui.state, ui.curriculum);
        if (current) {
          ui.state = markRememberedToday(ui.state, ui.curriculum, current.id, todayISO());
          persist();
          render();
        }
        return;
      }
      if (t.id === 'practise-more') {
        var cur = getCurrentNewGroup(ui.state, ui.curriculum);
        if (cur) {
          ui.state = practiseMore(ui.state, cur.id);
          persist();
          showToast('This group stays here so you can practise a little more.');
          render();
        }
        return;
      }
      if (t.id === 'go-review') {
        setView('review');
        return;
      }
      if (t.id === 'reveal-arabic') {
        ui.reviewReveal = !ui.reviewReveal;
        render();
        return;
      }
      if (t.id === 'review-remembered' || t.id === 'review-practice') {
        var today = todayISO();
        var queue = reviewQueue(today);
        var item = queue[0];
        var remembered = t.id === 'review-remembered';
        if (item && item.kind === 'combined') {
          ui.state = reviewCombined(ui.state, item.id, remembered, today);
        } else if (item) {
          ui.state = reviewGroup(ui.state, item.id, remembered, today);
        }
        ui.reviewReveal = false;
        persist();
        render();
        return;
      }
      if (t.getAttribute('data-save-type')) {
        var type = t.getAttribute('data-save-type');
        var id = t.getAttribute('data-save-id');
        ui.state = addSaved(ui.state, type, id, '', todayISO());
        persist();
        showToast('Saved on this phone.');
        render();
        return;
      }
      if (t.getAttribute('data-remove-type')) {
        var result = removeSaved(ui.state, t.getAttribute('data-remove-type'), t.getAttribute('data-remove-id'));
        var removed = result.removed;
        ui.state = result.state;
        persist();
        showToast('Removed.', function () {
          ui.state = restoreSaved(ui.state, removed);
          persist();
          render();
        });
        render();
        return;
      }
      if (t.getAttribute('data-open-saved-type') === 'group') {
        setView('today');
      }
    });
    document.getElementById('main').addEventListener('change', function (ev) {
      var t = ev.target;
      if (t.matches('textarea[data-note-id]')) {
        ui.state = addSaved(ui.state, t.getAttribute('data-note-type'), t.getAttribute('data-note-id'), t.value, todayISO());
        persist();
      }
    });
    var undo = document.getElementById('toast-undo');
    if (undo) undo.addEventListener('click', function () {
      if (ui.undoAction) ui.undoAction();
      document.getElementById('toast').hidden = true;
      ui.undoAction = null;
    });
    window.addEventListener('hashchange', function () {
      var parsed = parseHash();
      setView(parsed.view, parsed.about ? 'about' : undefined);
    });
  }

  function init(options) {
    options = options || {};
    ui.store = options.store || storageOr(null);
    function start(curriculum) {
      ui.curriculum = curriculum;
      ui.state = loadState(curriculum, ui.store);
      var parsed = parseHash();
      ui.view = parsed.view;
      if (typeof document !== 'undefined') {
        bind();
        if (parsed.about) setView('welcome', 'about');
        else render();
      }
      return ui.state;
    }
    if (options.curriculum) {
      return Promise.resolve(start(options.curriculum));
    }
    return Promise.all([
      fetch(DATA_CURRICULUM).then(function (r) { return r.json(); }),
      fetch(DATA_TANZIL).then(function (r) { return r.text(); }),
      fetch(DATA_CLEARQURAN).then(function (r) { return r.text(); }),
      fetch(DATA_TRANSLIT).then(function (r) { return r.json(); })
    ]).then(function (parts) {
      return start(hydrateCurriculum(parts[0], parsePipeVerses(parts[1]), parsePipeVerses(parts[2]), parts[3]));
    });
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    INTERVALS: INTERVALS,
    DISCLAIMER: DISCLAIMER,
    TRANSLIT_LINE: TRANSLIT_LINE,
    SOURCES_LINE: SOURCES_LINE,
    PRIVACY_LINE: PRIVACY_LINE,
    LAST_CHECKED: LAST_CHECKED,
    ARABIC_CREDIT: ARABIC_CREDIT,
    ENGLISH_CREDIT: ENGLISH_CREDIT,
    DATA_TRANSLIT: DATA_TRANSLIT,
    verseBlocks: verseBlocks,
    creditHtml: creditHtml,
    parsePipeVerses: parsePipeVerses,
    hydrateCurriculum: hydrateCurriculum,
    defaultSettings: defaultSettings,
    todayISO: todayISO,
    addDays: addDays,
    isDue: isDue,
    formatDate: formatDate,
    memoryStore: memoryStore,
    emptyState: emptyState,
    loadState: loadState,
    saveState: saveState,
    clearState: clearState,
    markRememberedToday: markRememberedToday,
    reviewGroup: reviewGroup,
    reviewCombined: reviewCombined,
    setLearning: setLearning,
    practiseMore: practiseMore,
    getCurrentNewGroup: getCurrentNewGroup,
    getDueIndividuals: getDueIndividuals,
    getDueCombined: getDueCombined,
    combinedStatus: combinedStatus,
    addSaved: addSaved,
    removeSaved: removeSaved,
    restoreSaved: restoreSaved,
    updateSettings: updateSettings,
    setOnboarded: setOnboarded,
    init: init
  };
});

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    if (window.IslamicGuide) window.IslamicGuide.init();
  });
}
