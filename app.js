const { startSniffer } = require('./sniffer');
const { monitorLogs } = require('./logMonitor');
const { monitorFiles } = require('./fileMonitor');

console.log("🚀 IDS Started...");

startSniffer();
monitorLogs();
monitorFiles();
