const {
  withDangerousMod,
  AndroidConfig,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config Plugin para crear el archivo network_security_config.xml
 */
const withNetworkSecurityConfigFile = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const xmlDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml'
      );

      // Crear directorio xml si no existe
      if (!fs.existsSync(xmlDir)) {
        fs.mkdirSync(xmlDir, { recursive: true });
      }

      // Contenido del archivo XML
      const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Permitir HTTP para el servidor ERP -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">x.verial.org</domain>
        <domain includeSubdomains="true">verial.org</domain>
        <domain includeSubdomains="true">212.78.130.144</domain>
        <domain includeSubdomains="true">80.58.154.71</domain>
        <!-- Para desarrollo local -->
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
    </domain-config>
    
    <!-- Resto de dominios usan HTTPS -->
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>`;

      // Escribir archivo
      const xmlPath = path.join(xmlDir, 'network_security_config.xml');
      fs.writeFileSync(xmlPath, xmlContent);

      return config;
    },
  ]);
};

module.exports = withNetworkSecurityConfigFile;
