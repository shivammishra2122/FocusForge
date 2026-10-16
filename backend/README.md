# FocusForge Backend API

[![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-node:sqlite-003B57?logo=sqlite&logoColor=white)](https://sqlite.org/)
[![Docker](https://img.shields.io/badge/Docker-Multi--Stage-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![CI Status](https://img.shields.io/badge/CI-Passing-brightgreen?logo=github-actions&logoColor=white)](https://github.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Production-ready, modular, and high-performance Node.js / Express backend implementing the **Obsidian Protocol** for the **FocusForge Deep Focus & Productivity Suite**.

---

## 🏛️ Architecture Overview

The backend is built with native ES Modules (ESM) following clean architectural layered patterns:

```
backend/
├── Dockerfile                 # Multi-stage lightweight Node 22 Alpine build
├── .dockerignore              # Clean build context exclusion rules
├── Procfile                   # Process configuration for Heroku/Render/Railway
├── .env.example               # Documented environment configuration template
├── package.json               # Backend dependencies, scripts, and native test runner
├── data/                      # Embedded persistent SQLite database (focusforge.db)
├── src/
│   ├── app.js                 # Express app configuration & middleware pipeline
│   ├── server.js              # Server lifecycle, database bootstrap & graceful shutdown
│   ├── config/
│   │   └── index.js           # Environment configuration & fallbacks
│   ├── db/
│   │   └── database.js        # High-performance node:sqlite with WAL mode & busy timeout
│   ├── constants/
│   │   └── achievements.js    # 10 Operator levels, achievement rules & XP metrics
│   ├── middleware/
│   │   ├── authMiddleware.js  # JWT Bearer token authentication & user hydration
│   │   ├── errorHandler.js    # Centralized error handler & custom AppError class
│   │   ├── validate.js        # Declarative request schema validators
│   │   └── rateLimiter.js     # Sliding-window rate limiters for auth & API routes
│   ├── services/
│   │   ├── authService.js     # User registration, scrypt hashing, JWT issuance & profiles
│   │   ├── taskService.js     # Task CRUD, dynamic priority XP calculation & batch sync
│   │   ├── sessionService.js  # Focus tracking, efficiency algorithms, streaks & stats
│   │   ├── analyticsService.js# 7-day breakdowns, 24h hourly distribution & category metrics
│   │   ├── leaderboardService.js# Operator rankings by XP and focus minutes
│   │   ├── syncService.js     # Atomic two-way synchronization with mobile storage
│   │   ├── insightService.js  # AI focus coaching, fatigue alerts & break interval advice
│   │   └── achievementService.js# Rule-based achievement evaluation & bonus XP triggers
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── taskController.js
│   │   ├── sessionController.js
│   │   ├── analyticsController.js
│   │   ├── leaderboardController.js
│   │   ├── syncController.js
│   │   ├── insightController.js
│   │   └── healthController.js
│   └── routes/
│       ├── authRoutes.js
│       ├── taskRoutes.js
│       ├── sessionRoutes.js
│       ├── analyticsRoutes.js
│       ├── leaderboardRoutes.js
│       ├── syncRoutes.js
│       ├── insightRoutes.js
│       ├── healthRoutes.js
│       └── index.js           # Master router mounted at /api
└── tests/
    ├── setup.js               # Test bridge configuring assertions & globals
    ├── api.test.js            # End-to-end integration test suite
    ├── auth.test.js           # Auth & JWT verification tests
    ├── tasks.test.js          # Task CRUD & XP reward tests
    ├── sessions.test.js       # Focus sessions & efficiency calculation tests
    ├── analytics.test.js      # 7-day trend & hourly breakdown tests
    ├── leaderboard.test.js    # Global ranking tests
    ├── sync.test.js           # Mobile sync push/pull snapshot tests
    ├── insights.test.js       # AI coaching insight tests
    └── health.test.js         # Uptime & health check tests
```

---

## 🚀 Setup & Installation

### Prerequisites
- **Node.js**: v22.0.0 or higher (requires native `node:sqlite`)
- **npm**: v10.0.0 or higher

### Local Setup
```bash
# 1. Navigate to the backend directory
cd backend

# 2. Configure environment variables
cp .env.example .env

# 3. Install dependencies
npm install

# 4. Start the development server (with auto-reload)
npm run dev

# Or start in production mode:
npm start
```

The server will initialize the SQLite database (`./data/focusforge.db`) and begin listening at `http://localhost:5001`.

---

## 📜 Available Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| `npm start` | `node src/server.js` | Launches the production server |
| `npm run dev` | `nodemon src/server.js` | Launches the development server with live reload |
| `npm test` | `node --import ./tests/setup.js --test --test-concurrency=1 tests/**/*.test.js` | Executes the complete test suite (42 tests across 15 suites) |

---

## 📡 Complete API Endpoint Catalog

All routes except `/` and `/api/health` require a Bearer token in the `Authorization` header unless marked as public.

```http
Authorization: Bearer <jwt-token>
```

### 1. System & Health

#### `GET /`
- **Access**: Public
- **Description**: API metadata, protocol details, and endpoint directory.
- **Response**:
```json
{
  "service": "FocusForge Backend API",
  "tagline": "Obsidian Protocol - Deep Focus & Gamified Productivity Engine",
  "version": "1.0.0",
  "status": "online",
  "documentation": { ... }
}
```

#### `GET /api/health`
- **Access**: Public
- **Description**: Container health check endpoint verifying uptime, database connectivity, and runtime metrics.
- **Response**:
```json
{
  "status": "healthy",
  "service": "FocusForge Backend API",
  "version": "1.0.0",
  "uptime": 142.5,
  "database": "healthy",
  "system": {
    "nodeVersion": "v22.11.0",
    "memory": { ... }
  }
}
```

---

### 2. Authentication (`/api/auth`)

#### `POST /api/auth/register`
- **Access**: Public
- **Body**:
```json
{
  "email": "operative@focusforge.dev",
  "password": "StrongPassword123!",
  "name": "Operator Zero",
  "avatar": "default_avatar",
  "dailyGoalHours": 3.0
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "message": "Account registered successfully",
  "data": {
    "user": {
      "id": "e8e192f1-6ad4-4d8b-967b-1cb8f9d0c649",
      "email": "operative@focusforge.dev",
      "name": "Operator Zero",
      "avatar": "default_avatar",
      "daily_goal_hours": 3.0,
      "xp": 0,
      "streak": 0,
      "created_at": "2026-10-16T17:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### `POST /api/auth/login`
- **Access**: Public
- **Body**:
```json
{
  "email": "operative@focusforge.dev",
  "password": "StrongPassword123!"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "id": "...", "email": "...", "name": "...", "xp": 450, "streak": 3 },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### `GET /api/auth/me`
- **Access**: Authenticated
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "e8e192f1-6ad4-4d8b-967b-1cb8f9d0c649",
      "email": "operative@focusforge.dev",
      "name": "Operator Zero",
      "level": 3,
      "levelTitle": "Deep Operator",
      "progressToNextLevel": 65
    },
    "settings": {
      "pomodoro_work": 25,
      "pomodoro_short_break": 5,
      "pomodoro_long_break": 15,
      "pomodoro_rounds": 4,
      "notifications": 1
    },
    "stats": {
      "totalMinutes": 180,
      "totalSessions": 6,
      "tasksCompleted": 4,
      "streak": 3,
      "xp": 450
    }
  }
}
```

#### `PUT /api/auth/profile`
- **Access**: Authenticated
- **Body**:
```json
{
  "name": "Commander Zero",
  "dailyGoalHours": 4.0,
  "settings": {
    "pomodoroWork": 30,
    "pomodoroShortBreak": 6,
    "pomodoroLongBreak": 20
  }
}
```
- **Response `200 OK`**: Updated profile and settings payload.

---

### 3. Tasks Management (`/api/tasks`)

#### `GET /api/tasks`
- **Access**: Authenticated
- **Query Parameters**: `?completed=true|false`
- **Response `200 OK`**:
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "task_1",
      "title": "Architect Obsidian Protocol",
      "notes": "Verify WAL and multi-stage build",
      "priority": "HIGH",
      "completed": false,
      "createdAt": 1792169500000
    }
  ]
}
```

