# Engineering & Security Rules

1. Never commit secrets, tokens, private keys, or production credentials.
2. Enforce authorization server-side for every protected resource and action.
3. Validate input at trust boundaries; use parameterized queries and safe APIs.
4. Treat user-controlled URLs, files, templates, and redirects as hostile.
5. Use least privilege and secure defaults.
6. Do not log passwords, tokens, financial data, or unnecessary personal data.
7. Keep dependencies minimal and patched; pin/lock them.
8. Add tests for authorization, validation, and security regressions.
9. Call security_review_change after every change before declaring completion.
