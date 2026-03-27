const fs = require('fs');
const { sendAlert } = require('./alerts');

function monitorLogs() {
  const logFile = '/var/log/auth.log';

  console.log("📜 Monitoring logs...");

  fs.watch(logFile, (eventType) => {
    if (eventType === 'change') {
      const content = fs.readFileSync(logFile, 'utf-8');

      if (content.includes('Failed password')) {
        sendAlert("🚨 Failed login attempt detected!");
      }
    }
  });
}

module.exports = { monitorLogs };
