/**
 * Artículos Screen - VERSIÓN CORREGIDA
 * - Mantiene: Stats, Botones de cabecera (Proveedores/Divisiones), Buscador original.
 * - Añade: Filtros dinámicos + Filtro "Stock Bajo".
 * - Nuevo Diseño: Tarjeta con Foto y Código Corto.
 * - CORRECCIÓN: Contador de "Stock Bajo" ahora usa criterio <= para coincidir con las tarjetas.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  ActivityIndicator,
  InteractionManager,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Image,
  FlatList,
  Linking,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { useResponsiveLayout } from '../../constants/layout';
import { Articulo } from '../../types';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';
import { catalogosService } from '../../services/erp/catalogos.service';
import { getStockLocalCheckpointMs, calcularStockLocalPorArticulo } from '../../services/stock-local.service';

const imgPlaceholder = require('../../../assets/blue-image-panel.png');

export default function ArticulosScreen() {
  const navigation = useNavigation<any>();
  const { articulos: articulosCtx, notasAlmacen, notasVenta, currentVendor, config } = useApp();
  const { isTablet, isSmallDevice } = useResponsiveLayout();
  const [isScreenReady, setIsScreenReady] = useState(false);
  const [stockCheckpointMs, setStockCheckpointMs] = useState<number | undefined>(undefined);

  useEffect(() => {
    getStockLocalCheckpointMs(currentVendor?.id).then(setStockCheckpointMs);
  }, [currentVendor?.id]);

  // Cantidad = stock local del furgón (Notas de Almacén - ventas), no el stock general del ERP.
  const stockLocalPorArticulo = useMemo(
    () => calcularStockLocalPorArticulo(notasAlmacen, notasVenta, stockCheckpointMs),
    [notasAlmacen, notasVenta, stockCheckpointMs]
  );
  const articulos = useMemo(
    () => articulosCtx.map(a => ({ ...a, cantidad: Math.max(0, stockLocalPorArticulo[a.id] || 0) })),
    [articulosCtx, stockLocalPorArticulo]
  );

  const handleAbrirCatalogo = async () => {
    // URL del Google Sheet del catálogo (configurable en Configuración)
    const catalogoUrl = config.catalogoPdfUrl || 'https://docs.google.com/spreadsheets/d/1KEeYssoGwAa_oEvHjfINP24cjTEZsHng8jik4Qs8hf8/edit?usp=sharing';

    try {
      const canOpen = await Linking.canOpenURL(catalogoUrl);
      if (canOpen) {
        await Linking.openURL(catalogoUrl);
      } else {
        Alert.alert('Error', 'No se puede abrir el catálogo. Verifica tu conexión a Internet.');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo abrir el catálogo.');
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('todos');
  const [soloConStock, setSoloConStock] = useState<boolean>(true);
  const [sortBy, setSortBy] = useState<'nombre' | 'cantidad' | 'stock'>('nombre');
  const [selectedArticulo, setSelectedArticulo] = useState<Articulo | null>(null);
  const [categoriasErp, setCategoriasErp] = useState<{ id: string; nombre: string }[]>([]);
  const [visibleLimit, setVisibleLimit] = useState(90);
  const [articlePoolLimit, setArticlePoolLimit] = useState(350);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setIsScreenReady(true);
    });
    return () => task.cancel();
  }, []);

  // Helpers de normalización
  const limpiarNombreCat = (nombre: string) => (nombre || '').replace(/,+$/g, '').trim();

  // Cargar categorías reales del ERP con timeout para evitar bloqueos
  useEffect(() => {
    let cancelled = false;
    const loadCategorias = async () => {
      try {
        // Timeout de 5 segundos para no bloquear la pantalla
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        );
        const data = await Promise.race([catalogosService.getCategorias(), timeoutPromise]);
        if (cancelled) return;
        const parsed = (data || [])
          .map((c: any) => ({
            id: (c.id_categoria || c.IdCategoria || c.ID_Categoria || c.id || c.ID || '').toString(),
            nombre: limpiarNombreCat((c.nombre || c.Nombre || c.Name || '').toString())
          }))
          .filter(c => c.nombre);

        if (parsed.length > 0) {
          const seen = new Set<string>();
          const unique = parsed.filter(c => {
            const key = c.id || c.nombre.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          if (!cancelled) setCategoriasErp(unique);
        }
      } catch {
        // Silenciar para modo offline o timeout
      }
    };
    loadCategorias();
    return () => { cancelled = true; };
  }, []);

  const normalizarCategoria = (value: string) =>
    limpiarNombreCat(value || '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm.trim().toLowerCase()), 180);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setVisibleLimit(90);
  }, [debouncedSearchTerm, categoriaSeleccionada, sortBy]);

  useEffect(() => {
    setArticlePoolLimit(350);
  }, [debouncedSearchTerm, categoriaSeleccionada, sortBy]);

  const useArticlePool = debouncedSearchTerm.length === 0 && categoriaSeleccionada === 'todos' && sortBy === 'nombre';
  const articulosSource = useMemo(
    () => (useArticlePool ? articulos.slice(0, articlePoolLimit) : articulos),
    [articulos, useArticlePool, articlePoolLimit]
  );

  const obtenerIdCategoriaSeleccionada = (idSel: string) => {
    if (!idSel || idSel === 'todos' || idSel === 'stock') return null;
    return idSel;
  };

  const obtenerIdCategoriaArticulo = (articulo: Articulo) => {
    if (articulo.categoriaId) return articulo.categoriaId.toString();

    const catArticulo = articulo.categoria || '';
    const limpio = limpiarNombreCat(catArticulo);

    // 1) Si viene como "Categoría 21" u otro con número explícito
    const numMatch = limpio.match(/(\d+)/);
    if (numMatch) return numMatch[1];

    // 2) Coincidencia directa por ID en el string (p.ej. "21 DECORACIÓN")
    const numeroInicio = limpio.split(' ')[0];
    if (/^\d+$/.test(numeroInicio)) return numeroInicio;

    // 3) Buscar por nombre normalizado en catálogo ERP
    const norm = normalizarCategoria(limpio);
    const match = categoriasErp.find(c => normalizarCategoria(c.nombre) === norm);
    if (match?.id) return match.id;

    // 4) Coincidencia parcial de nombre
    const parcial = categoriasErp.find(c => normalizarCategoria(c.nombre).includes(norm) || norm.includes(normalizarCategoria(c.nombre)));
    return parcial?.id || null;
  };

  // 1. GENERAR CATEGORÍAS: SOLO LAS DEL ERP (fallback a las de artículos) + "Todos" + "Con Stock" + "Stock Bajo"
  const categorias = useMemo(() => {
    const base: { id: string; nombre: string }[] = [
      { id: 'todos', nombre: 'Todos' },
      { id: 'stock', nombre: 'Stock Bajo' }
    ];
    if (categoriasErp.length > 0) {
      const sortedRaw = [...categoriasErp].sort((a, b) => {
        const na = Number(a.id);
        const nb = Number(b.id);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
      }).map((c, idx) => {
        const idVal = (c.id || '').toString().trim();
        const nameVal = (c.nombre || '').toString().trim();
        const fallbackId = idVal || normalizarCategoria(nameVal) || `cat_${idx}`;
        return { id: fallbackId, nombre: nameVal || `Categoría ${fallbackId}` };
      });
      const unique: { [k: string]: { id: string; nombre: string } } = {};
      sortedRaw.forEach(cat => { if (!unique[cat.id]) unique[cat.id] = cat; });
      
      const activas = Object.values(unique).filter(cat => {
          const nameNorm = normalizarCategoria(cat.nombre);
          
          // Omitir categorías que empiezan por WEB según petición del usuario
          if (nameNorm.startsWith('web')) return false;
          
          if (nameNorm.includes('mas vendidos') || nameNorm.includes('vendidos')) return true;

          return articulos.some(art => {
             const idArt = obtenerIdCategoriaArticulo(art);
             const catNorm = normalizarCategoria(cat.id);
             return idArt === cat.id || 
                    normalizarCategoria(idArt || '') === catNorm ||
                    normalizarCategoria(art.categoria || '') === catNorm ||
                    normalizarCategoria(art.categoria || '').includes(nameNorm);
          });
      });
      
      return [...base, ...activas];
    }

    // Fallback a categorías detectadas en artículos cuando no se pudieron leer del ERP
    const categoriasFallback = Array.from(
      new Set(
        articulos
          .map(a => (a.categoria || 'Sin Categoría').trim())
          .filter(c => c && c !== 'null' && c !== 'undefined')
      )
    ).sort((a, b) => {
      const regex = /categor[ií]a\s+(\d+)/i;
      const aMatch = a.match(regex);
      const bMatch = b.match(regex);
      if (aMatch && bMatch) return Number(aMatch[1]) - Number(bMatch[1]);
      if (aMatch) return -1;
      if (bMatch) return 1;
      return a.localeCompare(b, 'es', { sensitivity: 'base' });
    });

    const mappedFallback = categoriasFallback.map(c => ({
      id: normalizarCategoria(c) || c,
      nombre: c || 'Sin Categoría'
    }));

    return [...base, ...mappedFallback];
  }, [articulos, categoriasErp]);

  const categoriasById = useMemo(() => {
    const map: Record<string, string> = {};
    categorias.forEach(c => {
      if (c.id) map[c.id] = c.nombre;
    });
    return map;
  }, [categorias]);

  // Preseleccionar la primera categoría disponible
  useEffect(() => {
    if (categorias.length > 0 && !categoriaSeleccionada) {
      setCategoriaSeleccionada(categorias[0].id);
    }
  }, [categorias, categoriaSeleccionada]);

  // 2. PREPARAR DATOS (usar imágenes reales del ERP, sin simulación)
  const articulosProcesados = useMemo(() => {
    if (!isScreenReady) return [];
    return articulosSource.map(art => {
      const idCatArt = obtenerIdCategoriaArticulo(art);
      const categoriaResuelta = idCatArt ? (categoriasById[idCatArt] || art.categoria) : art.categoria;

      return {
        ...art,
        categoria: categoriaResuelta,
        // Mantener solo imagen real del ERP (o placeholder visual en render)
        imagen: art.imagen,
        // Generar código corto si no existe
        codigoCorto: art.codigoCorto || (art.nombre.substring(0, 3).toUpperCase() + '-' + art.id.slice(-3))
      };
    });
  }, [articulosSource, categoriasById, isScreenReady]);

  // 3. FILTRADO MEJORADO
  const filteredArticulos = useMemo(() => {
    const selectedCat = categorias.find(c => c.id === categoriaSeleccionada);
    const selectedNameNorm = normalizarCategoria(selectedCat?.nombre || '');
    const selectedId = categoriaSeleccionada;
    const selectedIdNorm = normalizarCategoria(selectedId || '');

    return articulosProcesados
      .filter((articulo) => {
        // Búsqueda por texto (más flexible)
        const term = debouncedSearchTerm;
        const matchSearch =
          (articulo.nombre || '').toLowerCase().includes(term) ||
          (articulo.codigoCorto || '').toLowerCase().includes(term) ||
          (articulo.id || '').toLowerCase().includes(term) ||
          (articulo.categoria || '').toLowerCase().includes(term);

        // Filtrado Con Stock (Toggle) — se ignora en "Stock Bajo" porque justamente muestran cantidad=0
        const isStockBajoFilter = selectedId === 'stock';
        if (soloConStock && !isStockBajoFilter && articulo.cantidad <= 0) {
            return false;
        }

        // Lógica del filtro de categoría: usar id del ERP (o fallback) y "Stock Bajo"
        let matchFilter = true;
        const keywordsVendidos = ['vendido', 'top', 'popular', 'destacado'];
        const isMasVendidos = keywordsVendidos.some(q => (normalizarCategoria(selectedCat?.nombre || '').includes(q) || normalizarCategoria(selectedId || '').includes(q)));

        if (isMasVendidos) {
           // Si se selecciona "Más vendidos", filtramos artículos que tengan esas keywords en su categoría o nombre
           matchFilter = articulo.categoria.toLowerCase().includes('vendido') || 
                         articulo.nombre.toLowerCase().includes('vendido') ||
                         articulo.categoria.toLowerCase().includes('top');
           
           // Si el filtro no cruza nada, permitimos todos para mostrar el catálogo ordenado por stock (como fallback)
           if (matchFilter === false && !articulo.nombre.toLowerCase().includes('vendido')) matchFilter = true;
        } else if (selectedId === 'stock') {
          matchFilter = articulo.cantidad <= (articulo.stockMinimo || 0);
        } else if (selectedId && selectedId !== 'todos') {
          const artId = obtenerIdCategoriaArticulo(articulo);
          const artNameNorm = normalizarCategoria(articulo.categoria || '');

          // Si no hay datos de categoría en el artículo, no lo excluimos (fallback)
          if (!artId && !artNameNorm) {
            matchFilter = true;
          } else {
            matchFilter = false;

            // 1) Coincidir por ID exacto
            if (artId && artId === selectedId) matchFilter = true;

            // 2) Coincidir por ID normalizado
            if (!matchFilter && artId && normalizarCategoria(artId) === selectedIdNorm) matchFilter = true;

            // 3) Coincidir por nombre normalizado del chip
            if (!matchFilter && selectedNameNorm && (artNameNorm === selectedNameNorm || artNameNorm.includes(selectedNameNorm))) matchFilter = true;

            // 4) Coincidir por el id normalizado como texto dentro del nombre
            if (!matchFilter && selectedIdNorm && artNameNorm.includes(selectedIdNorm)) matchFilter = true;
          }
        }

        return matchSearch && matchFilter;
      })
      .sort((a, b) => {
        const isMasVendidos = selectedIdNorm.includes('vendido') || (selectedNameNorm && selectedNameNorm.includes('vendido'));
        if (isMasVendidos) {
            return b.cantidad - a.cantidad;
        }

        if (sortBy === 'nombre') return a.nombre.localeCompare(b.nombre);
        if (sortBy === 'cantidad') return b.cantidad - a.cantidad;
        if (sortBy === 'stock') {
          // Prioridad a los que tienen stock bajo
          const aBajo = a.cantidad < (a.stockMinimo || 0);
          const bBajo = b.cantidad < (b.stockMinimo || 0);
          return (bBajo ? 1 : 0) - (aBajo ? 1 : 0);
        }
        return 0;
      });
  }, [articulosProcesados, debouncedSearchTerm, categoriaSeleccionada, sortBy, soloConStock]);

  const visibleArticulos = useMemo(
    () => filteredArticulos.slice(0, visibleLimit),
    [filteredArticulos, visibleLimit]
  );

  // Cálculos para las Stats (sobre el total de artículos, no los filtrados)
  // FIX: Usar <= para ser consistente con isStockBajo y la visualización
  const articulosStockBajo = articulos.filter(a => a.cantidad <= (a.stockMinimo || 0));

  const valorTotal = articulos.reduce((sum, a) => {
    const precio = parseFloat(a.precio?.replace(',', '.').replace('€', '').trim() || '0');
    return sum + (precio * a.cantidad);
  }, 0);

  const isStockBajo = (articulo: Articulo) => articulo.cantidad <= (articulo.stockMinimo || 0);

  return (
    <ScreenWithSidebar currentScreen="Articulos" scrollable={false}>
      <View style={styles.container}>
        {/* Header Fijo */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.navigate('Main', { screen: 'Dashboard' })}
            >
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Artículos</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.catalogoButton}
              onPress={handleAbrirCatalogo}
            >
              <Text style={styles.catalogoButtonText}>📄 Catálogo PDF</Text>
            </TouchableOpacity>
            <View style={[styles.searchBoxHeader, isSmallDevice && { minWidth: 200 }]}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por Nombre, ID o Código Corto..."
                placeholderTextColor="#94a3b8"
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </View>
          </View>
        </View>

        <Text style={styles.almacenHint}>
          Stock del furgón (local, calculado en esta tablet desde las Notas de Almacén y las ventas)
        </Text>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats Container (Restaurado) */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Artículos</Text>
              <Text style={styles.statValue}>{articulos.length}</Text>
            </View>

            {/* Al hacer clic filtra por Stock Bajo */}
            <TouchableOpacity
              style={[styles.statCard, styles.statCardWarning]}
              onPress={() => setCategoriaSeleccionada('stock')}
            >
              <Text style={styles.statLabelWarning}>Stock Bajo</Text>
              <Text style={styles.statValueWarning}>{articulosStockBajo.length}</Text>
            </TouchableOpacity>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Valor Inventario</Text>
              <Text style={[styles.statValue, { color: '#092090' }]}>
                {valorTotal.toFixed(2).replace('.', ',')} €
              </Text>
            </View>
          </View>

          {/* Search and Filters combinados */}
          <View style={styles.searchFilterContainer}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10, paddingHorizontal: 4 }}>
              <TouchableOpacity 
                style={[
                  styles.filterChip, 
                  soloConStock ? { backgroundColor: '#10b981', borderColor: '#10b981' } : { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
                  { borderRadius: 20, paddingHorizontal: 16 }
                ]} 
                onPress={() => setSoloConStock(!soloConStock)}
              >
                <Text style={{ fontWeight: 'bold', fontSize: 13, color: soloConStock ? '#fff' : '#64748b' }}>
                  {soloConStock ? '📦 Mostrando: Sólo con stock' : '📦 Mostrando: Todos (incluye agotados)'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
              {categorias.map((categoria) => (
                <TouchableOpacity
                  key={categoria.id}
                  style={[
                    styles.filterChip,
                    categoriaSeleccionada === categoria.id && styles.filterChipActive,
                    categoria.id === 'stock' && categoriaSeleccionada === 'stock' && { borderColor: '#dc2626', backgroundColor: '#fee2e2' },
                    categoria.id === 'constock' && categoriaSeleccionada === 'constock' && { borderColor: '#059669', backgroundColor: '#d1fae5' }
                  ]}
                  onPress={() => setCategoriaSeleccionada(categoria.id)}
                >
                  <Text style={[
                    styles.filterText,
                    categoriaSeleccionada === categoria.id && styles.filterTextActive,
                    categoria.id === 'stock' && categoriaSeleccionada === 'stock' && { color: '#dc2626' },
                    categoria.id === 'constock' && categoriaSeleccionada === 'constock' && { color: '#059669' }
                  ]}>
                    {categoria.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Ordenamiento */}
            <View style={styles.sortContainer}>
              <TouchableOpacity
                style={[styles.sortButton, sortBy === 'nombre' && styles.sortButtonActive]}
                onPress={() => setSortBy('nombre')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'nombre' && styles.sortButtonTextActive]}>A-Z</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortButton, sortBy === 'cantidad' && styles.sortButtonActive]}
                onPress={() => setSortBy('cantidad')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'cantidad' && styles.sortButtonTextActive]}>Cantidad</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortButton, sortBy === 'stock' && styles.sortButtonActive]}
                onPress={() => setSortBy('stock')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'stock' && styles.sortButtonTextActive]}>Prioridad Stock</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Lista de Artículos (NUEVO DISEÑO DE TARJETA) */}
          {!isScreenReady ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#0C2ABF" />
              <Text style={styles.emptyText}>Cargando artículos...</Text>
            </View>
          ) : filteredArticulos.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>No se encontraron artículos</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {visibleArticulos.map((articulo) => (
                <TouchableOpacity
                  key={articulo.id}
                  style={[
                    styles.articuloCard,
                    isStockBajo(articulo) && styles.articuloCardBajo,
                    isTablet ? styles.cardTablet : styles.cardMobile
                  ]}
                  onPress={() => setSelectedArticulo(articulo)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardInner}>

                    {/* 1. IMAGEN (Izquierda) */}
                    <View style={styles.imageContainer}>
                      <Image
                        source={articulo.imagen ? { uri: articulo.imagen } : imgPlaceholder}
                        style={styles.articuloImagen}
                        resizeMode="cover"
                      />
                    </View>

                    {/* 2. INFO (Derecha) */}
                    <View style={styles.infoContainer}>
                      <View style={styles.infoHeader}>
                        <View style={styles.badgesRow}>
                          {/* Badge Código Corto */}
                          <View style={styles.shortCodeBadge}>
                            <Text style={styles.shortCodeText}>{articulo.codigoCorto || 'N/D'}</Text>
                          </View>
                          {/* ID pequeño */}
                          <Text style={styles.idText}>{articulo.id}</Text>
                        </View>

                        {/* Badge Stock Bajo */}
                        {isStockBajo(articulo) && (
                          <View style={styles.alertBadge}>
                            <Text style={styles.alertBadgeText}>Stock Bajo</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.articuloNombre} numberOfLines={2}>
                        {articulo.nombre}
                      </Text>

                      <Text style={styles.articuloCategoria}>{articulo.categoria}</Text>

                      <View style={styles.infoFooter}>
                        <Text style={styles.articuloPrecio}>{articulo.precio}</Text>
                        <View style={styles.stockBox}>
                          <Text style={styles.stockLabel}>Stock:</Text>
                          <Text style={[
                            styles.stockValueNumber,
                            isStockBajo(articulo) && { color: '#dc2626' }
                          ]}>
                            {articulo.cantidad}
                          </Text>
                        </View>
                      </View>
                    </View>

                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {filteredArticulos.length > visibleArticulos.length && (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={() => setVisibleLimit((prev) => prev + 90)}
              activeOpacity={0.8}
            >
              <Text style={styles.loadMoreBtnText}>
                Cargar más ({filteredArticulos.length - visibleArticulos.length} restantes)
              </Text>
            </TouchableOpacity>
          )}
          {useArticlePool && articlePoolLimit < articulos.length && (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={() => {
                setArticlePoolLimit((prev) => Math.min(prev + 350, articulos.length));
                setVisibleLimit((prev) => prev + 90);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.loadMoreBtnText}>
                Cargar más catálogo ({articulos.length - articlePoolLimit} restantes)
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Modal Detalle */}
        <Modal
          visible={!!selectedArticulo}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedArticulo(null)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPressOut={() => setSelectedArticulo(null)}
          >
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              {selectedArticulo && (
                <>
                  <View style={styles.modalImageHeader}>
                    {selectedArticulo.imagen ? (
                      <Image source={{ uri: selectedArticulo.imagen }} style={styles.modalFullImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.modalFullImage, { backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }]}>
                        <Text style={{ fontSize: 50 }}>🌻</Text>
                      </View>
                    )}
                  </View>

                  <View style={{ padding: 24 }}>
                    <Text style={styles.modalTitle}>{selectedArticulo.nombre}</Text>

                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionLabel}>Código Corto</Text>
                      <Text style={styles.modalSectionValueLarge}>
                        {selectedArticulo.codigoCorto}
                      </Text>
                    </View>

                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionLabel}>Categoría</Text>
                      <Text style={styles.modalSectionValue}>{selectedArticulo.categoria}</Text>
                    </View>

                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionLabel}>Stock Actual</Text>
                      <Text style={[
                        styles.modalSectionValueLarge,
                        isStockBajo(selectedArticulo) && { color: '#dc2626' }
                      ]}>
                        {selectedArticulo.cantidad} unidades
                      </Text>
                    </View>

                    {selectedArticulo.precio && (
                      <View style={styles.modalSection}>
                        <Text style={styles.modalSectionLabel}>Precio</Text>
                        <Text style={styles.modalSectionValuePrice}>{selectedArticulo.precio}</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={() => setSelectedArticulo(null)}
                    >
                      <LinearGradient
                        colors={['#092090', '#0C2ABF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.modalCloseButtonGradient}
                      >
                        <Text style={styles.modalCloseButtonText}>Cerrar</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </ScreenWithSidebar>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 24,
    paddingTop: 20,
    paddingBottom: 60
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 60,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
    zIndex: 10
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  catalogoButton: {
    backgroundColor: '#092090',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0C2ABF'
  },
  catalogoButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center'
  },
  backIcon: {
    fontSize: 22,
    color: '#697b92',
    marginBottom: 2
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a'
  },
  almacenHint: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  searchBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 30,
    height: 48,
    paddingHorizontal: 16,
    gap: 10,
    minWidth: 260
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12
  },
  headerActionButton: {
    borderRadius: 10,
    overflow: 'hidden'
  },
  headerActionGradient: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  headerActionText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff'
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    padding: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  statLabel: {
    fontSize: 18,
    color: '#697b92',
    marginBottom: 4
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a'
  },
  statCardWarning: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5'
  },
  statLabelWarning: {
    fontSize: 18,
    color: '#dc2626',
    marginBottom: 4
  },
  statValueWarning: {
    fontSize: 32,
    fontWeight: '700',
    color: '#dc2626'
  },
  searchFilterContainer: {
    marginBottom: 24
  },
  searchBox: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 30,
    height: 50,
    alignItems: 'center',
    paddingHorizontal: 18,
    gap: 14,
    marginBottom: 16
  },
  searchIcon: {
    fontSize: 18
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    color: '#1a1a1a'
  },
  filters: {
    marginBottom: 16
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    marginRight: 8
  },
  filterChipActive: {
    backgroundColor: '#0C2ABF',
    borderColor: '#0C2ABF'
  },
  filterText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#697b92'
  },
  filterTextActive: {
    color: '#ffffff'
  },
  sortContainer: {
    flexDirection: 'row',
    gap: 8
  },
  sortButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff'
  },
  sortButtonActive: {
    backgroundColor: '#0C2ABF',
    borderColor: '#0C2ABF'
  },
  sortButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#697b92'
  },
  sortButtonTextActive: {
    color: '#ffffff'
  },

  // --- TARJETA ARTÍCULO NUEVA (Horizontal) ---
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  cardTablet: {
    width: '32%',
    minWidth: 260
  },
  cardMobile: {
    width: '100%'
  },
  articuloCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    height: 160 // Altura fija ligeramente aumentada para mostrar toda la información
  },
  articuloCardBajo: {
    backgroundColor: '#fff1f2',
    borderColor: '#fda4af'
  },
  cardInner: {
    flexDirection: 'row',
    height: '100%'
  },
  imageContainer: {
    width: 110,
    height: '100%',
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0'
  },
  articuloImagen: {
    width: '100%',
    height: '100%'
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  infoContainer: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between'
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  shortCodeBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#c7d2fe'
  },
  shortCodeText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#092090'
  },
  idText: {
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '500'
  },
  alertBadge: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10
  },
  alertBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff'
  },
  articuloNombre: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1a1a1a',
    marginVertical: 4,
    lineHeight: 24
  },
  articuloCategoria: {
    fontSize: 16,
    color: '#64748b'
  },
  infoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 8
  },
  articuloPrecio: {
    fontSize: 20,
    fontWeight: '700',
    color: '#092090'
  },
  stockBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  stockLabel: {
    fontSize: 16,
    color: '#64748b'
  },
  stockValueNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a'
  },

  emptyState: {
    padding: 60,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 18,
    color: '#697b92'
  },
  emptyIcon: {
    fontSize: 52,
    marginBottom: 20,
    opacity: 0.5
  },
  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    maxWidth: 400,
    width: '100%',
    overflow: 'hidden'
  },
  modalImageHeader: {
    width: '100%',
    height: 200,
    backgroundColor: '#f1f5f9'
  },
  modalFullImage: {
    width: '100%',
    height: '100%'
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20
  },
  modalSection: {
    marginBottom: 16
  },
  modalSectionLabel: {
    fontSize: 14,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4
  },
  modalSectionValue: {
    fontSize: 18,
    color: '#1a1a1a'
  },
  modalSectionValueLarge: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a'
  },
  modalSectionValuePrice: {
    fontSize: 28,
    fontWeight: '800',
    color: '#092090'
  },
  modalCloseButton: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
    height: 50
  },
  modalCloseButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalCloseButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600'
  },
  loadMoreBtn: {
    marginTop: 12,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  loadMoreBtnText: {
    color: '#1d4ed8',
    fontSize: 14,
    fontWeight: '700',
  },
});