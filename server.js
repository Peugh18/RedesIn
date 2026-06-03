/**
 * NetScope Pro - Sistema de Monitoreo de Redes en Tiempo Real
 * Backend: Express + Socket.IO + Escaneo de red en vivo
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { exec, execSync } = require('child_process');
const os = require('os');
const ping = require('ping');
const arp = require('node-arp');
const ip = require('ip');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = 3000;

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Utilidades de red

/**
 * Obtener información de la red local (IP, subred, puerta de enlace)
 */
function getLocalNetworkInfo() {
  const interfaces = os.networkInterfaces();
  const result = {
    localIP: '127.0.0.1',
    subnet: '255.255.255.0',
    netmask: 24,
    gateway: 'N/A',
    activeInterface: 'Desconocida'
  };

  // Priorizar Wi-Fi y Ethernet sobre interfaces virtuales/Hyper-V
  const entries = Object.entries(interfaces).sort((a, b) => {
    const nameA = a[0].toLowerCase();
    const nameB = b[0].toLowerCase();
    const isGoodA = nameA.includes('wi-fi') || nameA.includes('wlan') || nameA.includes('ethernet') || nameA.includes('eth');
    const isGoodB = nameB.includes('wi-fi') || nameB.includes('wlan') || nameB.includes('ethernet') || nameB.includes('eth');
    if (isGoodA && !isGoodB) return -1;
    if (!isGoodA && isGoodB) return 1;
    return 0;
  });

  for (const [name, addrs] of entries) {
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        // Saltar VirtualBox/Hyper-V si es posible a menos que sea la única opción
        if (name.toLowerCase().includes('virtual') && result.localIP !== '127.0.0.1') continue;
        
        result.localIP = addr.address;
        result.subnet = addr.netmask;
        result.activeInterface = name;
        // Calcular CIDR
        const maskParts = addr.netmask.split('.').map(Number);
        result.netmask = maskParts.reduce((acc, v) => acc + v.toString(2).split('').filter(b => b === '1').length, 0);
        break;
      }
    }
    if (result.localIP !== '127.0.0.1' && !result.activeInterface.toLowerCase().includes('virtual')) break;
  }

  // Intentar obtener la puerta de enlace desde la tabla de rutas
  try {
    let gw = '';
    if (process.platform === 'win32') {
      const out = execSync('route print 0.0.0.0', { timeout: 3000 }).toString();
      const match = out.match(/0\.0\.0\.0\s+0\.0\.0\.0\s+([\d.]+)/);
      if (match) gw = match[1];
    } else {
      const out = execSync('ip route show default', { timeout: 3000 }).toString();
      const match = out.match(/via ([\d.]+)/);
      if (match) gw = match[1];
    }
    if (gw) result.gateway = gw;
  } catch (e) {
    // ignorar
  }

  return result;
}

/**
 * Obtener todos los IPs en la subred a escanear
 */
function getNetworkRange(localIP, maskBits) {
  const mask = maskBits || 24;
  const ipParts = localIP.split('.').map(Number);
  const hosts = [];
  
  // Evitar escaneo masivo en loopback
  if (localIP.startsWith('127.')) {
    return [localIP];
  }

  // Calcular dirección de red y rango de hosts usando máscara de bits
  const ipNum = ipParts.reduce((acc, octet) => (acc << 8) + octet, 0) >>> 0;
  const maskNum = mask === 0 ? 0 : (~0 << (32 - mask)) >>> 0;
  const networkAddr = (ipNum & maskNum) >>> 0;
  const broadcastAddr = (networkAddr | (~maskNum >>> 0)) >>> 0;
  const totalHosts = broadcastAddr - networkAddr - 1;

  // Limitar el escaneo a máximo 1024 hosts para evitar escaneos demasiado largos
  const MAX_SCAN = 1024;
  if (totalHosts <= 0) {
    return [localIP];
  }

  if (totalHosts <= MAX_SCAN) {
    // Escanear subred completa
    for (let i = networkAddr + 1; i < broadcastAddr; i++) {
      const o1 = (i >>> 24) & 0xFF;
      const o2 = (i >>> 16) & 0xFF;
      const o3 = (i >>> 8) & 0xFF;
      const o4 = i & 0xFF;
      hosts.push(`${o1}.${o2}.${o3}.${o4}`);
    }
  } else {
    // Subred grande: escanear rango cercano centrado en la IP local
    const start = Math.max(networkAddr + 1, ipNum - Math.floor(MAX_SCAN / 2));
    const end = Math.min(broadcastAddr, start + MAX_SCAN);
    for (let i = start; i < end; i++) {
      const o1 = (i >>> 24) & 0xFF;
      const o2 = (i >>> 16) & 0xFF;
      const o3 = (i >>> 8) & 0xFF;
      const o4 = i & 0xFF;
      hosts.push(`${o1}.${o2}.${o3}.${o4}`);
    }
  }
  
  return hosts;
}

/**
 * Hacer ping a un host y devolver información de latencia
 */
async function pingHost(host) {
  try {
    const res = await ping.promise.probe(host, {
      timeout: 2,
      extra: ['-n', '1'],
    });
    return {
      alive: res.alive,
      time: res.time === 'unknown' ? null : parseFloat(res.time),
      host: host
    };
  } catch (e) {
    return { alive: false, time: null, host };
  }
}

/**
 * Múltiples pings para calcular jitter y pérdida de paquetes
 */
