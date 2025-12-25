const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Config Plugin para permitir tráfico HTTP al servidor ERP
 * Añade network security config para permitir conexiones a x.verial.org
 */
const withNetworkSecurityConfig = (config) => {
  return withAndroidManifest(config, async (config) => {
    const { manifest } = config.modResults;
    
    // Añadir usesCleartextTraffic a la aplicación
    if (manifest.application) {
      manifest.application[0].$['android:usesCleartextTraffic'] = 'true';
      manifest.application[0].$['android:networkSecurityConfig'] = '@xml/network_security_config';
    }
    
    return config;
  });
};

module.exports = withNetworkSecurityConfig;
