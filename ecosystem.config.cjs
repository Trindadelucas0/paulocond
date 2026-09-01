module.exports = {
  apps: [
    {
      name: "paulocond",
      script: "npm",
      args: "start -- -H 0.0.0.0 -p 3789",
      cwd: "/home/exito/projetos/paulocond",
      env: {
        NODE_ENV: "production",
        PORT: "3789",
      },
    },
  ],
};
