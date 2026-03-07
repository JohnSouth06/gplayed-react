import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { getLocales } from 'expo-localization';
import { useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PieChart, ProgressChart } from 'react-native-chart-kit';
import i18n from '../config/i18n';

const screenWidth = Dimensions.get('window').width;

// --- UTILS : Normalisation et Couleurs ---

// Uniformise les noms des plateformes
const normalizePlatformName = (name) => {
  if (!name) return 'Inconnu';
  const n = name.trim().toLowerCase();
  
  // Sony
  if (n === 'ps1' || n === 'psx' || n === 'playstation') return 'PlayStation 1';
  if (n === 'ps2' || n === 'playstation 2') return 'PlayStation 2';
  if (n === 'ps3' || n === 'playstation 3') return 'PlayStation 3';
  if (n === 'ps4' || n === 'playstation 4') return 'PlayStation 4';
  if (n === 'ps5' || n === 'playstation 5') return 'PlayStation 5';
  if (n === 'psp' || n === 'playstation portable') return 'PlayStation Portable';
  if (n === 'ps vita' || n === 'psvita' || n === 'playstation vita') return 'PlayStation Vita';
  
  // Microsoft
  if (n === 'xbox') return 'Xbox';
  if (n === 'xbox 360') return 'Xbox 360';
  if (n === 'xbox one') return 'Xbox One';
  if (n === 'xbox series' || n === 'xbox series x' || n === 'xbox series s' || n === 'xbox series x/s') return 'Xbox Series';
  
  // Nintendo
  if (n === 'switch' || n === 'nintendo switch') return 'Nintendo Switch';
  if (n === 'wii') return 'Nintendo Wii';
  if (n === 'wii u' || n === 'wiiu') return 'Nintendo Wii U';
  if (n === 'ds' || n === 'nintendo ds') return 'Nintendo DS';
  if (n === '3ds' || n === 'nintendo 3ds') return 'Nintendo 3DS';
  if (n === 'gamecube' || n === 'ngc') return 'Nintendo GameCube';
  if (n === 'n64' || n === 'nintendo 64') return 'Nintendo 64';
  if (n === 'snes' || n === 'super nintendo') return 'Super Nintendo';
  if (n === 'nes' || n === 'nintendo') return 'Nintendo (NES)';
  if (n === 'game boy' || n === 'gameboy') return 'Game Boy';
  if (n === 'game boy advance' || n === 'gba') return 'Game Boy Advance';
  if (n === 'game boy color' || n === 'gbc') return 'Game Boy Color';
  
  // PC / Autres
  if (n === 'pc' || n === 'windows' || n === 'steam' || n === 'epic') return 'PC';
  if (n === 'mac' || n === 'macos') return 'Mac';
  
  // Remplacement par défaut (Met la première lettre de chaque mot en majuscule)
  return name.replace(/\b\w/g, l => l.toUpperCase());
};

// Détermine le constructeur pour attribuer la bonne palette de couleurs
const getBrandFromName = (name) => {
  const n = name.toLowerCase();
  if (n.includes('playstation')) return 'playstation';
  if (n.includes('xbox')) return 'xbox';
  if (n.includes('nintendo') || n.includes('game boy') || n === 'super nintendo') return 'nintendo';
  if (n === 'pc' || n === 'mac') return 'pc';
  return 'default';
};

// Palettes de nuances pour chaque constructeur
const BRAND_COLORS = {
  // Nuances de bleu (#0072CE en base)
  playstation: ['#0072CE', '#005BB5', '#004494', '#338DDF', '#66A8E8', '#002E6B', '#99C4F1'],
  // Nuances de vert (#0E7A0D en base)
  xbox: ['#0E7A0D', '#0B5D0A', '#084007', '#3EA63B', '#6DC26A', '#062E05', '#9FD99D'],
  // Nuances de rouge (#FE0016 en base)
  nintendo: ['#FE0016', '#CC0012', '#99000D', '#FF3345', '#FF6674', '#660009', '#FF99A3'],
  // Nuances cyan/bleu clair pour PC
  pc: ['#09e0fe', '#07b5cd', '#058899', '#3ae6fe', '#6cecfe'],
  // Nuances de gris/doré pour les autres (Sega, Atari, etc.)
  default: ['#888888', '#ed9c01', '#666666', '#cc8500', '#aaaaaa']
};


