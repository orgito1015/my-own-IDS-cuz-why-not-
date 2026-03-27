const pcap = require('pcap');
const { detectTraffic } = require('./detector');

function startSniffer() {
  const session = pcap.createSession('', 'tcp');

  console.log("📡 Sniffing network...");

  session.on('packet', (rawPacket) => {
    try {
      const packet = pcap.decode.packet(rawPacket);
      const ipLayer = packet.payload.payload;

      if (ipLayer && ipLayer.saddr && ipLayer.daddr) {
        const srcIP = ipLayer.saddr.toString();
        const dstIP = ipLayer.daddr.toString();

        detectTraffic(srcIP, dstIP);
      }
    } catch (err) {
      // ignore parsing errors
    }
  });
}

module.exports = { startSniffer };
