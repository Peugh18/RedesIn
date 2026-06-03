const ping = require('ping');
(async () => {
  for (const ip of ['192.168.1.127', '192.168.1.130', '192.168.1.4']) {
    const res = await ping.promise.probe(ip, { timeout: 2, extra: ['-n', '1'] });
    console.log(`IP: ${ip}, Alive: ${res.alive}, Time: ${res.time}`);
  }
})();
