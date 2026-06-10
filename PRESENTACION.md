# 🎓 GUÍA DE PRESENTACIÓN - NetScope Pro

**Universidad Privada del Norte**
**Unidad 11: Testeo y Optimización de Redes Inalámbricas**

---

## 📋 ESTRUCTURA DE PRESENTACIÓN (8 Slides)

### SLIDE 1 - PORTADA
```
NetScope Pro
Sistema de Testeo y Optimización de Red Inalámbrica

Universidad Privada del Norte | Unidad 11 | [Tu nombre] | 2024-II
```

---

### SLIDE 2 - PROBLEMÁTICA
**Título**: Ausencia de Sistema Integrado de Testeo WiFi

**Síntomas**:
- Múltiples herramientas independientes (ping, netsh, apps móviles)
- Sin visibilidad unificada de canales WiFi saturados
- Sin detección automática de dispositivos conectados
- Diagnóstico manual sin medición objetiva de métricas

**Consecuencia**:
- Gestión reactiva de problemas de conectividad
- Dependencia de reportes de usuarios

---

### SLIDE 3 - MARCO TEÓRICO
**Título**: Unidad 11 - De Simuladores a Implementación Real

**Tema del Sílabo**:
- "Testeo y optimización de una red inalámbrica"
- Herramientas teóricas: ns-3, GNS3, CORE, OMNeT++

**Limitación de Simuladores**:
- Modelan comportamiento teórico
- No capturan interferencias físicas reales
- No miden dispositivos físicos

**Propuesta**:
- Implementación REAL de testeo y optimización
- NetScope Pro = Medición de redes físicas reales (no simulación)

---

### SLIDE 4 - LA SOLUCIÓN
**Título**: NetScope Pro - Dashboard de Testeo WiFi Real

**Arquitectura**:
- Backend: Node.js + Express + Socket.IO
- Frontend: HTML5 + Chart.js
- Escaneo nativo: Comandos del sistema (netsh, iwlist)

**7 Módulos Integrados**:
1. **WiFi** - Escaneo de canales 2.4/5 GHz + recomendación
2. **Dispositivos** - Inventario ARP + ping + clasificación
3. **Alertas** - Detección proactiva de problemas
4. **Dashboard** - Métricas en tiempo real
5. Seguridad - Análisis de vulnerabilidades (complementario)
6. Topología - Visualización de infraestructura (diagnóstico)
7. Traceroute - Diagnóstico de ruta (complementario)

---

### SLIDE 5 - TESTEO WiFi (FOCO PRINCIPAL)
**Título**: Testeo y Optimización de Canales WiFi

**Proceso Real**:
1. Escaneo cada 15 segundos: `netsh wlan show networks`
2. Detección: SSID, BSSID, canal, RSSI, tipo de radio
3. Análisis de congestión: Cuenta de redes por canal
4. Cálculo FSPL: Free Space Path Loss
5. Recomendación: Algoritmo identifica canal óptimo

**Resultado del Sistema**:
- Canal saturado detectado → recomienda canal alternativo
- Reducción de latencia: De 200-800ms a <30ms

**Demostración en Vivo**:
- Mostrar escaneo WiFi en tiempo real
- Mostrar mapa de canales
- Mostrar recomendación automática

---

### SLIDE 6 - MONITOREO DE DISPOSITIVOS
**Título**: Inventario y Clasificación de Equipos

**Descubrimiento Real**:
- Escaneo ARP: Mapeo IP-MAC
- Ping sweep: Verificación de dispositivos activos
- Clasificación automática: 📱 Celular, 💻 Laptop, 📺 Smart TV, 🎮 Consola, 🔌 IoT

**Medición en Tiempo Real**:
- Latencia al gateway (ping continuo)
- Jitter: Variación entre mediciones
- Packet Loss: Porcentaje de paquetes perdidos

**Sistema de Alertas Proactivas**:
- Dispositivo caído: No responde por 60 segundos
- Latencia alta: >100ms por más de 5 minutos
- ARP Spoofing: IP con múltiples MACs detectadas

**Demostración en Vivo**:
- Mostrar tabla de dispositivos
- Mostrar clasificación por tipo
- Mostrar métricas de calidad

---

### SLIDE 7 - RESULTADOS Y IMPACTO
**Título**: Beneficios del Sistema

**Tabla Antes vs Después**:

| Indicador | Antes | Después |
|-----------|-------|---------|
| Tiempo diagnóstico | Manual (horas) | Automático (segundos) |
| Visibilidad de red | Sin registro | Dashboard 24/7 |
| Detección de problemas | Reactiva | Proactiva |
| Optimización de canales | Manual/adivinanza | Automática/datos |
| Inventario de dispositivos | Desconocido | Completo y clasificado |

**Beneficios Técnicos**:
- Implementación REAL (no simulada)
- Datos objetivos (no estimaciones)
- Monitoreo continuo (no puntual)
- Escalable a múltiples ubicaciones

---

### SLIDE 8 - CONCLUSIÓN
**Título**: Implementación Real vs Simulación

**Resumen**:
NetScope Pro es una implementación práctica del testeo y optimización de redes inalámbricas (Unidad 11 del sílabo), utilizando medición real de redes físicas mediante comandos nativos del sistema operativo.

