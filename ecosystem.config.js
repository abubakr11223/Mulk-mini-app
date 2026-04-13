module.exports = {
  apps: [
    {
      name: "mulk-mini-app",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        DATABASE_URL: "postgres://foydalanuvchi_ismi:parol@ep-tiniq-suv-xxxxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require"
      }
    }
  ]
};