export default function StatsScreen() {
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Remarque : Le dossier API /api/ est bien conservé dans l'URL
  const API_URL = 'https://www.g-played.com/api/index.php?action=api_get_games';

  useFocusEffect(
    useCallback(() => {
      fetchGames();
    }, [])
  );

  const fetchGames = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;
      const response = await fetch(API_URL, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      if (data.success) {
        const validGames = data.data.filter(g => g.status !== 'wishlist' && g.status !== 'loaned');
        setGames(validGames);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#4CE5AE" /></View>;

  if (games.length === 0) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="insert-chart-outlined" size={64} color="#333" />
        <Text style={styles.emptyText}>{i18n.t('stats.empty_text')}</Text>
      </View>
    );
  }

  // --- CALCUL DES STATISTIQUES ---
  const physicalGames = games.filter(g => g.format === 'physical');
  const digitalGames = games.filter(g => g.format === 'digital');
  const playingGames = games.filter(g => g.status === 'playing');
  const completedGames = games.filter(g => g.status === 'completed' || g.status === 'finished');

  const userRegion = getLocales()[0]?.regionCode || 'FR';
  const currencySymbol = userRegion === 'US' ? '$' : (userRegion === 'JP' ? '¥' : '€');
  const decimals = userRegion === 'JP' ? 0 : 2;

  const physicalValue = physicalGames.reduce((acc, g) => acc + (parseFloat(g.estimated_price) || 0), 0);
  const digitalValue = digitalGames.reduce((acc, g) => acc + (parseFloat(g.estimated_price) || 0), 0);
  const totalValue = physicalValue + digitalValue;

  const completionRate = games.length > 0 ? completedGames.length / games.length : 0;


  // --- REPARTITION PAR PLATEFORME ---
  const platformCounts = {};
  
  games.forEach(g => {

    const rawPlatform = g.platform || 'Inconnu';

    const separatedPlatforms = rawPlatform.split(/[,/]/);

    separatedPlatforms.forEach(p => {
      // 1. On nettoie et unifie le nom (le trim() est géré dans normalizePlatformName)
      const platformName = normalizePlatformName(p);

      if (!platformCounts[platformName]) {
        platformCounts[platformName] = { 
          name: platformName, 
          population: 0, 
          legendFontColor: "#ccc", 
          legendFontSize: 12 
        };
      }
      platformCounts[platformName].population += 1;
    });
  });

  // Compteurs pour savoir à quelle nuance on en est pour chaque constructeur
  const colorIndexTracker = { playstation: 0, xbox: 0, nintendo: 0, pc: 0, default: 0 };

  // 2. On trie et on assigne les nuances
  const pieChartData = Object.values(platformCounts)
    .sort((a, b) => b.population - a.population)
    .map((item) => {
      const brand = getBrandFromName(item.name);
      const palette = BRAND_COLORS[brand];
      
      // On pioche la couleur, et on incrémente l'index pour que la prochaine plateforme de la même marque ait une autre nuance
      const assignedColor = palette[colorIndexTracker[brand] % palette.length];
      colorIndexTracker[brand] += 1;

      return {
        ...item,
        color: assignedColor
      };
    });

  const chartConfig = {
    backgroundGradientFrom: "#202020",
    backgroundGradientTo: "#202020",
    color: (opacity = 1) => `rgba(76, 229, 174, ${opacity})`,
    strokeWidth: 2,
    useShadowColorFromDataset: false
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>{i18n.t('stats.title')}</Text>

      {/* COMPTEURS PRINCIPAUX */}
      <View style={styles.cardsRow}>
        <View style={[styles.statCard, styles.mainCard]}>
          <MaterialCommunityIcons name="gamepad-variant" size={24} color="#4CE5AE" />
          <Text style={styles.statValue}>{games.length}</Text>
          <Text style={styles.statLabel}>{i18n.t('stats.owned_games')}</Text>
          
          <View style={styles.formatDivider} />
          <View style={styles.formatRow}>
            <Text style={styles.formatText}><Text style={styles.formatBold}>{physicalGames.length}</Text> {i18n.t('stats.physical')}</Text>
            <Text style={styles.formatText}><Text style={styles.formatBold}>{digitalGames.length}</Text> {i18n.t('stats.digital')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardsRow}>
        <View style={styles.statCard}>
          <MaterialIcons name="play-circle-outline" size={24} color="#09e0fe" />
          <Text style={styles.statValue}>{playingGames.length}</Text>
          <Text style={styles.statLabel}>{i18n.t('stats.playing')}</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="emoji-events" size={24} color="#ed9c01" />
          <Text style={styles.statValue}>{completedGames.length}</Text>
          <Text style={styles.statLabel}>{i18n.t('stats.completed')}</Text>
        </View>
      </View>

      {/* TAUX DE COMPLÉTION */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{i18n.t('stats.completion_rate')}</Text>
        <View style={styles.progressRow}>
          <ProgressChart
            data={{ data: [completionRate] }}
            width={screenWidth * 0.4}
            height={100}
            strokeWidth={12}
            radius={32}
            chartConfig={{...chartConfig, color: (opacity = 1) => `rgba(237, 156, 1, ${opacity})`}}
            hideLegend={true}
          />
          <View style={styles.progressInfo}>
            <Text style={styles.progressPercentage}>{Math.round(completionRate * 100)}%</Text>
            <Text style={styles.progressSub}>{i18n.t('stats.completion_percent')}</Text>
          </View>
        </View>
      </View>

      {/* VALEUR DE LA COLLECTION */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{i18n.t('stats.collection_value')}</Text>
        
        <Text style={styles.totalValue}>{totalValue.toFixed(decimals)} {currencySymbol}</Text>
        
        <View style={styles.valueBarContainer}>
          <View style={[styles.valueBarPhysical, { flex: physicalValue || 1 }]} />
        </View>
        
        <View style={styles.valueLabels}>
          <Text style={styles.valuePhysicalText}>• {i18n.t('stats.physical')} : {physicalValue.toFixed(decimals)} {currencySymbol}</Text>
        </View>
      </View>

      {/* RÉPARTITION PAR PLATEFORME */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{i18n.t('stats.platform_distribution')}</Text>
        <PieChart
          data={pieChartData}
          width={screenWidth - 40}
          height={180}
          chartConfig={chartConfig}
          accessor={"population"}
          backgroundColor={"transparent"}
          paddingLeft={"0"}
          absolute
        />
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1b1b1b' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1b1b1b', padding: 20 },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginHorizontal: 20, marginTop: 20, marginBottom: 20 },
  emptyText: { color: '#6c7d76', textAlign: 'center', marginTop: 20, fontSize: 16 },

  cardsRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, gap: 16 },
  statCard: { flex: 1, backgroundColor: '#202020', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  mainCard: { borderColor: 'rgba(76, 229, 174, 0.3)' },
  statValue: { fontSize: 36, fontWeight: 'bold', color: '#fff', marginVertical: 8 },
  statLabel: { fontSize: 13, color: '#aaa', textTransform: 'uppercase', fontWeight: 'bold' },

  formatDivider: { width: '100%', height: 1, backgroundColor: '#333', marginVertical: 12 },
  formatRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  formatText: { color: '#ccc', fontSize: 14 },
  formatBold: { color: '#fff', fontWeight: 'bold' },

  chartContainer: { backgroundColor: '#202020', marginHorizontal: 20, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#333' },
  chartTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 16 },

  progressRow: { flexDirection: 'row', alignItems: 'center' },
  progressInfo: { flex: 1, marginLeft: 10 },
  progressPercentage: { fontSize: 32, fontWeight: 'bold', color: '#ed9c01' },
  progressSub: { color: '#aaa', fontSize: 14 },

  totalValue: { fontSize: 32, fontWeight: 'bold', color: '#4CE5AE', marginBottom: 16 },
  valueBarContainer: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  valueBarPhysical: { backgroundColor: '#4CE5AE' },
  valueBarDigital: { backgroundColor: '#09e0fe' },
  valueLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  valuePhysicalText: { color: '#4CE5AE', fontSize: 13, fontWeight: 'bold' },
  valueDigitalText: { color: '#09e0fe', fontSize: 13, fontWeight: 'bold' }
});