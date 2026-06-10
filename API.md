# API REST - NetScope Pro

Documentación completa de los endpoints REST disponibles en NetScope Pro.

---

## Base URL

```
http://localhost:3000/api
```

---

## Endpoints

### 1. GET /api/status

**Descripción**: Obtiene el estado actual del sistema completo

**Parámetros**: Ninguno

**Respuesta (200 OK)**:
```json
{
  "networkInfo": {
    "localIP": "192.168.1.100",
    "subnet": "255.255.255.0",
    "netmask": 24,
    "gateway": "192.168.1.1",
    "activeInterface": "Wi-Fi"
  },
  "devices": [
    {
      "ip": "192.168.1.1",
      "mac": "AA:BB:CC:DD:EE:FF",
      "hostname": "gateway",
      "vendor": "TP-Link",
      "connectionType": "wired",
      "status": "online",
      "latency": 2.5,
      "jitter": 0.3,
      "packetLoss": 0,
      "quality": "Excelente",
      "isLocal": false,
      "firstSeen": "2024-06-09T10:30:00.000Z",
      "lastSeen": "2024-06-09T10:35:00.000Z",
      "latencyHistory": [
        { "time": 1717945800000, "value": 2.5 }
      ]
    }
  ],
  "wifiNetworks": [
    {
      "ssid": "ALEXANDER 5G",
      "bssid": "9E:63:5B:6C:5B:A7",
      "channel": 52,
      "frequency": "5 GHz",
      "signal": 100,
      "rssi": -30,
      "security": "WPA2",
      "radioType": "802.11ac",
      "congestion": "Baja",
      "fspl": 45.2,
      "estimatedDistance": 15.5,
      "securityRisk": {
        "level": "low",
        "label": "Segura",
        "description": "WPA2 con cifrado CCMP"
      }
    }
  ],
  "alerts": [
    {
      "id": "alert_001",
      "type": "device_offline",
      "message": "192.168.1.50 se desconectó",
      "severity": "error",
      "timestamp": "2024-06-09T10:35:00.000Z"
    }
  ],
  "lastScan": "2024-06-09T10:35:00.000Z",
  "scanning": false,
  "channelRecommendation": {
    "recommended24": {
      "channel": 1,
      "interference": 0
    },
    "recommended5": {
      "channel": 36,
      "interference": 0
    }
  }
}
```

**Códigos de Error**:
- `500` - Error interno del servidor

---

### 2. GET /api/topology

**Descripción**: Obtiene la topología de red (nodos y enlaces)

**Parámetros**: Ninguno

**Respuesta (200 OK)**:
```json
{
  "nodes": [
    {
      "id": "192.168.1.1",
      "label": "gateway",
      "type": "gateway",
      "status": "online",
      "vendor": "TP-Link"
    },
    {
      "id": "192.168.1.100",
      "label": "Mi-Laptop",
      "type": "local",
      "status": "online",
      "vendor": "Intel"
    },
    {
      "id": "192.168.1.50",
      "label": "iPhone-Juan",
      "type": "wireless",
      "status": "online",
      "vendor": "Apple"
    }
  ],
  "links": [
    {
      "source": "192.168.1.1",
      "target": "192.168.1.100",
      "latency": 2.5,
      "quality": "good",
      "packetLoss": 0
    },
    {
      "source": "192.168.1.1",
      "target": "192.168.1.50",
      "latency": 15.3,
      "quality": "good",
      "packetLoss": 0
    }
  ],
  "gateway": "192.168.1.1",
  "localIP": "192.168.1.100"
}
```

---

### 3. GET /api/arp/analysis

**Descripción**: Análisis de tabla ARP y detección de anomalías (ARP spoofing)

**Parámetros**: Ninguno

**Respuesta (200 OK)**:
```json
{
  "devices": [
    {
      "ip": "192.168.1.1",
      "mac": "AA:BB:CC:DD:EE:FF",
      "hostname": "gateway",
      "vendor": "TP-Link"
    },
    {
      "ip": "192.168.1.50",
      "mac": "11:22:33:44:55:66",
      "hostname": "iPhone-Juan",
      "vendor": "Apple"
    }
  ],
  "anomalies": [
    {
      "ip": "192.168.1.100",
      "macs": [
        "AA:BB:CC:DD:EE:FF",
        "11:22:33:44:55:66"
      ],
      "severity": "critical",
      "description": "Una IP con múltiples MACs (posible ARP spoofing)"
    }
  ],
  "scannedAt": "2024-06-09T10:35:00.000Z"
}
```

**Códigos de Error**:
- `500` - Error en análisis ARP

---

### 4. GET /api/traceroute/:target

**Descripción**: Ejecuta traceroute hacia un destino específico

**Parámetros**:
- `target` (string, requerido) - IP o dominio destino
  - Ejemplos: `8.8.8.8`, `google.com`, `1.1.1.1`

**Validación**:
- IP válida: `^(\d{1,3}\.){3}\d{1,3}$`
- Dominio válido: `^[\w.-]+$` (máximo 255 caracteres)

