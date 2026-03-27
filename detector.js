const { sendAlert } = require('./alerts');

let ipConnections = {};

function detectTraffic(srcIP, dstIP) {
  ipConnections[srcIP] = (ipConnections[srcIP] || 0) + 1;

  console.log(`Traffic: ${srcIP} → ${dstIP}`);

  // RULE 1: Too many requests → possible attack
  if (ipConnections[srcIP] > 50) {
    sendAlert(`🚨 Possible DDoS/Scan from ${srcIP}`);
  }
}

module.exports = { detectTraffic };
