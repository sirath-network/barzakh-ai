const fs = require("fs");
const path = require("path");

function patchPackageJson(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      const pkg = JSON.parse(content);
      let changed = false;

      if (!pkg.main) {
        pkg.main = "./dist/index.js";
        changed = true;
      }

      if (pkg.exports && pkg.exports["."]) {
        if (!pkg.exports["."].require) {
          pkg.exports["."].require = "./dist/index.js";
          changed = true;
        }
        if (!pkg.exports["."].default) {
          pkg.exports["."].default = "./dist/index.js";
          changed = true;
        }
      }

      if (changed) {
        fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2), "utf8");
        console.log(`[patch-memwal] Successfully patched: ${filePath}`);
      }
    }
  } catch (err) {
    console.warn(`[patch-memwal] Warning patching ${filePath}:`, err.message);
  }
}

// Search locations
const root = path.resolve(__dirname, "..");
const candidatePaths = [
  path.join(root, "packages/shared/node_modules/@mysten-incubation/memwal/package.json"),
  path.join(root, "apps/frontend/node_modules/@mysten-incubation/memwal/package.json"),
  path.join(root, "node_modules/@mysten-incubation/memwal/package.json"),
];

// Also check node_modules/.pnpm
const pnpmDir = path.join(root, "node_modules/.pnpm");
if (fs.existsSync(pnpmDir)) {
  const dirs = fs.readdirSync(pnpmDir);
  for (const d of dirs) {
    if (d.includes("@mysten-incubation+memwal")) {
      candidatePaths.push(
        path.join(pnpmDir, d, "node_modules/@mysten-incubation/memwal/package.json")
      );
    }
  }
}

for (const p of candidatePaths) {
  patchPackageJson(p);
}
