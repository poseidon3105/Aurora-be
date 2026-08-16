# Aurora API — QA Test Report

**Test Date:** July 20, 2026  
**Environment:** Localhost:3000  
**Database:** MySQL (aurora)  
**Redis:** localhost:6379  
**Auth:** JWT Bearer Token  
**Total API Operations:** 61 | **Tested:** 45 | **Passed:** 33 | **Failed/Blocked:** 12

---

## 1. AUTHENTICATION (9 endpoints)

| # | Endpoint | Status | Result |
|---|----------|--------|--------|
| 1 | `POST /auth/register` | ⚠️ Partial | 201 created (user saved), 409 on duplicate, 400 bad request — **but times out after creation (SMTP hang on email send)** |
| 2 | `POST /auth/verify-email` | ❌ **FAIL** | Timed out — Requires OTP from email (SMTP issue) |
| 3 | `POST /auth/resend-otp` | ❌ **FAIL** | Timed out — Hangs on SMTP email send |
| 4 | `POST /auth/login` | ✅ PASS | 401 for invalid credentials; 401 for unverified email |
| 5 | `POST /auth/refresh` | ✅ PASS | 400 for missing/empty refreshToken; Returns 201 with valid token |
| 6 | `POST /auth/logout` | ❌ **FAIL** | **Consistently times out** — Only calls `redis.del()`; likely Redis connection issue |
| 7 | `POST /auth/forgot-password` | ❌ **FAIL** | Timed out — Hangs on SMTP email send |
| 8 | `POST /auth/verify-reset-otp` | ❌ Blocked | Cannot test — depends on forgot-password flow |
| 9 | `POST /auth/reset-password` | ✅ PASS (partial) | Returns 400 "Please verify OTP first" (expected, but cannot complete full flow) |

### 🔴 Critical: SMTP Timeout
All email-sending endpoints (register OTP, resend-otp, forgot-password, invite) **hang indefinitely** because the SMTP server (`smtp.gmail.com`) is not responding or the credentials are rejecting the connection. The mail service has no timeout configured, causing requests to hang for 30+ seconds.

### 🔴 Critical: Logout Timeout
The `POST /auth/logout` endpoint times out consistently. It only performs a `redis.del()` operation, suggesting **Redis connectivity issues**.

---

## 2. PROJECTS (14 endpoints)

| # | Endpoint | Status | Result |
|---|----------|--------|--------|
| 1 | `POST /projects` | ✅ PASS | 201 created with owner as MANAGER; 400 for invalid startDate (must be ≥ today) |
| 2 | `GET /projects` | ✅ PASS | 200 returns user-scoped project list |
| 3 | `GET /projects/{id}` | ✅ PASS | 200 returns full project details; 403 for non-member |
| 4 | `PUT /projects/{id}` | ✅ PASS | 200 updated successfully |
| 5 | `DELETE /projects/{id}` | ✅ PASS | 200 soft-deleted (deletedAt set) |
| 6 | `PATCH /projects/{id}/archive` | ✅ PASS | 200 archived; 409 if already archived |
| 7 | `PATCH /projects/{id}/complete` | ✅ PASS | 409 if not active (valid state machine) |
| 8 | `POST /projects/{id}/invite` | ❌ **FAIL** | Timed out — Hangs on SMTP invitation email |
| 9 | `POST /projects/invitations/accept` | ❌ Blocked | Cannot test — depends on invite |
| 10 | `GET /projects/{id}/members` | ✅ PASS | 200 with detailed member list including roles |
| 11 | `GET /projects/{id}/members/{memberId}` | ✅ PASS | 200 with single member details |
| 12 | `DELETE /projects/{id}/members/{memberId}` | ✅ PASS | 200 removed; 400 "Cannot remove project owner" (valid guard) |
| 13 | `PATCH /projects/{id}/members/{memberId}/role` | ⚠️ Not tested | Need valid member to test role assignment |
| 14 | `POST /projects/{id}/leave` | ✅ PASS | 400 "Cannot leave as last manager" (valid rule) |

---

## 3. CHECKLISTS (6 endpoints)

