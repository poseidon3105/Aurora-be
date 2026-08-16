# Aurora API - Test Plan, Test Scenarios, Test Cases & API Documentation

- Source: `docs-json.json`
- Generated date: `2026-07-19`
- API title: `Aurora API`
- Description: Checklist Management System API
- Version: `1.0`
- OpenAPI: `3.0.0`
- Paths: `45`
- Operations: `61`
- Schemas: `27`
- Auth scheme: `bearer JWT` cho cac endpoint co `security: bearer`.

> Ghi chu QA: OpenAPI hien tai chua mo ta day du `minLength`, `pattern`, default pagination, response schema va error body cho tat ca endpoint. Test case validation mac dinh ky vong `400 Bad Request` neu spec khong ghi ro status khac.

## Module Overview

| Module | Operations | Main Responsibility |
|---|---:|---|
| Authentication | 9 | Dang ky tai khoan, xac thuc email bang OTP, dang nhap, refresh/logout token va reset password. |
| Activity Logs | 3 | Truy van lich su hoat dong cua user, project va task de phuc vu audit trail. |
| Projects | 14 | Quan ly vong doi project, thanh vien, loi moi, role va hanh dong roi/xoa project. |
| Notifications | 5 | Quan ly notification cua user hien tai, trang thai da doc/chua doc va unread count. |
| Checklists | 6 | Quan ly checklist trong project, chi tiet checklist, soft delete va chuyen trang thai. |
| Tasks | 9 | Quan ly task trong checklist, gan nguoi phu trach, chuyen trang thai, sap xep va dashboard summary. |
| Task Comments | 4 | Binh luan tren task, cap nhat/xoa comment va xu ly mention. |
| Task Attachments | 4 | Upload, liet ke, download URL va soft delete file dinh kem cua task. |
| Tags | 7 | Quan ly tag theo project va gan/go tag tren task. |

## Test Plan

### Objectives

- Xac minh API Aurora dap ung dung OpenAPI contract va cac business rule mo ta trong summary/response.
- Bao phu happy path, validation, boundary, authentication, authorization, business logic va security cho tung endpoint.
- Dam bao cac luong lien module nhu project -> checklist -> task -> comment/attachment/tag -> notification/activity log hoat dong nhat quan.

### Scope In

- REST API trong OpenAPI `Aurora API` version `1.0`.
- JWT bearer authentication, role/project membership authorization va current-user data isolation.
- CRUD/status/soft-delete/hard-delete, invitation, OTP, file upload, pagination va dashboard summary.

### Scope Out

- UI/Web frontend, email provider thuc te, Azure Blob infrastructure thuc te va performance/load test quy mo lon.
- Database migration va internal implementation khong the quan sat qua API.

### Test Strategy

| Test Type | Approach |
|---|---|
| Contract | Kiem tra method/path/status/request schema/required field/content-type theo OpenAPI. |
| Functional | Chay full flow theo module va cross-module flow project-checklist-task. |
| Negative | Missing field, sai type, ID khong ton tai, invalid status/role/token. |
| Boundary | Do dai max, min password/OTP, page/limit, file 20MB, position 0-based, ID boundary. |
| AuthN/AuthZ | Missing/expired/malformed token, non-member, wrong role, owner-only/current-user-only. |
| Security | IDOR, injection, XSS, mass assignment, replay/race, file upload attack, information leakage. |
| Regression | Automation smoke cho P0/P1 va rerun khi thay doi controller/service/guard/DTO. |

### Test Environment

- Base URL: lay tu environment test/staging.
- Database: test database co seed data rieng, reset duoc.
- Mail/OTP: dung mail sandbox hoac test hook de doc OTP.
- Storage: Azure Blob test container hoac mock storage co kha nang verify upload/delete.
- Tools goi y: Postman/Newman, Jest/Supertest, k6 cho smoke load, OWASP ZAP cho security baseline.

### Test Data

| Data | Purpose |
|---|---|
| `owner@example.com` | Project creator/manager. |
| `member@example.com` | Normal project member/assignee/comment owner. |
| `outsider@example.com` | Authenticated user not in project for 403/IDOR. |
| `admin@example.com`, `superadmin@example.com` | Role-based project/tag/member permission. |
| Project active/archived/completed/deleted | Status transition and forbidden mutation. |
| Checklist OPEN/IN_PROGRESS/DONE/deleted | Checklist status/delete rules. |
| Task TODO/IN_PROGRESS/REVIEW/DONE/deleted | Task status/update/delete/summary. |
| Files 0B, 1KB, 20MB, 20MB+1 | Attachment boundary/security. |

### Entry Criteria

- OpenAPI spec build thanh cong va test environment deploy dung version.
- Co seed data/credential cho cac role va project membership can thiet.
- Co cach lay OTP/invitation token/reset OTP trong moi truong test.

### Exit Criteria

- 100% P0 pass; khong con defect Critical/High dang open.
- Tat ca endpoint co ket qua cho 7 nhom test case trong tai lieu nay.
- Contract test va smoke regression chay thanh cong tren CI/staging.

### Risks

- Spec chua co response schema/error schema nen automation assertion body can bo sung sau khi quan sat implementation.
- Default pagination/range limit chua ro, can xac nhan voi BE de chot expected.
- Authorization phu thuoc roleId cu the nhung OpenAPI chua liet ke role catalog.

## API Documentation By Module

### Authentication

Dang ky tai khoan, xac thuc email bang OTP, dang nhap, refresh/logout token va reset password.

| Method | Path | Auth | Summary |
|---|---|---|---|
| `POST` | `/auth/register` | Public/body token | Register a new user account |
| `POST` | `/auth/verify-email` | Public/body token | Verify email with OTP |
| `POST` | `/auth/resend-otp` | Public/body token | Resend email verification OTP |
| `POST` | `/auth/login` | Public/body token | Login with email and password |
| `POST` | `/auth/refresh` | Public/body token | Refresh access token using refresh token |
| `POST` | `/auth/logout` | Bearer JWT | Logout and invalidate refresh token |
| `POST` | `/auth/forgot-password` | Public/body token | Request password reset OTP |
| `POST` | `/auth/verify-reset-otp` | Public/body token | Verify password reset OTP |
| `POST` | `/auth/reset-password` | Public/body token | Reset password after OTP verification |

#### `POST /auth/register`

- Summary: Register a new user account
- Operation ID: `AuthController_register`
- Authentication: No bearer JWT required

**Parameters**

_Khong co parameter._

**Request Body**

- Content-Type: `application/json`
- Required: Yes
- Schema: `RegisterDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| email | Yes | string | required | user@example.com | Registration email |
| password | Yes | string | required, min password length 8, requires uppercase, requires special char | Abc@1234 | Password (min 8 chars, 1 uppercase, 1 special char) |
| fullName | Yes | string | required | John Doe | Full name |

**Sample**

```json
{
  "email": "user@example.com",
  "password": "Abc@1234",
  "fullName": "John Doe"
}
```

**Responses**

| Status | Meaning |
|---:|---|
| 201 | Registration successful. Please verify your email. |
| 409 | Email already exists |

**QA Notes**

- 409: Email already exists

#### `POST /auth/verify-email`

- Summary: Verify email with OTP
- Operation ID: `AuthController_verifyEmail`
- Authentication: No bearer JWT required

**Parameters**

_Khong co parameter._

**Request Body**

- Content-Type: `application/json`
- Required: Yes
- Schema: `VerifyEmailDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| email | Yes | string | required | user@example.com |  |
| otp | Yes | string | required, 6 digits | 123456 | 6-digit OTP |

**Sample**

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Email verified successfully |
| 400 | Invalid or expired OTP |

**QA Notes**

- 400: Invalid or expired OTP

#### `POST /auth/resend-otp`

- Summary: Resend email verification OTP
- Operation ID: `AuthController_resendOtp`
- Authentication: No bearer JWT required

**Parameters**

_Khong co parameter._

**Request Body**

- Content-Type: `application/json`
- Required: Yes
- Schema: `ResendOtpDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| email | Yes | string | required | user@example.com |  |

**Sample**

```json
{
  "email": "user@example.com"
}
```

**Responses**

| Status | Meaning |
|---:|---|
| 200 | OTP sent successfully |
| 429 | Too many OTP requests |

**QA Notes**

- 429: Too many OTP requests

#### `POST /auth/login`

- Summary: Login with email and password
- Operation ID: `AuthController_login`
- Authentication: No bearer JWT required

**Parameters**

_Khong co parameter._

**Request Body**

- Content-Type: `application/json`
- Required: Yes
- Schema: `LoginDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| email | Yes | string | required | user@example.com |  |
| password | Yes | string | required | Abc@1234 |  |

**Sample**

```json
{
  "email": "user@example.com",
  "password": "Abc@1234"
}
```

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Returns access and refresh tokens |
| 401 | Invalid credentials or unverified email |

**QA Notes**

- 401: Invalid credentials or unverified email

#### `POST /auth/refresh`

- Summary: Refresh access token using refresh token
- Operation ID: `AuthController_refresh`
- Authentication: No bearer JWT required

**Parameters**

_Khong co parameter._

**Request Body**

- Content-Type: `application/json`
- Required: Yes
- Schema: `RefreshTokenDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| refreshToken | Yes | string | required | valid-token | Refresh token |

**Sample**

```json
{
  "refreshToken": "valid-token"
}
```

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Returns new access token |
| 401 | Invalid or expired refresh token |

**QA Notes**

- 401: Invalid or expired refresh token

#### `POST /auth/logout`

- Summary: Logout and invalidate refresh token
- Operation ID: `AuthController_logout`
- Authentication: Bearer JWT required

**Parameters**

_Khong co parameter._

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Logged out successfully |
| 401 | Unauthorized |

**QA Notes**

- Can JWT bearer token hop le.
- 401: Unauthorized

#### `POST /auth/forgot-password`

- Summary: Request password reset OTP
- Operation ID: `AuthController_forgotPassword`
- Authentication: No bearer JWT required

**Parameters**

_Khong co parameter._

**Request Body**

- Content-Type: `application/json`
- Required: Yes
- Schema: `ForgotPasswordDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| email | Yes | string | required | user@example.com |  |

**Sample**

```json
{
  "email": "user@example.com"
}
```

**Responses**

| Status | Meaning |
|---:|---|
| 200 | If the email exists, a password reset OTP has been sent |

**QA Notes**

- Khong co business note dac biet trong OpenAPI.

#### `POST /auth/verify-reset-otp`

- Summary: Verify password reset OTP
- Operation ID: `AuthController_verifyResetOtp`
- Authentication: No bearer JWT required

**Parameters**

_Khong co parameter._

**Request Body**

- Content-Type: `application/json`
- Required: Yes
- Schema: `VerifyResetOtpDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| email | Yes | string | required | user@example.com |  |
| otp | Yes | string | required, 6 digits | 123456 | 6-digit OTP |

**Sample**

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Responses**

| Status | Meaning |
|---:|---|
| 200 | OTP verified. You can now reset your password. |
| 400 | Invalid or expired OTP |

**QA Notes**

- 400: Invalid or expired OTP

#### `POST /auth/reset-password`

- Summary: Reset password after OTP verification
- Operation ID: `AuthController_resetPassword`
- Authentication: No bearer JWT required

**Parameters**

_Khong co parameter._

**Request Body**

- Content-Type: `application/json`
- Required: Yes
- Schema: `ResetPasswordDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| email | Yes | string | required | user@example.com |  |
| newPassword | Yes | string | required, min password length 8, requires uppercase, requires special char | NewAbc@1234 | New password (min 8 chars, 1 uppercase, 1 special char) |

**Sample**

```json
{
  "email": "user@example.com",
  "newPassword": "NewAbc@1234"
}
```

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Password reset successfully |
| 400 | OTP not verified or invalid |

**QA Notes**

- 400: OTP not verified or invalid

### Activity Logs

Truy van lich su hoat dong cua user, project va task de phuc vu audit trail.

| Method | Path | Auth | Summary |
|---|---|---|---|
| `GET` | `/activities/me` | Bearer JWT | Get activity logs for the authenticated user |
| `GET` | `/projects/{projectId}/activities` | Bearer JWT | Get activity logs related to a project |
| `GET` | `/tasks/{taskId}/activities` | Bearer JWT | Get activity logs related to a task |

#### `GET /activities/me`

- Summary: Get activity logs for the authenticated user
- Operation ID: `ActivityLogController_findMyActivities`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| page | query | No | number | Page number |
| limit | query | No | number | Records per page |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Paginated activity logs returned |
| 401 | Unauthorized |

**QA Notes**

- Can JWT bearer token hop le.
- Can test page/limit voi gia tri mac dinh, nho nhat, am va qua lon.
- 401: Unauthorized

#### `GET /projects/{projectId}/activities`

- Summary: Get activity logs related to a project
- Operation ID: `ActivityLogController_findProjectActivities`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| projectId | path | Yes | number | Project ID |
| page | query | No | number | Page number |
| limit | query | No | number | Records per page |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Paginated project activity logs returned |
| 401 | Unauthorized |
| 403 | Forbidden - not a project member |

**QA Notes**

- Can JWT bearer token hop le.
- Can test page/limit voi gia tri mac dinh, nho nhat, am va qua lon.
- 401: Unauthorized
- 403: Forbidden - not a project member

#### `GET /tasks/{taskId}/activities`

- Summary: Get activity logs related to a task
- Operation ID: `ActivityLogController_findTaskActivities`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| taskId | path | Yes | number | Task ID |
| page | query | No | number | Page number |
| limit | query | No | number | Records per page |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Paginated task activity logs returned |
| 401 | Unauthorized |
| 403 | Forbidden - not a project member |
| 404 | Task not found |

**QA Notes**

- Can JWT bearer token hop le.
- Can test page/limit voi gia tri mac dinh, nho nhat, am va qua lon.
- 401: Unauthorized
- 403: Forbidden - not a project member
- 404: Task not found

### Projects

Quan ly vong doi project, thanh vien, loi moi, role va hanh dong roi/xoa project.

| Method | Path | Auth | Summary |
|---|---|---|---|
| `POST` | `/projects` | Bearer JWT | Create a new project |
| `GET` | `/projects` | Bearer JWT | Get all projects owned by or shared with the user |
| `GET` | `/projects/{projectId}` | Bearer JWT | Get project details by ID |
| `PUT` | `/projects/{projectId}` | Bearer JWT | Update project |
| `DELETE` | `/projects/{projectId}` | Bearer JWT | Soft delete a project (manager, super admin, or admin) |
| `PATCH` | `/projects/{projectId}/archive` | Bearer JWT | Archive a project (manager only) |
| `PATCH` | `/projects/{projectId}/complete` | Bearer JWT | Complete a project (manager only) |
| `POST` | `/projects/{projectId}/invite` | Bearer JWT | Invite a user to join the project (manager only) |
| `POST` | `/projects/invitations/accept` | Bearer JWT | Accept a project invitation |
| `GET` | `/projects/{projectId}/members` | Bearer JWT | Get all members of a project |
| `GET` | `/projects/{projectId}/members/{memberId}` | Bearer JWT | Get member details |
| `DELETE` | `/projects/{projectId}/members/{memberId}` | Bearer JWT | Remove a member from the project (manager, admin, or super admin) |
| `PATCH` | `/projects/{projectId}/members/{memberId}/role` | Bearer JWT | Update a member's role (manager only) |
| `POST` | `/projects/{projectId}/leave` | Bearer JWT | Leave a project |

#### `POST /projects`

- Summary: Create a new project
- Operation ID: `ProjectsController_create`
- Authentication: Bearer JWT required

**Parameters**

_Khong co parameter._

**Request Body**

