const fs = require('fs');
const crypto = require('crypto');
const { sendAlert } = require('./alerts');

const FILE_TO_MONITOR = './important.txt';
let lastHash = null;

function hashFile(path) {
  const data = fs.readFileSync(path);
  return crypto.createHash('sha256').update(data).digest('hex');
}

function monitorFiles() {
  if (!fs.existsSync(FILE_TO_MONITOR)) {
    fs.writeFileSync(FILE_TO_MONITOR, "initial content");
  }

  lastHash = hashFile(FILE_TO_MONITOR);

  console.log("📁 Monitoring file integrity...");

  setInterval(() => {
    const currentHash = hashFile(FILE_TO_MONITOR);

    if (currentHash !== lastHash) {
      sendAlert("🚨 File modified!");
      lastHash = currentHash;
    }
  }, 5000);
}

module.exports = { monitorFiles };
