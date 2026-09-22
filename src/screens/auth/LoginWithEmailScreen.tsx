/**
 * Pantalla de Login con Email - React Native
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { setSessionId } from '../../services/erp.service';

// Importar logo (ruta correcta desde src/screens/auth/)
const logoImage = require('../../../assets/logo-login.png');

export default function LoginWithEmailScreen() {
  const ADMIN_EMAIL = 'teixidoflor@grupoteixido.es';
  const ADMIN_PASSWORD = 'Teixido2026';
  const ADMIN_ERP_SESSION = '39';

  const navigation = useNavigation<any>();
  const { setUserSession, setCurrentVendor } = useApp();
  const insets = useSafeAreaInsets();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      // Desplazar automáticamente al fondo del formulario
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor, completa todos los campos');
      return;
    }

    if (email.trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase() || password !== ADMIN_PASSWORD) {
      Alert.alert('Acceso denegado', 'Correo o contraseña incorrectos.');
      return;
    }

    setLoading(true);
    try {
      // Modo administrador: sin vendedor seleccionado, pero con sesión ERP activa.
      setCurrentVendor(null);
      setSessionId(ADMIN_ERP_SESSION);
      setUserSession({
        isLoggedIn: true,
        email: ADMIN_EMAIL,
        username: 'Administrador'
      });
      navigation.replace('AdminPanel');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + (keyboardVisible ? 10 : 20), paddingBottom: insets.bottom + 40 }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header — siempre visible */}
        <View style={[styles.header, keyboardVisible && { marginBottom: 8 }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>
        </View>

        {/* Logo — se oculta cuando el teclado está visible */}
        {!keyboardVisible && (
          <View style={styles.logoContainer}>
            <Image
              source={logoImage}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>Sistema de Gestión Comercial</Text>
          </View>
        )}

        {/* Title — se compacta cuando el teclado está visible */}
        <Text style={[styles.title, keyboardVisible && styles.titleCompact]}>
          Iniciar sesión con correo
        </Text>

        {/* Form */}
        <View style={styles.form}>
          {/* Email input */}
          <View style={[styles.inputContainer, keyboardVisible && { marginBottom: 14 }]}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              style={styles.input}
              placeholder="vendedor@example.com"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          {/* Password input */}
          <View style={[styles.inputContainer, keyboardVisible && { marginBottom: 14 }]}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          {/* Login button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleLogin}
            disabled={loading}
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          >
            <LinearGradient
              colors={loading ? ['#697b92', '#94a3b8'] : ['#092090', '#0C2ABF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradient}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Forgot password */}
          {!keyboardVisible && (
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#ffffff',
    padding: 20,
    paddingTop: 60
  },
  header: {
    marginBottom: 40
  },
  backButton: {
    padding: 8
  },
  backText: {
    fontSize: 20,
    color: '#0C2ABF',
    fontWeight: '600'
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40
  },
  logoImage: {
    width: 180,
    height: 55,
    marginBottom: 12
  },
  subtitle: {
    fontFamily: 'System',
    fontSize: 16,
    color: '#697b92',
    textAlign: 'center'
  },
  title: {
    fontFamily: 'System',
    fontSize: 28,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 40
  },
  titleCompact: {
    fontSize: 22,
    marginBottom: 16
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center'
  },
  inputContainer: {
    marginBottom: 24
  },
  label: {
    fontFamily: 'System',
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8
  },
  input: {
    height: 52,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 18,
    color: '#1a1a1a'
  },
  loginButton: {
    marginTop: 16,
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  loginButtonDisabled: {
    opacity: 0.6
  },
  gradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loginButtonText: {
    fontFamily: 'System',
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff'
  },
  forgotPassword: {
    marginTop: 16,
    alignItems: 'center'
  },
  forgotPasswordText: {
    fontFamily: 'System',
    fontSize: 18,
    color: '#0C2ABF',
    fontWeight: '500'
  }
});