- Content-Type: `application/json`
- Required: Yes
- Schema: `CreateProjectDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| name | Yes | string | required | My Project | Project name |
| description | No | string | - | A description of the project | Project description |
| startDate | No | string | - | 2025-01-01 | Project start date |
| endDate | No | string | - | 2025-12-31 | Project end date |

**Sample**

```json
{
  "name": "My Project",
  "description": "A description of the project",
  "startDate": "2025-01-01",
  "endDate": "2025-12-31"
}
```

**Responses**

| Status | Meaning |
|---:|---|
| 201 | Project created successfully |
| 400 | Invalid input or end date before start date |
| 401 | Unauthorized |

**QA Notes**

- Can JWT bearer token hop le.
- 400: Invalid input or end date before start date
- 401: Unauthorized

#### `GET /projects`

- Summary: Get all projects owned by or shared with the user
- Operation ID: `ProjectsController_findAll`
- Authentication: Bearer JWT required

**Parameters**

_Khong co parameter._

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | List of projects returned |
| 401 | Unauthorized |

**QA Notes**

- Can JWT bearer token hop le.
- 401: Unauthorized

#### `GET /projects/{projectId}`

- Summary: Get project details by ID
- Operation ID: `ProjectsController_findOne`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| projectId | path | Yes | number | Project ID |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Project details returned |
| 401 | Unauthorized |
| 403 | Forbidden - not a member, super admin, or admin |
| 404 | Project not found |

**QA Notes**

- Can JWT bearer token hop le.
- 401: Unauthorized
- 403: Forbidden - not a member, super admin, or admin
- 404: Project not found

#### `PUT /projects/{projectId}`

- Summary: Update project
- Operation ID: `ProjectsController_update`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| projectId | path | Yes | number | Project ID |

**Request Body**

- Content-Type: `application/json`
- Required: Yes
- Schema: `UpdateProjectDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| name | No | string | - | My Updated Project | Project name |
| description | No | string | - | An updated description | Project description |
| endDate | No | string | - | 2025-12-31 | Project end date |

**Sample**

```json
{
  "name": "My Updated Project",
  "description": "An updated description",
  "endDate": "2025-12-31"
}
```

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Project updated successfully |
| 400 | Invalid input or project is deleted |
| 401 | Unauthorized |
| 403 | Forbidden - not a manager, super admin, or admin |
| 404 | Project not found |

**QA Notes**

- Can JWT bearer token hop le.
- 400: Invalid input or project is deleted
- 401: Unauthorized
- 403: Forbidden - not a manager, super admin, or admin
- 404: Project not found

#### `DELETE /projects/{projectId}`

- Summary: Soft delete a project (manager, super admin, or admin)
- Operation ID: `ProjectsController_remove`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| projectId | path | Yes | number | Project ID |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Project deleted successfully |
| 401 | Unauthorized |
| 403 | Forbidden - not a manager, super admin, or admin |
| 404 | Project not found |

**QA Notes**

- Can JWT bearer token hop le.
- Can phan biet role manager/admin/super admin/member.
- Day la soft delete; can verify ban ghi khong con hien trong luong chinh va audit log van giu duoc.
- 401: Unauthorized
- 403: Forbidden - not a manager, super admin, or admin
- 404: Project not found

#### `PATCH /projects/{projectId}/archive`

- Summary: Archive a project (manager only)
- Operation ID: `ProjectsController_archive`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| projectId | path | Yes | number | Project ID |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Project archived successfully |
| 401 | Unauthorized |
| 403 | Forbidden - not a project manager |
| 404 | Project not found |
| 409 | Project is not active |

**QA Notes**

- Can JWT bearer token hop le.
- Quyen manager la dieu kien bat buoc.
- 401: Unauthorized
- 403: Forbidden - not a project manager
- 404: Project not found
- 409: Project is not active

#### `PATCH /projects/{projectId}/complete`

- Summary: Complete a project (manager only)
- Operation ID: `ProjectsController_complete`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| projectId | path | Yes | number | Project ID |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Project completed successfully |
| 401 | Unauthorized |
| 403 | Forbidden - not a project manager |
| 404 | Project not found |
| 409 | Project is not active |

**QA Notes**

- Can JWT bearer token hop le.
- Quyen manager la dieu kien bat buoc.
- 401: Unauthorized
- 403: Forbidden - not a project manager
- 404: Project not found
- 409: Project is not active

#### `POST /projects/{projectId}/invite`

- Summary: Invite a user to join the project (manager only)
- Operation ID: `ProjectsController_inviteMember`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| projectId | path | Yes | number | Project ID |

**Request Body**

- Content-Type: `application/json`
- Required: Yes
- Schema: `InviteMemberDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| email | Yes | string | required | user@gmail.com | Email of the invitee |
| roleId | Yes | number | required | 2 | Role ID to assign in the project |

**Sample**

```json
{
  "email": "user@gmail.com",
  "roleId": 2
}
```

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Invitation sent successfully |
| 400 | Invalid input or business rule violation |
| 401 | Unauthorized |
| 403 | Forbidden - not a project manager |
| 404 | Project not found |
| 409 | User is already a member |

**QA Notes**

- Can JWT bearer token hop le.
- Quyen manager la dieu kien bat buoc.
- 400: Invalid input or business rule violation
- 401: Unauthorized
- 403: Forbidden - not a project manager
- 404: Project not found
- 409: User is already a member

#### `POST /projects/invitations/accept`

- Summary: Accept a project invitation
- Operation ID: `ProjectsController_acceptInvitation`
- Authentication: Bearer JWT required

**Parameters**

_Khong co parameter._

**Request Body**

- Content-Type: `application/json`
- Required: Yes
- Schema: `AcceptInviteDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| token | Yes | string | required | abc123xyz | Invitation token |

**Sample**

```json
{
  "token": "abc123xyz"
}
```

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Joined project successfully |
| 400 | Invalid or expired invitation |
| 401 | Unauthorized |
| 403 | Email does not match the invitation |
| 409 | Already a member |

**QA Notes**

- Can JWT bearer token hop le.
- 400: Invalid or expired invitation
- 401: Unauthorized
- 403: Email does not match the invitation
- 409: Already a member

#### `GET /projects/{projectId}/members`

- Summary: Get all members of a project
- Operation ID: `ProjectsController_getMembers`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| projectId | path | Yes | number | Project ID |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | List of project members |
| 401 | Unauthorized |
| 403 | Forbidden - not a project member |
| 404 | Project not found |

**QA Notes**

- Can JWT bearer token hop le.
- 401: Unauthorized
- 403: Forbidden - not a project member
- 404: Project not found

#### `GET /projects/{projectId}/members/{memberId}`

- Summary: Get member details
- Operation ID: `ProjectsController_getMemberDetail`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| projectId | path | Yes | number | Project ID |
| memberId | path | Yes | number | Member ID |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Member details |
| 401 | Unauthorized |
| 403 | Forbidden - not a project member |
| 404 | Project or member not found |

**QA Notes**

- Can JWT bearer token hop le.
- 401: Unauthorized
- 403: Forbidden - not a project member
- 404: Project or member not found

#### `DELETE /projects/{projectId}/members/{memberId}`

- Summary: Remove a member from the project (manager, admin, or super admin)
- Operation ID: `ProjectsController_removeMember`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| projectId | path | Yes | number | Project ID |
| memberId | path | Yes | number | Member ID |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Member removed successfully |
| 400 | Cannot remove owner or self |
| 401 | Unauthorized |
| 403 | Forbidden - insufficient permissions |
| 404 | Project or member not found |
| 409 | Member has active tasks |

**QA Notes**

- Can JWT bearer token hop le.
- Can phan biet role manager/admin/super admin/member.
- 400: Cannot remove owner or self
- 401: Unauthorized
- 403: Forbidden - insufficient permissions
- 404: Project or member not found
- 409: Member has active tasks

#### `PATCH /projects/{projectId}/members/{memberId}/role`

- Summary: Update a member's role (manager only)
- Operation ID: `ProjectsController_updateMemberRole`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| projectId | path | Yes | number | Project ID |
| memberId | path | Yes | number | Member ID |

**Request Body**

- Content-Type: `application/json`
- Required: Yes
- Schema: `UpdateMemberRoleDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| roleId | Yes | number | required | 2 | New role ID to assign |

**Sample**

```json
{
  "roleId": 2
}
```

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Role updated successfully |
| 400 | Invalid role or cannot update owner |
| 401 | Unauthorized |
| 403 | Forbidden - not a project manager |
| 404 | Project or member not found |

**QA Notes**

- Can JWT bearer token hop le.
- Quyen manager la dieu kien bat buoc.
- 400: Invalid role or cannot update owner
- 401: Unauthorized
- 403: Forbidden - not a project manager
- 404: Project or member not found

#### `POST /projects/{projectId}/leave`

- Summary: Leave a project
- Operation ID: `ProjectsController_leaveProject`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| projectId | path | Yes | number | Project ID |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Left project successfully |
| 400 | Cannot leave as last manager or has active tasks |
| 401 | Unauthorized |
| 404 | Project not found |

**QA Notes**

- Can JWT bearer token hop le.
- 400: Cannot leave as last manager or has active tasks
- 401: Unauthorized
- 404: Project not found

### Notifications

Quan ly notification cua user hien tai, trang thai da doc/chua doc va unread count.

| Method | Path | Auth | Summary |
|---|---|---|---|
| `GET` | `/notifications` | Bearer JWT | Get notifications for the current user (paginated) |
| `GET` | `/notifications/unread-count` | Bearer JWT | Get unread notification count for the current user |
| `PATCH` | `/notifications/{notificationId}/read` | Bearer JWT | Mark a notification as read |
| `PATCH` | `/notifications/read-all` | Bearer JWT | Mark all notifications as read for the current user |
| `DELETE` | `/notifications/{notificationId}` | Bearer JWT | Delete a notification |

#### `GET /notifications`

- Summary: Get notifications for the current user (paginated)
- Operation ID: `NotificationsController_findAll`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| page | query | No | number |  |
| limit | query | No | number |  |
| isRead | query | No | boolean | Filter by read/unread status |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Paginated list of notifications |
| 401 | Unauthorized |

**QA Notes**

- Can JWT bearer token hop le.
- Can test page/limit voi gia tri mac dinh, nho nhat, am va qua lon.
- 401: Unauthorized

#### `GET /notifications/unread-count`

- Summary: Get unread notification count for the current user
- Operation ID: `NotificationsController_getUnreadCount`
- Authentication: Bearer JWT required

**Parameters**

_Khong co parameter._

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Unread notification count |
| 401 | Unauthorized |

**QA Notes**

- Can JWT bearer token hop le.
- 401: Unauthorized

#### `PATCH /notifications/{notificationId}/read`

- Summary: Mark a notification as read
- Operation ID: `NotificationsController_markAsRead`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| notificationId | path | Yes | number | Notification ID |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Notification marked as read |
| 401 | Unauthorized |
| 403 | Forbidden - not your notification |
| 404 | Notification not found |

**QA Notes**

- Can JWT bearer token hop le.
- 401: Unauthorized
- 403: Forbidden - not your notification
- 404: Notification not found

#### `PATCH /notifications/read-all`

- Summary: Mark all notifications as read for the current user
- Operation ID: `NotificationsController_markAllAsRead`
- Authentication: Bearer JWT required

**Parameters**

_Khong co parameter._

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | All notifications marked as read |
| 401 | Unauthorized |

**QA Notes**

- Can JWT bearer token hop le.
- 401: Unauthorized

#### `DELETE /notifications/{notificationId}`

- Summary: Delete a notification
- Operation ID: `NotificationsController_remove`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| notificationId | path | Yes | number | Notification ID |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Notification deleted successfully |
| 401 | Unauthorized |
| 403 | Forbidden - not your notification |
| 404 | Notification not found |

**QA Notes**

- Can JWT bearer token hop le.
- 401: Unauthorized
- 403: Forbidden - not your notification
- 404: Notification not found

### Checklists

Quan ly checklist trong project, chi tiet checklist, soft delete va chuyen trang thai.

| Method | Path | Auth | Summary |
|---|---|---|---|
| `POST` | `/projects/{projectId}/checklists` | Bearer JWT | Create a new checklist in a project |
| `GET` | `/projects/{projectId}/checklists` | Bearer JWT | Get all checklists for a project |
| `GET` | `/checklists/{checklistId}` | Bearer JWT | Get checklist details with task counts |
| `PUT` | `/checklists/{checklistId}` | Bearer JWT | Update a checklist (manager or creator only) |
| `DELETE` | `/checklists/{checklistId}` | Bearer JWT | Soft delete a checklist (manager or creator only, must have no incomplete tasks) |
| `PATCH` | `/checklists/{checklistId}/status` | Bearer JWT | Change checklist status (OPEN → IN_PROGRESS → DONE) |

#### `POST /projects/{projectId}/checklists`

- Summary: Create a new checklist in a project
- Operation ID: `ChecklistsController_create`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| projectId | path | Yes | number | Project ID |

**Request Body**

- Content-Type: `application/json`
- Required: Yes
- Schema: `CreateChecklistDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| title | Yes | string | required, maxLength=255 | QA checklist item | Checklist title |
| description | No | string | - | Mo ta hop le | Checklist description |
| dueDate | No | string | - | 2026-08-31 | Due date (ISO 8601) |

**Sample**

```json
{
  "title": "QA checklist item",
  "description": "Mo ta hop le",
  "dueDate": "2026-08-31"
}
```

**Responses**

| Status | Meaning |
|---:|---|
| 201 | Checklist created successfully |
| 400 | Invalid input or business rule violation |
| 401 | Unauthorized |
| 403 | Forbidden - not a project member |
| 404 | Project not found |

**QA Notes**

- Can JWT bearer token hop le.
- 400: Invalid input or business rule violation
- 401: Unauthorized
- 403: Forbidden - not a project member
- 404: Project not found

#### `GET /projects/{projectId}/checklists`

- Summary: Get all checklists for a project
- Operation ID: `ChecklistsController_findAll`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| projectId | path | Yes | number | Project ID |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | List of checklists returned |
| 401 | Unauthorized |
| 403 | Forbidden - not a project member |

**QA Notes**

- Can JWT bearer token hop le.
- 401: Unauthorized
- 403: Forbidden - not a project member

#### `GET /checklists/{checklistId}`

- Summary: Get checklist details with task counts
- Operation ID: `ChecklistsController_findOne`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| checklistId | path | Yes | number | Checklist ID |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Checklist details returned |
| 401 | Unauthorized |
| 403 | Forbidden - not a project member |
| 404 | Checklist not found |

**QA Notes**

- Can JWT bearer token hop le.
- 401: Unauthorized
- 403: Forbidden - not a project member
- 404: Checklist not found

#### `PUT /checklists/{checklistId}`

- Summary: Update a checklist (manager or creator only)
- Operation ID: `ChecklistsController_update`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| checklistId | path | Yes | number | Checklist ID |

**Request Body**

- Content-Type: `application/json`
- Required: Yes
- Schema: `UpdateChecklistDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| title | No | string | maxLength=255 | QA checklist item | Checklist title |
| description | No | string | - | Mo ta hop le | Checklist description |
| dueDate | No | string | - | 2026-08-31 | Due date (ISO 8601) |

**Sample**

```json
{
  "title": "QA checklist item",
  "description": "Mo ta hop le",
  "dueDate": "2026-08-31"
}
```

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Checklist updated successfully |
| 400 | Checklist is deleted |
| 401 | Unauthorized |
| 403 | Forbidden - not a manager or creator |
| 404 | Checklist not found |

**QA Notes**

- Can JWT bearer token hop le.
- 400: Checklist is deleted
- 401: Unauthorized
- 403: Forbidden - not a manager or creator
- 404: Checklist not found

#### `DELETE /checklists/{checklistId}`

- Summary: Soft delete a checklist (manager or creator only, must have no incomplete tasks)
- Operation ID: `ChecklistsController_remove`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| checklistId | path | Yes | number | Checklist ID |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Checklist deleted successfully |
| 401 | Unauthorized |
| 403 | Forbidden - not a manager or creator |
| 404 | Checklist not found |
| 409 | Checklist has incomplete tasks |

**QA Notes**

- Can JWT bearer token hop le.
- Day la soft delete; can verify ban ghi khong con hien trong luong chinh va audit log van giu duoc.
- 401: Unauthorized
- 403: Forbidden - not a manager or creator
- 404: Checklist not found
- 409: Checklist has incomplete tasks

#### `PATCH /checklists/{checklistId}/status`

- Summary: Change checklist status (OPEN → IN_PROGRESS → DONE)
- Operation ID: `ChecklistsController_changeStatus`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| checklistId | path | Yes | number | Checklist ID |

**Request Body**

- Content-Type: `application/json`
- Required: Yes
- Schema: `ChangeChecklistStatusDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| status | Yes | string enum(OPEN, IN_PROGRESS, DONE) | required, enum=OPEN, IN_PROGRESS, DONE | OPEN | Target status |

**Sample**

```json
{
  "status": "OPEN"
}
```

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Status changed successfully |
| 400 | Invalid status transition |
| 401 | Unauthorized |
| 403 | Forbidden - not a project member |
| 404 | Checklist not found |

