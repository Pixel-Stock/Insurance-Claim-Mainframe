# Installation Instructions

## Issue: better-sqlite3 requires C++ build tools

The system uses `better-sqlite3` which requires native compilation on Windows.

## Quick Fix Options

### Option 1: Install Visual Studio Build Tools (Recommended)

1. Download Visual Studio Build Tools: https://visualstudio.microsoft.com/downloads/
2. Run the installer and select "Desktop development with C++"
3. After installation, run:
   ```powershell
   npm install
   npm run gen-data
   npm run dev
   ```

### Option 2: Use prebuilt binaries (if available for Node v24)

```powershell
npm install --force
```

### Option 3: Downgrade Node.js

Your current Node.js version (v24.18.0) is very new. Better-sqlite3 may not have prebuilt binaries for it yet.

1. Install Node.js LTS (v20.x) from https://nodejs.org/
2. Run:
   ```powershell
   npm install
   npm run gen-data
   npm run dev
   ```

## Manual Run Without npm

If you cannot install dependencies, you can run the TypeScript files directly using Node with --loader:

```powershell
# Generate data
node --loader tsx/esm tools/gen-data.ts

# Run local validation
node --loader tsx/esm tools/run-local.ts

# Start bridge API
node --loader tsx/esm bridge/src/index.ts

# Start web (in another terminal)
npx vite
```

## Current Status

- ✅ All code is written and ready
- ✅ Project structure is complete
- ❌ Native dependencies not compiled (better-sqlite3, bcrypt)
- ❌ Development dependencies not installed (tsx, concurrently, vite)

## Next Steps

Choose one of the options above, then:

1. Generate test data: `npm run gen-data`
2. Start services: `npm run dev`
3. Open browser: http://localhost:5173
4. Login as any role (operator/adjuster/supervisor/auditor)
