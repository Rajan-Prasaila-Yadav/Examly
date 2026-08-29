# 22 — Security Architecture & Exam Integrity

Examly is engineered from the ground up to protect exam integrity, prevent unauthorized credential sharing, and safeguard intellectual property.

---

## 22.1 Authentication & Token Rotation Security

```
[ Client Request ] ──(Access Token: 15m)──► [ NestJS API ]
      │ (Expired 401)
      ▼
[ POST /auth/refresh-token ] ──(Refresh Token: 7d)──► [ Redis Token Store ]
      │ (Rotates refresh token & returns new access token)
      ▼
[ Client Stores New Tokens in Secure Storage ]
```

1. **Short-Lived JWT Access Tokens:** 15-minute expiration minimizes vulnerability if a bearer token is intercepted.
2. **Rotating Refresh Tokens:** Refreshing an expired session revokes the previous refresh token and issues a new pair.
3. **Password Security:** All passwords hashed with `bcrypt` using cost factor 12.

---

## 22.2 Anti-Cheat & Screen Security Mechanisms

| Threat | Defense Mechanism | Implementation |
|---|---|---|
| **Screenshot / Recording** | **`FLAG_SECURE` & iOS Shield** | Blocks OS-level screenshotting and screen recording on mobile apps. |
| **Phone Camera Recording** | **Dynamic Watermark Overlay** | Semi-transparent floating overlay displaying `Student Name + Roll No + IP`. |
| **Tab / App Switching** | **Visibility & Blur Event Listener** | Increments strike counter on app minimize; triggers auto-submit on strike 3. |
| **Question Leakage** | **Per-Student Option Shuffling** | Shuffles both question sequences and option choices ($A \to C, B \to A$) per attempt. |
| **Answer Manipulation** | **Server-Authoritative Clock** | Timers and late-join limits strictly computed on the backend; client clocks ignored. |
| **Credential Sharing** | **Single Active Session Limit** | Logging in on a new device automatically invalidates previous session tokens. |