**QA Notes**

- Can JWT bearer token hop le.
- 400: Invalid status transition
- 401: Unauthorized
- 403: Forbidden - not a project member
- 404: Checklist not found

### Tasks

Quan ly task trong checklist, gan nguoi phu trach, chuyen trang thai, sap xep va dashboard summary.

| Method | Path | Auth | Summary |
|---|---|---|---|
| `POST` | `/checklists/{checklistId}/tasks` | Bearer JWT | Create a new task in a checklist |
| `GET` | `/checklists/{checklistId}/tasks` | Bearer JWT | Get all tasks for a checklist |
| `GET` | `/tasks/{taskId}` | Bearer JWT | Get task details with assignee, status, tags, counts |
| `PUT` | `/tasks/{taskId}` | Bearer JWT | Update a task (manager or assignee only) |
| `DELETE` | `/tasks/{taskId}` | Bearer JWT | Soft delete a task (manager or creator only) |
| `PATCH` | `/tasks/{taskId}/assign` | Bearer JWT | Assign a task to a project member |
| `PATCH` | `/tasks/{taskId}/status` | Bearer JWT | Change task status (auto-updates checklist status) |
| `PATCH` | `/tasks/reorder` | Bearer JWT | Reorder tasks within a checklist |
| `GET` | `/projects/{projectId}/task-summary` | Bearer JWT | Get task summary/dashboard statistics for a project |

#### `POST /checklists/{checklistId}/tasks`

- Summary: Create a new task in a checklist
- Operation ID: `TasksController_create`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| checklistId | path | Yes | number | Checklist ID |

**Request Body**

- Content-Type: `application/json`
- Required: Yes
- Schema: `CreateTaskDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| title | Yes | string | required, maxLength=255 | QA checklist item | Task title |
| description | No | string | - | Mo ta hop le | Task description |
| assigneeId | No | number | - | 1 | Assignee user ID |
| dueDate | No | string | - | 2026-08-31 | Due date (ISO 8601) |

**Sample**

```json
{
  "title": "QA checklist item",
  "description": "Mo ta hop le",
  "assigneeId": 1,
  "dueDate": "2026-08-31"
}
```

**Responses**

| Status | Meaning |
|---:|---|
| 201 | Task created successfully |
| 400 | Invalid input or business rule violation |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Checklist not found |

**QA Notes**

- Can JWT bearer token hop le.
- 400: Invalid input or business rule violation
- 401: Unauthorized
- 403: Forbidden
- 404: Checklist not found

#### `GET /checklists/{checklistId}/tasks`

- Summary: Get all tasks for a checklist
- Operation ID: `TasksController_findAll`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| checklistId | path | Yes | number | Checklist ID |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | List of tasks returned |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Checklist not found |

**QA Notes**

- Can JWT bearer token hop le.
- 401: Unauthorized
- 403: Forbidden
- 404: Checklist not found

#### `GET /tasks/{taskId}`

- Summary: Get task details with assignee, status, tags, counts
- Operation ID: `TasksController_findOne`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| taskId | path | Yes | number | Task ID |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Task details returned |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Task not found |

**QA Notes**

- Can JWT bearer token hop le.
- 401: Unauthorized
- 403: Forbidden
- 404: Task not found

#### `PUT /tasks/{taskId}`

- Summary: Update a task (manager or assignee only)
- Operation ID: `TasksController_update`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| taskId | path | Yes | number | Task ID |

**Request Body**

- Content-Type: `application/json`
- Required: Yes
- Schema: `UpdateTaskDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| title | No | string | maxLength=255 | QA checklist item | Task title |
| description | No | string | - | Mo ta hop le | Task description |
| assigneeId | No | number | - | 1 | Assignee user ID |
| dueDate | No | string | - | 2026-08-31 | Due date (ISO 8601) |

**Sample**

```json
{
  "title": "QA checklist item",
  "description": "Mo ta hop le",
  "assigneeId": 1,
  "dueDate": "2026-08-31"
}
```

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Task updated successfully |
| 400 | Invalid input or deleted task |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Task not found |

**QA Notes**

- Can JWT bearer token hop le.
- 400: Invalid input or deleted task
- 401: Unauthorized
- 403: Forbidden
- 404: Task not found

#### `DELETE /tasks/{taskId}`

- Summary: Soft delete a task (manager or creator only)
- Operation ID: `TasksController_remove`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| taskId | path | Yes | number | Task ID |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Task deleted successfully |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Task not found |

**QA Notes**

- Can JWT bearer token hop le.
- Day la soft delete; can verify ban ghi khong con hien trong luong chinh va audit log van giu duoc.
- 401: Unauthorized
- 403: Forbidden
- 404: Task not found

#### `PATCH /tasks/{taskId}/assign`

- Summary: Assign a task to a project member
- Operation ID: `TasksController_assign`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| taskId | path | Yes | number | Task ID |

**Request Body**

- Content-Type: `application/json`
- Required: Yes
- Schema: `AssignTaskDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| assigneeId | Yes | number | required | 1 | Assignee user ID |

**Sample**

```json
{
  "assigneeId": 1
}
```

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Task assigned successfully |
| 400 | Invalid assignee |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Task not found |

**QA Notes**

- Can JWT bearer token hop le.
- 400: Invalid assignee
- 401: Unauthorized
- 403: Forbidden
- 404: Task not found

#### `PATCH /tasks/{taskId}/status`

- Summary: Change task status (auto-updates checklist status)
- Operation ID: `TasksController_changeStatus`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| taskId | path | Yes | number | Task ID |

**Request Body**

- Content-Type: `application/json`
- Required: Yes
- Schema: `ChangeTaskStatusDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| statusId | Yes | number | required | 1 | Task status ID (1=TODO, 2=IN_PROGRESS, 3=REVIEW, 4=DONE) |

**Sample**

```json
{
  "statusId": 1
}
```

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Status updated successfully |
| 400 | Invalid status |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Task not found |

**QA Notes**

- Can JWT bearer token hop le.
- 400: Invalid status
- 401: Unauthorized
- 403: Forbidden
- 404: Task not found

#### `PATCH /tasks/reorder`

- Summary: Reorder tasks within a checklist
- Operation ID: `TasksController_reorder`
- Authentication: Bearer JWT required

**Parameters**

_Khong co parameter._

**Request Body**

- Content-Type: `application/json`
- Required: Yes
- Schema: `ReorderTaskDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| taskId | Yes | number | required | 1 | Task ID to reorder |
| newPosition | Yes | number | required | 1 | New position (0-based index within the checklist) |

**Sample**

```json
{
  "taskId": 1,
  "newPosition": 1
}
```

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Tasks reordered successfully |
| 400 | Invalid position |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Task not found |

**QA Notes**

- Can JWT bearer token hop le.
- 400: Invalid position
- 401: Unauthorized
- 403: Forbidden
- 404: Task not found

#### `GET /projects/{projectId}/task-summary`

- Summary: Get task summary/dashboard statistics for a project
- Operation ID: `TasksController_getTaskSummary`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| projectId | path | Yes | number | Project ID |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Task summary returned |
| 401 | Unauthorized |
| 403 | Forbidden |

**QA Notes**

- Can JWT bearer token hop le.
- 401: Unauthorized
- 403: Forbidden

### Task Comments

Binh luan tren task, cap nhat/xoa comment va xu ly mention.

| Method | Path | Auth | Summary |
|---|---|---|---|
| `POST` | `/tasks/{taskId}/comments` | Bearer JWT | Add a comment to a task (supports @username mentions) |
| `GET` | `/tasks/{taskId}/comments` | Bearer JWT | Get all comments for a task (oldest first) |
| `PUT` | `/comments/{commentId}` | Bearer JWT | Update a comment (owner only) |
| `DELETE` | `/comments/{commentId}` | Bearer JWT | Soft delete a comment (owner or project manager only) |

#### `POST /tasks/{taskId}/comments`

- Summary: Add a comment to a task (supports @username mentions)
- Operation ID: `CommentsController_create`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| taskId | path | Yes | number | Task ID |

**Request Body**

- Content-Type: `application/json`
- Required: Yes
- Schema: `CreateCommentDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| content | Yes | string | required, maxLength=5000 | The Login API has been completed. | Comment content (supports @username mentions) |

**Sample**

```json
{
  "content": "The Login API has been completed."
}
```

**Responses**

| Status | Meaning |
|---:|---|
| 201 | Comment created successfully |
| 400 | Invalid input or task is deleted |
| 401 | Unauthorized |
| 403 | Forbidden - not a project member |
| 404 | Task not found |

**QA Notes**

- Can JWT bearer token hop le.
- 400: Invalid input or task is deleted
- 401: Unauthorized
- 403: Forbidden - not a project member
- 404: Task not found

#### `GET /tasks/{taskId}/comments`

- Summary: Get all comments for a task (oldest first)
- Operation ID: `CommentsController_findAll`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| taskId | path | Yes | number | Task ID |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | List of comments returned |
| 401 | Unauthorized |
| 403 | Forbidden - not a project member |
| 404 | Task not found |

**QA Notes**

- Can JWT bearer token hop le.
- 401: Unauthorized
- 403: Forbidden - not a project member
- 404: Task not found

#### `PUT /comments/{commentId}`

- Summary: Update a comment (owner only)
- Operation ID: `CommentsController_update`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| commentId | path | Yes | number | Comment ID |

**Request Body**

- Content-Type: `application/json`
- Required: Yes
- Schema: `UpdateCommentDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| content | Yes | string | required, maxLength=5000 | The Login API has been completed and deployed. | Updated comment content |

**Sample**

```json
{
  "content": "The Login API has been completed and deployed."
}
```

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Comment updated successfully |
| 400 | Cannot update a deleted comment |
| 401 | Unauthorized |
| 403 | Forbidden - not the comment owner |
| 404 | Comment not found |

**QA Notes**

- Can JWT bearer token hop le.
- 400: Cannot update a deleted comment
- 401: Unauthorized
- 403: Forbidden - not the comment owner
- 404: Comment not found

#### `DELETE /comments/{commentId}`

- Summary: Soft delete a comment (owner or project manager only)
- Operation ID: `CommentsController_remove`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| commentId | path | Yes | number | Comment ID |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Comment deleted successfully |
| 401 | Unauthorized |
| 403 | Forbidden - not the owner or manager |
| 404 | Comment not found |

**QA Notes**

- Can JWT bearer token hop le.
- Quyen manager la dieu kien bat buoc.
- Day la soft delete; can verify ban ghi khong con hien trong luong chinh va audit log van giu duoc.
- 401: Unauthorized
- 403: Forbidden - not the owner or manager
- 404: Comment not found

### Task Attachments

Upload, liet ke, download URL va soft delete file dinh kem cua task.

| Method | Path | Auth | Summary |
|---|---|---|---|
| `POST` | `/tasks/{taskId}/attachments` | Bearer JWT | Upload a file attachment to a task |
| `GET` | `/tasks/{taskId}/attachments` | Bearer JWT | Get all attachments for a task |
| `GET` | `/attachments/{attachmentId}/download` | Bearer JWT | Get download URL for an attachment |
| `DELETE` | `/attachments/{attachmentId}` | Bearer JWT | Soft delete an attachment (owner, project manager, or admin only) |

#### `POST /tasks/{taskId}/attachments`

- Summary: Upload a file attachment to a task
- Operation ID: `AttachmentsController_upload`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| taskId | path | Yes | number | Task ID |

**Request Body**

- Content-Type: `multipart/form-data`
- Required: Yes
- Schema: `object`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| file | No | string:binary | format=binary, max file size 20MB | string | File to upload (max 20MB) |

**Sample**

```text
file=@sample.pdf  # binary, max 20MB
```

**Responses**

| Status | Meaning |
|---:|---|
| 201 | Attachment uploaded successfully |
| 400 | Invalid file or task deleted |
| 401 | Unauthorized |
| 403 | Forbidden - not a project member |
| 404 | Task not found |

**QA Notes**

- Can JWT bearer token hop le.
- 400: Invalid file or task deleted
- 401: Unauthorized
- 403: Forbidden - not a project member
- 404: Task not found

#### `GET /tasks/{taskId}/attachments`

- Summary: Get all attachments for a task
- Operation ID: `AttachmentsController_findAll`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| taskId | path | Yes | number | Task ID |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | List of attachments returned |
| 401 | Unauthorized |
| 403 | Forbidden - not a project member |
| 404 | Task not found |

**QA Notes**

- Can JWT bearer token hop le.
- 401: Unauthorized
- 403: Forbidden - not a project member
- 404: Task not found

#### `GET /attachments/{attachmentId}/download`

- Summary: Get download URL for an attachment
- Operation ID: `AttachmentsController_download`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| attachmentId | path | Yes | number | Attachment ID |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Download URL returned |
| 401 | Unauthorized |
| 403 | Forbidden - not a project member |
| 404 | Attachment not found |

**QA Notes**

- Can JWT bearer token hop le.
- 401: Unauthorized
- 403: Forbidden - not a project member
- 404: Attachment not found

#### `DELETE /attachments/{attachmentId}`

- Summary: Soft delete an attachment (owner, project manager, or admin only)
- Operation ID: `AttachmentsController_remove`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| attachmentId | path | Yes | number | Attachment ID |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Attachment deleted successfully |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Attachment not found |

**QA Notes**

- Can JWT bearer token hop le.
- Can phan biet role manager/admin/super admin/member.
- Day la soft delete; can verify ban ghi khong con hien trong luong chinh va audit log van giu duoc.
- 401: Unauthorized
- 403: Forbidden
- 404: Attachment not found

### Tags

Quan ly tag theo project va gan/go tag tren task.

| Method | Path | Auth | Summary |
|---|---|---|---|
| `POST` | `/projects/{projectId}/tags` | Bearer JWT | Create a new tag in a project (manager, admin, or super admin only) |
| `GET` | `/projects/{projectId}/tags` | Bearer JWT | Get all tags for a project |
| `PUT` | `/tags/{tagId}` | Bearer JWT | Update a tag (manager, admin, or super admin only) |
| `DELETE` | `/tags/{tagId}` | Bearer JWT | Hard delete a tag and all its task associations (manager, admin, or super admin only) |
| `POST` | `/tasks/{taskId}/tags` | Bearer JWT | Assign a tag to a task |
| `GET` | `/tasks/{taskId}/tags` | Bearer JWT | Get all tags assigned to a task |
| `DELETE` | `/tasks/{taskId}/tags/{tagId}` | Bearer JWT | Remove a tag from a task |

#### `POST /projects/{projectId}/tags`

- Summary: Create a new tag in a project (manager, admin, or super admin only)
- Operation ID: `TagsController_create`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| projectId | path | Yes | number | Project ID |

**Request Body**

- Content-Type: `application/json`
- Required: Yes
- Schema: `CreateTagDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| name | Yes | string | required, maxLength=100 | Backend | Tag name |
| color | Yes | string | required | #2ecc71 | HEX color code |

**Sample**

```json
{
  "name": "Backend",
  "color": "#2ecc71"
}
```

**Responses**

| Status | Meaning |
|---:|---|
| 201 | Tag created successfully |
| 400 | Invalid input or project is deleted |
| 401 | Unauthorized |
| 403 | Forbidden - insufficient permissions |
| 404 | Project not found |
| 409 | Tag name already exists in this project |

**QA Notes**

- Can JWT bearer token hop le.
- Can phan biet role manager/admin/super admin/member.
- 400: Invalid input or project is deleted
- 401: Unauthorized
- 403: Forbidden - insufficient permissions
- 404: Project not found
- 409: Tag name already exists in this project

#### `GET /projects/{projectId}/tags`

- Summary: Get all tags for a project
- Operation ID: `TagsController_findAll`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| projectId | path | Yes | number | Project ID |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | List of tags returned |
| 401 | Unauthorized |
| 403 | Forbidden - not a project member |

**QA Notes**

- Can JWT bearer token hop le.
- 401: Unauthorized
- 403: Forbidden - not a project member

#### `PUT /tags/{tagId}`

- Summary: Update a tag (manager, admin, or super admin only)
- Operation ID: `TagsController_update`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| tagId | path | Yes | number | Tag ID |

**Request Body**