async function multiPing(host, count = 4) {
  const results = [];
  for (let i = 0; i < count; i++) {
    const r = await pingHost(host);
    results.push(r);
    if (i < count - 1) await delay(200);
  }

  const alive = results.filter(r => r.alive);
  const times = alive.map(r => r.time).filter(t => t !== null);
  const packetLoss = ((count - alive.length) / count) * 100;
  const avgLatency = times.length ? times.reduce((a, b) => a + b, 0) / times.length : null;
  const jitter = times.length > 1
    ? Math.sqrt(times.map(t => Math.pow(t - avgLatency, 2)).reduce((a, b) => a + b) / times.length)
    : 0;

  let quality = 'Desconocida';
  if (avgLatency !== null) {
    if (avgLatency < 10 && packetLoss === 0 && jitter < 2) quality = 'Excelente';
    else if (avgLatency < 30 && packetLoss < 5 && jitter < 5) quality = 'Buena';
    else if (avgLatency < 100 && packetLoss < 20) quality = 'Regular';
    else quality = 'Critica';
  }

  return {
    alive: alive.length > 0,
    avgLatency,
    jitter: parseFloat(jitter.toFixed(2)),
    packetLoss: parseFloat(packetLoss.toFixed(1)),
    quality
  };
}

/**
 * Resolver nombre de host desde IP
 */
function resolveHostname(ip) {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      exec(`nslookup ${ip}`, { timeout: 2000 }, (err, stdout) => {
        if (!err && stdout) {
          const match = stdout.match(/Name:\s+(.+)/);
          if (match) return resolve(match[1].trim().split('.')[0]);
        }
        resolve(null);
      });
    } else {
      exec(`host ${ip}`, { timeout: 2000 }, (err, stdout) => {
        if (!err && stdout) {
          const match = stdout.match(/pointer (.+)\./);
          if (match) return resolve(match[1].trim().split('.')[0]);
        }
        resolve(null);
      });
    }
  });
}

/**
 * Obtener dirección MAC para una IP usando ARP
 */
function getMacAddress(ipAddr) {
  return new Promise((resolve) => {
    arp.getMAC(ipAddr, (err, mac) => {
      if (err || !mac || mac === '(incomplete)') resolve(null);
      else resolve(mac.toUpperCase());
    });
  });
}

/**
 * Buscar fabricante desde MAC (OUI) - Base de datos local + alternativa API con caché
 */
const macVendorCache = {};

async function getMacVendor(mac) {
  if (!mac) return 'Desconocido';
  
  // Verificar caché primero
  const prefix = mac.replace(/[:-]/g, '').substring(0, 6).toUpperCase();
  if (macVendorCache[prefix]) return macVendorCache[prefix];

  // Intentar base de datos OUI local
  try {
    const oui = require('oui');
    const vendor = oui(mac);
    if (vendor && vendor !== 'Unknown') {
      macVendorCache[prefix] = vendor;
      return vendor;
    }
  } catch (e) {}

  // Alternativa: API de macvendors.io (gratuita, sin clave necesaria)
  try {
    const https = require('https');
    const result = await new Promise((resolve, reject) => {
      const req = https.get(`https://api.macvendors.com/${encodeURIComponent(mac)}`, {
        timeout: 3000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200 && data && !data.includes('Not Found')) {
            resolve(data.trim());
          } else {
            resolve('Unknown');
          }
        });
      });
      req.on('error', () => resolve('Unknown'));
      req.on('timeout', () => { req.destroy(); resolve('Unknown'); });
    });
    macVendorCache[prefix] = result;
    return result;
  } catch (e) {
    return 'Desconocido';
  }
}

// Versión sincrónica para compatibilidad hacia atrás donde async no es posible
function getMacVendorSync(mac) {
  if (!mac) return 'Unknown';
  const prefix = mac.replace(/[:-]/g, '').substring(0, 6).toUpperCase();
  if (macVendorCache[prefix]) return macVendorCache[prefix];
  try {
    const oui = require('oui');
    const vendor = oui(mac);
    if (vendor) { macVendorCache[prefix] = vendor; return vendor; }
  } catch (e) {}
  return 'Unknown';
}

/**
 * Obtener tabla ARP del sistema operativo
 */
function getArpTable() {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32' ? 'arp -a' : 'arp -n';
    exec(cmd, { timeout: 5000 }, (err, stdout) => {
      if (err) return resolve([]);
      const entries = [];
      const lines = stdout.split('\n');
      
      for (const line of lines) {
        if (process.platform === 'win32') {
          // Windows: "  192.168.1.1           aa-bb-cc-dd-ee-ff     dynamic"
          const m = line.match(/([\d.]+)\s+([\w-]+)\s+(dynamic|static)/i);
          if (m) {
            entries.push({
              ip: m[1],
              mac: m[2].replace(/-/g, ':').toUpperCase()
            });
          }
        } else {
          // Linux: "192.168.1.1 ether aa:bb:cc:dd:ee:ff C eth0"
          const m = line.match(/([\d.]+)\s+\w+\s+([\w:]+)/);
          if (m && m[2] !== '00:00:00:00:00:00') {
            entries.push({ ip: m[1], mac: m[2].toUpperCase() });
          }
        }
      }
      resolve(entries);
    });
  });
}

// 
// Escáner WiFi
// 

/**
 * Escanear redes WiFi (Windows: netsh, Linux: iwlist/nmcli)
 */
function scanWifi() {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      // Forzar un escaneo primero (esto toma un momento pero asegura datos frescos)
      exec('netsh wlan scan', { timeout: 5000 }, () => {
        exec('netsh wlan show networks mode=bssid', { timeout: 8000 }, (err, stdout) => {
          if (err || !stdout) return resolve([]);
          resolve(parseWindowsWifi(stdout));
        });
      });
    } else {
      exec('nmcli -t -f SSID,BSSID,CHAN,FREQ,SIGNAL,SECURITY dev wifi list', { timeout: 8000 }, (err, stdout) => {
        if (err || !stdout) {
          // Intentar iwlist
          exec('iwlist scan 2>/dev/null', { timeout: 8000 }, (err2, stdout2) => {
            if (err2 || !stdout2) return resolve([]);
            resolve(parseIwlistWifi(stdout2));
          });
          return;
        }
        resolve(parseNmcliWifi(stdout));
      });
    }
  });
}

