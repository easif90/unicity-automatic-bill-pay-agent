module.exports = {
  apps: [{
    name: 'bill-pay-agent',
    script: 'dist/agent.js',
    watch: false,
    env: {
      NODE_ENV: 'production'
    },
    autorestart: true,
    max_restarts: 10,
    restart_delay: 5000,
    env_production: {
      NODE_ENV: "production"
    }
  }]
};
