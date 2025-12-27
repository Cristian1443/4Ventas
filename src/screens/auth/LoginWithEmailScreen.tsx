/**
 * Pantalla de Login con Email - React Native
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';

// Importar logo (ruta correcta desde src/screens/auth/)
const logoImage = require('../../../assets/logo-login.png');

export default function LoginWithEmailScreen() {
  const navigation = useNavigation<any>();
  const { setUserSession, setCurrentVendor } = useApp();
  const insets = useSafeAreaInsets();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor, completa todos los campos');
      return;
    }

    setLoading(true);

    // Simular login (en producción conectar con API)
    setTimeout(() => {
      setLoading(false);
      
      // Guardar sesión (modo admin) sin vendedor
      setCurrentVendor(null);
      setUserSession({
        isLoggedIn: true,
        email: email,
        username: 'Admin'
      });

      // Navegar al Main (que contiene el Dashboard)
      navigation.replace('Main');
    }, 1000);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
      </View>

      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image 
          source={logoImage} 
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.subtitle}>Sistema de Gestión Comercial</Text>
      </View>

      {/* Title */}
      <Text style={styles.title}>Iniciar sesión con correo</Text>

      {/* Form */}
      <View style={styles.form}>
        {/* Email input */}
        <View style={styles.inputContainer}>
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
          />
        </View>

        {/* Password input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
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
        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
