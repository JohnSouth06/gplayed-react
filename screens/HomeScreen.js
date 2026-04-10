import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Image as ExpoImage } from 'expo-image';
import { Tabs, useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getRegionalPrice } from '../config/currency';
import i18n from '../config/i18n';

export default function HomeScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [games, setGames] = useState([]);
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeFormat, setActiveFormat] = useState('physical');

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedGames, setSelectedGames] = useState([]);

  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [lendModalVisible, setLendModalVisible] = useState(false);
  const [gameToLend, setGameToLend] = useState(null);
  const [loanedToName, setLoanedToName] = useState('');
  const [loanedDate, setLoanedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const API_URL = 'https://www.g-played.com/api/index.php?action=api_get_games';
  const API_DELETE_URL = 'https://www.g-played.com/api/index.php?action=api_delete_game';
  const API_UPDATE_URL = 'https://www.g-played.com/api/index.php?action=api_update_game';
  const API_PROFILE_URL = 'https://www.g-played.com/api/index.php?action=api_get_profile';

  const renderHeader = () => {
    if (isSelectionMode) return null;

    return (
      <View style={styles.scrollableHeaderContainer}>

        {/* 1. Titre de bienvenue */}
        <Text style={styles.pageTitle}>
          {username ? i18n.t('home.greeting', { name: username }) : i18n.t('home.title')}
        </Text>

        {/* 2. Sélecteur Physique / Digital */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, activeFormat === 'physical' && styles.toggleButtonActive]}
            onPress={() => setActiveFormat('physical')}
          >
            <Text style={[styles.toggleText, activeFormat === 'physical' && styles.toggleTextActive]}>
              <MaterialCommunityIcons name="minidisc" style={[styles.toggleIcons, activeFormat === 'physical' && styles.toggleIconsActive]} /> {i18n.t('home.tab_physical')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, activeFormat === 'digital' && styles.toggleButtonActive]}
            onPress={() => setActiveFormat('digital')}
          >
            <Text style={[styles.toggleText, activeFormat === 'digital' && styles.toggleTextActive]}>
              <MaterialCommunityIcons name="cloud-outline" style={[styles.toggleIcons, activeFormat === 'digital' && styles.toggleIconsActive]} /> {i18n.t('home.tab_digital')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. Barre de recherche */}
        <View style={styles.localSearchContainer}>
          <MaterialIcons name="search" size={20} color="#6c7d76" style={styles.localSearchIcon} />
          <TextInput
            style={styles.localSearchInput}
            placeholder={i18n.t('home.search_placeholder')}
            placeholderTextColor="#6c7d76"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* 5. Ligne des filtres (Plateforme, Statut, Tri) */}
        <View style={styles.filtersRow}>
          <TouchableOpacity style={styles.filterButton} onPress={() => openModal('platform')}>
            <Text style={styles.filterButtonText} numberOfLines={1}>
              {filterPlatform === 'all' ? i18n.t('common.platforms') : filterPlatform}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={20} color="#6c7d76" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterButton} onPress={() => openModal('status')}>
            <Text style={styles.filterButtonText} numberOfLines={1}>
              {filterStatus === 'all' ? i18n.t('common.status') : getStatusConfig(filterStatus).label}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={20} color="#6c7d76" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterButton} onPress={() => openModal('sort')}>
            <Text style={styles.filterButtonText} numberOfLines={1}>
              {sortBy === 'recent' ? i18n.t('common.recent') : sortBy === 'title' ? i18n.t('common.a_z') : i18n.t('common.price')}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={20} color="#6c7d76" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Fonction pour récupérer le nom d'utilisateur
  const fetchProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;

      const response = await fetch(API_PROFILE_URL, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success && data.user) {
        setUsername(data.user.username);
      }
    } catch (error) {
      console.error("Erreur profil:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchGames();
      fetchProfile();
      setIsSelectionMode(false);
      setSelectedGames([]);
    }, [])
  );

  const fetchGames = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;
      const response = await fetch(API_URL, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      if (data.success) setGames(data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    const config = {
      'not_started': { label: i18n.t('status.not_started'), icon: 'inbox', color: '#ccc' },
      'playing': { label: i18n.t('status.playing'), icon: 'play-circle-outline', color: '#4CE5AE' },
      'finished': { label: i18n.t('status.finished'), icon: 'check-circle', color: '#1ed0d0' },
      'completed': { label: i18n.t('status.completed'), icon: 'emoji-events', color: '#ed9c01' },
      'dropped': { label: i18n.t('status.dropped'), icon: 'cancel', color: '#dc3545' },
      'wishlist': { label: i18n.t('status.wishlist'), icon: 'favorite-border', color: '#e83e8c' },
      'loaned': { label: i18n.t('status.loaned'), icon: 'handshake', color: '#f0ad4e' }
    };
    return config[status] || { label: status, icon: 'info-outline', color: '#aaa' };
  };

  const handleLongPress = (id) => {
    if (!isSelectionMode) { setIsSelectionMode(true); setSelectedGames([id]); }
  };

  const handlePress = (item) => {
    if (isSelectionMode) {
      if (selectedGames.includes(item.id)) {
        const newSelection = selectedGames.filter(gameId => gameId !== item.id);
        setSelectedGames(newSelection);
        if (newSelection.length === 0) setIsSelectionMode(false);
      } else {
        setSelectedGames([...selectedGames, item.id]);
      }
    } else {
      router.push({ pathname: `/game/${item.id}`, params: { gameData: JSON.stringify(item) } });
    }
  };

  const deleteSelectedGames = () => {
    Alert.alert(
      i18n.t('home.delete_confirm_title'),
      i18n.t('home.delete_confirm_text', { count: selectedGames.length }),
      [
        { text: i18n.t('common.cancel'), style: "cancel" },
        {
          text: i18n.t('common.delete'), style: "destructive",
          onPress: async () => {
            setIsLoading(true);
            try {
              const token = await SecureStore.getItemAsync('userToken');
              await Promise.all(selectedGames.map(id =>
                fetch(`${API_DELETE_URL}&id=${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
              ));
              setIsSelectionMode(false);
              setSelectedGames([]);
              fetchGames();
            } catch (error) {
              Alert.alert(i18n.t('common.error'), i18n.t('common.error_adding_games'));
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const getStandardPlatform = (platformStr) => {
    if (!platformStr) return i18n.t('common.other');
    if (platformStr.includes(',') || platformStr.includes('/') || platformStr.toLowerCase() === 'multiplateforme') return i18n.t('common.multiplatform');
    return platformStr.trim();
  };

  const handleLendGame = async () => {
    if (!loanedToName.trim()) {
      Alert.alert(i18n.t('common.error'), i18n.t('home.lend_error'));
      return;
    }

    setIsLoading(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');

      // Formatage manuel strict en YYYY-MM-DD garanti sans décalage de fuseau
      const d = new Date(loanedDate);
      const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const response = await fetch(API_UPDATE_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: gameToLend.id,
          status: 'loaned',
          loaned_to: loanedToName.trim(),
          loaned_date: formattedDate // Envoi propre de la date
        })
      });
      const data = await response.json();

      if (data.success) {
        setLendModalVisible(false);
        setLoanedToName('');
        setGameToLend(null);
        Alert.alert(i18n.t('common.success'), i18n.t('home.lend_success', { name: loanedToName.trim() }));
        fetchGames();
      } else {
        Alert.alert(i18n.t('common.error'), data.message);
        setIsLoading(false);
      }
    } catch (error) {
      Alert.alert(i18n.t('common.error'), i18n.t('home.lend_error_api'));
      setIsLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let result = games.filter(game => game.format === activeFormat && game.status !== 'wishlist' && game.status !== 'loaned');

    if (searchQuery.trim() !== '') result = result.filter(g => g.title.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterPlatform !== 'all') result = result.filter(g => getStandardPlatform(g.platform) === filterPlatform);
    if (filterStatus !== 'all') result = result.filter(g => g.status === filterStatus);

    result.sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'platform') return getStandardPlatform(a.platform).localeCompare(getStandardPlatform(b.platform));
      if (sortBy === 'price') return (b.estimated_price || 0) - (a.estimated_price || 0);
      return b.id - a.id;
    });
    return result;
  };

  const displayedGames = applyFiltersAndSort();
  const platformSet = new Set(games.map(g => getStandardPlatform(g.platform)));
  const uniquePlatforms = ['all', ...Array.from(platformSet).sort()];

  const openModal = (type) => { setModalType(type); setModalVisible(true); };

  const getPlatformIcon = (platformStr, iconColor = '#aaa') => {
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
    const isSelected = selectedGames.includes(item.id);
    const statusConfig = getStatusConfig(item.status);

    let finalImageUrl = null;
    if (item.image_url) {
      if (item.image_url.startsWith('http')) {
        finalImageUrl = item.image_url;
      } else if (item.image_url.startsWith('//')) {
        finalImageUrl = `https:${item.image_url}`;
      } else {
        finalImageUrl = `https://www.g-played.com/${item.image_url}`;
      }
    }

    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.cardSelected]}
        activeOpacity={0.7}
        onLongPress={() => handleLongPress(item.id)}
        onPress={() => handlePress(item)}
      >
        {finalImageUrl ? (
          <ExpoImage
            source={{ uri: finalImageUrl }}
            style={[styles.cover, isSelected && styles.coverSelected]}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
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
            {getRegionalPrice(item) ? (
              <View style={[styles.badge, styles.badgePrice]}>
                <MaterialIcons name="sell" size={12} color="#fff" />
                <Text style={styles.badgeTextLight}>{getRegionalPrice(item)}</Text>
              </View>
            ) : null}
            {item.metacritic_score && item.metacritic_score > 0 ? (
              <View style={[styles.badge, styles.badgeMeta]}>
                <ExpoImage
                  source={require('../assets/images/metacritic.svg')}
                  style={{ width: 14, height: 14 }}
                  contentFit="contain" tintColor="#fff"
                />
                <Text style={styles.badgeTextLight}>{item.metacritic_score}</Text>
              </View>
            ) : null}
            {item.playtime && parseFloat(item.playtime) > 0 ? (
              <View style={[styles.badge, styles.badgePlaytime]}>
                <MaterialIcons name="schedule" size={12} color="#fff" />
                <Text style={styles.badgeTextLight}>{item.playtime}h</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusBadge}>
              <MaterialIcons name={statusConfig.icon} size={14} color={statusConfig.color} />
              <Text style={[styles.gameStatus, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>

            {!isSelected && activeFormat === 'physical' && item.status !== 'loaned' && (
              <TouchableOpacity
                style={styles.quickLendButton}
                onPress={() => { setGameToLend(item); setLoanedToName(''); setLoanedDate(new Date()); setLendModalVisible(true); }}
              >
                <MaterialCommunityIcons name="handshake-outline" size={20} color="#f0ad4e" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        {isSelected && (
          <View style={styles.checkOverlay}>
            <MaterialIcons name="check-circle" size={28} color="#dc3545" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const getModalOptions = () => {
    if (modalType === 'platform') return uniquePlatforms.map(p => ({ id: p, label: p === 'all' ? i18n.t('common.all') : p }));
    if (modalType === 'status') {
      return [
        { id: 'all', label: i18n.t('status.all_status') },
        { id: 'not_started', label: i18n.t('status.not_started') },
        { id: 'playing', label: i18n.t('status.playing') },
        { id: 'finished', label: i18n.t('status.finished') },
        { id: 'completed', label: i18n.t('status.completed') },
        { id: 'dropped', label: i18n.t('status.dropped') }
      ];
    }
    if (modalType === 'sort') {
      return [
        { id: 'recent', label: i18n.t('sort.recent') },
        { id: 'title', label: i18n.t('sort.title') },
        { id: 'platform', label: i18n.t('sort.platform') },
        { id: 'price', label: i18n.t('sort.price') }
      ];
    }
    return [];
  };

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#4CE5AE" /></View>;

  return (
    <View style={styles.container}>
      {/* On réactive le header natif (Logo + Avatar) quand on n'est pas en mode sélection */}
      <Tabs.Screen options={{ headerShown: !isSelectionMode }} />

      {isSelectionMode && (
        <View style={styles.selectionHeader}>
          <TouchableOpacity onPress={() => { setIsSelectionMode(false); setSelectedGames([]); }}>
            <MaterialIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.selectionText}>{selectedGames.length} {i18n.t('common.selected')}</Text>
        </View>
      )}

      <FlatList
        data={displayedGames}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderGameCard}
        ListHeaderComponent={renderHeader()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.emptyText}>{i18n.t('home.empty_text')}</Text>}
      />

      {isSelectionMode ? (
        <TouchableOpacity style={[styles.fab, styles.fabDelete]} onPress={deleteSelectedGames}>
          <MaterialIcons name="delete" size={28} color="#fff" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push({ pathname: '/search', params: { defaultStatus: 'not_started', defaultFormat: activeFormat } })}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalType === 'platform' ? i18n.t('common.choose_platform') : modalType === 'status' ? i18n.t('home.choose_status') : i18n.t('common.sort_by')}
            </Text>
            <FlatList
              data={getModalOptions()}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isActive = (modalType === 'platform' && filterPlatform === item.id) ||
                  (modalType === 'status' && filterStatus === item.id) ||
                  (modalType === 'sort' && sortBy === item.id);
                return (
                  <TouchableOpacity
                    style={styles.modalOption}
                    onPress={() => {
                      if (modalType === 'platform') setFilterPlatform(item.id);
                      if (modalType === 'status') setFilterStatus(item.id);
                      if (modalType === 'sort') setSortBy(item.id);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={[styles.modalOptionText, isActive && styles.modalOptionTextActive]}>{item.label}</Text>
                    {isActive && <MaterialIcons name="check" size={20} color="#4CE5AE" />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={lendModalVisible} transparent animationType="fade">
        <View style={styles.lendModalOverlay}>
          <View style={styles.lendModalContent}>
            <Text style={styles.lendModalTitle}>{i18n.t('home.lend_title')}</Text>
            <Text style={styles.lendModalText}>
              {i18n.t('home.lend_question', { game: gameToLend?.title })}
            </Text>
            <TextInput
              style={styles.lendInput}
              placeholder={i18n.t('home.lend_placeholder')}
              placeholderTextColor="#6c7d76"
              value={loanedToName}
              onChangeText={setLoanedToName}
              autoFocus
            />
            <TouchableOpacity style={[styles.lendInput, { justifyContent: 'center' }]} onPress={() => setShowDatePicker(true)}>
              <Text style={{ color: '#fff', fontSize: 16 }}>
                <MaterialIcons name="event" size={16} color="#6c7d76" /> {loanedDate.toLocaleDateString(i18n.locale)}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <View style={{ backgroundColor: '#202020', borderRadius: 12, padding: 10, marginBottom: 16 }}>
                <DateTimePicker
                  value={loanedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  locale={i18n.locale}
                  themeVariant="dark"
                  textColor="#ffffff"
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === 'android') setShowDatePicker(false);
                    if (selectedDate) setLoanedDate(selectedDate);
                  }}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={{ backgroundColor: '#4CE5AE', padding: 12, borderRadius: 8, marginTop: 10, alignItems: 'center' }}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={{ color: '#111', fontWeight: 'bold' }}>Valider la date</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <View style={styles.lendModalActions}>
              <TouchableOpacity style={[styles.lendModalBtn, styles.lendModalBtnCancel]} onPress={() => setLendModalVisible(false)}>
                <Text style={styles.lendModalBtnTextCancel}>{i18n.t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.lendModalBtn, styles.lendModalBtnConfirm]} onPress={handleLendGame}>
                <Text style={styles.lendModalBtnTextConfirm}>{i18n.t('common.confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollableHeaderContainer: { paddingTop: 20 },
  customTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20, },

  pageTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#202020', borderRadius: 50, marginBottom: 16, padding: 4 },
  toggleButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 50 },
  toggleButtonActive: { backgroundColor: '#4CE5AE' },

  container: { flex: 1, backgroundColor: '#1b1b1b' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1b1b1b' },

  selectionHeader: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#dc3545', marginBottom: 20 },
  selectionText: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginLeft: 20 },

  toggleText: { color: '#6c7d76', fontWeight: 'bold' },
  toggleIcons: { color: '#6c7d76', fontSize: 18 },
  toggleIconsActive: { color: '#111', fontSize: 18 },
  toggleTextActive: { color: '#111' },

  localSearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#202020', borderRadius: 12, borderWidth: 1, borderColor: '#333', marginBottom: 16, paddingHorizontal: 12, height: 44 },
  localSearchIcon: { marginRight: 8 },
  localSearchInput: { flex: 1, color: '#fff', fontSize: 14 },

  filtersRow: { flexDirection: 'row', marginBottom: 16, gap: 10 },
  filterButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#202020', borderWidth: 1, borderColor: '#333', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  filterButtonText: { color: '#ccc', fontSize: 13, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1b1b1b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '60%', borderWidth: 1, borderColor: '#333' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
  modalOptionText: { color: '#ccc', fontSize: 16 },
  modalOptionTextActive: { color: '#4CE5AE', fontWeight: 'bold' },

  listContainer: { paddingHorizontal: 16, paddingBottom: 80 },
  card: { flexDirection: 'row', backgroundColor: '#202020', borderRadius: 24, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', position: 'relative' },
  cardSelected: { borderColor: '#dc3545', borderWidth: 2, backgroundColor: 'rgba(220, 53, 69, 0.1)' },
  coverSelected: { opacity: 0.5 },
  checkOverlay: { position: 'absolute', right: 20, top: '40%' },

  cover: { display: 'flex', alignItems: 'center', justifyContent: 'center', justifyItems: 'center', flexDirection: 'row-reverse', width: '100', height: '100vh' },
  placeholderCover: { backgroundColor: '#151515' },

  cardInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  gameTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },

  badgesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8, marginTop: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, gap: 4 },
  badgePlatform: { backgroundColor: '#fff' },
  badgePrice: { backgroundColor: '#2e6c56' },
  badgePlaytime: { backgroundColor: '#8e44ad' },
  badgeMeta: { backgroundColor: '#ed9c01' },
  badgeTextPlatform: { fontSize: 11, fontWeight: 'bold', color: '#111' },
  badgeTextLight: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gameStatus: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  emptyText: { color: '#6c7d76', textAlign: 'center', marginTop: 40, fontSize: 16 },
  fab: { position: 'absolute', bottom: 25, right: 25, width: 60, height: 60, borderRadius: 30, backgroundColor: '#4CE5AE', justifyContent: 'center', alignItems: 'center', elevation: 5, zIndex: 10 },
  fabText: { color: '#111', fontSize: 32, fontWeight: 'bold', lineHeight: 34 },
  fabDelete: { backgroundColor: '#dc3545' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quickLendButton: { backgroundColor: 'rgba(240, 173, 78, 0.1)', padding: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(240, 173, 78, 0.3)' },

  lendModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  lendModalContent: { backgroundColor: '#1b1b1b', width: '100%', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#333' },
  lendModalTitle: { color: '#f0ad4e', fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  lendModalText: { color: '#ccc', fontSize: 15, marginBottom: 20, textAlign: 'center' },
  lendInput: { backgroundColor: '#202020', color: '#fff', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#333', marginBottom: 24 },
  lendModalActions: { flexDirection: 'row', gap: 12 },
  lendModalBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  lendModalBtnCancel: { backgroundColor: 'transparent', borderColor: '#6c7d76', borderRadius: 35 },
  lendModalBtnConfirm: { backgroundColor: '#f0ad4e', borderColor: '#f0ad4e', borderRadius: 35 },
  lendModalBtnTextCancel: { color: '#ccc', fontWeight: 'bold', fontSize: 16 },
  lendModalBtnTextConfirm: { color: '#111', fontWeight: 'bold', fontSize: 16 }
});