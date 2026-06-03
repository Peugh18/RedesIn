const { exec } = require('child_process');

function scanWifi() {
  return new Promise((resolve) => {
    exec('netsh wlan show networks mode=bssid', { timeout: 8000 }, (err, stdout) => {
      if (err || !stdout) return resolve([]);
      resolve(parseWindowsWifi(stdout));
    });
  });
}

function parseWindowsWifi(output) {
  const networks = [];
  const blocks = output.split(/SSID \d+ :/);
  
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const ssidMatch = block.match(/^\s*(.+)/);
    const bssidMatch = block.match(/BSSID \d+\s+:\s+([\w:]+)/i);
    const signalMatch = block.match(/(?:Signal|Se.al)\s*:\s*(\d+)%/i);
    const channelMatch = block.match(/(?:Channel|Canal)\s*:\s*(\d+)/i);
    const radioMatch = block.match(/(?:Radio type|Tipo de radio)\s*:\s*(.+)/i);
    const authMatch = block.match(/(?:Authentication|Autenticaci.n)\s*:\s*(.+)/i);
    const freqMatch = block.match(/(?:Band|Banda)\s*:\s*(.+)/i);
    
    if (!ssidMatch) continue;
    
    const ssid = ssidMatch[1].trim();
    if (!ssid || ssid === '') continue;
    
    const signal = signalMatch ? parseInt(signalMatch[1]) : 0;
    const rssi = Math.round(signal / 2 - 100);
    const channel = channelMatch ? parseInt(channelMatch[1]) : 0;
    const freq = channel > 14 ? '5 GHz' : '2.4 GHz';
    
    let security = 'Open';
    if (authMatch) {
      const auth = authMatch[1].trim().toUpperCase();
      if (auth.includes('WPA3')) security = 'WPA3';
      else if (auth.includes('WPA2')) security = 'WPA2';
      else if (auth.includes('WPA')) security = 'WPA';
      else if (auth.includes('WEP')) security = 'WEP';
    }
    
    networks.push({
      ssid: ssid || '(Hidden)',
      bssid: bssidMatch ? bssidMatch[1].toUpperCase() : 'Unknown',
      channel,
      frequency: freq,
      signal,
      rssi,
      security,
      vendor: 'Unknown'
    });
  }
  
  return networks;
}

scanWifi().then(res => console.log(JSON.stringify(res, null, 2)));
