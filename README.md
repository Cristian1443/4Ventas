# 4Ventas - React Native + Expo Go

Sistema de Gestión Comercial completo con funcionalidades **offline-first** y sincronización automática con ERP.

## 🚀 Características Principales

### ✅ Modo Híbrido Offline-First
- **Funciona siempre**: La app funciona completamente offline con datos locales
- **No bloquea**: Si el ERP no está disponible, la app continúa funcionando normalmente
- **Datos locales**: Todos los datos se guardan en AsyncStorage
- **Sincronización inteligente**: Detecta automáticamente cuando hay conexión

### ✅ Sincronización Automática
- **Cada hora**: Sincroniza clientes y artículos automáticamente
- **Cola de operaciones**: Guarda ventas y pagos pendientes cuando está offline
- **Reintentos automáticos**: Reintenta operaciones fallidas hasta 3 veces
- **Notificaciones**: Muestra el estado de sincronización en tiempo real

### ✅ Cola de Sincronización
- **Persistente**: Las operaciones pendientes se guardan en AsyncStorage
- **Priorizada**: Procesa operaciones en orden de importancia
- **Robusto**: Maneja errores y reintentos de manera inteligente
- **Transparente**: El usuario no necesita hacer nada, todo es automático

### ✅ Funcionalidades Completas

#### 📊 Ventas
- Crear nuevas ventas
- Seleccionar clientes
- Agregar artículos
- Formas de pago múltiples
- Estado de pago (pagado/pendiente)
- Historial de ventas
- Ver detalles de cada venta

#### 💰 Cobros
- Lista de cobros pendientes
- Registrar pagos
- Historial de cobros
- Relación con ventas
- Múltiples formas de pago

#### 📦 Almacén
- Control de stock
- Notas de almacén
- Resumen de stock
- Artículos con stock mínimo
- Actualización de cantidades

#### 👥 Clientes
- Lista de clientes
- Detalles de clientes
- Historial de ventas por cliente
- Selección de clientes

#### 📈 Gastos
- Registro de gastos
- Categorías
- Historial
- Fotos de comprobantes

#### 📄 Documentos
- Catálogos
- Contratos
- Facturas
- Otros documentos

#### 📅 Agenda
- Clientes del día
- Visitas programadas
- Historial de visitas

## 📱 Instalación

### Requisitos Previos
- Node.js 18+
- Expo CLI
- Expo Go app en tu dispositivo móvil (iOS o Android)

### Instalación

```bash
# Navegar al directorio de React Native
cd src/react-native

# Instalar dependencias
npm install

# Iniciar Expo
npm start
```

### Usando Expo Go

1. Instala **Expo Go** en tu dispositivo:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Android Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Escanea el código QR que aparece en la terminal con:
   - **iOS**: Cámara del iPhone
   - **Android**: App de Expo Go

3. La aplicación se cargará automáticamente en tu dispositivo

## 🔧 Configuración

### Configurar Conexión con ERP

Edita `src/services/erp.service.ts`:

```typescript
const ERP_BASE_URL = 'http://tu-servidor:8000/WcfServiceLibraryVerial';
let SESSION_ID = 'tu-session-id';
const ERP_ENABLED = true; // Activar conexión con ERP
```

### Modo Offline para Desarrollo

Si quieres desarrollar sin conexión al ERP:

```typescript
const ERP_ENABLED = false; // Usar datos mock
```

## 📂 Estructura del Proyecto

```
src/react-native/
├── App.tsx                      # Entrada principal
├── package.json                 # Dependencias
├── src/
│   ├── navigation/
│   │   ├── AppNavigator.tsx     # Navegación principal
│   │   └── types.ts             # Tipos de navegación
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── LoginWithEmailScreen.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardScreen.tsx
│   │   ├── ventas/
│   │   │   ├── VentasMenuScreen.tsx
│   │   │   ├── VentasListScreen.tsx
│   │   │   ├── NuevaVentaScreen.tsx
│   │   │   ├── VerNotaScreen.tsx
│   │   │   └── ResumenDiaScreen.tsx
│   │   ├── cobros/
│   │   │   ├── CobrosListScreen.tsx
│   │   │   ├── CobrosScreen.tsx
│   │   │   └── CobrosConfirmacionScreen.tsx
│   │   └── [otras pantallas...]
│   ├── components/
│   │   └── common/              # Componentes reutilizables
│   ├── context/
│   │   └── AppContext.tsx       # Estado global
│   ├── services/
│   │   ├── erp.service.ts       # Integración con ERP
│   │   ├── sync.service.ts      # Servicio de sincronización
│   │   └── storage.service.ts   # AsyncStorage wrapper
│   ├── types/
│   │   └── index.ts             # Tipos globales
│   └── constants/
│       ├── colors.ts
│       └── layout.ts
└── README.md
```

## 🔄 Sistema de Sincronización

### Funcionamiento

