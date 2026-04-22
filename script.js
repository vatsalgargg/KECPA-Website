document.addEventListener('DOMContentLoaded', () => {

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Security Logger ──────────────────────────────────────────────────────
  // Structured client-side logging for anomalies, API errors, and spam attempts.
  // In production, replace console.warn with a POST to your logging endpoint.
  const secLog = {
    _fmt: (level, event, detail) => ({
      level, event, detail,
      ts: new Date().toISOString(),
      url: location.href,
      ua: navigator.userAgent.slice(0, 120)
    }),
    warn:  (event, detail) => console.warn('[KECPA-SEC]',  JSON.stringify(secLog._fmt('WARN',  event, detail))),
    error: (event, detail) => console.error('[KECPA-SEC]', JSON.stringify(secLog._fmt('ERROR', event, detail))),
    info:  (event, detail) => console.info('[KECPA-SEC]',  JSON.stringify(secLog._fmt('INFO',  event, detail))),
  };

  // ── Form Rate Limiter ─────────────────────────────────────────────────────
  // Prevents repeated submissions within 60 seconds.
  const RATE_LIMIT_MS = 60_000;
  const RL_KEY = 'kecpa_form_last_submit';
  function isRateLimited() {
    const last = parseInt(localStorage.getItem(RL_KEY) || '0', 10);
    return Date.now() - last < RATE_LIMIT_MS;
  }
  function markSubmission() {
    localStorage.setItem(RL_KEY, Date.now());
  }

  // 1. NAVBAR SCROLL
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  // 2. MOBILE MENU
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');
  menuToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    menuToggle.classList.toggle('open', isOpen);
  });
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      menuToggle.classList.remove('open');
    });
  });

  // 3. SCROLL REVEAL
  if (prefersReducedMotion) {
    // Skip animations — make everything visible immediately
    document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right').forEach(el => el.classList.add('visible'));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right').forEach(el => observer.observe(el));
  }

  // 4. STATS COUNTER ANIMATION
  const statNumbers = document.querySelectorAll('.stat-number[data-target]');
  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        statsObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  statNumbers.forEach(el => statsObserver.observe(el));

  function animateCount(el) {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1600;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(eased * target).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // 5. GLOBAL VISITOR COUNTER (counterapi.dev — shared count for ALL visitors)
  const visitorCountEl = document.getElementById('visitorCount');
  if (visitorCountEl) {
    // Show cached value immediately (so it doesn't flicker on load)
    const cached = localStorage.getItem('kecpa_vc_cache');
    if (cached) visitorCountEl.textContent = parseInt(cached, 10).toLocaleString();

    // Hit the global counter — every visitor increments the SAME shared count
    fetch('https://api.counterapi.dev/v1/kecpa-website/visits/hit')
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(data => {
        if (data && data.count !== undefined) {
          const count = data.count;
          localStorage.setItem('kecpa_vc_cache', count); // cache for instant display next visit
          animateVisitor(count);
        }
      })
      .catch(() => {
        // API failed — show cached value only, do NOT increment locally
        if (cached) {
          visitorCountEl.textContent = parseInt(cached, 10).toLocaleString();
        } else {
          visitorCountEl.textContent = '—';
        }
      });

    function animateVisitor(target) {
      const start = parseInt(cached || Math.max(0, target - 60), 10);
      const duration = 1200;
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min((now - t0) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        visitorCountEl.textContent = Math.floor(start + (target - start) * eased).toLocaleString();
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }

  // 6. SCROLL TO TOP
  document.getElementById('scrollTop')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // 7. CONTACT FORM (Formspree AJAX + rate limit + honeypot + security logging)
  const contactForm = document.getElementById('contactForm');
  const submitBtn = document.getElementById('submitBtn');
  const formStatus = document.getElementById('formStatus');

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Honeypot check — bots fill hidden _gotcha field
      const honeypot = contactForm.querySelector('input[name="_gotcha"]');
      if (honeypot && honeypot.value) {
        secLog.warn('HONEYPOT_TRIGGERED', { field: '_gotcha' });
        return; // silently reject bot
      }

      // Rate limit check
      if (isRateLimited()) {
        const remaining = Math.ceil((RATE_LIMIT_MS - (Date.now() - parseInt(localStorage.getItem(RL_KEY) || '0', 10))) / 1000);
        secLog.warn('RATE_LIMIT_HIT', { cooldown_s: remaining });
        formStatus.className = 'form-status error';
        formStatus.textContent = `⚠️ Please wait ${remaining}s before sending another message.`;
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…';
      formStatus.className = 'form-status';
      formStatus.textContent = '';

      try {
        const res = await fetch(contactForm.action, {
          method: 'POST',
          body: new FormData(contactForm),
          headers: { 'Accept': 'application/json' }
        });

        if (res.ok) {
          markSubmission();
          secLog.info('FORM_SUBMIT_SUCCESS', { status: res.status });
          formStatus.className = 'form-status success';
          formStatus.textContent = '✅ Thank you! We\'ll be in touch within 24 hours.';
          contactForm.reset();
        } else {
          const data = await res.json().catch(() => ({}));
          const msg = data.errors ? data.errors.map(e => e.message).join(', ') : 'Submission failed.';
          secLog.error('FORM_SUBMIT_FAILED', { status: res.status, msg });
          formStatus.className = 'form-status error';
          formStatus.textContent = '❌ ' + msg;
        }
      } catch (err) {
        secLog.error('FORM_NETWORK_ERROR', { message: err.message });
        formStatus.className = 'form-status error';
        formStatus.textContent = '❌ Network error. Please email us directly.';
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
      }
    });
  }

  // Log unhandled JS errors (unusual JS exceptions may indicate tampering)
  window.addEventListener('error', (e) => {
    secLog.error('UNHANDLED_JS_ERROR', { message: e.message, file: e.filename, line: e.lineno });
  });

  // Log failed resource loads (CSP violations, blocked scripts, missing assets)
  window.addEventListener('error', (e) => {
    if (e.target && e.target !== window) {
      secLog.warn('RESOURCE_LOAD_FAILED', { tag: e.target.tagName, src: e.target.src || e.target.href });
    }
  }, true);

});
