# Quick Start Guide

## ✅ System Updated - Pure JavaScript Libraries

The system has been updated to use pure JavaScript libraries that don't require C++ compilation:
- ✅ **bcrypt** → **bcryptjs** (pure JS password hashing)
- ✅ **better-sqlite3** → **sql.js** (pure JS SQLite)

## Running the System

### Option 1: Double-click `run.bat`

Simply double-click the `run.bat` file in Windows Explorer. It will:
1. Install all dependencies
2. Generate test data (10,000 claims)
3. Start both the API server and React frontend

### Option 2: Manual Commands

Open PowerShell in this directory and run:

```powershell
# Install dependencies
npm install

# Generate test data  
npm run gen-data

# Start both services
npm run dev
```

## After Starting

1. Wait for both services to start (about 10-30 seconds)
2. Open your browser to: **http://localhost:5173**
3. Login with any role:
   - **operator** - Can view batches and upload files
   - **adjuster** - Can work claims and update statuses
   - **supervisor** - Can review and approve
   - **auditor** - Read-only access to audit logs

## Services

- **Bridge API**: http://localhost:3000
- **React Frontend**: http://localhost:5173

## What's Been Generated

When you run the system, it creates:
- `data/batches/` - Uploaded batch files
- `data/masters/` - Master data (policies, members, providers)
- `data/runs/` - Validation results per batch
- `data/workflow.db` - SQLite database with claims and workflow

## Test Data

The system generates realistic synthetic data:
- 1,200 policies across 5 plan types
- 2,000 members with realistic demographics
- 150 healthcare providers with valid NPIs
- 10,000 claims with intentional defects (16% exception rate)

## Stopping the System

Press `Ctrl+C` in the terminal/command prompt to stop both services.

## Troubleshooting

### If npm install fails:
- Make sure Node.js is installed (check with `node --version`)
- Try deleting `node_modules` folder and `package-lock.json`, then run `npm install` again

### If ports are already in use:
- Change PORT in `.env` or set environment variables:
  ```
  PORT=3001 for API
  VITE_PORT=5174 for frontend (in vite.config.ts)
  ```

### If data generation fails:
- Check that the `data/` folder exists
- Make sure you have write permissions in the project directory

## Next Steps

Once running:
1. **Upload a batch**: Go to Batches → Upload → Select file → Submit
2. **View results**: Navigate to Summary to see disposition breakdown
3. **Work claims**: (Future) Queue page will show pending claims
4. **Check audit**: (Future) Audit page shows all system actions

## Architecture

```
Browser (React)
    ↓
http://localhost:5173
    ↓
Vite Dev Server
    ↓
API calls to http://localhost:3000
    ↓
Express Bridge API
    ↓
SQLite (sql.js) + LocalRunner
    ↓
Mock COBOL Validation
```

All code is ready for deployment. The COBOL programs documented in `cobol/` would replace the LocalRunner when deploying to actual mainframe infrastructure.
