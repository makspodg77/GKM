const fs = require("fs");
const path = require("path");
const exec = require("child_process").execSync;

function runCommand(command) {
  console.log(`Running: ${command}`);
  exec(command, { stdio: "inherit" });
}

const distDir = path.join(__dirname, "dist");
if (fs.existsSync(distDir)) {
  console.log("Cleaning up old dist/ folder...");
  fs.rmSync(distDir, { recursive: true, force: true });
}

console.log("Installing dependencies...");
runCommand("npm install");

console.log("Copying necessary files...");
if (!fs.existsSync(path.join(distDir, "config"))) {
  fs.mkdirSync(path.join(distDir, "config"));
}
fs.copyFileSync("config/config.json", path.join(distDir, "config/config.json")); // Example for a config file

console.log("Build process completed.");
