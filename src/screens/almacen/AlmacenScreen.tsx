/**
 * Almacén Screen - EXACTAMENTE IGUAL A LA WEB
 * Menú con dos botones: Notas Almacén y Resumen Stock
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';

export default function AlmacenScreen() {
  const navigation = useNavigation<any>();

  return (
    <ScreenWithSidebar currentScreen="Almacen" scrollable={false}>
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Botones de acción */}
          <View style={styles.buttonsContainer}>
            {/* Notas Almacen */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('NotasAlmacen')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#092090', '#0C2ABF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonIcon}>📄</Text>
                <View style={styles.buttonTextContainer}>
                  <Text style={styles.buttonText}>Notas</Text>
                  <Text style={styles.buttonText}>Almacen</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Resumen Stock */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('ResumenStock')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#092090', '#0C2ABF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonIcon}>📊</Text>
                <View style={styles.buttonTextContainer}>
                  <Text style={styles.buttonText}>Resumen</Text>
                  <Text style={styles.buttonText}>Stock</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScreenWithSidebar>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  content: {
    flex: 1,
    padding: 60,
    paddingHorizontal: 140,
    position: 'relative'
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    width: 225,
    height: 105
  },
  actionButton: {
    width: 105.319,
    height: 105.267,
    borderRadius: 12.532,
    overflow: 'hidden'
  },
  buttonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  buttonIcon: {
    fontSize: 20,
    color: '#ffffff'
  },
  buttonTextContainer: {
    alignItems: 'center'
  },
  buttonText: {
    fontFamily: 'Inter',
    fontSize: 14.362,
    lineHeight: 16.755,
    textAlign: 'center',
    color: '#ffffff',
    margin: 0
  }
});
