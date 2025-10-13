# Railway Deployment Fix - Runtime Environment Variables

## Problem Diagnosis

The Railway deployment was failing to connect to the Fronius inverters while the local server worked fine. The root cause was **build-time vs runtime environment variable evaluation**.

### What Was Happening

1. **During Docker Build** (on Railway):
   - Railway builds the Docker image WITHOUT access to environment variables
   - Next.js compiles TypeScript files including `src/config/devices.ts`
   - Module-level constants like `export const devices = [...]` were evaluated during compilation
   - Since environment variables weren't available, fallback URLs were hardcoded into the build output

2. **At Runtime** (when container starts):
   - Railway provides environment variables
   - Tailscale successfully connects to the network
   - BUT the compiled code still uses the wrong URLs that were baked in during build

3. **Why Local Worked**:
   - Local development has environment variables available both at build time and runtime
   - The fallback URLs (`192.168.50.97`, `192.168.50.27`) might also work locally if on the same network

### The Core Issue

```typescript
// OLD CODE - Evaluated at MODULE LOAD TIME (during build)
export const devices: FroniusDevice[] = [
  {
    id: "nelsons-house",
    url: process.env.FRONIUS_NELSONS_URL ?? "http://192.168.50.97",
    // ^^^ This is evaluated ONCE when the module is first imported/compiled
  },
];
```

In Next.js builds, especially with module bundling, these top-level `export const` declarations can be evaluated and inlined during the build process, capturing whatever environment values (or fallbacks) exist at that time.

## The Solution

Changed from **build-time constants** to **runtime getter functions**:

### Changes Made

1. **src/config/devices.ts**:
   - Removed `export const devices` and `export const propertyLabel`
   - Created `getDevices()` and `getPropertyLabel()` functions
   - These functions evaluate `process.env` variables every time they're called
   - This ensures Railway's runtime environment variables are used

2. **src/lib/fronius.ts**:
   - Updated to call `getDevices()` and `getPropertyLabel()` 
   - These are called inside the API route handler, guaranteeing runtime evaluation

3. **src/lib/database.ts**:
   - Updated `ensureDevices()` to call `getDevices()` at runtime
   - Modified transaction to accept devices as a parameter

### Why This Works

```typescript
// NEW CODE - Evaluated at RUNTIME (when API is called)
export function getDevices(): FroniusDevice[] {
  return [
    {
      id: "nelsons-house",
      url: process.env.FRONIUS_NELSONS_URL ?? "http://192.168.50.97",
      // ^^^ This is evaluated each time the function is called at runtime
    },
  ];
}

// In the API route:
export async function getAllSnapshots() {
  const devices = getDevices(); // Called at runtime, sees Railway env vars
  // ...
}
```

## Deployment Steps

After committing these changes:

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Fix Railway deployment - use runtime env evaluation"
   git push origin main
   ```

2. **Railway Will Automatically**:
   - Detect the push
   - Rebuild the Docker image
   - Deploy with the same environment variables you configured

3. **Verify**:
   - Check Railway logs to confirm Tailscale connects successfully
   - Check that API requests to `/api/power` return valid data
   - Monitor for any `ECONNREFUSED` or timeout errors (should be gone now)

## Testing Locally

To verify the fix works locally:

```bash
# Unset environment variables to simulate build environment
Remove-Item Env:FRONIUS_NELSONS_URL
Remove-Item Env:FRONIUS_GRANNY_URL

# Build the application
npm run build

# Set runtime environment variables
$env:FRONIUS_NELSONS_URL = "http://192.168.50.97"
$env:FRONIUS_GRANNY_URL = "http://192.168.50.27"

# Start the production server
npm start

# Test the endpoint
curl http://localhost:3000/api/power
```

The API should now return data using the runtime environment variables, not the build-time fallbacks.

## Key Takeaways

1. **Build-time vs Runtime**: Be aware of when environment variables are evaluated in your code
2. **Module-level Constants**: These are often evaluated once during import/compilation
3. **Function Calls**: Using getter functions ensures runtime evaluation
4. **Docker Multi-stage Builds**: Build environment and runtime environment are separate
5. **Railway Specifics**: Environment variables are injected at container start, not during build

## Additional Notes

- This pattern is especially important for any configuration that varies between environments
- Consider this approach for other configuration values if you encounter similar issues
- The fix maintains backwards compatibility while ensuring correct runtime behavior