#### `POST /api/tasks`
- **Access**: Authenticated
- **Body**:
```json
{
  "title": "Configure Cloud Run Deployment",
  "notes": "Implement container image registry pipeline",
  "priority": "HIGH"
}
```
- **Response `201 Created`**: Returns created task object.

#### `PATCH /api/tasks/:id/toggle`
- **Access**: Authenticated
- **Description**: Toggles completion state and calculates dynamic gamified XP rewards:
  - **HIGH Priority**: +450 XP
  - **MEDIUM Priority**: +220 XP
  - **LOW Priority**: +80 XP
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Task completed! XP awarded.",
  "data": {
    "task": { "id": "task_1", "completed": true, "completedAt": 1792169600000 },
    "xpEarned": 450,
    "newTotalXp": 900,
    "level": 4,
    "levelTitle": "Focus Vanguard",
    "unlockedAchievements": []
  }
}
```

#### `POST /api/tasks/batch`
- **Access**: Authenticated
- **Body**:
```json
{
  "tasks": [
    { "id": "t1", "title": "Offline Task 1", "priority": "LOW", "completed": false },
    { "id": "t2", "title": "Offline Task 2", "priority": "MEDIUM", "completed": true }
  ]
}
```
- **Response `200 OK`**: Returns updated task array.

---

### 4. Focus Sessions (`/api/sessions`)

#### `POST /api/sessions`
- **Access**: Authenticated
- **Body**:
```json
{
  "mode": "POMODORO",
  "durationMinutes": 25,
  "deepFocus": true,
  "category": "Architecture",
  "soundId": "binaural_40hz",
  "note": "Constructing robust DevOps pipelines"
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "sess_1",
      "mode": "POMODORO",
      "durationMinutes": 25,
      "deepFocus": true,
      "efficiency": 97,
      "focusIndex": 1.02,
      "createdAt": "2026-10-16T17:15:00.000Z"
    },
    "xpEarned": 100,
    "newTotalXp": 1000,
    "streak": 4,
    "level": 5,
    "levelTitle": "Zen Master",
    "unlockedAchievements": ["streak_3"]
  }
}
```

#### `GET /api/sessions/stats`
- **Access**: Authenticated
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "totalSessions": 12,
    "totalMinutes": 320,
    "totalHours": 5.3,
    "deepFocusMinutes": 180,
    "averageEfficiency": 94,
    "averageFocusIndex": 0.98,
    "topCategory": "Architecture",
    "streak": 4,
    "xp": 1000,
    "level": 5,
    "levelTitle": "Zen Master"
  }
}
```