function parseWindowsWifi(output) {
  const networks = [];
  const blocks = output.split(/SSID \d+ :/);
  
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    
    // El SSID está en la primera línea del bloque (después de "SSID X :")
    const firstLine = block.split('\n')[0].replace('\r', '');
    const ssid = firstLine.trim();

    const bssidMatch = block.match(/BSSID \d+\s+:\s+([\w:]+)/i);
    const signalMatch = block.match(/(?:Signal|Se.al)\s*:\s*(\d+)%/i);
    const channelMatch = block.match(/(?:Channel|Canal)\s*:\s*(\d+)/i);
    const radioMatch = block.match(/(?:Radio type|Tipo de radio)\s*:\s*(.+)/i);
    const authMatch = block.match(/(?:Authentication|Autenticación)\s*:\s*(.+)/i);
    const freqMatch = block.match(/(?:Band|Banda)\s*:\s*(.+)/i);
    
    const signal = signalMatch ? parseInt(signalMatch[1]) : 0;
    const rssi = signalToRssi(signal);
    const channel = channelMatch ? parseInt(channelMatch[1]) : 0;
    const radioType = radioMatch ? radioMatch[1].trim() : 'Desconocido';
    // Usar información de banda si está disponible, de lo contrario deducir del canal
    let freq = '2.4 GHz';
    if (freqMatch) {
      freq = freqMatch[1].trim().includes('5') ? '5 GHz' : '2.4 GHz';
    } else {
      freq = channel > 14 ? '5 GHz' : '2.4 GHz';
    }
    
    let security = 'Abierta';
    if (authMatch) {
      const auth = authMatch[1].trim().toUpperCase();
      if (auth.includes('WPA3')) security = 'WPA3';
      else if (auth.includes('WPA2')) security = 'WPA2';
      else if (auth.includes('WPA')) security = 'WPA';
      else if (auth.includes('WEP')) security = 'WEP';
    }
    
    networks.push({
      ssid: ssid || '(Oculta)',
      bssid: bssidMatch ? bssidMatch[1].toUpperCase() : 'Desconocida',
      channel,
      frequency: freq,
      signal,
      rssi,
      security,
      radioType,
      vendor: 'Desconocido'
    });
  }
  
  return networks;
}

function parseNmcliWifi(output) {
  const networks = [];
  const lines = output.trim().split('\n');
  for (const line of lines) {
    const parts = line.split(':');
    if (parts.length < 6) continue;
    const [ssid, bssid, chan, freq, signal, security] = parts;
    const channel = parseInt(chan) || 0;
    networks.push({
      ssid: ssid || '(Oculta)',
      bssid: bssid.toUpperCase(),
      channel,
      frequency: freq.includes('5') ? '5 GHz' : '2.4 GHz',
      signal: parseInt(signal) || 0,
      rssi: signalToRssi(parseInt(signal)),
      security: security ? security.trim() : 'Abierta',
      vendor: 'Desconocido'
    });
  }
  return networks;
}

function parseIwlistWifi(output) {
  const networks = [];
  const cells = output.split(/Cell \d+ -/);
  for (let i = 1; i < cells.length; i++) {
    const cell = cells[i];
    const ssidMatch = cell.match(/ESSID:"(.*)"/);  
    const bssidMatch = cell.match(/Address: ([\w:]+)/i);
    const channelMatch = cell.match(/Channel:(\d+)/i);
    const signalMatch = cell.match(/Signal level[=:](-?\d+)/i);
    const encMatch = cell.match(/Encryption key:(on|off)/i);
    const wpaMatch = cell.match(/(WPA\d?)/i);
    
    const signal = signalMatch ? parseInt(signalMatch[1]) : -100;
    const channel = channelMatch ? parseInt(channelMatch[1]) : 0;
    let security = 'Abierta';
    if (wpaMatch) security = wpaMatch[1].toUpperCase();
    else if (encMatch && encMatch[1] === 'on') security = 'WEP';
    
    networks.push({
      ssid: ssidMatch ? ssidMatch[1] : '(Oculta)',
      bssid: bssidMatch ? bssidMatch[1].toUpperCase() : 'Desconocida',
      channel,
      frequency: channel > 14 ? '5 GHz' : '2.4 GHz',
      signal: rssiToSignal(signal),
      rssi: signal,
      security,
      vendor: 'Desconocido'
    });
  }
  return networks;
}

function signalToRssi(percent) {
  return Math.round(percent / 2 - 100);
}

function rssiToSignal(rssi) {
  return Math.max(0, Math.min(100, Math.round((rssi + 100) * 2)));
}

// ─────────────────────────────────────────────
// Estado en memoria
// ─────────────────────────────────────────────

const state = {
  devices: {},          // indexado por IP
  wifiNetworks: [],
  alerts: [],
  networkInfo: null,
  lastScanTime: null,
  scanning: false,
  channelRecommendation: null,
  arpAnomalies: [],
  throughput: null,
  trafficRate: { download: 0, upload: 0 }
};

const alertCooldownMs = 120000;
const alertLastSeen = new Map();

function addAlert(type, message, severity = 'warning', dedupKey = null) {
  const key = dedupKey || `${type}:${message}`;
  const now = Date.now();
  const last = alertLastSeen.get(key);
  if (last && now - last < alertCooldownMs) return null;

  alertLastSeen.set(key, now);
  const alert = {
    id: now,
    type,
    message,
    severity,
    timestamp: new Date().toISOString()
  };
  state.alerts.unshift(alert);
  if (state.alerts.length > 50) state.alerts.pop();
  return alert;
}

