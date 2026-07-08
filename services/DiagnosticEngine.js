/**
 * Motor de Diagnóstico Basado en Reglas (Rule-Based Diagnostic Engine)
 * Analiza métricas en bruto y devuelve un Informe Técnico de Diagnóstico
 */

class DiagnosticEngine {
  
  static runDiagnostics(deviceIp, globalState) {
    try {
      const devicesArray = Array.isArray(globalState.devices) ? globalState.devices : Object.values(globalState.devices || {});
      const device = devicesArray.find(d => d.ip === deviceIp);
      if (!device) {
        return this.generateErrorReport("Dispositivo no encontrado en el estado actual.");
      }

      const wifiNetworks = globalState.wifiNetworks || [];
      const alerts = globalState.alerts || [];
      const networkInfo = globalState.networkInfo || {};

    // Métricas del dispositivo
    const latency = device.latency || 0;
    const packetLoss = device.packetLoss || 0;
    const jitter = device.jitter || 0;
    const isWiFi = device.connectionType === 'wireless';
    const isWired = device.connectionType === 'wired';
    
    // Generar un ID único de reporte
    const reportId = `DIAG-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 10000)}`;

    let ruleMatched = null;

    // --- REGLA 2: Alteración de Capa 2 (Riesgo ARP Spoofing / Conflicto IP) ---
    const arpAlerts = alerts.filter(a => a.type === 'ARP_SPOOF' || a.type === 'ARP_NEW_MAC');
    if (arpAlerts.length > 0) {
      ruleMatched = {
        ruleName: "Regla 2: Alteración de Capa 2 (Riesgo ARP / Conflicto IP)",
        probableCause: "Ataque de intermediario (Man-in-the-Middle) o error de asignación de IP estática duplicada.",
        confidence: "Alto",
        severity: "Crítica",
        evidence: [
          "Se detectó un cambio abrupto o multiplicidad en la tabla ARP.",
          `Detalle de alerta: ${arpAlerts[0].message}`
        ],
        action: "Desconectar inmediatamente el equipo sospechoso.",
        level: "Escalar a Seguridad / Administrador de Red (L2) para revisar tabla MAC o configurar DAI."
      };
    }

    // --- REGLA 3: Falla de Enrutamiento o Enlace Externo (Isla Local) ---
    else if (packetLoss >= 100 && networkInfo && networkInfo.gatewayPing) {
       if (networkInfo.gatewayPing.packetLoss >= 100) {
          ruleMatched = {
            ruleName: "Regla 3: Falla de Enlace Externo (ISP / Gateway Down)",
            probableCause: "Caída del enlace del ISP o fallo en el enrutador principal/firewall.",
            confidence: "Muy Alto",
            severity: "Alta",
            evidence: [
              `El dispositivo local presenta ${packetLoss}% de Packet Loss.`,
              `El Ping automático al Gateway (${networkInfo.gateway}) también presenta 100% de Packet Loss.`
            ],
            action: "NO realizar acciones en el equipo del usuario final.",
            level: "Escalar al Administrador WAN / Proveedor de Internet."
          };
       }
    }

    // --- REGLA 1: Saturación o Degradación General (Aplica a WiFi o Desconocido) ---
    else if ((isWiFi || !isWired) && (packetLoss > 2 || latency > 80)) {
      let congestedChannel = null;
      let networksOnChannel = 0;
      
      if (wifiNetworks && wifiNetworks.length > 0) {
        const channelCounts = {};
        wifiNetworks.forEach(net => {
          channelCounts[net.channel] = (channelCounts[net.channel] || 0) + 1;
        });
        
        const maxNetworks = Math.max(...Object.values(channelCounts));
        const worstChannel = Object.keys(channelCounts).find(key => channelCounts[key] === maxNetworks);
        
        if (maxNetworks >= 4) {
          congestedChannel = worstChannel;
          networksOnChannel = maxNetworks;
        }
      }

      if (congestedChannel) {
        ruleMatched = {
          ruleName: "Regla 1: Interferencia Co-Canal Inalámbrica",
          probableCause: "Congestión severa del espectro de radiofrecuencia (CSMA/CA Collision).",
          confidence: "Alto",
          severity: "Media",
          evidence: [
            `Packet Loss sostenido en ${packetLoss}% y Latencia promedio de ${latency}ms.`,
            `Entorno aéreo saturado: se detectaron ${networksOnChannel} redes adicionales en el Canal ${congestedChannel}.`
          ],
          action: `Cambiar el Access Point local a un canal menos congestionado.`,
          level: "Nivel 1 (Si es AP local) o Nivel 2 (Si requiere controlador WLC)."
        };
      } else {
         ruleMatched = {
          ruleName: "Regla 1B: Degradación Inalámbrica",
          probableCause: "Distancia excesiva al AP o atenuación física (muros).",
          confidence: "Medio",
          severity: "Baja",
          evidence: [
            `Packet Loss: ${packetLoss}%, Latencia: ${latency}ms.`,
            `No se detectó saturación co-canal severa en el entorno.`
          ],
          action: `Reubicar el dispositivo o verificar la antena del cliente.`,
          level: "Nivel 1"
        };
      }
    }

    // --- REGLA 4: Degradación de Capa Física LAN (Duplex Mismatch / Falla de Cable) ---
    else if ((isWired || !isWiFi) && (jitter > 30 || packetLoss > 2) && latency <= 80) {
      ruleMatched = {
        ruleName: "Regla 4: Degradación de Capa Física LAN",
        probableCause: "Deficiencia en el cableado estructurado o desajuste de velocidad/dúplex en el Switch.",
        confidence: "Medio",
        severity: "Baja",
        evidence: [
          `Tipo de Medio: Ethernet LAN.`,
          `Packet Loss: ${packetLoss}%.`,
          `Jitter (Fluctuación): ${jitter}ms.`
        ],
        action: "Reemplazar el cable UTP del dispositivo (Patch Cord) o probar otra roseta.",
        level: "Nivel 1. Escalar a L2 si persiste para revisar FCS/CRC errors en switch."
      };
    }

    // --- REGLA 5: Rogue AP (Implementado pasivamente aquí como advertencia general si aplica) ---
    else if (wifiNetworks && wifiNetworks.some(n => (n.ssid || '').toLowerCase().includes('corp') && n.security === 'None')) {
      ruleMatched = {
        ruleName: "Regla 5: Access Point No Autorizado (Posible Rogue AP)",
        probableCause: "Dispositivo de grado consumidor transmitiendo un SSID corporativo sin seguridad.",
        confidence: "Medio-Alto",
        severity: "Crítica",
        evidence: [
          "Se detectó una red inalámbrica abierta suplantando nombres corporativos."
        ],
        action: "Rastrear físicamente utilizando indicador RSSI y desconectar roseta.",
        level: "Escalar a Seguridad de la Información (SecOps) de inmediato."
      };
    }

    // --- RED SANA ---
    if (!ruleMatched) {
      ruleMatched = {
        ruleName: "N/A",
        probableCause: "El dispositivo no presenta anomalías de red en Capa 1 a 3.",
        confidence: "Alto",
        severity: "Informativa",
        evidence: [
          `Latencia estable: ${latency}ms, Jitter: ${jitter}ms, Loss: ${packetLoss}%`,
          `Sin colisiones ARP detectadas.`
        ],
        action: "Verificar rendimiento de Capa de Aplicación (DNS, HTTP) o recursos del equipo local (CPU/RAM).",
        level: "Nivel 1"
      };
    }

    return {
      id_diagnostico: reportId,
      fecha_hora_analisis: new Date().toISOString(),
      estado_incidente: "Pendiente",
      dispositivo_evaluado: {
        ip: device.ip,
        mac: device.mac || 'Desconocida',
        fabricante: device.vendor || 'Desconocido',
        hostname: device.hostname || 'Desconocido'
      },
      diagnostico_tecnico: {
        sintoma_principal: packetLoss > 0 ? "Pérdida de conectividad / Intermitencia" : (latency > 50 ? "Lentitud de red" : "Funcionamiento aparente normal"),
        causa_probable: ruleMatched.probableCause,
        nivel_confianza: ruleMatched.confidence,
        severidad: ruleMatched.severity,
        regla_aplicada: ruleMatched.ruleName
      },
      evidencias_tecnicas: ruleMatched.evidence,
      asistencia_operativa: {
        accion_sugerida: ruleMatched.action,
        nivel_escalamiento_sugerido: ruleMatched.level
      }
    };
    } catch (e) {
      console.error("Error en DiagnosticEngine:", e);
      return this.generateErrorReport("Error interno del motor de diagnóstico: " + e.message);
    }
  }

  static generateErrorReport(msg) {
    return { error: true, message: msg };
  }
}

module.exports = DiagnosticEngine;
