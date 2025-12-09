/**
 * Pantalla de Login - React Native (Igual al Web)
 * Layout: 50% imagen izquierda + 50% form derecha
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsiveLayout } from '../../constants/layout';

// Importar assets (ruta correcta desde src/screens/auth/)
const logoImage = require('../../../assets/logo-login.png');
const backgroundImage = require('../../../assets/image-login.png');

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const layout = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const [isVendorHovered, setIsVendorHovered] = useState(false);
  const [isAdminHovered, setIsAdminHovered] = useState(false);

  const handleVendorLogin = () => {
    navigation.navigate('VendorSelection');
  };

  const handleAdminLogin = () => {
    navigation.navigate('LoginEmail');
  };

  // En tablets landscape, usar layout horizontal (como web)
  const useHorizontalLayout = layout.isTablet && layout.isLandscape;

  if (useHorizontalLayout) {
    // Layout horizontal para tablets (igual al web)
    return (
      <View style={[styles.containerHorizontal, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Left side with image */}
        <View style={styles.leftPanel}>
          <Image
            source={backgroundImage}
            style={styles.backgroundImage}
            resizeMode="cover"
          />
        </View>

        {/* Right side with login form */}
        <View style={styles.rightPanel}>
          <View style={styles.formContainer}>
            {/* Title */}
            <Text style={styles.title}>Iniciar sesión</Text>

            {/* Vendor button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPressIn={() => setIsVendorHovered(true)}
              onPressOut={() => setIsVendorHovered(false)}
              onPress={handleVendorLogin}
              style={[styles.button, isVendorHovered && styles.buttonElevated]}
            >
              <LinearGradient
                colors={isVendorHovered ? ['#a0e000', '#d4ff77'] : ['#8bd600', '#c4ff57']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradient}
              >
                <Text style={styles.buttonText}>Entrar como Vendedor</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider with "O" */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>O</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Admin button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPressIn={() => setIsAdminHovered(true)}
              onPressOut={() => setIsAdminHovered(false)}
              onPress={handleAdminLogin}
              style={[styles.button, isAdminHovered && styles.buttonElevated]}
            >
              <LinearGradient
                colors={isAdminHovered ? ['#0a2ba0', '#0d2ed0'] : ['#092090', '#0C2ABF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradient}
              >
                <Text style={styles.buttonTextWhite}>Acceso Administrador</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Help text */}
            <Text style={styles.helpText}>
              ¿Necesitas ayuda? Contacta con soporte
            </Text>

            {/* Logo at bottom */}
            <View style={styles.bottomLogo}>
              <Image
                source={logoImage}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Layout vertical para móviles (simplificado)
  return (
    <View style={[styles.containerVertical, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.contentVertical}>
        {/* Title */}
        <Text style={styles.title}>Iniciar sesión</Text>

        {/* Vendor button */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleVendorLogin}
          style={styles.button}
        >
          <LinearGradient
            colors={['#8bd600', '#c4ff57']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            <Text style={styles.buttonText}>Entrar como Vendedor</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Divider with "O" */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>O</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Admin button */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleAdminLogin}
          style={styles.button}
        >
          <LinearGradient
            colors={['#092090', '#0C2ABF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            <Text style={styles.buttonTextWhite}>Acceso Administrador</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Help text */}
        <Text style={styles.helpText}>
          ¿Necesitas ayuda? Contacta con soporte
        </Text>

        {/* Logo at bottom */}
        <View style={styles.bottomLogo}>
          <Image
            source={logoImage}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Layout horizontal (tablets)
  containerHorizontal: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
  },
  leftPanel: {
    flex: 1,
    minWidth: 320,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  rightPanel: {
    flex: 1,
    minWidth: 320,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  formContainer: {
    width: '100%',
    maxWidth: 333,
    alignItems: 'center',
    paddingBottom: 80,
  },

  // Layout vertical (móviles)
  containerVertical: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentVertical: {
    width: '100%',
    maxWidth: 333,
    padding: 20,
    alignItems: 'center',
  },

  // Common styles
  title: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 30,
    lineHeight: 30,
    color: '#0C2ABF',
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 24,
  },
  buttonElevated: {
    ...Platform.select({
      ios: {
        shadowColor: '#8bd600',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  gradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 18,
    lineHeight: 18,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  buttonTextWhite: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 18,
    lineHeight: 18,
    color: '#ffffff',
    textAlign: 'center',
  },
  dividerContainer: {
    width: '100%',
    height: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 18,
    lineHeight: 18,
    color: '#cbd5e1',
    textAlign: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
  },
  helpText: {
    fontFamily: 'Inter',
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  bottomLogo: {
    marginTop: 'auto',
    width: 204,
    height: 39,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
});
