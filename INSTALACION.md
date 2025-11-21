# 🚀 Guía de Instalación - 4Ventas React Native

## ✅ Pasos de Instalación

### 1. Requisitos Previos

Asegúrate de tener instalado:
- **Node.js** 18 o superior
- **npm** o **yarn**

### 2. Instalar Dependencias

```bash
# Navegar al directorio
cd src/react-native

# Limpiar cache de npm (por si acaso)
npm cache clean --force

# Instalar dependencias
npm install
```

**Nota**: Si ves algún warning sobre peer dependencies, es normal con Expo y puedes ignorarlos.

### 3. Instalar Expo CLI Globalmente (opcional pero recomendado)

```bash
npm install -g expo-cli
```

### 4. Iniciar la Aplicación

```bash
npm start
```

Esto abrirá Expo Dev Tools en tu navegador y mostrará un código QR.

### 5. Instalar Expo Go en tu Móvil

**iOS:**
- Descarga desde [App Store](https://apps.apple.com/app/expo-go/id982107779)
- Abre la cámara y escanea el QR

**Android:**
- Descarga desde [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
- Abre Expo Go y escanea el QR

### 6. ¡Listo!

La aplicación se cargará en tu dispositivo y podrás ver:
- Pantalla de Login
- Dashboard con estadísticas
- Módulo de Ventas
- Módulo de Gastos
- Módulo de Clientes
- Y más...

## 🐛 Solución de Problemas

### Error: "No matching version found"

Si ves este error durante `npm install`:

```bash
# Solución 1: Limpiar cache
npm cache clean --force
rm -rf node_modules
rm package-lock.json
npm install

# Solución 2: Usar versiones específicas
npm install --legacy-peer-deps
```

### Error: "Metro bundler failed to start"

```bash
# Limpiar cache de Metro
expo start -c
```

### Error: "Unable to resolve module"

```bash
# Reinstalar todo
rm -rf node_modules
npm install
npm start -- --reset-cache
```

### La app no se conecta

1. Asegúrate de que tu móvil y computadora estén en la misma red WiFi
2. Si usas VPN, desactívala temporalmente
3. Intenta con el modo túnel: `expo start --tunnel`

## 📱 Comandos Útiles

```bash
# Iniciar normalmente
npm start

# Iniciar limpiando cache
npm start -- -c

# Iniciar en modo túnel (si hay problemas de red)
npm start -- --tunnel

# Ver en Android
npm run android

# Ver en iOS
npm run ios

# Ver en navegador web
npm run web
```

## 🔧 Configuración del ERP

Para conectar con tu ERP real, edita:

```typescript
// src/services/erp.service.ts

const ERP_BASE_URL = 'http://tu-servidor:8000/WcfServiceLibraryVerial';
let SESSION_ID = 'tu-session-id';
const ERP_ENABLED = true; // Cambiar a true
```

Por defecto está en modo demo (`ERP_ENABLED = false`) con datos de prueba.

## 📚 Siguiente Paso

Lee [QUICK_START.md](QUICK_START.md) para aprender a usar la aplicación.

---

**¿Problemas?** Revisa [README.md](README.md) para más información.