---

### 5. Analytics & AI Coaching (`/api/analytics` & `/api/insights`)

#### `GET /api/analytics/overview`
- **Access**: Authenticated
- **Response `200 OK`**:
  - 7-day focus trend breakdown
  - 24-hour cognitive hourly distribution
  - Category breakdown with percentage contributions
  - Level progress & badge information

#### `GET /api/insights`
- **Access**: Authenticated
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "operator": { "name": "Operator Zero", "level": 5, "title": "Zen Master" },
    "momentumScore": 85,
    "momentumStatus": "HYPERDRIVE",
    "optimalFocusWindow": {
      "recommendedStartHour": 9,
      "timeframe": "9:00 AM - 11:00 AM",
      "confidence": 92,
      "insight": "Your cognitive efficiency peaks between 9:00 AM - 11:00 AM."
    },
    "fatigueAlert": {
      "level": "LOW",
      "fatigued": false,
      "message": "Optimal cognitive energy. Ready for deep execution."
    },
    "recommendedProtocol": {
      "workDuration": 50,
      "shortBreak": 10,
      "longBreak": 25,
      "profileName": "Deep Flow Protocol"
    },
    "tacticalTips": [ ... ]
  }
}
```

---

### 6. Cloud Sync (`/api/sync`)

Direct bridge for mobile synchronization (`src/utils/cloudSync.js`).

#### `POST /api/sync/push`
- **Access**: Authenticated
- **Body**:
```json
{
  "profile": { "name": "Operator", "dailyGoalHours": 2.5 },
  "stats": { "xp": 1200, "streak": 5 },
  "tasks": [ ... ],
  "sessions": [ ... ],
  "achievements": ["first_session", "streak_3"],
  "streaks": { "2026-10-15": 90, "2026-10-16": 120 },
  "settings": { "pomodoroWork": 25 }
}
```
- **Response `200 OK`**: `{ "success": true, "message": "Cloud sync push successful", "syncedAt": "..." }`

#### `GET /api/sync/pull`
- **Access**: Authenticated
- **Response `200 OK`**: Returns full synchronized state snapshot matching mobile AsyncStorage keys.

---

## 🐳 Docker Containerization

FocusForge backend uses a production multi-stage Docker build with Node 22 Alpine for minimum image size (< 150MB) and hardened non-root security.

### 1. Build Docker Image
```bash
docker build -t focusforge-backend:latest ./backend
```

### 2. Run Container with Persistent SQLite Volume
```bash
docker run -d \
  --name focusforge-backend \
  -p 5001:5001 \
  -e NODE_ENV=production \
  -e PORT=5001 \
  -e JWT_SECRET=focusforge_prod_super_secure_key_2026 \
  -v $(pwd)/backend/data:/app/data \
  --restart unless-stopped \
  focusforge-backend:latest
