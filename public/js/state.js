/**
 * NetScope Pro — Estado Global
 * Estado compartido en todos los módulos
 */
let socket;
let allDevices = [];
let allWifi = [];
let alerts = [];
let currentFilter = 'all';
let currentWifiTab = 'all';
let selectedDeviceIp = null;
let currentView = 'dashboard';