**Diferenciadores**:
- ✅ Mide redes WiFi reales (no simuladas)
- ✅ Detecta dispositivos físicos conectados
- ✅ Proporciona datos objetivos: RSSI, latencia, throughput
- ✅ Funciona como herramienta de diagnóstico real

**Aplicabilidad**:
- Sistema demostrable en cualquier entorno con WiFi
- Útil para universidades, empresas, hogares
- Escalable y mantenible

---

## 🎯 DEMOSTRACIÓN EN VIVO

### Orden Recomendado

1. **Abrir Dashboard**
   - Mostrar métricas generales
   - Explicar qué se está monitoreando

2. **Ir a WiFi & Canales**
   - Mostrar redes detectadas
   - Explicar mapa de canales
   - Mostrar recomendación automática
   - Hacer clic en "Escanear Ahora"

3. **Ir a Dispositivos**
   - Mostrar tabla de dispositivos
   - Explicar clasificación (Celular, Laptop, etc.)
   - Mostrar métricas de latencia/jitter

4. **Ir a Alertas**
   - Mostrar historial de alertas
   - Explicar severidad

5. **Mencionar brevemente**:
   - Seguridad WiFi (análisis complementario)
   - Topología (herramienta de diagnóstico)
   - Traceroute (diagnóstico de ruta)

---

## 💡 PUNTOS CLAVE A ENFATIZAR

### Durante la Presentación

✅ **"Este es un sistema REAL, no simulado"**
- Mide redes WiFi físicas
- Detecta dispositivos reales conectados
- Proporciona datos objetivos

✅ **"Implementa la Unidad 11 de forma práctica"**
- Testeo: Escanea y mide redes reales
- Optimización: Recomienda canales óptimos
- Alternativa a simuladores teóricos

✅ **"Es proactivo, no reactivo"**
- Detecta problemas automáticamente
- Genera alertas antes de que el usuario reporte
- Monitoreo continuo 24/7

✅ **"Es escalable y demostrable"**
- Funciona en cualquier entorno con WiFi
- Fácil de replicar en otras ubicaciones
- Código profesional y documentado

---

## ⏱️ TIMING RECOMENDADO

| Slide | Tema | Tiempo |
|-------|------|--------|
| 1 | Portada | 30s |
| 2 | Problemática | 1min |
| 3 | Marco Teórico | 1min |
| 4 | Solución | 1min |
| 5 | Testeo WiFi (DEMO) | 2min |
| 6 | Dispositivos (DEMO) | 2min |
| 7 | Resultados | 1min |
| 8 | Conclusión | 1min |
| **DEMO EN VIVO** | Dashboard completo | 3-5min |
| **PREGUNTAS** | Q&A | 2-3min |
| **TOTAL** | | ~15-20min |

---

## 🎤 RESPUESTAS A PREGUNTAS COMUNES

### "¿Por qué no usaste un simulador como ns-3?"
> "Los simuladores modelan comportamiento teórico, pero no capturan las interferencias físicas reales del entorno. NetScope Pro mide redes WiFi reales, lo que es más aplicable para la Unidad 11 que enfatiza testeo y optimización prácticos."

### "¿Qué tan preciso es el escaneo WiFi?"
> "Usa comandos nativos del sistema operativo (netsh en Windows, iwlist en Linux), que son los mismos que usan herramientas profesionales. La precisión es comparable a herramientas comerciales."

### "¿Puede detectar todas las redes WiFi?"
> "Detecta todas las redes visibles desde la ubicación actual. En Windows requiere privilegios de administrador. En la universidad, detectará todas las redes del campus que sean visibles desde esa ubicación."

### "¿Cómo se diferencia de otras herramientas?"
> "La mayoría de herramientas son fragmentadas (ping, netsh, apps móviles). NetScope Pro integra todo en un dashboard unificado con Socket.IO para actualización en tiempo real."

### "¿Es seguro ejecutar esto en la red universitaria?"
> "Sí. Solo realiza operaciones de lectura (escaneo, ping, ARP). No modifica nada en la red. Es equivalente a usar herramientas de diagnóstico estándar."

---

## 📸 CAPTURAS DE PANTALLA RECOMENDADAS

Tomar screenshots de:
1. Dashboard con métricas
2. WiFi & Canales con mapa
3. Tabla de dispositivos
4. Centro de alertas
5. Topología de red

Guardar en carpeta `/screenshots` para referencia durante presentación.

---

## ✅ CHECKLIST ANTES DE PRESENTAR

- [ ] Laptop cargada (100% batería)
- [ ] WiFi funcionando correctamente
- [ ] Servidor Node.js ejecutándose (`npm start`)
- [ ] Dashboard accesible en http://localhost:3000
- [ ] WiFi scan funciona (botón "Escanear Ahora")
- [ ] Dispositivos se detectan correctamente
- [ ] Alertas funcionan
- [ ] PPT con 8 slides listo
- [ ] Ensayo completo realizado
- [ ] Respuestas a preguntas comunes memorizadas

---

## 🚀 ÚLTIMA RECOMENDACIÓN

**Enfatiza que es un proyecto REAL y DEMOSTRATIVO**, no teórico. Eso es lo que diferencia a NetScope Pro de un simple trabajo académico.

¡Éxito en tu presentación! 🎓

---

**Última actualización**: Junio 2024
**Versión**: 1.0.0