- Content-Type: `application/json`
- Required: Yes
- Schema: `UpdateTagDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| name | No | string | maxLength=100 | API | Tag name |
| color | No | string | - | #3498db | HEX color code |

**Sample**

```json
{
  "name": "API",
  "color": "#3498db"
}
```

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Tag updated successfully |
| 400 | Invalid input |
| 401 | Unauthorized |
| 403 | Forbidden - insufficient permissions |
| 404 | Tag not found |
| 409 | Tag name already exists in this project |

**QA Notes**

- Can JWT bearer token hop le.
- Can phan biet role manager/admin/super admin/member.
- 400: Invalid input
- 401: Unauthorized
- 403: Forbidden - insufficient permissions
- 404: Tag not found
- 409: Tag name already exists in this project

#### `DELETE /tags/{tagId}`

- Summary: Hard delete a tag and all its task associations (manager, admin, or super admin only)
- Operation ID: `TagsController_remove`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| tagId | path | Yes | number | Tag ID |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Tag deleted successfully |
| 401 | Unauthorized |
| 403 | Forbidden - insufficient permissions |
| 404 | Tag not found |

**QA Notes**

- Can JWT bearer token hop le.
- Can phan biet role manager/admin/super admin/member.
- Day la hard delete; can verify association lien quan bi xoa sach.
- 401: Unauthorized
- 403: Forbidden - insufficient permissions
- 404: Tag not found

#### `POST /tasks/{taskId}/tags`

- Summary: Assign a tag to a task
- Operation ID: `TagsController_assignToTask`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| taskId | path | Yes | number | Task ID |

**Request Body**

- Content-Type: `application/json`
- Required: Yes
- Schema: `AssignTagDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| tagId | Yes | number | required | 2 | Tag ID to assign |

**Sample**

```json
{
  "tagId": 2
}
```

**Responses**

| Status | Meaning |
|---:|---|
| 201 | Tag assigned successfully |
| 400 | Invalid input or tag does not belong to project |
| 401 | Unauthorized |
| 403 | Forbidden - not a project member |
| 404 | Task or tag not found |
| 409 | Tag already assigned to this task |

**QA Notes**

- Can JWT bearer token hop le.
- 400: Invalid input or tag does not belong to project
- 401: Unauthorized
- 403: Forbidden - not a project member
- 404: Task or tag not found
- 409: Tag already assigned to this task

#### `GET /tasks/{taskId}/tags`

- Summary: Get all tags assigned to a task
- Operation ID: `TagsController_getTaskTags`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| taskId | path | Yes | number | Task ID |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | List of task tags returned |
| 401 | Unauthorized |
| 403 | Forbidden - not a project member |
| 404 | Task not found |

**QA Notes**

- Can JWT bearer token hop le.
- 401: Unauthorized
- 403: Forbidden - not a project member
- 404: Task not found

#### `DELETE /tasks/{taskId}/tags/{tagId}`

- Summary: Remove a tag from a task
- Operation ID: `TagsController_removeFromTask`
- Authentication: Bearer JWT required

**Parameters**

| Name | In | Required | Type | Description |
|---|---|---:|---|---|
| taskId | path | Yes | number | Task ID |
| tagId | path | Yes | number | Tag ID |

**Request Body**

_Khong co request body._

**Responses**

| Status | Meaning |
|---:|---|
| 200 | Tag removed from task successfully |
| 400 | Tag not assigned to task |
| 401 | Unauthorized |
| 403 | Forbidden - not a project member |
| 404 | Task not found |

**QA Notes**

- Can JWT bearer token hop le.
- 400: Tag not assigned to task
- 401: Unauthorized
- 403: Forbidden - not a project member
- 404: Task not found


## Test Scenarios

### Authentication

| Scenario ID | Area | Scenario | APIs Covered | Priority |
|---|---|---|---|---|
| SC-AUTH-001 | Account onboarding | Dang ky user moi, verify email bang OTP, login thanh cong va nhan access/refresh token. | /auth/register, /auth/verify-email, /auth/login | P0 |
| SC-AUTH-002 | OTP lifecycle | Resend OTP, verify OTP sai/het han, verify OTP dung va chan verify lai token da dung. | /auth/verify-email, /auth/resend-otp | P1 |
| SC-AUTH-003 | Session lifecycle | Refresh access token bang refresh token hop le, logout va dam bao refresh token bi vo hieu hoa. | /auth/refresh, /auth/logout | P0 |
| SC-AUTH-004 | Password recovery | Forgot password, verify reset OTP, reset password, login bang password moi va reject password cu. | /auth/forgot-password, /auth/verify-reset-otp, /auth/reset-password | P0 |
| SC-AUTH-005 | Abuse prevention | Thu brute force login/OTP va resend qua nguong de xac minh rate limit/lockout/logging. | Auth endpoints | P1 |

### Activity Logs

| Scenario ID | Area | Scenario | APIs Covered | Priority |
|---|---|---|---|---|
| SC-ACT-001 | My activity feed | Current user xem lich su cua minh voi pagination va sort on dinh. | GET /activities/me | P1 |
| SC-ACT-002 | Project activity feed | Member project xem activity project; non-member bi 403. | GET /projects/{projectId}/activities | P1 |
| SC-ACT-003 | Task activity feed | Member project xem activity cua task; task khong ton tai tra 404. | GET /tasks/{taskId}/activities | P1 |
| SC-ACT-004 | Audit integrity | Cac hanh dong create/update/delete/status/role tao log dung actor, target va timestamp. | Activity sources | P1 |

### Projects

| Scenario ID | Area | Scenario | APIs Covered | Priority |
|---|---|---|---|---|
| SC-PROJ-001 | Project lifecycle | Tao project, xem danh sach/chi tiet, update, complete/archive va soft delete theo dung trang thai. | Projects CRUD/status APIs | P0 |
| SC-PROJ-002 | Project membership | Invite member, accept invitation, xem member list/detail va cap nhat role. | Invitation/member APIs | P0 |
| SC-PROJ-003 | Project authorization | Kiem tra manager/admin/super admin/member/non-member tren cac API doc, update, xoa va role. | Projects protected APIs | P0 |
| SC-PROJ-004 | Member constraints | Khong cho remove owner/self, khong cho remove member co active task, khong cho last manager leave. | Member remove/leave APIs | P0 |
| SC-PROJ-005 | Invitation integrity | Token loi moi het han, email khong khop, user da la member va duplicate invitation. | Invite/accept APIs | P1 |

### Notifications

| Scenario ID | Area | Scenario | APIs Covered | Priority |
|---|---|---|---|---|
| SC-NOTI-001 | Notification inbox | Lay danh sach notification cua current user voi pagination va filter isRead. | GET /notifications | P0 |
| SC-NOTI-002 | Read state | Mark one notification read, mark all read va verify unread count. | Notification read APIs | P0 |
| SC-NOTI-003 | Notification ownership | User khong the doc/xoa notification cua user khac. | Notification protected APIs | P0 |
| SC-NOTI-004 | Deletion behavior | Xoa notification va dam bao khong xuat hien lai trong list/unread count. | DELETE /notifications/{notificationId} | P1 |

### Checklists

| Scenario ID | Area | Scenario | APIs Covered | Priority |
|---|---|---|---|---|
| SC-CHK-001 | Checklist lifecycle | Tao checklist trong project, lay danh sach, lay chi tiet, update va soft delete. | Checklist APIs | P0 |
| SC-CHK-002 | Checklist status flow | Chuyen status OPEN -> IN_PROGRESS -> DONE va reject transition nguoc/bo qua buoc neu khong hop le. | /checklists/{checklistId}/status | P0 |
| SC-CHK-003 | Deletion rules | Khong cho xoa checklist con incomplete task; cho xoa khi tat ca task da hoan thanh. | DELETE /checklists/{checklistId} | P0 |
| SC-CHK-004 | Checklist access control | Member xem, manager/creator update/delete, non-member bi chan. | Checklist APIs | P0 |

### Tasks

| Scenario ID | Area | Scenario | APIs Covered | Priority |
|---|---|---|---|---|
| SC-TASK-001 | Task lifecycle | Tao task, xem danh sach/chi tiet, update, assign, chuyen status, reorder va soft delete. | Task APIs | P0 |
| SC-TASK-002 | Assignment rules | Chi assign task cho member thuoc project; reject assignee khong ton tai/khong thuoc project. | /tasks/{taskId}/assign | P0 |
| SC-TASK-003 | Status and summary | Chuyen status task va xac minh checklist status/task-summary duoc cap nhat dung. | /tasks/{taskId}/status, /projects/{projectId}/task-summary | P0 |
| SC-TASK-004 | Ordering | Reorder task voi index 0-based, boundary dau/cuoi va atomicity khi position loi. | /tasks/reorder | P1 |
| SC-TASK-005 | Task authorization | Manager/assignee/creator/member co dung quyen cho update/delete/view. | Task protected APIs | P0 |

### Task Comments

| Scenario ID | Area | Scenario | APIs Covered | Priority |
|---|---|---|---|---|
| SC-COMM-001 | Comment lifecycle | Them comment, xem danh sach oldest first, update boi owner va soft delete. | Comment APIs | P0 |
| SC-COMM-002 | Mention behavior | Comment co @username tao notification dung nguoi va khong tao mention gia. | POST /tasks/{taskId}/comments | P1 |
| SC-COMM-003 | Comment authorization | Chi owner update; owner hoac project manager delete; non-member bi chan. | Comment APIs | P0 |
| SC-COMM-004 | Content safety | Kiem tra max length, empty content, script tag va HTML rendering an toan. | Comment APIs | P1 |

### Task Attachments

| Scenario ID | Area | Scenario | APIs Covered | Priority |
|---|---|---|---|---|
| SC-ATT-001 | Attachment lifecycle | Upload file <=20MB, list attachments, lay download URL va soft delete. | Attachment APIs | P0 |
| SC-ATT-002 | File validation | Reject file rong, file qua 20MB, MIME khong hop le va filename nguy hiem. | POST /tasks/{taskId}/attachments | P0 |
| SC-ATT-003 | Attachment authorization | Member project xem/download; owner/manager/admin xoa; non-member bi chan. | Attachment APIs | P0 |
| SC-ATT-004 | Storage integrity | URL download khong bi leak, file da xoa khong con download duoc. | Download/delete APIs | P1 |

### Tags

| Scenario ID | Area | Scenario | APIs Covered | Priority |
|---|---|---|---|---|
| SC-TAG-001 | Tag lifecycle | Tao tag, lay danh sach, update va hard delete tag kem association. | Tag CRUD APIs | P0 |
| SC-TAG-002 | Tag assignment | Gan tag vao task, lay tag cua task, go tag va reject duplicate assignment. | Task tag APIs | P0 |
| SC-TAG-003 | Tag uniqueness | Khong cho trung ten tag trong cung project; cho cung ten o project khac neu business cho phep. | Create/update tag APIs | P1 |
| SC-TAG-004 | Tag authorization | Manager/admin/super admin quan ly tag; member chi xem/gan/go theo quyen project. | Tag APIs | P0 |
| SC-TAG-005 | Color validation | Kiem tra HEX color hop le, invalid HEX va CSS injection payload. | Create/update tag APIs | P1 |


## Test Cases

Coverage target: `61` operations x `7` categories = `427` generated test cases.

Legend: `HP` Happy Path, `VAL` Validation, `BND` Boundary, `AUTHN` Authentication, `AUTHZ` Authorization, `BL` Business Logic, `SEC` Security.

### Authentication

#### `POST /auth/register`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-AUTH-001-HP | Happy Path | Khong can JWT; du lieu test hop le da san sang. | Goi `POST /auth/register` voi body co field bat buoc: email, password, fullName. | 201 - Registration successful. Please verify your email.; response dung schema/side effect mong doi. |
| TC-AUTH-002-VAL | Validation | Khong can JWT; du lieu test hop le da san sang. | lan luot bo required field: email, password, fullName | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-AUTH-003-BND | Boundary | Khong can JWT; du lieu test hop le da san sang. | password: 7/8 ky tu, thieu uppercase, thieu special char | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 Bad Request; domain boundary co the tra 409 Email already exists. |
| TC-AUTH-004-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Xac minh endpoint public khong yeu cau bearer token; gui Authorization gia mao khong lam thay doi logic. | Endpoint public xu ly dung theo business response, khong yeu cau JWT. |
| TC-AUTH-005-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Thu su dung email/OTP/token/reset token cua user khac de dam bao khong chiem quyen tai khoan. | Khong cho chiem quyen tai khoan/flow cua user khac; thong tin nhay cam khong bi leak. |
| TC-AUTH-006-BL | Business Logic | Khong can JWT; du lieu test hop le da san sang. | Dang ky email moi thanh cong; dang ky lai email da ton tai phai tra 409 va khong tao duplicate user. | Thanh cong: 201 Registration successful. Please verify your email.; case vi pham rule tra 409 Email already exists. |
| TC-AUTH-007-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | POST /auth/register: brute force, OTP enumeration, timing difference, token leakage trong response/log va replay token. | Khong brute force duoc, response khong tiet lo user ton tai/password/OTP/token; token duoc revoke dung. |

#### `POST /auth/verify-email`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-AUTH-008-HP | Happy Path | Khong can JWT; du lieu test hop le da san sang. | Goi `POST /auth/verify-email` voi body co field bat buoc: email, otp. | 200 - Email verified successfully; response dung schema/side effect mong doi. |
| TC-AUTH-009-VAL | Validation | Khong can JWT; du lieu test hop le da san sang. | lan luot bo required field: email, otp | 400 - Invalid or expired OTP |
| TC-AUTH-010-BND | Boundary | Khong can JWT; du lieu test hop le da san sang. | otp: 5/6/7 digits, ky tu khong phai so | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 - Invalid or expired OTP. |
| TC-AUTH-011-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi endpoint voi OTP/token dung, sai, het han va da su dung. | OTP/token/body khong hop le tra 400; request hop le khong can bearer token. |
| TC-AUTH-012-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Thu su dung email/OTP/token/reset token cua user khac de dam bao khong chiem quyen tai khoan. | Khong cho chiem quyen tai khoan/flow cua user khac; thong tin nhay cam khong bi leak. |
| TC-AUTH-013-BL | Business Logic | Khong can JWT; du lieu test hop le da san sang. | OTP dung xac thuc email thanh cong; OTP sai/het han/da dung phai tra 400. | Thanh cong: 200 Email verified successfully; case vi pham rule tra 400 Invalid or expired OTP. |
| TC-AUTH-014-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | POST /auth/verify-email: brute force, OTP enumeration, timing difference, token leakage trong response/log va replay token. | Khong brute force duoc, response khong tiet lo user ton tai/password/OTP/token; token duoc revoke dung. |

#### `POST /auth/resend-otp`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-AUTH-015-HP | Happy Path | Khong can JWT; du lieu test hop le da san sang. | Goi `POST /auth/resend-otp` voi body co field bat buoc: email. | 200 - OTP sent successfully; response dung schema/side effect mong doi. |
| TC-AUTH-016-VAL | Validation | Khong can JWT; du lieu test hop le da san sang. | lan luot bo required field: email | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-AUTH-017-BND | Boundary | Khong can JWT; du lieu test hop le da san sang. | lap lai request voi du lieu empty/min/max theo domain va id boundary | Gia tri trong bien duoc chap nhan; ngoai bien tra 400/404 phu hop va khong mutate data. |
| TC-AUTH-018-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi endpoint voi OTP/token dung, sai, het han va da su dung. | Endpoint public xu ly dung theo business response, khong yeu cau JWT. |
| TC-AUTH-019-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Thu su dung email/OTP/token/reset token cua user khac de dam bao khong chiem quyen tai khoan. | Khong cho chiem quyen tai khoan/flow cua user khac; thong tin nhay cam khong bi leak. |
| TC-AUTH-020-BL | Business Logic | Khong can JWT; du lieu test hop le da san sang. | Resend OTP cho email hop le; vuot nguong resend phai tra 429 va khong spam email. | Thanh cong: 200 OTP sent successfully; case vi pham rule tra 429 Too many OTP requests. |
| TC-AUTH-021-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | POST /auth/resend-otp: brute force, OTP enumeration, timing difference, token leakage trong response/log va replay token. | Khong brute force duoc, response khong tiet lo user ton tai/password/OTP/token; token duoc revoke dung. |

