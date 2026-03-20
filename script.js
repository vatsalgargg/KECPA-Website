document.addEventListener('DOMContentLoaded', () => {
    // 1. Navbar Scroll Effect
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 2. Mobile Menu Toggle
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    
    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        const icon = menuToggle.querySelector('i');
        if (navLinks.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });

    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            const icon = menuToggle.querySelector('i');
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        });
    });

    // 3. Intersection Observer for scroll animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: Stop observing once animated if we only want it to happen once
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all animated elements
    const animatedElements = document.querySelectorAll('.fade-in, .fade-in-up, .slide-in-bottom, .fade-in-left, .fade-in-right');
    animatedElements.forEach(el => observer.observe(el));
    
    // 4. Smooth scrolling for anchor links 
    document.querySelectorAll('.scroll-top').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    });
    // 5. Contact Form — AJAX Submission via Formspree
    const contactForm = document.getElementById('contactForm');
    const submitBtn = document.getElementById('submitBtn');
    const formStatus = document.getElementById('formStatus');

    // 6. Visitor Counter via counterapi.dev (active CountAPI fork)
    const visitorCountEl = document.getElementById('visitorCount');
    if (visitorCountEl) {
        const LS_KEY = 'kecpa_visitor_count';

        function animateCount(target) {
            const stored = parseInt(localStorage.getItem(LS_KEY) || '0', 10);
            localStorage.setItem(LS_KEY, target);
            const start = Math.max(stored, Math.max(0, target - 80));
            const duration = 1500;
            const startTime = performance.now();
            const tick = (now) => {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                visitorCountEl.textContent = Math.floor(start + (target - start) * eased).toLocaleString();
                if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }

        // Show cached count immediately while the fetch runs
        const cached = localStorage.getItem(LS_KEY);
        if (cached) visitorCountEl.textContent = parseInt(cached, 10).toLocaleString();

        fetch('https://api.counterapi.dev/v1/kecpa-website/visits/hit')
            .then(res => { if (!res.ok) throw new Error('API error'); return res.json(); })
            .then(data => {
                if (data && data.count !== undefined) {
                    animateCount(data.count);
                }
            })
            .catch(() => {
                // Fallback: increment localStorage counter so it still ticks up
                const fallback = parseInt(localStorage.getItem(LS_KEY) || '0', 10) + 1;
                localStorage.setItem(LS_KEY, fallback);
                animateCount(fallback);
            });
    }

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Button loading state
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending…';
            formStatus.className = 'form-status';
            formStatus.textContent = '';

            try {
                const response = await fetch(contactForm.action, {
                    method: 'POST',
                    body: new FormData(contactForm),
                    headers: { 'Accept': 'application/json' }
                });

                if (response.ok) {
                    formStatus.className = 'form-status success';
                    formStatus.textContent = '✅ Thank you! We\'ll be in touch shortly.';
                    contactForm.reset();
                } else {
                    const data = await response.json();
                    const msg = data.errors ? data.errors.map(e => e.message).join(', ') : 'Something went wrong.';
                    formStatus.className = 'form-status error';
                    formStatus.textContent = '❌ ' + msg;
                }
            } catch (err) {
                formStatus.className = 'form-status error';
                formStatus.textContent = '❌ Network error. Please try again or email us directly.';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send Message';
            }
        });
    }
});
