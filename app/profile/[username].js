import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import i18n from '../../config/i18n';

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  // Ajout de l'état pour l'onglet actif
  const [activeFormat, setActiveFormat] = useState('physical');

  const API_URL = 'https://www.g-played.com/api/index.php';

  useEffect(() => {
    fetchPublicData();
  }, [username]);

  const fetchPublicData = async () => {
    // ... (Code existant inchangé)
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(`${API_URL}?action=api_get_public_collection&username=${username}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await response.json();
      if (json.success) setData(json);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    // ... (Code existant inchangé)
    const config = {
      'not_started': { label: i18n.t('status.not_started'), icon: 'inbox', color: '#ccc' },
      'playing': { label: i18n.t('status.playing'), icon: 'play-circle-outline', color: '#4CE5AE' },
      'completed': { label: i18n.t('status.completed'), icon: 'emoji-events', color: '#ed9c01' },
      'dropped': { label: i18n.t('status.dropped'), icon: 'cancel', color: '#dc3545' },
    };
    return config[status] || { label: status, icon: 'info-outline', color: '#aaa' };
  };

  const getPlatformIcon = (platformStr, iconColor = '#aaa') => {
     // ... (Code existant inchangé)
     if (!platformStr) return <MaterialIcons name="videogame-asset" size={14} color={iconColor} />;
     const platL = platformStr.toLowerCase();
     if (platL.includes(',') || platL.includes('/') || platL.includes('multiplateforme')) return <MaterialIcons name="devices" size={14} color={iconColor} />;
     else if (platL.includes('ps') || platL.includes('playstation')) return <MaterialCommunityIcons name="sony-playstation" size={14} color="#0a57ae" />;
     else if (platL.includes('xbox')) return <MaterialCommunityIcons name="microsoft-xbox" size={14} color="#0f780f" />;
     else if (platL.includes('switch') || platL.includes('nintendo')) return <MaterialCommunityIcons name="nintendo-switch" size={14} color="#e60012" />;
     else if (platL.includes('pc') || platL.includes('windows')) return <MaterialCommunityIcons name="microsoft-windows" size={14} color="#09e0fe" />;
     return <MaterialIcons name="videogame-asset" size={14} color={iconColor} />;
  };

  const renderGameCard = ({ item }) => {
    // ... (Code existant inchangé)
    const statusConfig = getStatusConfig(item.status);
    
    let finalImageUrl = null;
    if (item.image_url) {
      if (item.image_url.startsWith('http')) finalImageUrl = item.image_url;
      else if (item.image_url.startsWith('//')) finalImageUrl = `https:${item.image_url}`;
      else finalImageUrl = `https://www.g-played.com/${item.image_url}`;
    }

    return (
      <View style={styles.card}>
        {finalImageUrl ? (
          <ExpoImage source={{ uri: finalImageUrl }} style={styles.cover} contentFit="cover" cachePolicy="memory-disk" transition={200} />
        ) : (
          <View style={[styles.cover, styles.placeholderCover]} />
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.gameTitle} numberOfLines={1}>{item.title}</Text>
          
          <View style={styles.badgesContainer}>
            <View style={[styles.badge, styles.badgePlatform]}>
              {getPlatformIcon(item.platform, '#111')}
              <Text style={styles.badgeTextPlatform}>{item.platform}</Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusBadge}>
              <MaterialIcons name={statusConfig.icon} size={14} color={statusConfig.color} />
              <Text style={[styles.gameStatus, { color: statusConfig.color }]}>{statusConfig.label}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#4CE5AE" /></View>;

  const validGames = data?.games?.filter(g => g.status !== 'loaned' && g.status !== 'wishlist') || [];
  
  const physicalCount = validGames.filter(g => g.format === 'physical').length;
  const digitalCount = validGames.filter(g => g.format === 'digital').length;
  
  // NOUVEAU : Filtrage par format actif ET recherche
  let displayedGames = validGames.filter(g => g.format === activeFormat);
  if (searchQuery.trim() !== '') {
    displayedGames = displayedGames.filter(g => g.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back-ios" size={22} color="#fff" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t('public_collection.title')} {username}</Text>
      </View>

      <View style={styles.userInfoContainer}>
        <ExpoImage 
          source={{ uri: data?.owner.avatar_url ? `https://www.g-played.com/${data.owner.avatar_url}` : 'https://www.g-played.com/uploads/avatars/default.png' }} 
          style={styles.avatar}
        />
        <Text style={styles.username}>{data?.owner.username}</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{physicalCount}</Text>
            <Text style={styles.statLabel}>{i18n.t('home.tab_physical')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{digitalCount}</Text>
            <Text style={styles.statLabel}>{i18n.t('home.tab_digital')}</Text>
          </View>
        </View>
      </View>

      {/* NOUVEAU : Toggle Physique / Digital */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity style={[styles.toggleButton, activeFormat === 'physical' && styles.toggleButtonActive]} onPress={() => setActiveFormat('physical')}>
          <Text style={[styles.toggleText, activeFormat === 'physical' && styles.toggleTextActive]}>
            <MaterialCommunityIcons name="minidisc" style={[styles.toggleIcons, activeFormat === 'physical' && styles.toggleIconsActive]} /> {i18n.t('home.tab_physical')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toggleButton, activeFormat === 'digital' && styles.toggleButtonActive]} onPress={() => setActiveFormat('digital')}>
          <Text style={[styles.toggleText, activeFormat === 'digital' && styles.toggleTextActive]}>
            <MaterialCommunityIcons name="cloud-outline" style={[styles.toggleIcons, activeFormat === 'digital' && styles.toggleIconsActive]} /> {i18n.t('home.tab_digital')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.localSearchContainer}>
        <MaterialIcons name="search" size={20} color="#6c7d76" style={styles.localSearchIcon} />
        <TextInput
          style={styles.localSearchInput}
          placeholder={i18n.t('public_collection.search')}
          placeholderTextColor="#6c7d76"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="cancel" size={20} color="#6c7d76" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={displayedGames}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderGameCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.emptyText}>{i18n.t('public_collection.empty')}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // ... (Conservez vos styles existants pour container, header, userInfoContainer, etc.)
  container: { flex: 1, backgroundColor: '#1b1b1b' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1b1b1b' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 10, backgroundColor: '#1b1b1b' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#202020', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginRight: 40 },
  userInfoContainer: { alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#333', marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: '#4CE5AE', marginBottom: 10 },
  username: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  statsRow: { flexDirection: 'row', backgroundColor: '#202020', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 24, borderWidth: 1, borderColor: '#333' },
  statBox: { alignItems: 'center', minWidth: 80 },
  statValue: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: '#6c7d76', fontSize: 12, textTransform: 'uppercase', marginTop: 4 },
  statDivider: { width: 1, backgroundColor: '#333', marginHorizontal: 20 },
  localSearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#202020', borderRadius: 12, borderWidth: 1, borderColor: '#333', marginHorizontal: 20, marginBottom: 16, paddingHorizontal: 12, height: 44 },
  localSearchIcon: { marginRight: 8 },
  localSearchInput: { flex: 1, color: '#fff', fontSize: 14 },
  listContainer: { paddingHorizontal: 16, paddingBottom: 40 },
  card: { flexDirection: 'row', backgroundColor: '#202020', borderRadius: 24, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cover: { width: 90, height: 120 },
  placeholderCover: { backgroundColor: '#151515' },
  cardInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  gameTitle: { fontSize: 17, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  badgesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8, marginTop: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, gap: 4 },
  badgePlatform: { backgroundColor: '#fff' },
  badgeTextPlatform: { fontSize: 11, fontWeight: 'bold', color: '#111' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gameStatus: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  emptyText: { color: '#6c7d76', textAlign: 'center', marginTop: 40, fontSize: 16 },

  // NOUVEAU : Styles ajoutés pour le Toggle
  toggleContainer: { flexDirection: 'row', backgroundColor: '#202020', borderRadius: 50, marginHorizontal: 20, marginBottom: 16, padding: 4 },
  toggleButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 50 },
  toggleButtonActive: { backgroundColor: '#4CE5AE' },
  toggleText: { color: '#6c7d76', fontWeight: 'bold' },
  toggleIcons: { color: '#6c7d76', fontSize: 18 },
  toggleIconsActive: { color: '#111', fontSize: 18 },
  toggleTextActive: { color: '#111' },
});