#### `POST /auth/login`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-AUTH-022-HP | Happy Path | Khong can JWT; du lieu test hop le da san sang. | Goi `POST /auth/login` voi body co field bat buoc: email, password. | 200 - Returns access and refresh tokens; response dung schema/side effect mong doi. |
| TC-AUTH-023-VAL | Validation | Khong can JWT; du lieu test hop le da san sang. | lan luot bo required field: email, password | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-AUTH-024-BND | Boundary | Khong can JWT; du lieu test hop le da san sang. | password: 7/8 ky tu, thieu uppercase, thieu special char | Gia tri trong bien duoc chap nhan; ngoai bien tra 400/404 phu hop va khong mutate data. |
| TC-AUTH-025-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Login voi credential dung/sai, email chua verify va password sai. | Credential/token khong hop le tra 401; khong tra thong tin nhay cam. |
| TC-AUTH-026-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Thu su dung email/OTP/token/reset token cua user khac de dam bao khong chiem quyen tai khoan. | Khong cho chiem quyen tai khoan/flow cua user khac; thong tin nhay cam khong bi leak. |
| TC-AUTH-027-BL | Business Logic | Khong can JWT; du lieu test hop le da san sang. | Chi user da verify email va dung password moi nhan token; credential sai hoac email chua verify tra 401. | Thanh cong: 200 Returns access and refresh tokens; du lieu lien quan duoc cap nhat nhat quan. |
| TC-AUTH-028-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | POST /auth/login: brute force, OTP enumeration, timing difference, token leakage trong response/log va replay token. | Khong brute force duoc, response khong tiet lo user ton tai/password/OTP/token; token duoc revoke dung. |

#### `POST /auth/refresh`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-AUTH-029-HP | Happy Path | Khong can JWT; du lieu test hop le da san sang. | Goi `POST /auth/refresh` voi body co field bat buoc: refreshToken. | 200 - Returns new access token; response dung schema/side effect mong doi. |
| TC-AUTH-030-VAL | Validation | Khong can JWT; du lieu test hop le da san sang. | lan luot bo required field: refreshToken | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-AUTH-031-BND | Boundary | Khong can JWT; du lieu test hop le da san sang. | lap lai request voi du lieu empty/min/max theo domain va id boundary | Gia tri trong bien duoc chap nhan; ngoai bien tra 400/404 phu hop va khong mutate data. |
| TC-AUTH-032-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi refresh voi refreshToken hop le, het han, bi revoke va random string. | Credential/token khong hop le tra 401; khong tra thong tin nhay cam. |
| TC-AUTH-033-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Thu su dung email/OTP/token/reset token cua user khac de dam bao khong chiem quyen tai khoan. | Khong cho chiem quyen tai khoan/flow cua user khac; thong tin nhay cam khong bi leak. |
| TC-AUTH-034-BL | Business Logic | Khong can JWT; du lieu test hop le da san sang. | Refresh token hop le tao access token moi; token het han/bi revoke/sai tra 401. | Thanh cong: 200 Returns new access token; du lieu lien quan duoc cap nhat nhat quan. |
| TC-AUTH-035-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | POST /auth/refresh: brute force, OTP enumeration, timing difference, token leakage trong response/log va replay token. | Khong brute force duoc, response khong tiet lo user ton tai/password/OTP/token; token duoc revoke dung. |

#### `POST /auth/logout`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-AUTH-036-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `POST /auth/logout` voi request hop le theo route. | 200 - Logged out successfully; response dung schema/side effect mong doi. |
| TC-AUTH-037-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | gui malformed JSON hoac content-type sai neu endpoint co body | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-AUTH-038-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | lap lai request voi du lieu empty/min/max theo domain va id boundary | Gia tri trong bien duoc chap nhan; ngoai bien tra 400/404 phu hop va khong mutate data. |
| TC-AUTH-039-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi POST /auth/logout khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-AUTH-040-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user A truy cap resource cua user B hoac project khong lien quan de xac minh khong bi IDOR. | Khong tra du lieu ngoai pham vi user; ket qua phu hop la 403/404 hoac filtered list. |
| TC-AUTH-041-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Logout vo hieu hoa refresh token/session; refresh lai sau logout phai that bai 401. | Thanh cong: 200 Logged out successfully; du lieu lien quan duoc cap nhat nhat quan. |
| TC-AUTH-042-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | POST /auth/logout: brute force, OTP enumeration, timing difference, token leakage trong response/log va replay token. | Khong brute force duoc, response khong tiet lo user ton tai/password/OTP/token; token duoc revoke dung. |

#### `POST /auth/forgot-password`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-AUTH-043-HP | Happy Path | Khong can JWT; du lieu test hop le da san sang. | Goi `POST /auth/forgot-password` voi body co field bat buoc: email. | 200 - If the email exists, a password reset OTP has been sent; response dung schema/side effect mong doi. |
| TC-AUTH-044-VAL | Validation | Khong can JWT; du lieu test hop le da san sang. | lan luot bo required field: email | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-AUTH-045-BND | Boundary | Khong can JWT; du lieu test hop le da san sang. | lap lai request voi du lieu empty/min/max theo domain va id boundary | Gia tri trong bien duoc chap nhan; ngoai bien tra 400/404 phu hop va khong mutate data. |
| TC-AUTH-046-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Xac minh endpoint public khong yeu cau bearer token; gui Authorization gia mao khong lam thay doi logic. | Endpoint public xu ly dung theo business response, khong yeu cau JWT. |
| TC-AUTH-047-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Thu su dung email/OTP/token/reset token cua user khac de dam bao khong chiem quyen tai khoan. | Khong cho chiem quyen tai khoan/flow cua user khac; thong tin nhay cam khong bi leak. |
| TC-AUTH-048-BL | Business Logic | Khong can JWT; du lieu test hop le da san sang. | Tra response generic 200 cho ca email ton tai/khong ton tai de tranh user enumeration. | Thanh cong: 200 If the email exists, a password reset OTP has been sent; du lieu lien quan duoc cap nhat nhat quan. |
| TC-AUTH-049-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | POST /auth/forgot-password: brute force, OTP enumeration, timing difference, token leakage trong response/log va replay token. | Khong brute force duoc, response khong tiet lo user ton tai/password/OTP/token; token duoc revoke dung. |

#### `POST /auth/verify-reset-otp`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-AUTH-050-HP | Happy Path | Khong can JWT; du lieu test hop le da san sang. | Goi `POST /auth/verify-reset-otp` voi body co field bat buoc: email, otp. | 200 - OTP verified. You can now reset your password.; response dung schema/side effect mong doi. |
| TC-AUTH-051-VAL | Validation | Khong can JWT; du lieu test hop le da san sang. | lan luot bo required field: email, otp | 400 - Invalid or expired OTP |
| TC-AUTH-052-BND | Boundary | Khong can JWT; du lieu test hop le da san sang. | otp: 5/6/7 digits, ky tu khong phai so | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 - Invalid or expired OTP. |
| TC-AUTH-053-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi endpoint voi OTP/token dung, sai, het han va da su dung. | OTP/token/body khong hop le tra 400; request hop le khong can bearer token. |
| TC-AUTH-054-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Thu su dung email/OTP/token/reset token cua user khac de dam bao khong chiem quyen tai khoan. | Khong cho chiem quyen tai khoan/flow cua user khac; thong tin nhay cam khong bi leak. |
| TC-AUTH-055-BL | Business Logic | Khong can JWT; du lieu test hop le da san sang. | Reset OTP dung mo khoa buoc reset password; OTP sai/het han tra 400. | Thanh cong: 200 OTP verified. You can now reset your password.; case vi pham rule tra 400 Invalid or expired OTP. |
| TC-AUTH-056-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | POST /auth/verify-reset-otp: brute force, OTP enumeration, timing difference, token leakage trong response/log va replay token. | Khong brute force duoc, response khong tiet lo user ton tai/password/OTP/token; token duoc revoke dung. |

#### `POST /auth/reset-password`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-AUTH-057-HP | Happy Path | Khong can JWT; du lieu test hop le da san sang. | Goi `POST /auth/reset-password` voi body co field bat buoc: email, newPassword. | 200 - Password reset successfully; response dung schema/side effect mong doi. |
| TC-AUTH-058-VAL | Validation | Khong can JWT; du lieu test hop le da san sang. | lan luot bo required field: email, newPassword | 400 - OTP not verified or invalid |
| TC-AUTH-059-BND | Boundary | Khong can JWT; du lieu test hop le da san sang. | newPassword: 7/8 ky tu, thieu uppercase, thieu special char | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 - OTP not verified or invalid. |
| TC-AUTH-060-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Xac minh endpoint public khong yeu cau bearer token; gui Authorization gia mao khong lam thay doi logic. | OTP/token/body khong hop le tra 400; request hop le khong can bearer token. |
| TC-AUTH-061-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Thu su dung email/OTP/token/reset token cua user khac de dam bao khong chiem quyen tai khoan. | Khong cho chiem quyen tai khoan/flow cua user khac; thong tin nhay cam khong bi leak. |
| TC-AUTH-062-BL | Business Logic | Khong can JWT; du lieu test hop le da san sang. | Chi reset sau khi OTP da verify; password cu khong login duoc, password moi login duoc. | Thanh cong: 200 Password reset successfully; case vi pham rule tra 400 OTP not verified or invalid. |
| TC-AUTH-063-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | POST /auth/reset-password: brute force, OTP enumeration, timing difference, token leakage trong response/log va replay token. | Khong brute force duoc, response khong tiet lo user ton tai/password/OTP/token; token duoc revoke dung. |

### Activity Logs

#### `GET /activities/me`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-ACT-001-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `GET /activities/me` voi path/query hop le: page, limit. | 200 - Paginated activity logs returned; response dung schema/side effect mong doi. |
| TC-ACT-002-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: page, limit='abc'; query page/limit la chuoi, so am hoac 0 | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-ACT-003-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | page/limit: 1, 0, -1, limit rat lon | Gia tri trong bien duoc chap nhan; ngoai bien tra 400/404 phu hop va khong mutate data. |
| TC-ACT-004-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi GET /activities/me khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-ACT-005-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user A truy cap resource cua user B hoac project khong lien quan de xac minh khong bi IDOR. | Khong tra du lieu ngoai pham vi user; ket qua phu hop la 403/404 hoac filtered list. |
| TC-ACT-006-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Chi tra activity cua user hien tai, pagination dung va khong leak activity user khac. | Thanh cong: 200 Paginated activity logs returned; du lieu lien quan duoc cap nhat nhat quan. |
| TC-ACT-007-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | GET /activities/me: IDOR projectId/taskId va audit log khong chua secret/token. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `GET /projects/{projectId}/activities`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-ACT-008-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `GET /projects/{projectId}/activities` voi path/query hop le: projectId, page, limit. | 200 - Paginated project activity logs returned; response dung schema/side effect mong doi. |
| TC-ACT-009-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: projectId, page, limit='abc'; query page/limit la chuoi, so am hoac 0 | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-ACT-010-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | page/limit: 1, 0, -1, limit rat lon; path id boundary cho projectId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; ngoai bien tra 400/404 phu hop va khong mutate data. |
| TC-ACT-011-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi GET /projects/{projectId}/activities khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-ACT-012-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not a project member |
| TC-ACT-013-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Member project xem duoc activity project; non-member bi 403. | Thanh cong: 200 Paginated project activity logs returned; case vi pham rule tra 403 Forbidden - not a project member. |
| TC-ACT-014-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | GET /projects/{projectId}/activities: IDOR projectId/taskId va audit log khong chua secret/token. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `GET /tasks/{taskId}/activities`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-ACT-015-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `GET /tasks/{taskId}/activities` voi path/query hop le: taskId, page, limit. | 200 - Paginated task activity logs returned; response dung schema/side effect mong doi. |
| TC-ACT-016-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: taskId, page, limit='abc'; query page/limit la chuoi, so am hoac 0 | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-ACT-017-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | page/limit: 1, 0, -1, limit rat lon; path id boundary cho taskId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 Bad Request; domain boundary co the tra 404 Task not found. |
| TC-ACT-018-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi GET /tasks/{taskId}/activities khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-ACT-019-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not a project member |
| TC-ACT-020-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Member project xem activity task; task khong ton tai tra 404. | Thanh cong: 200 Paginated task activity logs returned; case vi pham rule tra 403 Forbidden - not a project member; 404 Task not found. |
| TC-ACT-021-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | GET /tasks/{taskId}/activities: IDOR projectId/taskId va audit log khong chua secret/token. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

### Projects