// ─────────────────────────────────────────────
// Device scanner
// ─────────────────────────────────────────────

async function scanNetwork() {
  if (state.scanning) return;
  state.scanning = true;

  try {
    const netInfo = getLocalNetworkInfo();
    state.networkInfo = netInfo;

    // Limpiar dispositivos loopback fantasma si la red actual ya no es loopback
    if (!netInfo.localIP.startsWith('127.')) {
      for (const key in state.devices) {
        if (key.startsWith('127.') && key !== '127.0.0.1') {
          delete state.devices[key];
        }
      }
    }

    // First pass: ARP table (fast, finds already-known devices)
    const arpTable = await getArpTable();
    
    // Build a quick map
    const arpMap = {};
    for (const entry of arpTable) {
      arpMap[entry.ip] = entry.mac;
    }

    // Second pass: Ping sweep
    const hosts = getNetworkRange(netInfo.localIP, netInfo.netmask);
    const BATCH_SIZE = 30;
    const activeHosts = [];

    for (let i = 0; i < hosts.length; i += BATCH_SIZE) {
      const batch = hosts.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(pingHost));
      for (const r of results) {
        if (r.alive) activeHosts.push(r.host);
      }
    }

    // Include local IP if not in list
    if (!activeHosts.includes(netInfo.localIP)) {
      activeHosts.push(netInfo.localIP);
    }

    io.emit('scan_progress', { 
      found: activeHosts.length,
      total: hosts.length,
      status: 'Analizando dispositivos...'
    });

    // Process each active host
    for (const host of activeHosts) {
      await processDevice(host, arpMap[host] || null, netInfo.localIP);
    }

    // Mark offline devices
    for (const [ip, device] of Object.entries(state.devices)) {
      if (!activeHosts.includes(ip)) {
        if (device.status === 'online') {
          device.status = 'offline';
          device.lastSeen = device.lastSeen || new Date().toISOString();
          addAlert('device_offline', `${device.hostname || ip} se desconectó`, 'error', `offline:${ip}`);
        }
      }
    }

    state.lastScanTime = new Date().toISOString();
    io.emit('devices_update', { devices: Object.values(state.devices), networkInfo: state.networkInfo });

  } catch (e) {
    console.error('Scan error:', e);
  } finally {
    state.scanning = false;
  }
}

async function processDevice(ipAddr, knownMac, localIP) {
  const isLocal = ipAddr === localIP;
  
  // Get MAC
  let mac = knownMac;
  if (!mac) {
    mac = await getMacAddress(ipAddr);
  }

  // Get hostname
  let hostname = await resolveHostname(ipAddr);
  if (isLocal) hostname = os.hostname();

  // Get vendor (async with API fallback)
  const vendor = await getMacVendor(mac);

  // MEJORA 5: Classify device connection type
  const connectionType = classifyDeviceType(vendor, mac);

  // Ping quality
  const pingData = await multiPing(ipAddr, 3);

  const now = new Date().toISOString();
  const existing = state.devices[ipAddr];

  // Build latency history
  const history = existing?.latencyHistory || [];
  if (pingData.avgLatency !== null) {
    history.push({ time: Date.now(), value: pingData.avgLatency });
    if (history.length > 20) history.shift();
  }

  // Check for alerts
  if (pingData.avgLatency > 100) {
    addAlert('high_latency', `${hostname || ipAddr}: latencia alta (${pingData.avgLatency.toFixed(1)} ms)`, 'warning', `latency:${ipAddr}`);
  }
  if (pingData.packetLoss > 20) {
    addAlert('packet_loss', `${hostname || ipAddr}: pérdida de paquetes del ${pingData.packetLoss}%`, 'error', `loss:${ipAddr}`);
  }
  if (pingData.jitter > 15) {
    addAlert('jitter', `${hostname || ipAddr}: jitter elevado (${pingData.jitter} ms)`, 'warning', `jitter:${ipAddr}`);
  }

  state.devices[ipAddr] = {
    ip: ipAddr,
    mac: mac || 'N/A',
    hostname: hostname || (isLocal ? os.hostname() : `Device-${ipAddr.split('.').pop()}`),
    vendor,
    connectionType,
    status: pingData.alive ? 'online' : 'offline',
    latency: pingData.avgLatency,
    jitter: pingData.jitter,
    packetLoss: pingData.packetLoss,
    quality: pingData.quality,
    isLocal,
    firstSeen: existing?.firstSeen || now,
    lastSeen: now,
    latencyHistory: history
  };
}

// ─────────────────────────────────────────────
// WiFi scanner loop
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// RF Propagation Calculations
// ─────────────────────────────────────────────

/**
 * Calculate Free-Space Path Loss (FSPL) in dB
 * FSPL(dB) = 20*log10(d) + 20*log10(f) + 32.44
 * where d = distance in km, f = frequency in MHz
 */
function calculateFSPL(distanceKm, frequencyMHz) {
  if (distanceKm <= 0) return 0;
  return 20 * Math.log10(distanceKm) + 20 * Math.log10(frequencyMHz) + 32.44;
}

/**
 * Estimate distance from RSSI using Log-Distance Path Loss Model
 * RSSI = TxPower - 10 * n * log10(d/d0)
 * d = d0 * 10^((TxPower - RSSI) / (10 * n))
 * 
 * TxPower: typical AP transmit power (20 dBm)
 * n: path-loss exponent (2.0 free space, 2.7-3.5 indoor)
 * d0: reference distance (1m)
 */
