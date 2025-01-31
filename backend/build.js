const fs = require("fs");
const path = require("path");
const exec = require("child_process").execSync;

// Helper function to run shell commands
function runCommand(command) {
  console.log(`Running: ${command}`);
  exec(command, { stdio: "inherit" });
}

// Step 1: Clean the build directory (remove any old build files)
const distDir = path.join(__dirname, "dist");
if (fs.existsSync(distDir)) {
  console.log("Cleaning up old dist/ folder...");
  fs.rmSync(distDir, { recursive: true, force: true });
}

// Step 2: Install dependencies (if not already installed)
console.log("Installing dependencies...");
runCommand("npm install");

// Step 3: Compile TypeScript (if using TypeScript)

// Step 4: Minify (optional, only if needed) - You can add other optimizations
// For example, using a tool like `terser` to minify JS
// runCommand('npx terser ./dist/**/*.js --compress --mangle --output ./dist/');

// Step 5: Ensure we have all necessary files (optional for your project)
console.log("Copying necessary files...");
if (!fs.existsSync(path.join(distDir, "config"))) {
  fs.mkdirSync(path.join(distDir, "config"));
}
fs.copyFileSync("config/config.json", path.join(distDir, "config/config.json")); // Example for a config file

// Step 6: Done! Now your build is ready for deployment.
console.log("Build process completed.");