#### `POST /projects`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-PROJ-001-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `POST /projects` voi body co field bat buoc: name. | 201 - Project created successfully; response dung schema/side effect mong doi. |
| TC-PROJ-002-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | lan luot bo required field: name | 400 - Invalid input or end date before start date |
| TC-PROJ-003-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | startDate: ISO hop le, ngay khong ton tai, timezone edge; endDate: ISO hop le, ngay khong ton tai, timezone edge | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 - Invalid input or end date before start date. |
| TC-PROJ-004-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi POST /projects khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-PROJ-005-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user A truy cap resource cua user B hoac project khong lien quan de xac minh khong bi IDOR. | Khong tra du lieu ngoai pham vi user; ket qua phu hop la 403/404 hoac filtered list. |
| TC-PROJ-006-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Tao project voi owner/manager dung; endDate truoc startDate phai tra 400. | Thanh cong: 201 Project created successfully; case vi pham rule tra 400 Invalid input or end date before start date. |
| TC-PROJ-007-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | POST /projects: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `GET /projects`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-PROJ-008-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `GET /projects` voi request hop le theo route. | 200 - List of projects returned; response dung schema/side effect mong doi. |
| TC-PROJ-009-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | gui malformed JSON hoac content-type sai neu endpoint co body | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-PROJ-010-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | lap lai request voi du lieu empty/min/max theo domain va id boundary | Gia tri trong bien duoc chap nhan; ngoai bien tra 400/404 phu hop va khong mutate data. |
| TC-PROJ-011-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi GET /projects khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-PROJ-012-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user A truy cap resource cua user B hoac project khong lien quan de xac minh khong bi IDOR. | Khong tra du lieu ngoai pham vi user; ket qua phu hop la 403/404 hoac filtered list. |
| TC-PROJ-013-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Danh sach chi gom project user so huu hoac duoc share; project soft-deleted khong leak neu business yeu cau. | Thanh cong: 200 List of projects returned; du lieu lien quan duoc cap nhat nhat quan. |
| TC-PROJ-014-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | GET /projects: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `GET /projects/{projectId}`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-PROJ-015-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `GET /projects/{projectId}` voi path/query hop le: projectId. | 200 - Project details returned; response dung schema/side effect mong doi. |
| TC-PROJ-016-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: projectId='abc' | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-PROJ-017-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | path id boundary cho projectId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 Bad Request; domain boundary co the tra 404 Project not found. |
| TC-PROJ-018-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi GET /projects/{projectId} khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-PROJ-019-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not a member, super admin, or admin |
| TC-PROJ-020-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Member/admin/super admin xem duoc; non-member bi 403, project khong ton tai 404. | Thanh cong: 200 Project details returned; case vi pham rule tra 403 Forbidden - not a member, super admin, or admin; 404 Project not found. |
| TC-PROJ-021-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | GET /projects/{projectId}: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `PUT /projects/{projectId}`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-PROJ-022-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `PUT /projects/{projectId}` voi path/query hop le: projectId. | 200 - Project updated successfully; response dung schema/side effect mong doi. |
| TC-PROJ-023-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: projectId='abc' | 400 - Invalid input or project is deleted |
| TC-PROJ-024-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | endDate: ISO hop le, ngay khong ton tai, timezone edge; path id boundary cho projectId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 - Invalid input or project is deleted; domain boundary co the tra 404 Project not found. |
| TC-PROJ-025-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi PUT /projects/{projectId} khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-PROJ-026-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not a manager, super admin, or admin |
| TC-PROJ-027-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Manager/admin/super admin update duoc; project deleted hoac date khong hop le tra 400. | Thanh cong: 200 Project updated successfully; case vi pham rule tra 400 Invalid input or project is deleted; 403 Forbidden - not a manager, super admin, or admin; 404 Project not found. |
| TC-PROJ-028-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | PUT /projects/{projectId}: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `DELETE /projects/{projectId}`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-PROJ-029-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `DELETE /projects/{projectId}` voi path/query hop le: projectId. | 200 - Project deleted successfully; response dung schema/side effect mong doi. |
| TC-PROJ-030-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: projectId='abc' | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-PROJ-031-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | path id boundary cho projectId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 Bad Request; domain boundary co the tra 404 Project not found. |
| TC-PROJ-032-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi DELETE /projects/{projectId} khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-PROJ-033-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not a manager, super admin, or admin |
| TC-PROJ-034-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Soft delete project va chan cac thao tac tiep theo tren project da xoa. | Thanh cong: 200 Project deleted successfully; case vi pham rule tra 403 Forbidden - not a manager, super admin, or admin; 404 Project not found. |
| TC-PROJ-035-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | DELETE /projects/{projectId}: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `PATCH /projects/{projectId}/archive`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-PROJ-036-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `PATCH /projects/{projectId}/archive` voi path/query hop le: projectId. | 200 - Project archived successfully; response dung schema/side effect mong doi. |
| TC-PROJ-037-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: projectId='abc' | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-PROJ-038-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | path id boundary cho projectId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 Bad Request; domain boundary co the tra 404 Project not found; 409 Project is not active. |
| TC-PROJ-039-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi PATCH /projects/{projectId}/archive khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-PROJ-040-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not a project manager |
| TC-PROJ-041-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Chi manager archive project active; archive lai project khong active tra 409. | Thanh cong: 200 Project archived successfully; case vi pham rule tra 403 Forbidden - not a project manager; 404 Project not found; 409 Project is not active. |
| TC-PROJ-042-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | PATCH /projects/{projectId}/archive: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `PATCH /projects/{projectId}/complete`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-PROJ-043-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `PATCH /projects/{projectId}/complete` voi path/query hop le: projectId. | 200 - Project completed successfully; response dung schema/side effect mong doi. |
| TC-PROJ-044-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: projectId='abc' | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-PROJ-045-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | path id boundary cho projectId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 Bad Request; domain boundary co the tra 404 Project not found; 409 Project is not active. |
| TC-PROJ-046-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi PATCH /projects/{projectId}/complete khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-PROJ-047-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not a project manager |
| TC-PROJ-048-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Chi manager complete project active; complete lai project khong active tra 409. | Thanh cong: 200 Project completed successfully; case vi pham rule tra 403 Forbidden - not a project manager; 404 Project not found; 409 Project is not active. |
| TC-PROJ-049-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | PATCH /projects/{projectId}/complete: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `POST /projects/{projectId}/invite`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-PROJ-050-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `POST /projects/{projectId}/invite` voi path/query hop le: projectId; body co field bat buoc: email, roleId. | 200 - Invitation sent successfully; response dung schema/side effect mong doi. |
| TC-PROJ-051-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | lan luot bo required field: email, roleId; gui sai type cho numeric field: roleId; path/query numeric khong hop le: projectId='abc' | 400 - Invalid input or business rule violation |
| TC-PROJ-052-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | roleId: -1, 0, 1, so rat lon, decimal; path id boundary cho projectId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 - Invalid input or business rule violation; domain boundary co the tra 404 Project not found; 409 User is already a member. |
| TC-PROJ-053-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi POST /projects/{projectId}/invite khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-PROJ-054-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not a project manager |
| TC-PROJ-055-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Manager invite user hop le; user da la member tra 409, input/role loi tra 400. | Thanh cong: 200 Invitation sent successfully; case vi pham rule tra 400 Invalid input or business rule violation; 403 Forbidden - not a project manager; 404 Project not found; 409 User is already a member. |
| TC-PROJ-056-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | POST /projects/{projectId}/invite: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `POST /projects/invitations/accept`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-PROJ-057-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `POST /projects/invitations/accept` voi body co field bat buoc: token. | 200 - Joined project successfully; response dung schema/side effect mong doi. |
| TC-PROJ-058-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | lan luot bo required field: token | 400 - Invalid or expired invitation |
| TC-PROJ-059-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | lap lai request voi du lieu empty/min/max theo domain va id boundary | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 - Invalid or expired invitation; domain boundary co the tra 409 Already a member. |
| TC-PROJ-060-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi POST /projects/invitations/accept khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-PROJ-061-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Email does not match the invitation |
| TC-PROJ-062-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Accept token hop le va email khop; token het han 400, email khong khop 403, da la member 409. | Thanh cong: 200 Joined project successfully; case vi pham rule tra 400 Invalid or expired invitation; 403 Email does not match the invitation; 409 Already a member. |
| TC-PROJ-063-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | POST /projects/invitations/accept: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `GET /projects/{projectId}/members`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-PROJ-064-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `GET /projects/{projectId}/members` voi path/query hop le: projectId. | 200 - List of project members; response dung schema/side effect mong doi. |
| TC-PROJ-065-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: projectId='abc' | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-PROJ-066-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | path id boundary cho projectId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 Bad Request; domain boundary co the tra 404 Project not found. |
| TC-PROJ-067-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi GET /projects/{projectId}/members khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-PROJ-068-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not a project member |
| TC-PROJ-069-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Member project xem danh sach member; non-member bi 403, project missing 404. | Thanh cong: 200 List of project members; case vi pham rule tra 403 Forbidden - not a project member; 404 Project not found. |
| TC-PROJ-070-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | GET /projects/{projectId}/members: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `GET /projects/{projectId}/members/{memberId}`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-PROJ-071-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `GET /projects/{projectId}/members/{memberId}` voi path/query hop le: projectId, memberId. | 200 - Member details; response dung schema/side effect mong doi. |
| TC-PROJ-072-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: projectId, memberId='abc' | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-PROJ-073-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | path id boundary cho projectId, memberId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 Bad Request; domain boundary co the tra 404 Project or member not found. |
| TC-PROJ-074-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi GET /projects/{projectId}/members/{memberId} khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-PROJ-075-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not a project member |
| TC-PROJ-076-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Tra detail member trong project; member/project missing tra 404. | Thanh cong: 200 Member details; case vi pham rule tra 403 Forbidden - not a project member; 404 Project or member not found. |
| TC-PROJ-077-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | GET /projects/{projectId}/members/{memberId}: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `DELETE /projects/{projectId}/members/{memberId}`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-PROJ-078-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `DELETE /projects/{projectId}/members/{memberId}` voi path/query hop le: projectId, memberId. | 200 - Member removed successfully; response dung schema/side effect mong doi. |
| TC-PROJ-079-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: projectId, memberId='abc' | 400 - Cannot remove owner or self |
| TC-PROJ-080-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | path id boundary cho projectId, memberId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 - Cannot remove owner or self; domain boundary co the tra 404 Project or member not found; 409 Member has active tasks. |
| TC-PROJ-081-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi DELETE /projects/{projectId}/members/{memberId} khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-PROJ-082-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - insufficient permissions |
| TC-PROJ-083-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Khong cho remove owner/self; member co active tasks tra 409. | Thanh cong: 200 Member removed successfully; case vi pham rule tra 400 Cannot remove owner or self; 403 Forbidden - insufficient permissions; 404 Project or member not found; 409 Member has active tasks. |
| TC-PROJ-084-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | DELETE /projects/{projectId}/members/{memberId}: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `PATCH /projects/{projectId}/members/{memberId}/role`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-PROJ-085-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `PATCH /projects/{projectId}/members/{memberId}/role` voi path/query hop le: projectId, memberId; body co field bat buoc: roleId. | 200 - Role updated successfully; response dung schema/side effect mong doi. |
| TC-PROJ-086-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | lan luot bo required field: roleId; gui sai type cho numeric field: roleId; path/query numeric khong hop le: projectId, memberId='abc' | 400 - Invalid role or cannot update owner |
| TC-PROJ-087-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | roleId: -1, 0, 1, so rat lon, decimal; path id boundary cho projectId, memberId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 - Invalid role or cannot update owner; domain boundary co the tra 404 Project or member not found. |
| TC-PROJ-088-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi PATCH /projects/{projectId}/members/{memberId}/role khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-PROJ-089-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not a project manager |
| TC-PROJ-090-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Chi manager doi role; khong doi owner, role invalid tra 400. | Thanh cong: 200 Role updated successfully; case vi pham rule tra 400 Invalid role or cannot update owner; 403 Forbidden - not a project manager; 404 Project or member not found. |
| TC-PROJ-091-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | PATCH /projects/{projectId}/members/{memberId}/role: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `POST /projects/{projectId}/leave`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-PROJ-092-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `POST /projects/{projectId}/leave` voi path/query hop le: projectId. | 200 - Left project successfully; response dung schema/side effect mong doi. |
| TC-PROJ-093-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: projectId='abc' | 400 - Cannot leave as last manager or has active tasks |
| TC-PROJ-094-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | path id boundary cho projectId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 - Cannot leave as last manager or has active tasks; domain boundary co the tra 404 Project not found. |
| TC-PROJ-095-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi POST /projects/{projectId}/leave khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-PROJ-096-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user A truy cap resource cua user B hoac project khong lien quan de xac minh khong bi IDOR. | Khong tra du lieu ngoai pham vi user; ket qua phu hop la 403/404 hoac filtered list. |
| TC-PROJ-097-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | User roi project thanh cong; last manager hoac user co active tasks bi chan 400. | Thanh cong: 200 Left project successfully; case vi pham rule tra 400 Cannot leave as last manager or has active tasks; 404 Project not found. |
| TC-PROJ-098-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | POST /projects/{projectId}/leave: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

### Notifications

#### `GET /notifications`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-NOTI-001-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `GET /notifications` voi path/query hop le: page, limit, isRead. | 200 - Paginated list of notifications; response dung schema/side effect mong doi. |
| TC-NOTI-002-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: page, limit='abc'; query page/limit la chuoi, so am hoac 0 | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-NOTI-003-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | page/limit: 1, 0, -1, limit rat lon | Gia tri trong bien duoc chap nhan; ngoai bien tra 400/404 phu hop va khong mutate data. |
| TC-NOTI-004-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi GET /notifications khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-NOTI-005-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user A truy cap resource cua user B hoac project khong lien quan de xac minh khong bi IDOR. | Khong tra du lieu ngoai pham vi user; ket qua phu hop la 403/404 hoac filtered list. |
| TC-NOTI-006-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Tra notification cua current user, filter isRead va pagination dung. | Thanh cong: 200 Paginated list of notifications; du lieu lien quan duoc cap nhat nhat quan. |
| TC-NOTI-007-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | GET /notifications: IDOR notificationId, filter tampering va response khong leak payload user khac. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `GET /notifications/unread-count`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-NOTI-008-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `GET /notifications/unread-count` voi request hop le theo route. | 200 - Unread notification count; response dung schema/side effect mong doi. |
| TC-NOTI-009-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | gui malformed JSON hoac content-type sai neu endpoint co body | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-NOTI-010-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | lap lai request voi du lieu empty/min/max theo domain va id boundary | Gia tri trong bien duoc chap nhan; ngoai bien tra 400/404 phu hop va khong mutate data. |
| TC-NOTI-011-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi GET /notifications/unread-count khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-NOTI-012-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user A truy cap resource cua user B hoac project khong lien quan de xac minh khong bi IDOR. | Khong tra du lieu ngoai pham vi user; ket qua phu hop la 403/404 hoac filtered list. |
| TC-NOTI-013-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Unread count phan anh dung sau khi mark read/delete. | Thanh cong: 200 Unread notification count; du lieu lien quan duoc cap nhat nhat quan. |
| TC-NOTI-014-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | GET /notifications/unread-count: IDOR notificationId, filter tampering va response khong leak payload user khac. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `PATCH /notifications/{notificationId}/read`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-NOTI-015-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `PATCH /notifications/{notificationId}/read` voi path/query hop le: notificationId. | 200 - Notification marked as read; response dung schema/side effect mong doi. |
| TC-NOTI-016-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: notificationId='abc' | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-NOTI-017-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | path id boundary cho notificationId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 Bad Request; domain boundary co the tra 404 Notification not found. |
| TC-NOTI-018-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi PATCH /notifications/{notificationId}/read khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-NOTI-019-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not your notification |
| TC-NOTI-020-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Chi owner notification mark read duoc; not found 404, not owner 403. | Thanh cong: 200 Notification marked as read; case vi pham rule tra 403 Forbidden - not your notification; 404 Notification not found. |
| TC-NOTI-021-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | PATCH /notifications/{notificationId}/read: IDOR notificationId, filter tampering va response khong leak payload user khac. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `PATCH /notifications/read-all`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-NOTI-022-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `PATCH /notifications/read-all` voi request hop le theo route. | 200 - All notifications marked as read; response dung schema/side effect mong doi. |
| TC-NOTI-023-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | gui malformed JSON hoac content-type sai neu endpoint co body | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-NOTI-024-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | lap lai request voi du lieu empty/min/max theo domain va id boundary | Gia tri trong bien duoc chap nhan; ngoai bien tra 400/404 phu hop va khong mutate data. |
| TC-NOTI-025-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi PATCH /notifications/read-all khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-NOTI-026-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user A truy cap resource cua user B hoac project khong lien quan de xac minh khong bi IDOR. | Khong tra du lieu ngoai pham vi user; ket qua phu hop la 403/404 hoac filtered list. |
| TC-NOTI-027-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Chi mark notification cua current user, khong anh huong user khac. | Thanh cong: 200 All notifications marked as read; du lieu lien quan duoc cap nhat nhat quan. |
| TC-NOTI-028-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | PATCH /notifications/read-all: IDOR notificationId, filter tampering va response khong leak payload user khac. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `DELETE /notifications/{notificationId}`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-NOTI-029-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `DELETE /notifications/{notificationId}` voi path/query hop le: notificationId. | 200 - Notification deleted successfully; response dung schema/side effect mong doi. |
| TC-NOTI-030-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: notificationId='abc' | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-NOTI-031-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | path id boundary cho notificationId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 Bad Request; domain boundary co the tra 404 Notification not found. |
| TC-NOTI-032-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi DELETE /notifications/{notificationId} khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-NOTI-033-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not your notification |
| TC-NOTI-034-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Chi owner xoa duoc notification; xoa xong khong con trong list. | Thanh cong: 200 Notification deleted successfully; case vi pham rule tra 403 Forbidden - not your notification; 404 Notification not found. |
| TC-NOTI-035-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | DELETE /notifications/{notificationId}: IDOR notificationId, filter tampering va response khong leak payload user khac. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

### Checklists

