{
  "apps": [
    {
      "name": "bot-mvb-server",
      "script": "app.js",
      "cwd": "/var/www/bot-mvb-pro/server",
      "instances": 1,
      "exec_mode": "fork",
      "env": {
        "NODE_ENV": "production",
        "PORT": 3001
      },
      "env_production": {
        "NODE_ENV": "production",
        "PORT": 3001
      },
      "log_file": "/var/log/pm2/bot-mvb-server.log",
      "out_file": "/var/log/pm2/bot-mvb-server-out.log",
      "error_file": "/var/log/pm2/bot-mvb-server-error.log",
      "log_date_format": "YYYY-MM-DD HH:mm:ss Z",
      "merge_logs": true,
      "max_memory_restart": "1G",
      "restart_delay": 4000,
      "max_restarts": 10,
      "min_uptime": "10s"
    }
  ]
}


