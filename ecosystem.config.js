module.exports = {
  apps: [
    {
      name: "frontend",
      cwd: "./frontend",
      script: "npm",
      args: "run dev",
      env: {
        PORT: 3000, // Port dla frontendu
      },
    },
    {
      name: "backend",
      cwd: "./backend",
      script: "npm",
      args: "start",
      env: {
        PORT: 3001, // Port dla backendu
      },
    },
  ],
};