function estimateDistance(rssiDbm, frequencyGHz) {
  const txPower = 20; // dBm (typical AP)
  const n = frequencyGHz >= 5 ? 3.0 : 2.7; // Higher attenuation for 5GHz indoors
  const d0 = 1; // reference distance in meters
  const distance = d0 * Math.pow(10, (txPower - rssiDbm) / (10 * n));
  return Math.round(distance * 100) / 100; // meters, 2 decimal places
}

/**
 * Get frequency in MHz from channel number
 */
function channelToFreqMHz(channel) {
  if (channel >= 1 && channel <= 13) {
    return 2412 + (channel - 1) * 5; // 2.4 GHz band
  } else if (channel === 14) {
    return 2484;
  } else if (channel >= 36 && channel <= 165) {
    return 5000 + channel * 5; // 5 GHz band
  }
  return 2437; // fallback ch6
}

/**
 * Recommend optimal channel based on congestion analysis
 * Returns best channels for 2.4 GHz and 5 GHz
 */
function recommendOptimalChannels(networks) {
  // 2.4 GHz: only non-overlapping channels 1, 6, 11 matter
  const nonOverlapping24 = [1, 6, 11];
  // 5 GHz: common channels
  const channels5 = [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 149, 153, 157, 161, 165];

  // Count interference per channel (2.4 GHz considers overlapping ±2 channels)
  const interference24 = {};
  nonOverlapping24.forEach(ch => { interference24[ch] = 0; });

  const interference5 = {};
  channels5.forEach(ch => { interference5[ch] = 0; });

  for (const net of networks) {
    if (!net.channel) continue;
    if (net.frequency && net.frequency.includes('5')) {
      // 5 GHz: direct channel match
      if (interference5[net.channel] !== undefined) {
        interference5[net.channel] += 1;
      }
    } else {
      // 2.4 GHz: overlapping channel model
      for (const ch of nonOverlapping24) {
        const overlap = Math.max(0, 5 - Math.abs(net.channel - ch));
        interference24[ch] += overlap > 0 ? overlap / 5 : 0;
      }
    }
  }

  // Find best channel for each band
  let best24 = nonOverlapping24[0];
  let minInterference24 = Infinity;
  for (const ch of nonOverlapping24) {
    if (interference24[ch] < minInterference24) {
      minInterference24 = interference24[ch];
      best24 = ch;
    }
  }

  let best5 = channels5[0];
  let minInterference5 = Infinity;
  for (const ch of channels5) {
    if ((interference5[ch] || 0) < minInterference5) {
      minInterference5 = interference5[ch] || 0;
      best5 = ch;
    }
  }

  return {
    recommended24: { channel: best24, interference: parseFloat(minInterference24.toFixed(2)) },
    recommended5: { channel: best5, interference: minInterference5 },
    analysis24: nonOverlapping24.map(ch => ({ channel: ch, interference: parseFloat(interference24[ch].toFixed(2)) })),
    analysis5: channels5.filter(ch => interference5[ch] > 0).map(ch => ({ channel: ch, interference: interference5[ch] }))
  };
}

/**
 * Evaluate WiFi security vulnerabilities
 */
function evaluateSecurityRisk(security) {
  const sec = (security || '').toLowerCase();
  if (!security || sec === 'open' || sec === 'abierta') {
    return { level: 'critical', label: 'Sin cifrado', description: 'Red abierta — todo el tráfico es visible' };
  }
  if (security === 'WEP') {
    return { level: 'high', label: 'WEP (obsoleto)', description: 'Cifrado roto — se puede crackear en minutos' };
  }
  if (security === 'WPA' && !security.includes('2') && !security.includes('3')) {
    return { level: 'medium', label: 'WPA (antiguo)', description: 'Vulnerable a ataques TKIP — usar WPA2/WPA3' };
  }
  if (security === 'WPA2') {
    return { level: 'low', label: 'WPA2', description: 'Seguro para uso general' };
  }
  if (security === 'WPA3') {
    return { level: 'none', label: 'WPA3', description: 'Máxima seguridad disponible' };
  }
  return { level: 'low', label: security, description: 'Seguridad aceptable' };
}

/**
 * Classify device connection type based on MAC vendor (OUI)
 */
function classifyDeviceType(vendor, mac) {
  if (!vendor || vendor === 'Unknown') return 'unknown';
  const v = vendor.toLowerCase();
  // Known WiFi chipset vendors
  const wifiVendors = ['qualcomm', 'broadcom', 'mediatek', 'realtek', 'intel', 'atheros', 'ralink', 'marvell', 'espressif', 'tp-link', 'asus', 'd-link', 'netgear', 'linksys', 'ubiquiti', 'aruba', 'cisco', 'huawei', 'xiaomi', 'samsung', 'apple', 'google', 'amazon', 'sonos'];
  const ethernetVendors = ['hewlett', 'dell', 'lenovo', 'vmware', 'microsoft', 'hyper-v', 'virtual'];
  const iotVendors = ['espressif', 'tuya', 'shenzhen', 'hangzhou', 'amazon', 'ring', 'nest', 'philips', 'sonos', 'roku'];

  if (iotVendors.some(kw => v.includes(kw))) return 'iot';
  if (ethernetVendors.some(kw => v.includes(kw))) return 'wired';
  if (wifiVendors.some(kw => v.includes(kw))) return 'wireless';
  return 'unknown';
}

