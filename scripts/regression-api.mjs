const base = (process.env.API_BASE_URL || "http://localhost:9500").replace(/\/$/, "");
const cases = [
  ["GET", "/health", 200],
  ["GET", "/version", 200],
  ["GET", "/api/v1/services", 200],
  ["GET", "/api/v1/website/public", 200],
];
let failed = 0;
for (const [method, path, expected] of cases) {
  try {
    const response = await fetch(base + path, { method, redirect: "manual" });
    const ok = response.status === expected;
    console.log(`${ok ? "PASS" : "FAIL"} ${method} ${path} -> ${response.status}`);
    if (!ok) failed += 1;
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${method} ${path}:`, error.message);
  }
}
if (failed) process.exit(1);