```

### 3. Using Docker Compose (Recommended)
From the project root:
```bash
# Start backend in detached mode
docker compose up -d

# Check service status and health check
docker compose ps

# View live container logs
docker compose logs -f backend

# Stop the backend service
docker compose down
```

---

## ☁️ Production Cloud Deployment Guide

### Option 1: Render (One-Click Blueprint)

The repository includes a ready-to-use [`render.yaml`](../render.yaml) blueprint.

1. Push your repository to GitHub.
2. Log into [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** → **Blueprint**.
4. Connect the FocusForge repository. Render will automatically detect `render.yaml`.
5. Review the service configuration:
   - **Environment**: Node
   - **Plan**: Free
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
6. Click **Apply**. Render will build and deploy your service with a free HTTPS URL.

---

### Option 2: Railway

1. Install the Railway CLI or use the web dashboard at [railway.app](https://railway.app).
2. Connect your GitHub repository.
3. In Project Settings:
   - Set **Root Directory** to `backend`.
   - Set Environment Variables:
     - `PORT=5001`
     - `NODE_ENV=production`
     - `JWT_SECRET=<generate-strong-key>`
4. Add a Persistent Volume mounted at `/app/data` to ensure SQLite data persists across deployments.
5. Deploy. Railway automatically detects `Procfile` (`web: npm start`).

---

### Option 3: Fly.io

1. Install Fly CLI: `brew install flyctl`
2. Authenticate: `fly auth login`
3. Launch from the `backend/` directory:
   ```bash
   cd backend
   fly launch --no-deploy
   ```
4. Create a 1GB persistent volume for SQLite storage:
   ```bash
   fly volumes create focusforge_data --size 1
   ```
5. In `fly.toml`, configure the mount:
   ```toml
   [mounts]
     source = "focusforge_data"
     destination = "/app/data"

   [[services.http_checks]]
     interval = 10000
     grace_period = "5s"
     method = "get"
     path = "/api/health"
     protocol = "http"
     timeout = 2000
   ```
6. Set the production secret:
   ```bash
   fly secrets set JWT_SECRET="your-secure-production-secret-here"
   ```
7. Deploy: `fly deploy`

---

### Option 4: Self-Hosted VPS (Docker Compose + Nginx + SSL)

1. Provision an Ubuntu 22.04 / 24.04 VPS with Docker and Docker Compose installed.
2. Clone the repository and configure `.env`:
   ```bash
   git clone https://github.com/your-org/FocusForge.git
   cd FocusForge
   cp backend/.env.example backend/.env
   nano backend/.env  # Update JWT_SECRET and CORS_ORIGIN
   ```
3. Start the container via Docker Compose:
   ```bash
   docker compose up -d
   ```
4. Configure Nginx reverse proxy with SSL (`/etc/nginx/sites-available/focusforge.conf`):
   ```nginx
   server {
       server_name api.focusforge.yourdomain.com;

       location / {
           proxy_pass http://127.0.0.1:5001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
5. Enable SSL via Certbot:
   ```bash
   sudo certbot --nginx -d api.focusforge.yourdomain.com
   ```

---

## 🧪 Testing with cURL

### 1. Health Check
```bash
curl -X GET http://localhost:5001/api/health
```

### 2. User Registration
```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "pilot@focusforge.dev",
    "password": "Password123!",
    "name": "Operator Pilot",
    "dailyGoalHours": 2.5
  }'
```

### 3. Record a Focus Session
```bash
curl -X POST http://localhost:5001/api/sessions \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "POMODORO",
    "durationMinutes": 25,
    "deepFocus": true,
    "category": "Engineering",
    "soundId": "rain",
    "note": "Infrastructure automation"
  }'
```

### 4. Fetch AI Insights
```bash
curl -X GET http://localhost:5001/api/insights \
  -H "Authorization: Bearer <TOKEN>"
```