1. **Inicio de la App**
   - Carga datos locales de AsyncStorage
   - Intenta sincronizar con el ERP
   - Si falla, continúa en modo offline

2. **Sincronización Automática**
   - Cada hora sincroniza clientes y artículos
   - Procesa la cola de operaciones pendientes
   - Actualiza el estado en la UI

3. **Cola de Operaciones**
   - Todas las operaciones (ventas, pagos) se guardan localmente
   - Se agregan a la cola de sincronización
   - Se procesan cuando hay conexión
   - Se reintentan automáticamente si fallan

4. **Modo Offline**
   - Detecta automáticamente cuando no hay conexión
   - Muestra indicador visual en la UI
   - Todas las funciones siguen disponibles
   - Los datos se sincronizan cuando vuelve la conexión

### API del Servicio de Sincronización

```typescript
import { syncService } from './services/sync.service';

// Sincronizar todo manualmente
await syncService.syncAll();

// Obtener clientes locales
const clientes = await syncService.getClientesLocal();

// Obtener artículos locales
const articulos = await syncService.getArticulosLocal();

// Agregar operación a la cola
syncService.addToQueue('venta', ventaData);

// Ver operaciones pendientes
const pendientes = syncService.getPendingCount();

// Ver errores
const errores = syncService.getErrors();
```

## 🎨 UI/UX

- **Diseño adaptativo**: Se adapta a cualquier tamaño de pantalla
- **Gradientes**: Colores corporativos (#092090 → #0C2ABF)
- **Iconos**: Emojis para compatibilidad universal
- **Animaciones**: Transiciones suaves
- **Feedback visual**: Loading states, refresh controls
- **Modo oscuro**: Preparado para implementar

## 🚀 Desarrollo

### Agregar Nueva Pantalla

1. Crear archivo en `src/screens/[módulo]/NombrePantalla.tsx`:

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../../context/AppContext';

export default function NombrePantalla() {
  const { /* estados y funciones */ } = useApp();
  
  return (
    <View style={styles.container}>
      <Text>Contenido</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  }
});
```

2. Agregar ruta en `src/navigation/AppNavigator.tsx`:

```typescript
<Stack.Screen name="NombrePantalla" component={NombrePantalla} />
```

3. Agregar tipo en `src/types/index.ts`:

```typescript
export type RootStackParamList = {
  // ... otras rutas
  NombrePantalla: undefined;
};
```

### Usar el Contexto Global

```typescript
import { useApp } from '../context/AppContext';

function MiComponente() {
  const {
    // Estados
    notasVenta,
    clientes,
    articulos,
    syncStatus,
    modoOffline,
    
    // Funciones
    addNotaVenta,
    addCobro,
    sincronizar
  } = useApp();
  
  // Tu código aquí
}
```

## 📱 Comandos Útiles

```bash
# Iniciar en modo desarrollo
npm start

# Iniciar en Android
npm run android

# Iniciar en iOS
npm run ios

# Limpiar cache
expo start -c

# Ver logs en tiempo real
npx react-native log-android  # Android
npx react-native log-ios      # iOS
```

## 🐛 Debugging

### Ver Logs en Expo Go

1. Sacude el dispositivo (o Cmd+D en iOS, Cmd+M en Android)
2. Selecciona "Debug Remote JS"
3. Abre Chrome Developer Tools

### AsyncStorage Inspector

```typescript
import { storageService } from './services/storage.service';

// Ver todas las claves
const keys = await storageService.getAllKeys();
console.log(keys);

// Ver un item específico
const data = await storageService.getItem('clientes');
console.log(data);
```

## 📊 Estado del Proyecto

### ✅ Completado
- ✅ Servicios offline-first
- ✅ Sincronización automática
- ✅ Cola de operaciones
- ✅ Pantallas de autenticación
- ✅ Dashboard
- ✅ Módulo de ventas (básico)
- ✅ Navegación principal
- ✅ Contexto global
- ✅ AsyncStorage integration

### 🚧 En Desarrollo
- 🚧 Módulo de cobros completo
- 🚧 Módulo de almacén completo
- 🚧 Pantallas de gastos, documentos, etc.
- 🚧 Modales de selección
- 🚧 Impresión de recibos
- 🚧 Cámara para fotos

### 📋 Pendiente
- Notificaciones push
- Modo oscuro
- Sincronización en background
- Tests unitarios
- Tests de integración
- CI/CD

## 🔐 Seguridad

- **AsyncStorage**: Los datos se guardan encriptados en el dispositivo
- **Sesiones**: Token de sesión seguro
- **API**: Todas las llamadas usan HTTPS (en producción)
- **Validación**: Validación de datos en cliente y servidor

## 📄 Licencia

Propietario - Todos los derechos reservados

## 👥 Equipo

Desarrollado por el equipo de 4Ventas

## 📞 Soporte

Para soporte técnico, contacta a: soporte@4ventas.com

---

**¡Disfruta de 4Ventas en tu dispositivo móvil! 📱✨**
