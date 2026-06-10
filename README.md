# NetScope Pro

**Sistema de Testeo y Optimización de Red Inalámbrica**

Universidad Privada del Norte | Unidad 11: Testeo y Optimización de Redes Inalámbricas

---

## 📋 Descripción

NetScope Pro es una **implementación real** (no simulada) de un sistema de testeo y optimización de redes inalámbricas. Proporciona un dashboard integrado para monitoreo proactivo de infraestructura WiFi, dispositivos conectados, y diagnóstico de problemas de conectividad.

### Características Principales

- ✅ **Escaneo WiFi Real**: Detección de redes 2.4 GHz y 5 GHz con análisis de congestión
- ✅ **Recomendación de Canales**: Algoritmo automático para identificar canales óptimos
- ✅ **Inventario de Dispositivos**: Descubrimiento automático vía ARP + ping sweep
- ✅ **Clasificación Inteligente**: Identifica tipo de dispositivo (Celular, Laptop, TV, IoT)
- ✅ **Monitoreo en Tiempo Real**: Socket.IO para actualización automática cada 15 segundos
- ✅ **Alertas Proactivas**: Detección de latencia alta, dispositivos caídos, ARP spoofing
- ✅ **Medición de Throughput**: Ancho de banda real hacia gateway
- ✅ **Análisis de Seguridad**: Evaluación de vulnerabilidades WiFi (WEP, abierta, etc.)

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (HTML5/JS)                  │
│  Dashboard | WiFi | Dispositivos | Alertas | Seguridad │
└────────────────────────┬────────────────────────────────┘
                         │
                    Socket.IO (WebSocket)
                         │
┌────────────────────────▼────────────────────────────────┐
│              BACKEND (Node.js + Express)                │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Escaneo WiFi (netsh/iwlist)                      │   │
│  │ Detección de Dispositivos (ARP + Ping)           │   │
│  │ Medición de Latencia/Throughput                  │   │
│  │ Análisis de Seguridad (WPA2/WPA3)                │   │
│  │ Detección de Anomalías (ARP Spoofing)            │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
    Windows          Linux            macOS
   (netsh)         (iwlist/nmcli)    (airport)
```

### Stack Tecnológico

**Backend:**
- Node.js 16+
- Express 5.x
- Socket.IO 4.x

**Librerías de Red:**
- `ping` - Medición de latencia
- `node-arp` - Lectura de tabla ARP
- `oui` - Identificación de fabricante por MAC
- `node-wifi` - Escaneo WiFi (opcional)

**Frontend:**
- HTML5 + CSS3
- JavaScript Vanilla
- Chart.js - Gráficas de tráfico
- Socket.IO Client

---

## 🚀 Instalación

### Requisitos Previos

- **Node.js** 16.0.0 o superior
- **npm** 7.0.0 o superior
- **Privilegios de Administrador** (requerido para escaneo WiFi en Windows)

### Pasos de Instalación

1. **Clonar o descargar el proyecto**
```bash
cd NetScope-Pro
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Ejecutar el servidor**
```bash
npm start
```

4. **Acceder al dashboard**
Abre tu navegador en: `http://localhost:3000`

---

## 📖 Uso

### Dashboard Principal

El dashboard muestra:
- **Métricas en Tiempo Real**: Dispositivos online, redes WiFi, alertas
- **Gráfica de Tráfico**: Download/Upload en Mbps
- **Estado de Red**: IP local, gateway, interfaz activa

### Módulos Funcionales

#### 1. **WiFi & Canales**
- Escaneo automático cada 15 segundos
- Mapa de canales con saturación (Libre/Medio/Saturado)
- Recomendación automática de canal óptimo
- Botón "Escanear Ahora" para forzar escaneo manual

#### 2. **Dispositivos en Red**
- Inventario de dispositivos conectados
- Clasificación por tipo (📱 Celular, 💻 Laptop, 📺 Smart TV, etc.)
- Medición de latencia, jitter, packet loss
- Historial de latencia (sparklines)
- Filtros por estado (En línea / Desconectados)

#### 3. **Centro de Alertas**
- Alertas proactivas de problemas
- Historial de eventos
- Severidad: Info / Warning / Error

#### 4. **Seguridad WiFi**
- Detección de redes abiertas
- Identificación de protocolos débiles (WEP)
- Evaluación de riesgo de seguridad

#### 5. **Topología de Red**
- Mapa visual de dispositivos
- Detección de anomalías ARP
- Análisis de spoofing

#### 6. **Traceroute**
- Diagnóstico de ruta hacia destino
- Latencia por salto
- Medición de throughput

---

