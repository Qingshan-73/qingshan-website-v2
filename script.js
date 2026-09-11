/* ============================================================
   青嵩工坊 QS STUDIO — Micro-interactions
   ────────────────────────────────────────────────────────────
   架構說明（對接後台用）：
   ・initShell()    外殼互動（頁首、手機選單）→ 只執行一次
   ・initContent()   內容互動（進場動畫、數字遞增、FAQ 手風琴）
                     → 首次載入執行；若 /api/content 回傳新 HTML
                       覆蓋 #site-content 後，會再次執行
   ============================================================ */
(() => {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

  /* ============================================================
     SHELL — 外殼互動（與後台內容無關，只跑一次）
     ============================================================ */
  function initShell() {
    /* 頁首：滾動後浮現毛玻璃髮線 */
    const header = document.getElementById('siteHeader');
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    /* 手機版全屏選單 */
    const toggle = document.getElementById('menuToggle');
    const menu = document.getElementById('mobileMenu');
    const setMenu = open => {
      document.body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? '關閉選單' : '開啟選單');
      menu.setAttribute('aria-hidden', String(!open));
      document.body.style.overflow = open ? 'hidden' : '';
    };
    toggle.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) setMenu(false);
    });

    /* 手風琴展開中的面板，隨視窗縮放重新計算高度 */
    window.addEventListener('resize', () => {
      document.querySelectorAll('.acc-item.open .acc-body').forEach(body => {
        body.style.maxHeight = body.scrollHeight + 'px';
      });
    });
  }

  /* ============================================================
     CONTENT — 內容互動（後台注入新 HTML 後需重跑）
     ============================================================ */
  function initContent() {
    const root = document.getElementById('site-content') || document;

    /* ---------- 進場揭示（模糊＋位移＋淡入） ---------- */
    const revealEls = root.querySelectorAll('.reveal:not(.in)');
    if (prefersReduced) {
      revealEls.forEach(el => el.classList.add('in'));
    } else {
      const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      revealEls.forEach(el => io.observe(el));
    }

    /* ---------- 統計數字遞增 ---------- */
    const counters = root.querySelectorAll('[data-count]');
    if (counters.length) {
      const runCounter = el => {
        const target = parseInt(el.dataset.count, 10);
        const suffix = el.dataset.suffix || '';
        if (prefersReduced || isNaN(target)) { el.textContent = (target || 0) + suffix; return; }
        const duration = 1400;
        const start = performance.now();
        const tick = now => {
          const p = Math.min((now - start) / duration, 1);
          el.textContent = Math.round(easeOutCubic(p) * target) + (p === 1 ? suffix : '');
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      };
      const so = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          counters.forEach(runCounter);
          so.disconnect();
        });
      }, { threshold: 0.4 });
      so.observe(counters[0]);
    }

    /* ---------- FAQ 手風琴（單開模式） ---------- */
    root.querySelectorAll('.acc-item').forEach(item => {
      const head = item.querySelector('.acc-head');
      const body = item.querySelector('.acc-body');
      if (!head || !body) return;
      head.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        const parent = item.parentElement;
        if (parent) {
          parent.querySelectorAll('.acc-item.open').forEach(other => {
            if (other === item) return;
            other.classList.remove('open');
            other.querySelector('.acc-head').setAttribute('aria-expanded', 'false');
            other.querySelector('.acc-body').style.maxHeight = '0px';
          });
        }
        item.classList.toggle('open', !isOpen);
        head.setAttribute('aria-expanded', String(!isOpen));
        body.style.maxHeight = isOpen ? '0px' : body.scrollHeight + 'px';
      });
    });
  }

  /* ============================================================
     後台內容載入（沿用原有 /api/content 合約）
     ・成功且 data.html 有內容 → 覆蓋 #site-content 並重新初始化
     ・失敗或無資料 → 保留 index.html 內建預設內容
     ============================================================ */
  function boot() {
    initShell();
    fetch('/api/content')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data && data.html) {
          const target = document.getElementById('site-content');
          if (target) target.innerHTML = data.html;
        }
      })
      .catch(() => { /* 離線或無後台：使用預設內容 */ })
      .finally(() => initContent());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