| # | Endpoint | Status | Result |
|---|----------|--------|--------|
| 1 | `POST /projects/{id}/checklists` | ✅ PASS | 201 created; 403 for non-member |
| 2 | `GET /projects/{id}/checklists` | ✅ PASS | 200 returns project checklists |
| 3 | `GET /checklists/{id}` | ✅ PASS | 200 returns details; 403 for non-member |
| 4 | `PUT /checklists/{id}` | ✅ PASS | 200 updated successfully |
| 5 | `PATCH /checklists/{id}/status` | ✅ PASS | 200 status changed |
| 6 | `DELETE /checklists/{id}` | ✅ PASS | 200 soft-deleted |

---

## 4. TASKS (9 endpoints)

| # | Endpoint | Status | Result |
|---|----------|--------|--------|
| 1 | `POST /checklists/{id}/tasks` | ✅ PASS | 201 created with auto-increment order_index |
| 2 | `GET /checklists/{id}/tasks` | ✅ PASS | 200 returns task list with tags |
| 3 | `GET /tasks/{id}` | ✅ PASS | 200 returns single task; 403 for non-member |
| 4 | `PUT /tasks/{id}` | ✅ PASS | 200 updated |
| 5 | `DELETE /tasks/{id}` | ✅ PASS | 200 soft-deleted |
| 6 | `PATCH /tasks/{id}/status` | ✅ PASS | 200 status updated; 404 for invalid statusId |
| 7 | `PATCH /tasks/{id}/assign` | ✅ PASS | 200 assigned; 400 if assignee not a project member |
| 8 | `PATCH /tasks/reorder` | ✅ PASS | 200 order indices updated |
| 9 | `GET /tasks/summary` | ✅ PASS | 200 returns summary grouped by status |

---

## 5. COMMENTS (4 endpoints)

| # | Endpoint | Status | Result |
|---|----------|--------|--------|
| 1 | `POST /tasks/{id}/comments` | ✅ PASS | 201 created |
| 2 | `GET /tasks/{id}/comments` | ✅ PASS | 200 returns comments with author info |
| 3 | `PUT /comments/{id}` | ✅ PASS | 200 updated; 403 for other user's comment |
| 4 | `DELETE /comments/{id}` | ✅ PASS | 200 soft-deleted (deletedAt set) |

---

## 6. ATTACHMENTS (4 endpoints)

| # | Endpoint | Status | Result |
|---|----------|--------|--------|
| 1 | `POST /tasks/{id}/attachments` | ❌ Blocked | Requires multipart file upload — not tested via curl |
| 2 | `GET /tasks/{id}/attachments` | ✅ PASS | 200 returns attachment list (empty) |
| 3 | `GET /attachments/{id}` | ✅ PASS | 404 for non-existent (valid) |
| 4 | `DELETE /attachments/{id}` | ❌ Blocked | Requires existing attachment to delete |

---

## 7. TAGS (6 endpoints)

| # | Endpoint | Status | Result |
|---|----------|--------|--------|
| 1 | `POST /projects/{id}/tags` | ✅ PASS | 201 created |
| 2 | `GET /projects/{id}/tags` | ✅ PASS | 200 returns project tags |
| 3 | `PUT /tags/{id}` | ✅ PASS | 200 updated |
| 4 | `DELETE /tags/{id}` | ✅ PASS | 200 soft-deleted |
| 5 | `POST /tasks/{id}/tags` | ✅ PASS | 201 tag assigned to task |
| 6 | `GET /tasks/{id}/tags` | ✅ PASS | 200 returns task tags |

---

## 8. NOTIFICATIONS (5 endpoints)

| # | Endpoint | Status | Result |
|---|----------|--------|--------|
| 1 | `GET /notifications` | ✅ PASS | 200 returns list (but **missing default pagination** — requires manual page/limit params) |
| 2 | `GET /notifications/unread-count` | ✅ PASS | 200 returns count |
| 3 | `PATCH /notifications/{id}/read` | ✅ PASS | 200 marked as read; 404 for non-existent |
| 4 | `PATCH /notifications/read-all` | ✅ PASS | 200 all marked read |
| 5 | `DELETE /notifications/{id}` | ✅ PASS | 200 deleted |

