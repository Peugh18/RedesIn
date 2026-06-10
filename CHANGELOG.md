# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

## [1.0.0] - 2024-06-09

### Agregado
- ✅ Sistema de logging estructurado con niveles (INFO, WARN, ERROR, DEBUG)
- ✅ Caché limitado para MAC vendors y hostnames (prevención de memory leaks)
- ✅ Validación estricta de inputs en todos los endpoints
- ✅ Graceful shutdown con manejo de señales SIGTERM/SIGINT
- ✅ Métricas de rendimiento (uptime, scans, dispositivos, alertas)
- ✅ Manejo de excepciones no capturadas
- ✅ Timeout optimizado para resolución de hostname (500ms)
- ✅ Escaneo WiFi automático cada 15 segundos
- ✅ Botón "Escanear Ahora" para escaneo manual
- ✅ Clasificación inteligente de dispositivos (Celular, Laptop, TV, IoT)
- ✅ Detección de ARP spoofing
- ✅ Alertas proactivas (latencia, dispositivo caído, spoofing)
- ✅ Medición de throughput real
- ✅ Dashboard en tiempo real con Socket.IO
- ✅ Branding Universidad Privada del Norte

### Mejorado
- 🔧 Refactorización de getMacVendor con caché mejorado
- 🔧 Optimización de resolveHostname con caché
- 🔧 Validación de traceroute para prevenir inyección de comandos
- 🔧 Configuración centralizada en objeto CONFIG
- 🔧 Logs con timestamp ISO y contexto
- 🔧 Manejo de errores consistente en todas las funciones

### Corregido
- 🐛 Memory leak en caché de MAC vendors (ahora limitado a 1000 entradas)
- 🐛 Require() dentro de función getMacVendor (movido al inicio)
- 🐛 Race condition en escaneo de red (sincronización mejorada)
- 🐛 Timeout agresivo en HTTPS (reducido a 1000ms)
- 🐛 Falta de validación en endpoint traceroute

### Documentación
- 📚 README.md completo con arquitectura, instalación, uso
- 📚 API.md con documentación de endpoints
- 📚 Comentarios JSDoc en funciones clave
- 📚 .gitignore para proyecto profesional
- 📚 .env.example para configuración
- 📚 LICENSE (MIT)
- 📚 CHANGELOG.md (este archivo)

## [0.9.0] - 2024-06-08

### Inicial
- Versión beta del sistema
- Funcionalidades básicas de escaneo WiFi
- Dashboard inicial
- Socket.IO en tiempo real

---

## Formato de Versiones

Este proyecto sigue [Semantic Versioning](https://semver.org/):
- **MAJOR** (1.0.0): Cambios incompatibles
- **MINOR** (1.1.0): Nuevas funcionalidades compatibles
- **PATCH** (1.0.1): Correcciones de bugs

## Próximas Mejoras Planeadas

- [ ] Persistencia de datos en base de datos
- [ ] Exportación de reportes (PDF/Excel)
- [ ] Autenticación de usuarios
- [ ] Historial de cambios de canales
- [ ] Predicción de congestión con ML
- [ ] Integración con sistemas de TI (Nagios, Zabbix)