**Respuesta (200 OK)**:
```json
{
  "target": "8.8.8.8",
  "hops": [
    {
      "hop": 1,
      "ip": "192.168.1.1",
      "hostname": "gateway",
      "latency": 2.5,
      "ttl": 64
    },
    {
      "hop": 2,
      "ip": "10.0.0.1",
      "hostname": "isp-router",
      "latency": 15.3,
      "ttl": 63
    },
    {
      "hop": 3,
      "ip": "8.8.8.8",
      "hostname": "dns.google",
      "latency": 25.1,
      "ttl": 62
    }
  ],
  "timestamp": "2024-06-09T10:35:00.000Z",
  "success": true
}
```

**Códigos de Error**:
- `400` - Destino no válido
  ```json
  {
    "error": "Destino no válido. Use una IP o dominio válido."
  }
  ```
- `500` - Error ejecutando traceroute
  ```json
  {
    "error": "Error ejecutando traceroute"
  }
  ```

---

### 5. GET /api/throughput

**Descripción**: Mide el throughput (ancho de banda) real hacia el gateway

**Parámetros**: Ninguno

**Respuesta (200 OK)**:
```json
{
  "download": 45.2,
  "upload": 12.5,
  "latency": 15,
  "target": "192.168.1.1",
  "timestamp": "2024-06-09T10:35:00.000Z"
}
```

**Notas**:
- `download` y `upload` en Mbps
- `latency` en milisegundos
- Medición basada en ICMP burst

---

## Socket.IO Events

### Cliente → Servidor

#### `request_scan`
Solicita un escaneo manual de red

```javascript
socket.emit('request_scan');
```

#### `request_wifi_scan`
Solicita un escaneo manual de WiFi

```javascript
socket.emit('request_wifi_scan');
```

---

### Servidor → Cliente

#### `devices_update`
Actualización de dispositivos detectados

```javascript
socket.on('devices_update', (data) => {
  console.log(data.devices);      // Array de dispositivos
  console.log(data.networkInfo);  // Info de red
  console.log(data.alerts);       // Alertas
});
```

#### `wifi_update`
Actualización de redes WiFi detectadas

```javascript
socket.on('wifi_update', (data) => {
  console.log(data.networks);              // Array de redes WiFi
  console.log(data.channelRecommendation); // Recomendación de canal
  console.log(data.lastScan);              // Timestamp del último escaneo
});
```

#### `scan_progress`
Progreso del escaneo en curso

```javascript
socket.on('scan_progress', (data) => {
  console.log(data.found);   // Dispositivos encontrados
  console.log(data.total);   // Total a escanear
  console.log(data.status);  // Mensaje de estado
});
```

#### `traffic_rate_update`
Actualización de tráfico en tiempo real

```javascript
socket.on('traffic_rate_update', (data) => {
  console.log(data.download); // Mbps descargados
  console.log(data.upload);   // Mbps subidos
});
```

#### `throughput_update`
Actualización de medición de throughput

```javascript
socket.on('throughput_update', (data) => {
  console.log(data.download); // Mbps
  console.log(data.upload);   // Mbps
  console.log(data.latency);  // ms
});
```

---

## Códigos de Estado HTTP

| Código | Significado |
|--------|-------------|
| 200 | OK - Solicitud exitosa |
| 400 | Bad Request - Parámetros inválidos |
| 404 | Not Found - Endpoint no existe |
| 500 | Internal Server Error - Error del servidor |

---

## Límites y Timeouts

| Operación | Timeout |
|-----------|---------|
| Resolución de hostname | 500ms |
| API externa (macvendors) | 1000ms |
| Comando netsh/iwlist | 8000ms |
| Traceroute | 30000ms |

---

## Ejemplos de Uso

### JavaScript (Fetch API)

```javascript
// Obtener estado del sistema
fetch('http://localhost:3000/api/status')
  .then(res => res.json())
  .then(data => console.log(data));

// Ejecutar traceroute
fetch('http://localhost:3000/api/traceroute/8.8.8.8')
  .then(res => res.json())
  .then(data => console.log(data.hops));
```

### cURL

```bash
# Obtener estado
curl http://localhost:3000/api/status

# Obtener topología
curl http://localhost:3000/api/topology

# Traceroute
curl http://localhost:3000/api/traceroute/8.8.8.8
```

### JavaScript (Socket.IO)

```javascript
const socket = io('http://localhost:3000');

// Escuchar actualizaciones de dispositivos
socket.on('devices_update', (data) => {
  console.log('Dispositivos:', data.devices);
});

// Solicitar escaneo manual
socket.emit('request_scan');

// Escuchar progreso
socket.on('scan_progress', (data) => {
  console.log(`Encontrados: ${data.found}/${data.total}`);
});
```

---

## Notas de Seguridad

- ✅ Todos los inputs se validan estrictamente
- ✅ No se permiten comandos shell en parámetros
- ✅ Timeouts configurados en todas las operaciones
- ✅ Manejo de errores consistente
- ✅ Logging de intentos inválidos

---

**Última actualización**: Junio 2024
**Versión API**: 1.0.0