async function scanWifiNetworks() {
  try {
    const networks = await scanWifi();
    if (networks.length > 0) {
      // Add channel congestion data
      const channelCount = {};
      for (const net of networks) {
        channelCount[net.channel] = (channelCount[net.channel] || 0) + 1;
      }

      for (const net of networks) {
        const count = channelCount[net.channel] || 1;
        net.congestion = count > 4 ? 'Alta' : count > 2 ? 'Media' : 'Baja';
        net.channelCount = count;

        // MEJORA 1: Calculate FSPL
        const freqMHz = channelToFreqMHz(net.channel);
        const distanceM = estimateDistance(net.rssi, freqMHz / 1000);
        net.fspl = parseFloat(calculateFSPL(distanceM / 1000, freqMHz).toFixed(1));

        // MEJORA 2: Estimate distance
        net.estimatedDistance = distanceM;

        // MEJORA 4: Security risk evaluation
        net.securityRisk = evaluateSecurityRisk(net.security);

        if (net.signal < 30) {
          addAlert('weak_signal', `Señal débil en «${net.ssid}»: ${net.signal}%`, 'warning', `weak:${net.bssid}`);
        }
        if (count > 4) {
          addAlert('channel_congestion', `Canal ${net.channel} saturado (${count} redes)`, 'warning', `cong:${net.channel}`);
        }
        // Security vulnerability alert
        if (net.securityRisk.level === 'critical' || net.securityRisk.level === 'high') {
          addAlert('security_vuln', `«${net.ssid}»: ${net.securityRisk.label} — ${net.securityRisk.description}`, 'error', `sec:${net.bssid}:${net.securityRisk.level}`);
        }
      }

      // MEJORA 3: Channel recommendation
      state.channelRecommendation = recommendOptimalChannels(networks);

      state.wifiNetworks = networks;
      io.emit('wifi_update', { 
        networks: state.wifiNetworks,
        channelRecommendation: state.channelRecommendation
      });
    }
  } catch (e) {
    console.error('WiFi scan error:', e);
  }
}

// ─────────────────────────────────────────────
// Continuous ping monitor (keeps devices updated)
// ─────────────────────────────────────────────

async function continuousMonitor() {
  const devices = Object.values(state.devices);
  if (devices.length === 0) return;

  for (const device of devices) {
    const result = await pingHost(device.ip);
    const wasOnline = device.status === 'online';
    const isNowOnline = result.alive;

    if (wasOnline && !isNowOnline) {
      device.status = 'offline';
      addAlert('device_offline', `${device.hostname} se desconectó`, 'error', `offline:${device.ip}`);
    } else if (!wasOnline && isNowOnline) {
      device.status = 'online';
      addAlert('device_online', `${device.hostname} volvió a conectarse`, 'info', `online:${device.ip}`);
    }

    if (result.time !== null) {
      device.latency = parseFloat(result.time);
      device.lastSeen = new Date().toISOString();
      device.latencyHistory = device.latencyHistory || [];
      device.latencyHistory.push({ time: Date.now(), value: device.latency });
      if (device.latencyHistory.length > 20) device.latencyHistory.shift();
    }
  }

  io.emit('devices_update', { 
    devices: Object.values(state.devices), 
    networkInfo: state.networkInfo,
    alerts: state.alerts.slice(0, 20)
  });
}

// ─────────────────────────────────────────────
// ARP SPOOFING DETECTION
// ─────────────────────────────────────────────

function detectArpSpoofing() {
  const macToIps = {};
  const ipToMacs = {};
  const anomalies = [];

  const devices = Object.values(state.devices);
  for (const d of devices) {
    if (!d.mac || d.mac === 'N/A') continue;

    // Track MAC -> IPs
    if (!macToIps[d.mac]) macToIps[d.mac] = new Set();
    macToIps[d.mac].add(d.ip);

    // Track IP -> MACs
    if (!ipToMacs[d.ip]) ipToMacs[d.ip] = new Set();
    ipToMacs[d.ip].add(d.mac);
  }

  // Detect: same MAC with multiple IPs (possible NAT/router or spoofing)
  for (const [mac, ips] of Object.entries(macToIps)) {
    if (ips.size > 3) {
      anomalies.push({
        type: 'mac_multiple_ips',
        severity: 'warning',
        mac,
        ips: Array.from(ips),
        description: `MAC ${mac} asociada a ${ips.size} IPs distintas — posible router o spoofing`
      });
    }
  }

  // Detect: same IP with multiple MACs (strong indicator of ARP spoofing)
  for (const [ipAddr, macs] of Object.entries(ipToMacs)) {
    if (macs.size > 1) {
      anomalies.push({
        type: 'ip_multiple_macs',
        severity: 'critical',
        ip: ipAddr,
        macs: Array.from(macs),
        description: `IP ${ipAddr} responde con ${macs.size} MACs distintas — POSIBLE ARP SPOOFING`
      });
      addAlert('arp_spoofing', `Posible ARP spoofing: la IP ${ipAddr} responde con varias MAC (${Array.from(macs).join(', ')})`, 'error', `arp_ip:${ipAddr}`);
    }
  }

  // Detect: gateway MAC change (most dangerous)
  const gw = state.networkInfo?.gateway;
  if (gw && ipToMacs[gw] && ipToMacs[gw].size > 1) {
    anomalies.push({
      type: 'gateway_spoofing',
      severity: 'critical',
      ip: gw,
      macs: Array.from(ipToMacs[gw]),
      description: `ALERTA: Gateway ${gw} tiene multiples MACs — posible ataque MITM`
    });
    addAlert('arp_spoofing', `Crítico: la puerta de enlace ${gw} tiene varias MAC — posible ataque Man-in-the-Middle`, 'error', `arp_gw:${gw}`);
  }

  state.arpAnomalies = anomalies;
  return anomalies;
}

// ─────────────────────────────────────────────
// TRACEROUTE
// ─────────────────────────────────────────────