## 🔧 Configuración

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
PORT=3000
NODE_ENV=development
DEBUG=false
```

### Constantes de Configuración

En `server.js`, sección `CONFIG`:

```javascript
const CONFIG = {
  SCAN_INTERVAL: 15000,        // Escaneo WiFi cada 15s
  PING_INTERVAL: 5000,         // Ping continuo cada 5s
  FULL_SCAN_INTERVAL: 60000,   // Escaneo completo cada 60s
  HOSTNAME_CACHE_TTL: 3600000, // Caché de hostname 1 hora
  MAC_VENDOR_CACHE_MAX: 1000,  // Máximo de MACs en caché
  API_TIMEOUT: 1000,           // Timeout para APIs externas
  HOSTNAME_TIMEOUT: 500,       // Timeout para resolución DNS
  MAX_ALERTS: 50,              // Máximo de alertas guardadas
  BATCH_SIZE: 30               // Tamaño de batch para ping sweep
};
```

---

## 📊 API REST

### Endpoints Disponibles

#### `GET /api/status`
Obtiene estado actual del sistema
```json
{
  "networkInfo": { "localIP": "192.168.1.100", ... },
  "devices": [ { "ip": "192.168.1.1", ... } ],
  "wifiNetworks": [ { "ssid": "ALEXANDER 5G", ... } ],
  "alerts": [ { "type": "device_offline", ... } ],
  "scanning": false
}
```

#### `GET /api/topology`
Obtiene topología de red
```json
{
  "nodes": [ { "id": "192.168.1.1", "label": "gateway", ... } ],
  "links": [ { "source": "gateway", "target": "192.168.1.100", ... } ]
}
```

#### `GET /api/arp/analysis`
Análisis de tabla ARP y detección de spoofing
```json
{
  "devices": [ { "ip": "192.168.1.1", "mac": "AA:BB:CC:DD:EE:FF", ... } ],
  "anomalies": [ { "ip": "192.168.1.50", "macs": [...], "severity": "critical" } ]
}
```

#### `GET /api/traceroute/:target`
Ejecuta traceroute a un destino
```json
{
  "target": "8.8.8.8",
  "hops": [ { "hop": 1, "ip": "192.168.1.1", "latency": 2.5 } ],
  "success": true
}
```

#### `GET /api/throughput`
Medición de throughput real
```json
{
  "download": 45.2,
  "upload": 12.5,
  "latency": 15,
  "target": "192.168.1.1"
}
```

---

## 🔒 Seguridad

### Validación de Inputs

- ✅ Validación estricta de IPs en traceroute
- ✅ Sanitización de hostnames
- ✅ Prevención de inyección de comandos
- ✅ Timeout en todas las operaciones de red

### Caché Limitado

- ✅ Caché de MAC vendors con límite de 1000 entradas
- ✅ Caché de hostnames con límite de 1000 entradas
- ✅ Política FIFO para evitar memory leaks

---

## 📈 Rendimiento

### Optimizaciones Implementadas

- **Batch Processing**: Ping sweep en lotes de 30 dispositivos
- **Caché Multinivel**: OUI local + API + caché en memoria
- **Timeout Agresivo**: 500ms para hostname, 1s para APIs
- **Sincronización**: Prevención de race conditions en escaneos
- **Logging Estructurado**: Logs con timestamp y nivel de severidad

### Métricas Disponibles

```javascript
// Acceso a métricas
metrics.getStats()
// Retorna:
{
  "uptime": 3600,           // segundos
  "scansCompleted": 120,
  "devicesDiscovered": 45,
  "alertsGenerated": 8,
  "memoryUsage": { ... }
}
```

---

## 🐛 Troubleshooting

### "WiFi scan requiere privilegios de administrador"

**Solución**: Ejecuta Node.js como Administrador
```bash
# Windows (PowerShell como Admin)
npm start
```

### "No se detectan redes WiFi"

**Verificación**:
```bash
# Windows
netsh wlan show networks mode=bssid

# Linux
nmcli dev wifi list
```

Si ves redes en el comando pero no en NetScope:
- Verifica que el driver de WiFi esté actualizado
- Intenta desactivar/activar WiFi
- Reinicia el servidor

### "Latencia muy alta en resolución de hostname"

**Solución**: El caché de hostname se llena después del primer escaneo. Espera 30 segundos para que se estabilice.

---

## 📝 Logs

Los logs se imprimen en consola con formato:
```
[INFO] 2024-01-15T10:30:45.123Z - Mensaje
[WARN] 2024-01-15T10:30:46.456Z - Advertencia
[ERROR] 2024-01-15T10:30:47.789Z - Error
[DEBUG] 2024-01-15T10:30:48.012Z - Información de debug (solo si DEBUG=true)
```

---

## 🤝 Contribuciones

Este es un proyecto académico para la Universidad Privada del Norte.

---

## 📄 Licencia

MIT License - Ver archivo LICENSE

---

## 👨‍💼 Autor

[Tu Nombre]
Universidad Privada del Norte
Ciclo 2024-II

---

## 📞 Soporte

Para reportar bugs o sugerencias, contacta al autor o crea un issue en el repositorio.

---

**Última actualización**: Junio 2024
**Versión**: 1.0.0
