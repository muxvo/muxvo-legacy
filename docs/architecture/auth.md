# Auth Architecture

Three login methods (`AuthMethod = 'github' | 'google' | 'email'`):

```
src/modules/auth/auth-machine.ts   — State machine: LoggedOut → Authorizing → ExchangingToken → LoggedIn
src/main/services/auth/
  ├── auth-manager.ts              — Orchestrator (login flow, token refresh)
  └── backend-client.ts            — HTTP client for api.muxvo.com/auth/*
server/src/routes/auth.ts          — Backend: OAuth callbacks, JWT RS256, email verification
server/src/services/email.ts       — Email sending via Resend API
```
