#!/usr/bin/env node

const required = [
  "DATABASE_URL",
  "CORS_ORIGIN",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD"
];

let missing = [];

for (const key of required) {
  if (!process.env[key] || process.env[key].trim() === "") {
    missing.push(key);
  }
}

if (missing.length) {
  console.error(`❌ Missing required environment variables:\n  ${missing.join("\n  ")}`);
  process.exit(1);
}

// Extra validation: ensure CORS_ORIGIN includes the Vercel domain
const cors = process.env.CORS_ORIGIN.split(",");
const hasProd = cors.some(origin =>
  origin.includes("vercel.app") || origin.includes("yourdomain.com")
);
if (!hasProd) {
  console.error("❌ CORS_ORIGIN does not include your Vercel or production domain!");
  process.exit(1);
}

console.log("✅ Environment check passed. All critical vars are present.");