# Workasana Backend API

A robust task and team management REST API built with **Node.js**, **Express**, and **MongoDB (Mongoose)** — inspired by project management tools like Asana. 

It provides authentication, role/team collaboration, task lifecycle tracking, project organization, tagging, and aggregation-powered analytical reports.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the Application](#running-the-application)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
  - [1. Authentication Routes](#1-authentication-routes)
  - [2. Task Management Routes](#2-task-management-routes)
  - [3. Team Management Routes](#3-team-management-routes)
  - [4. Project Management Routes](#4-project-management-routes)
  - [5. Tag Management Routes (asanaTags)](#5-tag-management-routes-asanatags)
  - [6. Reporting & Analytics Routes](#6-reporting--analytics-routes)
- [Data Models Overview](#data-models-overview)
- [Response & Error Handling](#response--error-handling)

---

## Features

- **JWT Authentication & Security:** Secure user registration, password hashing via `bcrypt`, and stateless JWT authentication for protected routes.
- **Task Lifecycle Management:** Create, filter, view, update, and delete tasks with multiple owners, tags, time estimates, and status tracking (`To Do`, `In Progress`, `Completed`, `Blocked`).
- **Flexible Task Filtering:** Query tasks by `team`, `owners`, `tags`, `project`, or `status` with automatic population of relational data.
- **Team Collaboration:** Manage teams, add members, and inspect unassigned members available for onboarding.
- **Project & Tag Cataloging:** Create unique projects and tags to organize tasks efficiently.
- **Advanced Aggregation & Reporting:**
  - Tasks completed in the last 7 days.
  - Total pending work estimation (sum of remaining days).
  - Breakdown of closed tasks grouped by team, task owner, and project using MongoDB Aggregation Pipelines.

---

## Tech Stack

- **Runtime:** [Node.js](https://nodejs.org/)
- **Framework:** [Express 5](https://expressjs.com/)
- **Database & ODM:** [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/)
- **Authentication:** [JSON Web Token (jsonwebtoken)](https://jwt.io/), [bcrypt](https://github.com/kelektiv/node.bcrypt.js)
- **CORS & Config:** [cors](https://www.npmjs.com/package/cors), [dotenv](https://www.npmjs.com/package/dotenv)
- **Dev Tooling:** [Nodemon](https://nodemon.io/)

---

## Getting Started

### Prerequisites

Make sure you have installed:
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [MongoDB](https://www.mongodb.com/) instance (local or MongoDB Atlas connection string)

### Installation

1. Clone or open the repository:
   ```bash
   cd "FSP1_Assignment (Workasana) Backend"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Environment Variables

Create a `.env` file in the root directory and add the following configuration:

```env
PORT=<YOUR_PORT_VALUE>
YOUR_MONGODB_KEY=<MONGODB_CONNECTION_STRING>
JWT_SECRET_KEY=<YOUR_JWT_SECRET_VALUE>
```

### Running the Application

- **Development Mode (with auto-restart via nodemon):**
  ```bash
  npm run dev
  ```
- **Production Mode:**
  ```bash
  npm start
  ```

The server will run on `http://localhost:3000` (or your defined `PORT`).

---

## Authentication

Protected endpoints require a JSON Web Token sent in the HTTP `Authorization` request header:

```http
Authorization: Bearer <your-token-here>
```

---

## API Endpoints

### 1. Authentication Routes

| Method | Endpoint | Auth Required | Description |
|---|---|:---:|---|
| `POST` | `/auth/signup` | No | Register a new user account |
| `POST` | `/auth/login` | No | Authenticate user & retrieve JWT token |
| `GET` | `/auth/me` | **Yes** | Fetch current logged-in user profile |

#### `POST /auth/signup`
- **Body:**
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "strongPassword123",
    "team": "60d0fe4f5311236168a109ca" // optional
  }
  ```
- **Response (201):**
  ```json
  {
    "success": true,
    "message": "User with Email Id - jane@example.com Successfully Registered"
  }
  ```

#### `POST /auth/login`
- **Body:**
  ```json
  {
    "email": "jane@example.com",
    "password": "strongPassword123"
  }
  ```
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Log In Successful",
    "token_value": "<jwt_token>"
  }
  ```

#### `GET /auth/me`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "User Details Fetched Successfully",
    "user": {
      "_id": "60d0fe4f5311236168a109ca",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "team": "60d0fe4f5311236168a109cb"
    }
  }
  ```

---

### 2. Task Management Routes

| Method | Endpoint | Auth Required | Description |
|---|---|:---:|---|
| `POST` | `/tasks` | **Yes** | Create a new task |
| `GET` | `/tasks` | No | Get tasks with optional query filters |
| `GET` | `/tasks/:id` | No | Get specific task details by Task ID |
| `PUT` | `/tasks/:id` | **Yes** | Update an existing task |
| `DELETE` | `/tasks/:id` | **Yes** | Delete a task |

#### `POST /tasks`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "name": "Implement Database Indexing",
    "project": "60d0fe4f5311236168a109ca",
    "team": "60d0fe4f5311236168a109cb",
    "owners": ["60d0fe4f5311236168a109cc"],
    "tags": ["60d0fe4f5311236168a109cd"],
    "timeToComplete": 3,
    "status": "To Do" // "To Do" | "In Progress" | "Completed" | "Blocked"
  }
  ```

#### `GET /tasks`
- **Query Parameters (Optional):**
  - `team`: Team ID
  - `owners`: Comma-separated User IDs (e.g., `?owners=id1,id2`)
  - `tags`: Comma-separated Tag IDs (e.g., `?tags=id1,id2`)
  - `project`: Project ID
  - `status`: Filter by status (`To Do`, `In Progress`, `Completed`, `Blocked`)
- **Example:** `GET /tasks?status=In Progress&team=60d0fe4f5311236168a109cb`
- **Response (200):** Array of tasks with `project`, `owners`, and `tags` populated.

#### `PUT /tasks/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Body:** Any task fields to update (e.g. `status`, `timeToComplete`, `owners`).

#### `DELETE /tasks/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):** Confirms deletion and returns deleted task object.

---

### 3. Team Management Routes

| Method | Endpoint | Auth Required | Description |
|---|---|:---:|---|
| `POST` | `/teams` | **Yes** | Create a new team and optionally assign members |
| `POST` | `/teams/add-members` | **Yes** | Add members to an existing team |
| `GET` | `/teams` | No | Fetch all teams |
| `GET` | `/teams/:teamId` | No | Fetch a team with aggregated member details |
| `GET` | `/teams/add-members/available-users` | **Yes** | List users not yet assigned to any team |

#### `POST /teams`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "name": "Backend Engineering",
    "description": "Core API and services squad",
    "selectedUserIds": ["60d0fe4f5311236168a109cc"] // optional initial members
  }
  ```

#### `POST /teams/add-members`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "teamId": "60d0fe4f5311236168a109cb",
    "selectedUserIds": ["60d0fe4f5311236168a109cc", "60d0fe4f5311236168a109cd"]
  }
  ```

---

### 4. Project Management Routes

| Method | Endpoint | Auth Required | Description |
|---|---|:---:|---|
| `POST` | `/projects` | No | Create a new project |
| `GET` | `/projects` | No | Get all projects |
| `GET` | `/projects/:projectId` | No | Get specific project by ID |

#### `POST /projects`
- **Body:**
  ```json
  {
    "name": "Workasana V1 Launch",
    "description": "Initial release of task and project management suite"
  }
  ```

---

### 5. Tag Management Routes (`asanaTags`)

| Method | Endpoint | Auth Required | Description |
|---|---|:---:|---|
| `POST` | `/tags` | No | Create a new tag |
| `GET` | `/tags` | No | Fetch all available tags |

> **Note:** Tag documents are stored in MongoDB under the **`asanaTags`** collection/model (`models/tag.models.js`), referenced by tasks via `ref: 'asanaTags'`.

#### `POST /tags`
- **Body:**
  ```json
  {
    "name": "Urgent"
  }
  ```

---

### 6. Reporting & Analytics Routes

| Method | Endpoint | Auth Required | Description |
|---|---|:---:|---|
| `GET` | `/report/last-week` | No | Tasks completed in the last 7 days |
| `GET` | `/report/pending` | No | Total pending days of work across incomplete tasks |
| `GET` | `/report/closed-tasks` | No | Completed tasks count grouped by Team, Owner, and Project |

#### `GET /report/last-week`
- Returns all tasks with `status: "Completed"` whose `updatedAt` is within the last 7 days (with populated references).

#### `GET /report/pending`
- Calculates the sum of `timeToComplete` for all tasks where `status != "Completed"`.
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Total Pending Work Days Fetched Successfully",
    "pendingTaskDays": 14
  }
  ```

#### `GET /report/closed-tasks`
- Aggregates completed tasks into three breakdowns:
  ```json
  {
    "success": true,
    "message": "Closed Tasks Report Fetched Successfully",
    "closedTasksReport": {
      "byTeam": [
        { "_id": "Backend Engineering", "count": 8 }
      ],
      "byOwner": [
        { "_id": "Jane Doe", "count": 5 }
      ],
      "byProject": [
        { "_id": "Workasana V1 Launch", "count": 12 }
      ]
    }
  }
  ```

---

## Data Models Overview

- **User**: `name`, `email` (unique), `password` (bcrypt hashed), `team` (ObjectId ref: `Team`)
- **Team**: `name` (unique), `description`
- **Project**: `name` (unique), `description`, timestamps (`createdAt`, `updatedAt`)
- **asanaTags (Tag)**: `name` (unique) — Mongoose model registered as `'asanaTags'` (MongoDB collection: `asanatags`)
- **Task**: `name`, `project` (ref: `Project`), `team` (ref: `Team`), `owners` (Array of refs: `User`), `tags` (Array of refs: `asanaTags`), `timeToComplete` (Number, days), `status` (`'To Do'`, `'In Progress'`, `'Completed'`, `'Blocked'`), timestamps (`createdAt`, `updatedAt`)

---

## Response & Error Handling

All responses follow a consistent JSON format:

- **Success Response:**
  ```json
  {
    "success": true,
    "message": "Operation description",
    "dataKey": { ... }
  }
  ```

- **Error Response:**
  ```json
  {
    "success": false,
    "error": "Detailed error message or validation summary"
  }
  ```

HTTP status codes used:
- `200 OK` - Request succeeded
- `201 Created` - Resource successfully created
- `400 Bad Request` - Validation error or missing fields
- `401 Unauthorized` - Missing or invalid JWT Bearer token
- `404 Not Found` - Resource not found
- `409 Conflict` - Duplicate key constraint violation (e.g. duplicate email/name)
- `500 Internal Server Error` - Server exception
