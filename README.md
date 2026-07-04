# Aurora — Checklist Management System API

A collaborative checklist and task management backend built with **NestJS**, **Prisma**, and **MySQL**. Features JWT-based authentication, project/team management, real-time notifications, file attachments via Azure Blob Storage, and a full activity audit trail.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Modules Overview](#modules-overview)
- [API Endpoints](#api-endpoints)
- [Authentication Flow](#authentication-flow)
- [Database Schema](#database-schema)
- [Development](#development)
- [Deployment](#deployment)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 20+ |
| **Framework** | NestJS 10 |
| **Database** | MySQL 8 |
| **ORM** | Prisma 5 |
| **Cache / Session** | Redis (ioredis) |
| **Auth** | JWT (access + refresh tokens), Passport |
| **File Storage** | Azure Blob Storage |
| **Email** | Nodemailer (SMTP) |
| **Validation** | class-validator + class-transformer |
| **API Docs** | Swagger / OpenAPI |
| **Language** | TypeScript 5 (strict mode) |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    NestJS App                        │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐ │
│  │ Auth     │  │ Projects │  │ Checklists        │ │
│  │ Module   │  │ Module   │  │ Module            │ │
│  ├──────────┤  ├──────────┤  ├───────────────────┤ │
│  │ Tasks    │  │ Comments │  │ Attachments       │ │
│  │ Module   │  │ Module   │  │ Module            │ │
│  ├──────────┤  ├──────────┤  ├───────────────────┤ │
│  │ Tags     │  │ Notific. │  │ Activity Log      │ │
│  │ Module   │  │ Module   │  │ Module             │ │
│  └──────────┘  └──────────┘  └───────────────────┘ │
│  ┌─────────────────────────────────────────────────┐│
│  │  Shared: Prisma | Redis | Mail | AzureBlob      ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
         │              │              │
         ▼              ▼              ▼
      MySQL           Redis        Azure Blob
```

### Key Design Principles

- **Module per domain** — Each business domain (projects, tasks, comments, etc.) is encapsulated in its own NestJS module.
- **Service-based business logic** — Controllers are thin; all business rules live in services.
- **Dependency injection** — Cross-module services (Notifications, ActivityLog) are injected via DI, with `forwardRef()` to resolve circular dependencies.
- **Soft deletes** — Most entities use a `deletedAt` timestamp rather than hard deletion.
- **Activity audit trail** — Every business action is automatically recorded in the Activity Log after the database transaction succeeds.
- **Notifications** — Key events trigger in-app notifications via the Notifications module.

---

## Getting Started

### Prerequisites

- Node.js 20+
- MySQL 8+
- Redis 7+
- An Azure Storage account (for file uploads) — optional, can be left empty

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd aurora-be

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration (see Environment Variables below)

# Generate Prisma client and run migrations
npx prisma generate
npx prisma db push

# Seed roles (optional, creates default system roles and project roles)
npx prisma db seed

# Start the development server
npm run start:dev
```

The API will be available at `http://localhost:3000`  
Swagger docs at `http://localhost:3000/api/docs`

## Modules Overview

### Auth Module (`/auth`)

Handles registration, email verification (OTP), login, token refresh, logout, and password reset.

- OTP-based email verification with rate limiting
- JWT access + refresh token pair
- Refresh token rotation (old token invalidated on reuse)

### Projects Module (`/projects`)

Full CRUD for projects with status lifecycle: `ACTIVE → ARCHIVED | COMPLETED`.

- **Project Members** — Invite via email, accept invitation, role management
- **Roles** — `PROJECT_MANAGER`, `PROJECT_MEMBER`, `ADMIN` (system-wide), `SUPER_ADMIN` (system-wide)
- **Soft delete** — projects are soft-deleted with `deletedAt`

### Checklists Module (`/checklists`)

Checklists belong to a project and contain tasks. Status flow: `OPEN → IN_PROGRESS → DONE`.

- Tasks are automatically counted for status-based completion
- Checklist-level due dates constrain individual task due dates

### Tasks Module (`/tasks`)

Tasks (ChecklistItems) are the core work unit. They support:

- Assignment to project members
- Custom status workflow (configurable via `TaskStatus` table)
- Ordering within a checklist (drag-and-drop reorder)
- Auto-update of parent checklist status based on task completion
- Due dates constrained by checklist and project dates

### Comments Module (`/tasks/:taskId/comments`)

Threaded comments on tasks with:

- @mention detection and email notification
- Task participant notification on new comments
- Soft delete with owner/manager authorization

### Attachments Module (`/tasks/:taskId/attachments`)

File upload to Azure Blob Storage with:

- MIME type and extension validation (images, PDFs, Office documents)
- Malicious file blocking (.exe, .bat, .sh, .js, .jar, etc.)
- Unicode/mojibake filename recovery and normalization
- Size limit enforcement (configurable, default 20 MB)
- Soft delete in DB + physical deletion from Azure

### Tags Module (`/projects/:projectId/tags`, `/tasks/:taskId/tags`)

Project-scoped tags with hex color codes. Tags can be assigned to/removed from tasks. Duplicate names are enforced within a project.

### Notifications Module (`/notifications`)

Automatically generated in-app notifications for:

- Being added to a project
- Role changes
- Task assigned, unassigned, completed
- New comments and file uploads

Supports pagination, read/unread filtering, mark-all-as-read, and individual delete.

### Activity Log Module (`/activities`)

System-wide audit trail that records every business action.

**Logged actions:**
- **Project**: created, updated, archived, completed, deleted
- **Members**: added, removed, role updated
- **Checklists**: created, updated, deleted, status changed
- **Tasks**: created, updated, deleted, assigned, unassigned, status changed, completed
- **Comments**: created, updated, deleted
- **Attachments**: uploaded, deleted
- **Tags**: created, updated, deleted, assigned, removed
- **Auth**: registered

Each entry captures `userId`, `action`, `entityType`, `entityId`, and optional `oldValue`/`newValue` as JSON snapshots.

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register a new account |
| POST | `/auth/verify-email` | Verify email with OTP |
| POST | `/auth/resend-otp` | Resend verification OTP |
| POST | `/auth/login` | Login, returns JWT pair |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Invalidate refresh token |
| POST | `/auth/forgot-password` | Request password reset OTP |
| POST | `/auth/verify-reset-otp` | Verify reset OTP |
| POST | `/auth/reset-password` | Set new password |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects` | Create a project |
| GET | `/projects` | List my projects |
| GET | `/projects/:id` | Get project detail |
| PUT | `/projects/:id` | Update project |
| PATCH | `/projects/:id/archive` | Archive project |
| PATCH | `/projects/:id/complete` | Complete project |
| DELETE | `/projects/:id` | Soft-delete project |
| POST | `/projects/:id/invite` | Invite a member |
| POST | `/invitations/accept` | Accept invitation |
| GET | `/projects/:id/members` | List members |
| GET | `/projects/:id/members/:memberId` | Member detail |
| PATCH | `/projects/:id/members/:memberId/role` | Update member role |
| DELETE | `/projects/:id/members/:memberId` | Remove member |
| POST | `/projects/:id/leave` | Leave project |
| GET | `/projects/:id/activities` | Project activity log |

### Checklists

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects/:id/checklists` | Create checklist |
| GET | `/projects/:id/checklists` | List checklists |
| GET | `/checklists/:id` | Checklist detail |
| PUT | `/checklists/:id` | Update checklist |
| PATCH | `/checklists/:id/status` | Change status |
| DELETE | `/checklists/:id` | Soft-delete checklist |

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/checklists/:id/tasks` | Create task |
| GET | `/checklists/:id/tasks` | List tasks |
| GET | `/tasks/:id` | Task detail |
| PUT | `/tasks/:id` | Update task |
| POST | `/tasks/:id/assign` | Assign task |
| PATCH | `/tasks/:id/status` | Change status |
| PUT | `/tasks/reorder` | Reorder tasks |
| DELETE | `/tasks/:id` | Soft-delete task |
| GET | `/projects/:id/tasks/summary` | Task summary |
| GET | `/tasks/:id/activities` | Task activity log |
| GET | `/tasks/:id/comments` | List comments |
| POST | `/tasks/:id/comments` | Create comment |
| PUT | `/comments/:id` | Update comment |
| DELETE | `/comments/:id` | Soft-delete comment |
| POST | `/tasks/:id/attachments` | Upload attachment |
| GET | `/tasks/:id/attachments` | List attachments |
| GET | `/attachments/:id/download` | Get download URL |
| DELETE | `/attachments/:id` | Soft-delete attachment |

### Tags

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects/:id/tags` | Create tag |
| GET | `/projects/:id/tags` | List project tags |
| PUT | `/tags/:id` | Update tag |
| DELETE | `/tags/:id` | Hard-delete tag |
| POST | `/tasks/:id/tags` | Assign tag to task |
| DELETE | `/tasks/:id/tags/:tagId` | Remove tag from task |
| GET | `/tasks/:id/tags` | Get task tags |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | My notifications (paginated) |
| GET | `/notifications/unread-count` | Unread count |
| PATCH | `/notifications/:id/read` | Mark as read |
| PATCH | `/notifications/read-all` | Mark all as read |
| DELETE | `/notifications/:id` | Delete notification |

### Activity Log

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/activities/me` | My activity history (paginated) |
| GET | `/projects/:id/activities` | Project activity history |
| GET | `/tasks/:id/activities` | Task activity history |

---

## Authentication Flow

```
Registration:
  POST /auth/register → Email with OTP → POST /auth/verify-email

Login:
  POST /auth/login → { accessToken (15m), refreshToken (7d) }

Authenticated requests:
  Authorization: Bearer <accessToken>

Token refresh:
  POST /auth/refresh → { accessToken }

Logout:
  POST /auth/logout → Refresh token invalidated
```

### Authorization Levels

| Level | Scope |
|-------|-------|
| **SUPER_ADMIN** | System-wide: can manage any project, bypass membership checks |
| **ADMIN** | System-wide: elevated permissions across all projects |
| **PROJECT_MANAGER** | Per-project: full control over project settings, members, tasks |
| **PROJECT_MEMBER** | Per-project: can view and interact with assigned tasks |

---

## Database Schema

The database is managed via Prisma migrations. Key models:

- **User** — User accounts with status (PENDING_VERIFICATION, ACTIVE, INACTIVE)
- **Project** — Projects with status lifecycle and owner
- **ProjectMember** — Membership with role reference
- **ProjectRole** — Role definitions (PROJECT_MANAGER, PROJECT_MEMBER, etc.)
- **Checklist** — Checklist within a project, status workflow
- **ChecklistItem** — Individual tasks within a checklist
- **TaskStatus** — Customizable task status definitions
- **TaskComment** — Comments on tasks
- **TaskAttachment** — File references uploaded to Azure Blob
- **Tag** — Project-scoped labels with color codes
- **TaskTag** — Many-to-many between tasks and tags
- **Notification** — In-app user notifications
- **ActivityLog** — System-wide audit trail

Refer to `prisma/schema.prisma` for the complete schema definition.

---

## Development

### Commands

```bash
# Development with hot-reload
npm run start:dev

# Build for production
npm run build

# Production start
npm run start

# Type-check
npx tsc --noEmit

# Generate Prisma client (after schema changes)
npx prisma generate

# Push schema to database (dev)
npx prisma db push

# Create a migration
npx prisma migrate dev --name <migration-name>

# Open Prisma Studio (database GUI)
npx prisma studio
```

### Project Structure

```
src/
├── main.ts                       # Application entry point
├── app.module.ts                 # Root module
├── config/                       # Configuration (env, jwt, swagger)
├── prisma/                       # Prisma client wrapper
├── redis/                        # Redis client wrapper
├── mail/                         # Email service (Nodemailer)
├── azure-blob/                   # Azure Blob Storage wrapper
└── modules/
    ├── auth/                     # Auth module
    ├── projects/                 # Projects + members module
    ├── checklists/               # Checklists module
    ├── tasks/                    # Tasks module
    ├── comments/                 # Comments module
    ├── attachments/              # File attachments module
    ├── tags/                     # Tags module
    ├── notifications/            # Notifications module
    └── activity-log/             # Activity log module
```

### Code Style

- TypeScript strict mode
- Decorators for validation, Swagger docs, and authorization
- Controllers are thin — business logic lives in services
- Async/await throughout
- `.catch(() => {})` for non-critical side effects (notifications, activity logs)

---

## Deployment

### Build

```bash
npm run build
```

This compiles TypeScript to the `dist/` directory.

### Required Services

1. **MySQL 8** — Main database. Run migrations with `npx prisma migrate deploy`.
2. **Redis 7** — Session cache, OTP storage, refresh tokens.
3. **SMTP server** — Transactional emails (OTP, invitations).
4. **Azure Storage Account** — File attachments (optional, feature works without it).

### Health Check

The app runs on the configured `PORT` (default 3000). Use a reverse proxy (nginx, Caddy) for production deployments.

---

## License

Private — Internal project.