function runTraceroute(target) {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32'
      ? `tracert -d -w 2000 -h 15 ${target}`
      : `traceroute -n -w 2 -m 15 ${target}`;

    exec(cmd, { timeout: 30000 }, (err, stdout) => {
      if (err && !stdout) return resolve([]);
      const hops = [];
      const lines = stdout.split('\n');

      for (const line of lines) {
        if (process.platform === 'win32') {
          // Windows tracert: "  1    <1 ms    <1 ms    <1 ms  192.168.1.1"
          const match = line.match(/^\s*(\d+)\s+(.+?)\s+([\d.]+)\s*$/);
          if (match) {
            const hopNum = parseInt(match[1]);
            const timePart = match[2];
            const hopIp = match[3];
            // Parse times: could be "<1 ms", "5 ms", "*"
            const times = timePart.split(/\s{2,}/).map(t => {
              if (t.includes('*')) return null;
              const m = t.match(/([\d.]+)\s*ms/);
              return m ? parseFloat(m[1]) : (t.includes('<1') ? 0.5 : null);
            }).filter(t => t !== null);
            const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null;
            hops.push({ hop: hopNum, ip: hopIp, time: avgTime !== null ? parseFloat(avgTime.toFixed(1)) : null });
          } else {
            // Alternative parsing for timeout lines
            const altMatch = line.match(/^\s*(\d+)/);
            if (altMatch && line.includes('*')) {
              hops.push({ hop: parseInt(altMatch[1]), ip: '*', time: null });
            }
          }
        } else {
          // Linux: " 1  192.168.1.1  1.234 ms  0.987 ms  1.100 ms"
          const match = line.match(/^\s*(\d+)\s+([\d.*]+)\s+(.+)/);
          if (match) {
            const hopNum = parseInt(match[1]);
            const hopIp = match[2];
            const rest = match[3];
            const times = [...rest.matchAll(/([\d.]+)\s*ms/g)].map(m => parseFloat(m[1]));
            const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null;
            hops.push({ hop: hopNum, ip: hopIp, time: avgTime !== null ? parseFloat(avgTime.toFixed(1)) : null });
          }
        }
      }
      resolve(hops);
    });
  });
}

// ─────────────────────────────────────────────
// LIVE NETWORK INTERFACE TRAFFIC MONITOR (Real)
// ─────────────────────────────────────────────

let lastTrafficBytes = null;
let lastTrafficTime = Date.now();

function getBytesTransmitted() {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      exec('netstat -e', { timeout: 2000 }, (err, stdout) => {
        if (err || !stdout) return resolve(null);
        const match = stdout.match(/Bytes\s+(\d+)\s+(\d+)/i);
        if (match) {
          return resolve({
            rx: parseInt(match[1]),
            tx: parseInt(match[2])
          });
        }
        resolve(null);
      });
    } else {
      exec("cat /proc/net/dev 2>/dev/null || ip -s link", { timeout: 2000 }, (err, stdout) => {
        if (err || !stdout) return resolve(null);
        const lines = stdout.split('\n');
        let rx = 0;
        let tx = 0;
        for (const line of lines) {
          const match = line.match(/^\s*(\w+):\s*(\d+)\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+(\d+)/);
          if (match) {
            const iface = match[1].toLowerCase();
            if (iface !== 'lo') {
              rx += parseInt(match[2]);
              tx += parseInt(match[3]);
            }
          }
        }
        if (rx > 0 || tx > 0) {
          return resolve({ rx, tx });
        }
        resolve(null);
      });
    }
  });
}

async function updateLiveTrafficRate() {
  try {
    const bytes = await getBytesTransmitted();
    if (!bytes) return;

    const now = Date.now();
    if (lastTrafficBytes) {
      const dt = (now - lastTrafficTime) / 1000; // time delta in seconds
      if (dt > 0.5) {
        const rxDelta = bytes.rx - lastTrafficBytes.rx;
        const txDelta = bytes.tx - lastTrafficBytes.tx;

        // Check for overflow or reset
        if (rxDelta >= 0 && txDelta >= 0) {
          const downloadMbps = parseFloat(((rxDelta * 8) / (dt * 1024 * 1024)).toFixed(2));
          const uploadMbps = parseFloat(((txDelta * 8) / (dt * 1024 * 1024)).toFixed(2));

          state.trafficRate = {
            download: downloadMbps,
            upload: uploadMbps,
            timestamp: new Date().toISOString()
          };

          io.emit('traffic_rate_update', state.trafficRate);
        }
      }
    }
    lastTrafficBytes = bytes;
    lastTrafficTime = now;
  } catch (e) {
    console.error('Error updating live traffic rate:', e);
  }
}

// ─────────────────────────────────────────────
// THROUGHPUT MEASUREMENT (Real)
// ─────────────────────────────────────────────

async function measureThroughput() {
  const gateway = state.networkInfo?.gateway;
  if (!gateway) return { download: 0, upload: 0, target: null };

  // Measure by sending a known-size ICMP burst and calculating throughput
  // This is a simplified approach using large ping payloads
  const payloadSize = 1400; // bytes (near MTU)
  const count = 10;

  try {
    const start = Date.now();
    const results = [];
    for (let i = 0; i < count; i++) {
      const res = await ping.promise.probe(gateway, {
        timeout: 2,
        extra: process.platform === 'win32' ? ['-l', String(payloadSize)] : ['-s', String(payloadSize)]
      });
      if (res.alive) results.push(parseFloat(res.time));
    }
    const elapsed = Date.now() - start;

    if (results.length === 0) return { download: 0, upload: 0, target: gateway };

    // Throughput estimate: bytes sent/received per second
    const totalBytes = results.length * payloadSize * 2; // round trip
    const throughputBps = (totalBytes / (elapsed / 1000)) * 8; // bits per second
    const throughputMbps = parseFloat((throughputBps / 1000000).toFixed(2));
    const avgLatency = results.reduce((a, b) => a + b, 0) / results.length;

    return {
      download: throughputMbps,
      upload: parseFloat((throughputMbps * 0.3).toFixed(2)), // Approx asymmetric
      latency: parseFloat(avgLatency.toFixed(1)),
      target: gateway,
      packetsOk: results.length,
      packetsTotal: count,
      timestamp: new Date().toISOString()
    };
  } catch (e) {
    return { download: 0, upload: 0, target: gateway };
  }
}

