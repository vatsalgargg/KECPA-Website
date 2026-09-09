# KECPA Website — Product Requirements Document

Created: 2026-09-09

## Problem
Redesign the existing Knowledge Excellence CPAs website with an original modern financial visual identity and performant 3D scroll animation. Preserve business content, SEO, contact information, existing form endpoints, and Cloudflare deployment. Preview locally and validate mobile, desktop, keyboard and reduced motion.

## Users and jobs
- U.S. CPA firms, businesses and individuals evaluating outsourced accounting, tax and advisory support.
- Understand KECPA's credentials and services, then call or request a consultation.

## Scope
- In scope: full responsive presentation redesign, financial 3D artwork, scroll-linked motion, accessible navigation and contact experience, local preview.
- Preserve original business copy, contact details, service choices, metadata and Formspree action.
- Out of scope: invented financial metrics, trading functionality and a new backend. User subsequently authorized responsive optimization and a push to GitHub main.

## Acceptance criteria
- No horizontal page overflow at 320, 375, 390, 430, 768, 1024, 1440 or 1920 pixels.
- All five services and three process steps remain available. Original headings, paragraphs, labels and contact details pass a comparison with HEAD.
- Native scrolling, functional mobile navigation, keyboard dismissal and visible focus.
- 3D artwork responds to scroll; reduced motion disables movement, including when changed while the page is open.
- Refresh returns to the top. Forms validate, handle failures, and work if browser storage is blocked.
- Browser form tests intercept delivery; no actual message is sent.
