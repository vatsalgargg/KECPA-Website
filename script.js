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

  // ── Input Sanitizer ───────────────────────────────────────────────────────
  // Strips all HTML tags, script-injectable characters, and dangerous patterns
  // from a string before it is sent anywhere. Defense against XSS / script injection.
  function sanitize(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/</g, '&lt;')          // block < (HTML tags / script injection)
      .replace(/>/g, '&gt;')          // block >
      .replace(/&(?!amp;|lt;|gt;|quot;|#\d+;)/g, '&amp;') // escape stray &
      .replace(/"/g, '&quot;')        // block attribute injection
      .replace(/'/g, '&#x27;')        // block attribute injection
      .replace(/`/g, '&#x60;')        // block template literal injection
      .replace(/javascript:/gi, '')   // block javascript: URIs
      .replace(/on\w+\s*=/gi, '')     // block inline event handlers (onclick= etc.)
      .trim();
  }

  // ── Field Validators ──────────────────────────────────────────────────────
  // Each returns null if valid, or an error string if invalid.
  const ALLOWED_SERVICES = [
    '', 'Financial Accounting & Reporting', 'Tax Preparation & Planning',
    'Audit Support & Compliance', 'Bookkeeping & Payroll', 'Virtual CFO & Advisory'
  ];

  const validators = {
    name(v) {
      if (!v || v.length < 2)  return 'Name must be at least 2 characters.';
      if (v.length > 80)       return 'Name must be under 80 characters.';
      if (!/^[A-Za-z\s'\-]+$/.test(v)) return 'Name may only contain letters, spaces, hyphens, and apostrophes.';
      return null;
    },
    phone(v) {
      if (!v || v.length < 7)  return 'Phone number must be at least 7 digits.';
      if (v.length > 20)       return 'Phone number must be under 20 characters.';
      if (!/^[\+]?[0-9\s\-\(\)]+$/.test(v)) return 'Enter a valid phone number.';
      return null;
    },
    email(v) {
      if (!v)                  return 'Email address is required.';
      if (v.length > 254)      return 'Email address is too long.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address.';
      return null;
    },
    service(v) {
      if (!ALLOWED_SERVICES.includes(v)) {
        secLog.warn('INVALID_SELECT_VALUE', { field: 'service', value: v });
        return 'Please select a valid service from the list.';
      }
      return null;
    },
    message(v) {
      if (v.length > 2000) return 'Message must be under 2000 characters.';
      return null;
    }
  };

  // Show / clear inline validation errors
  function showFieldError(id, msg) {
    let el = document.getElementById(id + '_err');
    if (!el) {
      el = document.createElement('span');
      el.id = id + '_err';
      el.className = 'field-error';
      el.setAttribute('role', 'alert');
      document.getElementById(id)?.insertAdjacentElement('afterend', el);
    }
    el.textContent = msg || '';
    el.style.display = msg ? 'block' : 'none';
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


  // VISITOR BADGE — src set via JS to avoid HTML & encoding issues; extraCount seeds from 1000
  const badge = document.getElementById('visitorBadge');
  if (badge) {
    badge.src = 'https://hits.sh/knowledgeexcellencecpa.com.svg?style=flat&label=Visitors&color=b8860b&labelColor=0a1628&extraCount=1000';
  }

  // 6. SCROLL TO TOP
  document.getElementById('scrollTop')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // 7. CONTACT FORM — with sanitization, validation, rate limiting, honeypot
  const contactForm = document.getElementById('contactForm');
  const submitBtn   = document.getElementById('submitBtn');
  const formStatus  = document.getElementById('formStatus');

  // Character counter for message field
  const msgArea    = document.getElementById('message');
  const msgCounter = document.getElementById('msgCounter');
  if (msgArea && msgCounter) {
    msgArea.addEventListener('input', () => {
      const len = msgArea.value.length;
      msgCounter.textContent = `${len} / 2000`;
      msgCounter.style.color = len > 1800 ? '#dc2626' : '';
    });
  }

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // 1. Honeypot check
      const honeypot = contactForm.querySelector('input[name="_gotcha"]');
      if (honeypot && honeypot.value) {
        secLog.warn('HONEYPOT_TRIGGERED', { field: '_gotcha' });
        return;
      }

      // 2. Rate limit check
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

      // 3. Validate all fields — show inline errors, abort if any fail
      const fields = { name: 'name', phone: 'phone', email: 'email', service: 'service', message: 'message' };
      let hasError = false;
      for (const [field, id] of Object.entries(fields)) {
        const el  = document.getElementById(id);
        const val = el ? el.value : '';
        const err = validators[field] ? validators[field](val) : null;
        showFieldError(id, err);
        if (err) hasError = true;
      }
      if (hasError) {
        secLog.warn('VALIDATION_FAILED', { fields: Object.keys(fields) });
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
        return;
      }

      // 4. Sanitize — build a clean FormData with stripped values only
      const cleanData = new FormData();
      cleanData.append('name',    sanitize(document.getElementById('name').value));
      cleanData.append('phone',   sanitize(document.getElementById('phone').value));
      cleanData.append('email',   sanitize(document.getElementById('email').value));
      cleanData.append('service', sanitize(document.getElementById('service').value));
      cleanData.append('message', sanitize(document.getElementById('message').value));

      try {
        const res = await fetch(contactForm.action, {
          method: 'POST',
          body: cleanData,
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