#### `POST /projects/{projectId}/checklists`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-CHK-001-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `POST /projects/{projectId}/checklists` voi path/query hop le: projectId; body co field bat buoc: title. | 201 - Checklist created successfully; response dung schema/side effect mong doi. |
| TC-CHK-002-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | lan luot bo required field: title; path/query numeric khong hop le: projectId='abc' | 400 - Invalid input or business rule violation |
| TC-CHK-003-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | title: length=255 va 256; dueDate: ISO hop le, ngay khong ton tai, timezone edge; path id boundary cho projectId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 - Invalid input or business rule violation; domain boundary co the tra 404 Project not found. |
| TC-CHK-004-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi POST /projects/{projectId}/checklists khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-CHK-005-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not a project member |
| TC-CHK-006-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Member project tao checklist hop le; project missing/deleted hoac input loi bi reject. | Thanh cong: 201 Checklist created successfully; case vi pham rule tra 400 Invalid input or business rule violation; 403 Forbidden - not a project member; 404 Project not found. |
| TC-CHK-007-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | POST /projects/{projectId}/checklists: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `GET /projects/{projectId}/checklists`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-CHK-008-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `GET /projects/{projectId}/checklists` voi path/query hop le: projectId. | 200 - List of checklists returned; response dung schema/side effect mong doi. |
| TC-CHK-009-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: projectId='abc' | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-CHK-010-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | path id boundary cho projectId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; ngoai bien tra 400/404 phu hop va khong mutate data. |
| TC-CHK-011-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi GET /projects/{projectId}/checklists khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-CHK-012-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not a project member |
| TC-CHK-013-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Member xem checklist cua project; non-member bi 403. | Thanh cong: 200 List of checklists returned; case vi pham rule tra 403 Forbidden - not a project member. |
| TC-CHK-014-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | GET /projects/{projectId}/checklists: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `GET /checklists/{checklistId}`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-CHK-015-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `GET /checklists/{checklistId}` voi path/query hop le: checklistId. | 200 - Checklist details returned; response dung schema/side effect mong doi. |
| TC-CHK-016-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: checklistId='abc' | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-CHK-017-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | path id boundary cho checklistId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 Bad Request; domain boundary co the tra 404 Checklist not found. |
| TC-CHK-018-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi GET /checklists/{checklistId} khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-CHK-019-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not a project member |
| TC-CHK-020-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Tra chi tiet checklist kem task counts dung; checklist missing 404. | Thanh cong: 200 Checklist details returned; case vi pham rule tra 403 Forbidden - not a project member; 404 Checklist not found. |
| TC-CHK-021-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | GET /checklists/{checklistId}: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `PUT /checklists/{checklistId}`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-CHK-022-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `PUT /checklists/{checklistId}` voi path/query hop le: checklistId. | 200 - Checklist updated successfully; response dung schema/side effect mong doi. |
| TC-CHK-023-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: checklistId='abc' | 400 - Checklist is deleted |
| TC-CHK-024-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | title: length=255 va 256; dueDate: ISO hop le, ngay khong ton tai, timezone edge; path id boundary cho checklistId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 - Checklist is deleted; domain boundary co the tra 404 Checklist not found. |
| TC-CHK-025-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi PUT /checklists/{checklistId} khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-CHK-026-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not a manager or creator |
| TC-CHK-027-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Manager hoac creator update duoc; checklist deleted tra 400. | Thanh cong: 200 Checklist updated successfully; case vi pham rule tra 400 Checklist is deleted; 403 Forbidden - not a manager or creator; 404 Checklist not found. |
| TC-CHK-028-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | PUT /checklists/{checklistId}: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `DELETE /checklists/{checklistId}`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-CHK-029-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `DELETE /checklists/{checklistId}` voi path/query hop le: checklistId. | 200 - Checklist deleted successfully; response dung schema/side effect mong doi. |
| TC-CHK-030-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: checklistId='abc' | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-CHK-031-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | path id boundary cho checklistId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 Bad Request; domain boundary co the tra 404 Checklist not found; 409 Checklist has incomplete tasks. |
| TC-CHK-032-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi DELETE /checklists/{checklistId} khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-CHK-033-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not a manager or creator |
| TC-CHK-034-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Chi xoa checklist khi khong con incomplete task; neu con incomplete task tra 409. | Thanh cong: 200 Checklist deleted successfully; case vi pham rule tra 403 Forbidden - not a manager or creator; 404 Checklist not found; 409 Checklist has incomplete tasks. |
| TC-CHK-035-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | DELETE /checklists/{checklistId}: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `PATCH /checklists/{checklistId}/status`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-CHK-036-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `PATCH /checklists/{checklistId}/status` voi path/query hop le: checklistId; body co field bat buoc: status. | 200 - Status changed successfully; response dung schema/side effect mong doi. |
| TC-CHK-037-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | lan luot bo required field: status; path/query numeric khong hop le: checklistId='abc' | 400 - Invalid status transition |
| TC-CHK-038-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | path id boundary cho checklistId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 - Invalid status transition; domain boundary co the tra 404 Checklist not found. |
| TC-CHK-039-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi PATCH /checklists/{checklistId}/status khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-CHK-040-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not a project member |
| TC-CHK-041-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Chi cho transition OPEN -> IN_PROGRESS -> DONE; transition khong hop le tra 400. | Thanh cong: 200 Status changed successfully; case vi pham rule tra 400 Invalid status transition; 403 Forbidden - not a project member; 404 Checklist not found. |
| TC-CHK-042-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | PATCH /checklists/{checklistId}/status: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

### Tasks

#### `POST /checklists/{checklistId}/tasks`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-TASK-001-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `POST /checklists/{checklistId}/tasks` voi path/query hop le: checklistId; body co field bat buoc: title. | 201 - Task created successfully; response dung schema/side effect mong doi. |
| TC-TASK-002-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | lan luot bo required field: title; gui sai type cho numeric field: assigneeId; path/query numeric khong hop le: checklistId='abc' | 400 - Invalid input or business rule violation |
| TC-TASK-003-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | title: length=255 va 256; assigneeId: -1, 0, 1, so rat lon, decimal; dueDate: ISO hop le, ngay khong ton tai, timezone edge; path id boundary cho checklistId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 - Invalid input or business rule violation; domain boundary co the tra 404 Checklist not found. |
| TC-TASK-004-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi POST /checklists/{checklistId}/tasks khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-TASK-005-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden |
| TC-TASK-006-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Tao task trong checklist hop le; assignee phai la project member neu truyen. | Thanh cong: 201 Task created successfully; case vi pham rule tra 400 Invalid input or business rule violation; 403 Forbidden; 404 Checklist not found. |
| TC-TASK-007-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | POST /checklists/{checklistId}/tasks: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `GET /checklists/{checklistId}/tasks`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-TASK-008-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `GET /checklists/{checklistId}/tasks` voi path/query hop le: checklistId. | 200 - List of tasks returned; response dung schema/side effect mong doi. |
| TC-TASK-009-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: checklistId='abc' | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-TASK-010-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | path id boundary cho checklistId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 Bad Request; domain boundary co the tra 404 Checklist not found. |
| TC-TASK-011-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi GET /checklists/{checklistId}/tasks khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-TASK-012-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden |
| TC-TASK-013-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Tra task cua checklist dung thu tu, khong leak task da xoa neu soft delete. | Thanh cong: 200 List of tasks returned; case vi pham rule tra 403 Forbidden; 404 Checklist not found. |
| TC-TASK-014-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | GET /checklists/{checklistId}/tasks: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `GET /tasks/{taskId}`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-TASK-015-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `GET /tasks/{taskId}` voi path/query hop le: taskId. | 200 - Task details returned; response dung schema/side effect mong doi. |
| TC-TASK-016-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: taskId='abc' | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-TASK-017-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | path id boundary cho taskId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 Bad Request; domain boundary co the tra 404 Task not found. |
| TC-TASK-018-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi GET /tasks/{taskId} khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-TASK-019-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden |
| TC-TASK-020-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Tra detail task kem assignee/status/tags/counts dung. | Thanh cong: 200 Task details returned; case vi pham rule tra 403 Forbidden; 404 Task not found. |
| TC-TASK-021-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | GET /tasks/{taskId}: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `PUT /tasks/{taskId}`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-TASK-022-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `PUT /tasks/{taskId}` voi path/query hop le: taskId. | 200 - Task updated successfully; response dung schema/side effect mong doi. |
| TC-TASK-023-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | gui sai type cho numeric field: assigneeId; path/query numeric khong hop le: taskId='abc' | 400 - Invalid input or deleted task |
| TC-TASK-024-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | title: length=255 va 256; assigneeId: -1, 0, 1, so rat lon, decimal; dueDate: ISO hop le, ngay khong ton tai, timezone edge; path id boundary cho taskId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 - Invalid input or deleted task; domain boundary co the tra 404 Task not found. |
| TC-TASK-025-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi PUT /tasks/{taskId} khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-TASK-026-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden |
| TC-TASK-027-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Manager hoac assignee update duoc; task deleted hoac input loi tra 400. | Thanh cong: 200 Task updated successfully; case vi pham rule tra 400 Invalid input or deleted task; 403 Forbidden; 404 Task not found. |
| TC-TASK-028-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | PUT /tasks/{taskId}: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `DELETE /tasks/{taskId}`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-TASK-029-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `DELETE /tasks/{taskId}` voi path/query hop le: taskId. | 200 - Task deleted successfully; response dung schema/side effect mong doi. |
| TC-TASK-030-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: taskId='abc' | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-TASK-031-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | path id boundary cho taskId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 Bad Request; domain boundary co the tra 404 Task not found. |
| TC-TASK-032-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi DELETE /tasks/{taskId} khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-TASK-033-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden |
| TC-TASK-034-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Manager hoac creator soft delete task; task khong ton tai tra 404. | Thanh cong: 200 Task deleted successfully; case vi pham rule tra 403 Forbidden; 404 Task not found. |
| TC-TASK-035-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | DELETE /tasks/{taskId}: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `PATCH /tasks/{taskId}/assign`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-TASK-036-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `PATCH /tasks/{taskId}/assign` voi path/query hop le: taskId; body co field bat buoc: assigneeId. | 200 - Task assigned successfully; response dung schema/side effect mong doi. |
| TC-TASK-037-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | lan luot bo required field: assigneeId; gui sai type cho numeric field: assigneeId; path/query numeric khong hop le: taskId='abc' | 400 - Invalid assignee |
| TC-TASK-038-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | assigneeId: -1, 0, 1, so rat lon, decimal; path id boundary cho taskId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 - Invalid assignee; domain boundary co the tra 404 Task not found. |
| TC-TASK-039-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi PATCH /tasks/{taskId}/assign khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-TASK-040-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden |
| TC-TASK-041-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Chi assign cho project member; assignee invalid tra 400. | Thanh cong: 200 Task assigned successfully; case vi pham rule tra 400 Invalid assignee; 403 Forbidden; 404 Task not found. |
| TC-TASK-042-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | PATCH /tasks/{taskId}/assign: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `PATCH /tasks/{taskId}/status`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-TASK-043-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `PATCH /tasks/{taskId}/status` voi path/query hop le: taskId; body co field bat buoc: statusId. | 200 - Status updated successfully; response dung schema/side effect mong doi. |
| TC-TASK-044-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | lan luot bo required field: statusId; gui sai type cho numeric field: statusId; path/query numeric khong hop le: taskId='abc' | 400 - Invalid status |
| TC-TASK-045-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | statusId: -1, 0, 1, so rat lon, decimal; path id boundary cho taskId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 - Invalid status; domain boundary co the tra 404 Task not found. |
| TC-TASK-046-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi PATCH /tasks/{taskId}/status khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-TASK-047-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden |
| TC-TASK-048-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | StatusId hop le 1..4; cap nhat task va auto-update checklist status dung. | Thanh cong: 200 Status updated successfully; case vi pham rule tra 400 Invalid status; 403 Forbidden; 404 Task not found. |
| TC-TASK-049-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | PATCH /tasks/{taskId}/status: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `PATCH /tasks/reorder`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-TASK-050-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `PATCH /tasks/reorder` voi body co field bat buoc: taskId, newPosition. | 200 - Tasks reordered successfully; response dung schema/side effect mong doi. |
| TC-TASK-051-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | lan luot bo required field: taskId, newPosition; gui sai type cho numeric field: taskId, newPosition | 400 - Invalid position |
| TC-TASK-052-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | taskId: -1, 0, 1, so rat lon, decimal; newPosition: -1, 0, 1, so rat lon, decimal | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 - Invalid position; domain boundary co the tra 404 Task not found. |
| TC-TASK-053-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi PATCH /tasks/reorder khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-TASK-054-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden |
| TC-TASK-055-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | newPosition 0-based hop le reorder atomic; position loi tra 400 va khong doi order. | Thanh cong: 200 Tasks reordered successfully; case vi pham rule tra 400 Invalid position; 403 Forbidden; 404 Task not found. |
| TC-TASK-056-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | PATCH /tasks/reorder: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `GET /projects/{projectId}/task-summary`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-TASK-057-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `GET /projects/{projectId}/task-summary` voi path/query hop le: projectId. | 200 - Task summary returned; response dung schema/side effect mong doi. |
| TC-TASK-058-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: projectId='abc' | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-TASK-059-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | path id boundary cho projectId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; ngoai bien tra 400/404 phu hop va khong mutate data. |
| TC-TASK-060-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi GET /projects/{projectId}/task-summary khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-TASK-061-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden |
| TC-TASK-062-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Task summary theo project dung voi so luong task tung status. | Thanh cong: 200 Task summary returned; case vi pham rule tra 403 Forbidden. |
| TC-TASK-063-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | GET /projects/{projectId}/task-summary: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

### Task Comments

#### `POST /tasks/{taskId}/comments`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-COMM-001-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `POST /tasks/{taskId}/comments` voi path/query hop le: taskId; body co field bat buoc: content. | 201 - Comment created successfully; response dung schema/side effect mong doi. |
| TC-COMM-002-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | lan luot bo required field: content; path/query numeric khong hop le: taskId='abc' | 400 - Invalid input or task is deleted |
| TC-COMM-003-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | content: length=5000 va 5001; path id boundary cho taskId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 - Invalid input or task is deleted; domain boundary co the tra 404 Task not found. |
| TC-COMM-004-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi POST /tasks/{taskId}/comments khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-COMM-005-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not a project member |
| TC-COMM-006-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Member project comment duoc; @username mention tao notification dung nguoi neu user hop le. | Thanh cong: 201 Comment created successfully; case vi pham rule tra 400 Invalid input or task is deleted; 403 Forbidden - not a project member; 404 Task not found. |
| TC-COMM-007-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | POST /tasks/{taskId}/comments: content chua <script>, HTML, SQL payload, mention spam va very long unicode. | Payload duoc sanitize/encode; khong XSS, khong mention/notification spam ngoai rule. |

#### `GET /tasks/{taskId}/comments`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-COMM-008-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `GET /tasks/{taskId}/comments` voi path/query hop le: taskId. | 200 - List of comments returned; response dung schema/side effect mong doi. |
| TC-COMM-009-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: taskId='abc' | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-COMM-010-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | path id boundary cho taskId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 Bad Request; domain boundary co the tra 404 Task not found. |
| TC-COMM-011-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi GET /tasks/{taskId}/comments khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-COMM-012-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not a project member |
| TC-COMM-013-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Tra comment oldest first; task missing 404. | Thanh cong: 200 List of comments returned; case vi pham rule tra 403 Forbidden - not a project member; 404 Task not found. |
| TC-COMM-014-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | GET /tasks/{taskId}/comments: content chua <script>, HTML, SQL payload, mention spam va very long unicode. | Payload duoc sanitize/encode; khong XSS, khong mention/notification spam ngoai rule. |

#### `PUT /comments/{commentId}`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-COMM-015-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `PUT /comments/{commentId}` voi path/query hop le: commentId; body co field bat buoc: content. | 200 - Comment updated successfully; response dung schema/side effect mong doi. |
| TC-COMM-016-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | lan luot bo required field: content; path/query numeric khong hop le: commentId='abc' | 400 - Cannot update a deleted comment |
| TC-COMM-017-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | content: length=5000 va 5001; path id boundary cho commentId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 - Cannot update a deleted comment; domain boundary co the tra 404 Comment not found. |
| TC-COMM-018-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi PUT /comments/{commentId} khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-COMM-019-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not the comment owner |
| TC-COMM-020-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Chi owner update; comment da xoa khong update duoc va tra 400. | Thanh cong: 200 Comment updated successfully; case vi pham rule tra 400 Cannot update a deleted comment; 403 Forbidden - not the comment owner; 404 Comment not found. |
| TC-COMM-021-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | PUT /comments/{commentId}: content chua <script>, HTML, SQL payload, mention spam va very long unicode. | Payload duoc sanitize/encode; khong XSS, khong mention/notification spam ngoai rule. |

#### `DELETE /comments/{commentId}`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-COMM-022-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `DELETE /comments/{commentId}` voi path/query hop le: commentId. | 200 - Comment deleted successfully; response dung schema/side effect mong doi. |
| TC-COMM-023-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: commentId='abc' | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-COMM-024-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | path id boundary cho commentId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 Bad Request; domain boundary co the tra 404 Comment not found. |
| TC-COMM-025-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi DELETE /comments/{commentId} khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-COMM-026-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not the owner or manager |
| TC-COMM-027-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Owner hoac project manager soft delete duoc; non-owner/non-manager bi 403. | Thanh cong: 200 Comment deleted successfully; case vi pham rule tra 403 Forbidden - not the owner or manager; 404 Comment not found. |
| TC-COMM-028-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | DELETE /comments/{commentId}: content chua <script>, HTML, SQL payload, mention spam va very long unicode. | Payload duoc sanitize/encode; khong XSS, khong mention/notification spam ngoai rule. |

### Task Attachments

#### `POST /tasks/{taskId}/attachments`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-ATT-001-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `POST /tasks/{taskId}/attachments` voi path/query hop le: taskId; multipart file hop le <=20MB. | 201 - Attachment uploaded successfully; response dung schema/side effect mong doi. |
| TC-ATT-002-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: taskId='abc' | 400 - Invalid file or task deleted |
| TC-ATT-003-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | file: 0 byte, 20MB, 20MB+1, MIME khong khop extension; path id boundary cho taskId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 - Invalid file or task deleted; domain boundary co the tra 404 Task not found. |
| TC-ATT-004-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi POST /tasks/{taskId}/attachments khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-ATT-005-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not a project member |
| TC-ATT-006-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Upload file hop le <=20MB len storage; task deleted/file invalid tra 400. | Thanh cong: 201 Attachment uploaded successfully; case vi pham rule tra 400 Invalid file or task deleted; 403 Forbidden - not a project member; 404 Task not found. |
| TC-ATT-007-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | POST /tasks/{taskId}/attachments: upload/download voi MIME spoofing, filename '../a.exe', file script, file qua size; verify URL khong public vinh vien. | File nguy hiem bi reject/quarantine; URL download chi cap cho user co quyen; khong path traversal. |

