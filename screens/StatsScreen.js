import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PieChart, ProgressChart } from 'react-native-chart-kit';
import i18n from '../config/i18n';
import { getLocales } from 'expo-localization';

const screenWidth = Dimensions.get('window').width;

export default function StatsScreen() {
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
        // RÈGLE : On exclut strictement la wishlist et les jeux prêtés
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

  // 1. Compteurs Principaux (Priorité Physique)
  const physicalGames = games.filter(g => g.format === 'physical');
  const digitalGames = games.filter(g => g.format === 'digital');
  
  const playingGames = games.filter(g => g.status === 'playing');
  const completedGames = games.filter(g => g.status === 'completed');

  // 2. Valeur de la collection
  const userRegion = getLocales()[0]?.regionCode || 'FR';
  const currencySymbol = userRegion === 'US' ? '$' : (userRegion === 'JP' ? '¥' : '€');
  const decimals = userRegion === 'JP' ? 0 : 2; // Le Yen n'a pas de centimes

  const getGameValue = (g) => {
    if (userRegion === 'US' && g.price_usa) return parseFloat(g.price_usa);
    if (userRegion === 'JP' && g.price_jp) return parseFloat(g.price_jp);
    return parseFloat(g.price_pal || g.estimated_price || 0);
  };
  const physicalValue = physicalGames.reduce((acc, g) => acc + (parseFloat(g.estimated_price) || 0), 0);
  const digitalValue = digitalGames.reduce((acc, g) => acc + (parseFloat(g.estimated_price) || 0), 0);
  const totalValue = physicalValue + digitalValue;

  // 3. Taux de complétion
  const completionRate = games.length > 0 ? completedGames.length / games.length : 0;

  // 4. Répartition par Plateforme (Pour le PieChart)
  const platformCounts = {};
  games.forEach(g => {
    let platL = g.platform ? g.platform.toLowerCase() : '';
    let standardized = 'Autre';
    let color = '#aaa';

    if (platL.includes(',') || platL.includes('/') || platL.includes('multiplateforme')) { standardized = 'Multi'; color = '#f0ad4e'; }
    else if (platL.includes('ps') || platL.includes('playstation')) { standardized = 'PlayStation'; color = '#0a57ae'; }
    else if (platL.includes('xbox')) { standardized = 'Xbox'; color = '#0f780f'; }
    else if (platL.includes('switch') || platL.includes('nintendo')) { standardized = 'Nintendo'; color = '#e60012'; }
    else if (platL.includes('pc') || platL.includes('windows')) { standardized = 'PC'; color = '#09e0fe'; }

    if (!platformCounts[standardized]) {
      platformCounts[standardized] = { name: standardized, population: 0, color: color, legendFontColor: "#ccc", legendFontSize: 12 };
    }
    platformCounts[standardized].population += 1;
  });

  const pieChartData = Object.values(platformCounts).sort((a, b) => b.population - a.population);

  // Configuration visuelle des graphiques
  const chartConfig = {
    backgroundGradientFrom: "#202020",
    backgroundGradientTo: "#202020",
    color: (opacity = 1) => `rgba(76, 229, 174, ${opacity})`, // Couleur principale verte
    strokeWidth: 2,
    useShadowColorFromDataset: false
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>{i18n.t('stats.title')}</Text>

      {/* COMPTEURS PRINCIPAUX */}
      <View style={styles.cardsRow}>
        <View style={[styles.statCard, styles.mainCard]}>
          <MaterialIcons name="library-books" size={24} color="#4CE5AE" />
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

      {/* TAUX DE COMPLÉTION (Progress Ring Animé) */}
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
            <Text style={styles.progressSub}>de jeux terminés</Text>
          </View>
        </View>
      </View>

      {/* VALEUR DE LA COLLECTION */}
      {/* VALEUR DE LA COLLECTION */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{i18n.t('stats.collection_value')}</Text>
        
        {/* On utilise dynamiquement le symbole et le nombre de décimales */}
        <Text style={styles.totalValue}>{totalValue.toFixed(decimals)} {currencySymbol}</Text>
        
        <View style={styles.valueBarContainer}>
          <View style={[styles.valueBarPhysical, { flex: physicalValue || 1 }]} />
          <View style={[styles.valueBarDigital, { flex: digitalValue || 1 }]} />
        </View>
        
        <View style={styles.valueLabels}>
          <Text style={styles.valuePhysicalText}>• {i18n.t('stats.physical')} : {physicalValue.toFixed(decimals)} {currencySymbol}</Text>
          <Text style={styles.valueDigitalText}>• {i18n.t('stats.digital')} : {digitalValue.toFixed(decimals)} {currencySymbol}</Text>
        </View>
      </View>

      {/* RÉPARTITION PAR PLATEFORME (Pie Chart Animé) */}
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