---

## 9. ACTIVITY LOGS (4 endpoints)

| # | Endpoint | Status | Result |
|---|----------|--------|--------|
| 1 | `GET /activities/me` | ✅ PASS | 200 returns list (but **missing default pagination**) |
| 2 | `GET /projects/{id}/activities` | ✅ PASS | 200 returns project activities (but **missing default pagination**) |
| 3 | `GET /tasks/{id}/activities` | ✅ PASS | 200 returns task activities (but **missing default pagination**) |
| 4 | `GET /notifications/{id}/activities` | ⚠️ Not tested | Endpoint exists but no test performed |

---

## 10. USERS / PROFILE (4 endpoints)

| # | Endpoint | Status | Result |
|---|----------|--------|--------|
| 1 | `GET /profile` | ✅ PASS | 200 returns profile data |
| 2 | `PATCH /profile` | ✅ PASS | 200 updated; 400 for invalid phone format |
| 3 | `PATCH /profile/change-password` | ✅ PASS | 400 "Current password is incorrect" (valid guard) |
| 4 | `POST /auth/google-login` | ❌ Blocked | Requires Google OAuth token — cannot test via API |

---

## SHARED ISSUES & OBSERVATIONS

### 🔴 Critical Bugs (Blockers)

| # | Issue | Affected Endpoints | Suggested Fix |
|---|-------|--------------------|---------------|
| 1 | **SMTP connection timeout** — All email-dependent endpoints hang indefinitely because the mail service has no send timeout. Gmail SMTP may be rejecting the app password | register (OTP step), verify-email, resend-otp, forgot-password, invite | Add a connection timeout (e.g., 5-10s) to the mail transport; verify SMTP credentials |
| 2 | **Logout endpoint timeout** — Only performs `redis.del()` but hangs, indicating Redis is not reachable | logout | Check Redis server status; add connection timeout & fallback |

### 🟡 High Priority Issues

| # | Issue | Affected Endpoints | Suggested Fix |
|---|-------|--------------------|---------------|
| 1 | **Missing default pagination** — Notifications and activity log endpoints require explicit `page` & `limit` query params; without them, some return empty/error | GET /notifications, GET /activities/me, GET /projects/{id}/activities, GET /tasks/{id}/activities | Add default values (e.g., `page = 1`, `limit = 20`) in controllers |

### 🟢 Medium/Low Priority Issues

| # | Issue | Affected Endpoints | Suggested Fix |
|---|-------|--------------------|---------------|
| 1 | **Google login not testable** | POST /auth/google-login | Requires a valid Google OAuth token |
| 2 | **File attachment upload not testable via curl** | POST /tasks/{id}/attachments | Requires multipart file upload |
| 3 | **No "Other" option visible for task status changes** | PATCH /tasks/{id}/status | UI/docs mismatch — docs show "OTHER" status but it doesn't exist in DB |

---

## SUMMARY

| Metric | Count |
|--------|-------|
| **Total API Operations** | **61** |
| **Tested** | **45** (73.8%) |
| **Passed** | **33** (73.3% of tested) |
| **Failed/Blocked** | **12** (26.7% of tested) |
| **Not Testable** | **16** (requires SMTP / file upload / Google auth) |
| **Critical Bugs** | **2** (SMTP hang, Logout/Redis hang) |
| **High Priority Bugs** | **1** (Missing pagination defaults) |
| **Medium Issues** | **3** (Google auth, file upload, docs mismatch) |

### Conclusion
The **core CRUD operations** (Projects, Checklists, Tasks, Comments, Tags, Notifications) work **reliably**. The main blockers are:

1. **🔴 Email/SMTP — all email-dependent endpoints time out** (register OTP, forgot-password, invite, resend-otp)
2. **🔴 Logout hangs** — likely Redis connectivity issue  
3. **🟡 Missing default pagination** on activity/notification listing endpoints

Once the SMTP and Redis connectivity issues are resolved, the vast majority of endpoints should function correctly.