#### `GET /tasks/{taskId}/attachments`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-ATT-008-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `GET /tasks/{taskId}/attachments` voi path/query hop le: taskId. | 200 - List of attachments returned; response dung schema/side effect mong doi. |
| TC-ATT-009-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: taskId='abc' | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-ATT-010-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | path id boundary cho taskId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 Bad Request; domain boundary co the tra 404 Task not found. |
| TC-ATT-011-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi GET /tasks/{taskId}/attachments khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-ATT-012-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not a project member |
| TC-ATT-013-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Member project xem list attachment cua task; task missing 404. | Thanh cong: 200 List of attachments returned; case vi pham rule tra 403 Forbidden - not a project member; 404 Task not found. |
| TC-ATT-014-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | GET /tasks/{taskId}/attachments: upload/download voi MIME spoofing, filename '../a.exe', file script, file qua size; verify URL khong public vinh vien. | File nguy hiem bi reject/quarantine; URL download chi cap cho user co quyen; khong path traversal. |

#### `GET /attachments/{attachmentId}/download`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-ATT-015-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `GET /attachments/{attachmentId}/download` voi path/query hop le: attachmentId. | 200 - Download URL returned; response dung schema/side effect mong doi. |
| TC-ATT-016-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: attachmentId='abc' | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-ATT-017-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | path id boundary cho attachmentId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 Bad Request; domain boundary co the tra 404 Attachment not found. |
| TC-ATT-018-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi GET /attachments/{attachmentId}/download khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-ATT-019-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not a project member |
| TC-ATT-020-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Authorized user nhan download URL; non-member bi 403, missing attachment 404. | Thanh cong: 200 Download URL returned; case vi pham rule tra 403 Forbidden - not a project member; 404 Attachment not found. |
| TC-ATT-021-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | GET /attachments/{attachmentId}/download: upload/download voi MIME spoofing, filename '../a.exe', file script, file qua size; verify URL khong public vinh vien. | File nguy hiem bi reject/quarantine; URL download chi cap cho user co quyen; khong path traversal. |

#### `DELETE /attachments/{attachmentId}`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-ATT-022-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `DELETE /attachments/{attachmentId}` voi path/query hop le: attachmentId. | 200 - Attachment deleted successfully; response dung schema/side effect mong doi. |
| TC-ATT-023-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: attachmentId='abc' | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-ATT-024-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | path id boundary cho attachmentId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 Bad Request; domain boundary co the tra 404 Attachment not found. |
| TC-ATT-025-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi DELETE /attachments/{attachmentId} khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-ATT-026-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden |
| TC-ATT-027-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Owner/manager/admin soft delete duoc; file da xoa khong con download duoc. | Thanh cong: 200 Attachment deleted successfully; case vi pham rule tra 403 Forbidden; 404 Attachment not found. |
| TC-ATT-028-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | DELETE /attachments/{attachmentId}: upload/download voi MIME spoofing, filename '../a.exe', file script, file qua size; verify URL khong public vinh vien. | File nguy hiem bi reject/quarantine; URL download chi cap cho user co quyen; khong path traversal. |

### Tags

#### `POST /projects/{projectId}/tags`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-TAG-001-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `POST /projects/{projectId}/tags` voi path/query hop le: projectId; body co field bat buoc: name, color. | 201 - Tag created successfully; response dung schema/side effect mong doi. |
| TC-TAG-002-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | lan luot bo required field: name, color; path/query numeric khong hop le: projectId='abc' | 400 - Invalid input or project is deleted |
| TC-TAG-003-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | name: length=100 va 101; color: #000000, #FFFFFF, #GGGGGG, 'red', payload CSS; path id boundary cho projectId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 - Invalid input or project is deleted; domain boundary co the tra 404 Project not found; 409 Tag name already exists in this project. |
| TC-TAG-004-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi POST /projects/{projectId}/tags khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-TAG-005-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - insufficient permissions |
| TC-TAG-006-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Tao tag voi ten duy nhat trong project va HEX color hop le; duplicate name tra 409. | Thanh cong: 201 Tag created successfully; case vi pham rule tra 400 Invalid input or project is deleted; 403 Forbidden - insufficient permissions; 404 Project not found; 409 Tag name already exists in this project. |
| TC-TAG-007-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | POST /projects/{projectId}/tags: name/color chua HTML/CSS injection, duplicate race condition va tagId cua project khac. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `GET /projects/{projectId}/tags`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-TAG-008-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `GET /projects/{projectId}/tags` voi path/query hop le: projectId. | 200 - List of tags returned; response dung schema/side effect mong doi. |
| TC-TAG-009-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: projectId='abc' | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-TAG-010-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | path id boundary cho projectId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; ngoai bien tra 400/404 phu hop va khong mutate data. |
| TC-TAG-011-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi GET /projects/{projectId}/tags khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-TAG-012-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not a project member |
| TC-TAG-013-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Member project xem tags cua project; non-member bi 403. | Thanh cong: 200 List of tags returned; case vi pham rule tra 403 Forbidden - not a project member. |
| TC-TAG-014-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | GET /projects/{projectId}/tags: name/color chua HTML/CSS injection, duplicate race condition va tagId cua project khac. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `PUT /tags/{tagId}`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-TAG-015-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `PUT /tags/{tagId}` voi path/query hop le: tagId. | 200 - Tag updated successfully; response dung schema/side effect mong doi. |
| TC-TAG-016-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: tagId='abc' | 400 - Invalid input |
| TC-TAG-017-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | name: length=100 va 101; color: #000000, #FFFFFF, #GGGGGG, 'red', payload CSS; path id boundary cho tagId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 - Invalid input; domain boundary co the tra 404 Tag not found; 409 Tag name already exists in this project. |
| TC-TAG-018-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi PUT /tags/{tagId} khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-TAG-019-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - insufficient permissions |
| TC-TAG-020-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Manager/admin/super admin update tag; duplicate name tra 409. | Thanh cong: 200 Tag updated successfully; case vi pham rule tra 400 Invalid input; 403 Forbidden - insufficient permissions; 404 Tag not found; 409 Tag name already exists in this project. |
| TC-TAG-021-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | PUT /tags/{tagId}: name/color chua HTML/CSS injection, duplicate race condition va tagId cua project khac. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `DELETE /tags/{tagId}`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-TAG-022-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `DELETE /tags/{tagId}` voi path/query hop le: tagId. | 200 - Tag deleted successfully; response dung schema/side effect mong doi. |
| TC-TAG-023-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: tagId='abc' | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-TAG-024-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | path id boundary cho tagId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 Bad Request; domain boundary co the tra 404 Tag not found. |
| TC-TAG-025-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi DELETE /tags/{tagId} khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-TAG-026-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - insufficient permissions |
| TC-TAG-027-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Hard delete tag va tat ca association voi task. | Thanh cong: 200 Tag deleted successfully; case vi pham rule tra 403 Forbidden - insufficient permissions; 404 Tag not found. |
| TC-TAG-028-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | DELETE /tags/{tagId}: name/color chua HTML/CSS injection, duplicate race condition va tagId cua project khac. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `POST /tasks/{taskId}/tags`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-TAG-029-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `POST /tasks/{taskId}/tags` voi path/query hop le: taskId; body co field bat buoc: tagId. | 201 - Tag assigned successfully; response dung schema/side effect mong doi. |
| TC-TAG-030-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | lan luot bo required field: tagId; gui sai type cho numeric field: tagId; path/query numeric khong hop le: taskId='abc' | 400 - Invalid input or tag does not belong to project |
| TC-TAG-031-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | tagId: -1, 0, 1, so rat lon, decimal; path id boundary cho taskId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 - Invalid input or tag does not belong to project; domain boundary co the tra 404 Task or tag not found; 409 Tag already assigned to this task. |
| TC-TAG-032-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi POST /tasks/{taskId}/tags khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-TAG-033-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not a project member |
| TC-TAG-034-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Gan tag thuoc cung project; duplicate assignment 409, tag sai project 400. | Thanh cong: 201 Tag assigned successfully; case vi pham rule tra 400 Invalid input or tag does not belong to project; 403 Forbidden - not a project member; 404 Task or tag not found; 409 Tag already assigned to this task. |
| TC-TAG-035-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | POST /tasks/{taskId}/tags: name/color chua HTML/CSS injection, duplicate race condition va tagId cua project khac. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `GET /tasks/{taskId}/tags`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-TAG-036-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `GET /tasks/{taskId}/tags` voi path/query hop le: taskId. | 200 - List of task tags returned; response dung schema/side effect mong doi. |
| TC-TAG-037-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: taskId='abc' | 400 Bad Request theo validation policy; response khong lam thay doi du lieu. |
| TC-TAG-038-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | path id boundary cho taskId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 Bad Request; domain boundary co the tra 404 Task not found. |
| TC-TAG-039-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi GET /tasks/{taskId}/tags khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-TAG-040-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not a project member |
| TC-TAG-041-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Tra dung tag dang gan cho task; task missing 404. | Thanh cong: 200 List of task tags returned; case vi pham rule tra 403 Forbidden - not a project member; 404 Task not found. |
| TC-TAG-042-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | GET /tasks/{taskId}/tags: name/color chua HTML/CSS injection, duplicate race condition va tagId cua project khac. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |

#### `DELETE /tasks/{taskId}/tags/{tagId}`

| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |
|---|---|---|---|---|
| TC-TAG-043-HP | Happy Path | Da co JWT hop le va user co dung quyen voi resource. | Goi `DELETE /tasks/{taskId}/tags/{tagId}` voi path/query hop le: taskId, tagId. | 200 - Tag removed from task successfully; response dung schema/side effect mong doi. |
| TC-TAG-044-VAL | Validation | Da co JWT hop le va user co dung quyen voi resource. | path/query numeric khong hop le: taskId, tagId='abc' | 400 - Tag not assigned to task |
| TC-TAG-045-BND | Boundary | Da co JWT hop le va user co dung quyen voi resource. | path id boundary cho taskId, tagId: 0, -1, 2147483647 | Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 - Tag not assigned to task; domain boundary co the tra 404 Task not found. |
| TC-TAG-046-AUTHN | Authentication | Co/khong co credential/token tuy theo flow. | Goi DELETE /tasks/{taskId}/tags/{tagId} khong co Authorization, Bearer rong, token het han va token sai signature. | 401 - Unauthorized |
| TC-TAG-047-AUTHZ | Authorization | Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le. | Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac. | 403 - Forbidden - not a project member |
| TC-TAG-048-BL | Business Logic | Da co JWT hop le va user co dung quyen voi resource. | Go tag da gan thanh cong; tag chua gan tra 400. | Thanh cong: 200 Tag removed from task successfully; case vi pham rule tra 400 Tag not assigned to task; 403 Forbidden - not a project member; 404 Task not found. |
| TC-TAG-049-SEC | Security | Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat. | DELETE /tasks/{taskId}/tags/{tagId}: name/color chua HTML/CSS injection, duplicate race condition va tagId cua project khac. | Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac. |


## Data Schema Appendix

### `RegisterDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| email | Yes | string | required | user@example.com | Registration email |
| password | Yes | string | required, min password length 8, requires uppercase, requires special char | Abc@1234 | Password (min 8 chars, 1 uppercase, 1 special char) |
| fullName | Yes | string | required | John Doe | Full name |

### `VerifyEmailDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| email | Yes | string | required | user@example.com |  |
| otp | Yes | string | required, 6 digits | 123456 | 6-digit OTP |

### `ResendOtpDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| email | Yes | string | required | user@example.com |  |

### `LoginDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| email | Yes | string | required | user@example.com |  |
| password | Yes | string | required | Abc@1234 |  |

### `RefreshTokenDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| refreshToken | Yes | string | required | valid-token | Refresh token |

### `ForgotPasswordDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| email | Yes | string | required | user@example.com |  |

### `VerifyResetOtpDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| email | Yes | string | required | user@example.com |  |
| otp | Yes | string | required, 6 digits | 123456 | 6-digit OTP |

### `ResetPasswordDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| email | Yes | string | required | user@example.com |  |
| newPassword | Yes | string | required, min password length 8, requires uppercase, requires special char | NewAbc@1234 | New password (min 8 chars, 1 uppercase, 1 special char) |

### `CreateProjectDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| name | Yes | string | required | My Project | Project name |
| description | No | string | - | A description of the project | Project description |
| startDate | No | string | - | 2025-01-01 | Project start date |
| endDate | No | string | - | 2025-12-31 | Project end date |

### `UpdateProjectDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| name | No | string | - | My Updated Project | Project name |
| description | No | string | - | An updated description | Project description |
| endDate | No | string | - | 2025-12-31 | Project end date |

### `InviteMemberDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| email | Yes | string | required | user@gmail.com | Email of the invitee |
| roleId | Yes | number | required | 2 | Role ID to assign in the project |

### `AcceptInviteDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| token | Yes | string | required | abc123xyz | Invitation token |

### `UpdateMemberRoleDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| roleId | Yes | number | required | 2 | New role ID to assign |

### `CreateChecklistDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| title | Yes | string | required, maxLength=255 | QA checklist item | Checklist title |
| description | No | string | - | Mo ta hop le | Checklist description |
| dueDate | No | string | - | 2026-08-31 | Due date (ISO 8601) |

### `UpdateChecklistDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| title | No | string | maxLength=255 | QA checklist item | Checklist title |
| description | No | string | - | Mo ta hop le | Checklist description |
| dueDate | No | string | - | 2026-08-31 | Due date (ISO 8601) |

### `ChangeChecklistStatusDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| status | Yes | string enum(OPEN, IN_PROGRESS, DONE) | required, enum=OPEN, IN_PROGRESS, DONE | OPEN | Target status |

### `CreateTaskDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| title | Yes | string | required, maxLength=255 | QA checklist item | Task title |
| description | No | string | - | Mo ta hop le | Task description |
| assigneeId | No | number | - | 1 | Assignee user ID |
| dueDate | No | string | - | 2026-08-31 | Due date (ISO 8601) |

### `UpdateTaskDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| title | No | string | maxLength=255 | QA checklist item | Task title |
| description | No | string | - | Mo ta hop le | Task description |
| assigneeId | No | number | - | 1 | Assignee user ID |
| dueDate | No | string | - | 2026-08-31 | Due date (ISO 8601) |

### `AssignTaskDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| assigneeId | Yes | number | required | 1 | Assignee user ID |

### `ChangeTaskStatusDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| statusId | Yes | number | required | 1 | Task status ID (1=TODO, 2=IN_PROGRESS, 3=REVIEW, 4=DONE) |

### `ReorderTaskDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| taskId | Yes | number | required | 1 | Task ID to reorder |
| newPosition | Yes | number | required | 1 | New position (0-based index within the checklist) |

### `CreateCommentDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| content | Yes | string | required, maxLength=5000 | The Login API has been completed. | Comment content (supports @username mentions) |

### `UpdateCommentDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| content | Yes | string | required, maxLength=5000 | The Login API has been completed and deployed. | Updated comment content |

### `UploadAttachmentResponseDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| id | Yes | number | required | 5 | Attachment ID |
| fileName | Yes | string | required | Design.pdf | Original file name |
| fileUrl | Yes | string | required | https://<storage-account>.blob.core.windows.net/files/550e8400-e29b-41d4-a716-446655440000.pdf | Azure Blob Storage URL |

### `CreateTagDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| name | Yes | string | required, maxLength=100 | Backend | Tag name |
| color | Yes | string | required | #2ecc71 | HEX color code |

### `UpdateTagDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| name | No | string | maxLength=100 | API | Tag name |
| color | No | string | - | #3498db | HEX color code |

### `AssignTagDto`

| Field | Required | Type | Constraints | Example | Description |
|---|---:|---|---|---|---|
| tagId | Yes | number | required | 2 | Tag ID to assign |