// ─────────────────────────────────────────────
// NETWORK TOPOLOGY GENERATION
// ─────────────────────────────────────────────

function generateTopology() {
  const gateway = state.networkInfo?.gateway || '0.0.0.0';
  const localIP = state.networkInfo?.localIP || '0.0.0.0';
  const devices = Object.values(state.devices);

  const nodes = [];
  const links = [];

  // Gateway node (center)
  nodes.push({
    id: gateway,
    label: `Gateway (${gateway})`,
    type: 'gateway',
    status: 'online'
  });

  for (const d of devices) {
    if (d.ip === gateway) continue;

    nodes.push({
      id: d.ip,
      label: d.hostname || d.ip,
      type: d.isLocal ? 'local' : d.connectionType || 'unknown',
      status: d.status,
      vendor: d.vendor
    });

    // Link quality based on latency
    let quality = 'good';
    if (d.latency > 100 || d.packetLoss > 10) quality = 'critical';
    else if (d.latency > 30 || d.packetLoss > 5) quality = 'warning';

    links.push({
      source: gateway,
      target: d.ip,
      latency: d.latency,
      quality,
      packetLoss: d.packetLoss || 0
    });
  }

  return { nodes, links, gateway, localIP };
}

// ─────────────────────────────────────────────
// REST API
// ─────────────────────────────────────────────

app.get('/api/status', (req, res) => {
  res.json({
    networkInfo: state.networkInfo,
    devices: Object.values(state.devices),
    wifiNetworks: state.wifiNetworks,
    alerts: state.alerts.slice(0, 20),
    lastScan: state.lastScanTime,
    scanning: state.scanning,
    channelRecommendation: state.channelRecommendation
  });
});

app.post('/api/scan', async (req, res) => {
  if (state.scanning) return res.json({ status: 'escaneo_en_curso' });
  res.json({ status: 'iniciado' });
  scanNetwork();
});

// Topology endpoint
app.get('/api/topology', (req, res) => {
  res.json(generateTopology());
});

// ARP security analysis
app.get('/api/arp/analysis', (req, res) => {
  const anomalies = detectArpSpoofing();
  const devices = Object.values(state.devices).map(d => ({
    ip: d.ip, mac: d.mac, hostname: d.hostname, vendor: d.vendor
  }));
  res.json({ devices, anomalies, scannedAt: new Date().toISOString() });
});

// Traceroute endpoint
app.get('/api/traceroute/:target', async (req, res) => {
  const target = req.params.target;
  // Basic validation
  if (!/^[\d.]+$/.test(target) && !/^[\w.-]+$/.test(target)) {
    return res.status(400).json({ error: 'Destino no válido' });
  }
  const hops = await runTraceroute(target);
  res.json({ target, hops, timestamp: new Date().toISOString() });
});

// Throughput measurement endpoint
app.get('/api/throughput', async (req, res) => {
  const result = await measureThroughput();
  res.json(result);
});

// ─────────────────────────────────────────────
// FUTURE PHASES PREPARATION
// ─────────────────────────────────────────────

// IA para detección de degradación (fase futura)
app.get('/api/ai/analyze', (req, res) => {
  res.json({ status: 'no_implementado', message: 'Módulo de análisis con IA pendiente' });
});

// Métricas históricas (fase futura)
app.get('/api/metrics/history', (req, res) => {
  // Devuelve historial real del estado en memoria
  const history = Object.values(state.devices).map(d => ({
    ip: d.ip,
    hostname: d.hostname,
    latencyHistory: d.latencyHistory || [],
    lastSeen: d.lastSeen
  }));
  res.json({ status: 'ok', data: history });
});

// Exportación de alertas como JSON
app.get('/api/logs/export', (req, res) => {
  res.json({ status: 'ok', alertas: state.alerts, dispositivos: Object.values(state.devices) });
});

// ─────────────────────────────────────────────
// Socket.IO
// ─────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Send current state immediately
  socket.emit('devices_update', {
    devices: Object.values(state.devices),
    networkInfo: state.networkInfo,
    alerts: state.alerts.slice(0, 20)
  });
  socket.emit('wifi_update', { networks: state.wifiNetworks });
  socket.emit('traffic_rate_update', state.trafficRate);

  socket.on('request_scan', () => {
    if (!state.scanning) scanNetwork();
    scanWifiNetworks(); // Force a fresh wifi scan too
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// 
// Helpers
// 

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 
// Scheduler
// 

async function startMonitoring() {
  console.log('Starting initial network scan...');
  
  // Start network scan (don't await so we don't block WiFi)
  scanNetwork();

  // WiFi scan starts immediately
  scanWifiNetworks();
  setInterval(scanWifiNetworks, 30000);

  // Continuous ping monitor every 5 seconds
  setInterval(continuousMonitor, 5000);

  // Full rescan every 60 seconds
  setInterval(scanNetwork, 60000);

  // ARP spoofing check every 15 seconds
  setInterval(detectArpSpoofing, 15000);

  // Throughput measurement every 20 seconds
  setInterval(async () => {
    state.throughput = await measureThroughput();
    io.emit('throughput_update', state.throughput);
  }, 20000);

  // Monitoreo de tráfico en vivo en tiempo real de la interfaz activa cada 1 segundo
  setInterval(updateLiveTrafficRate, 1000);
}

// 
// Start server
// 

server.listen(PORT, () => {
  console.log(`║   NetScope Pro — Network Monitor       ║`);
  
  console.log(`║  Dashboard: http://localhost:${PORT}       ║`);
  startMonitoring();
});
