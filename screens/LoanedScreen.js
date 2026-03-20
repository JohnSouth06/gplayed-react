import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Image as ExpoImage } from 'expo-image';
import { Tabs, useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getRegionalPrice } from '../config/currency';
import i18n from '../config/i18n';

export default function LoanedScreen() {
  const router = useRouter();
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedGames, setSelectedGames] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState(null);

  // Nouveaux états pour l'édition
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [gameToEdit, setGameToEdit] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const API_URL = 'https://www.g-played.com/api/index.php?action=api_get_games';
  const API_DELETE_URL = 'https://www.g-played.com/api/index.php?action=api_delete_game';
  const API_UPDATE_URL = 'https://www.g-played.com/api/index.php?action=api_update_game';

  useFocusEffect(
    useCallback(() => {
      fetchLoanedGames();
      setIsSelectionMode(false);
      setSelectedGames([]);
    }, [])
  );

  const fetchLoanedGames = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;
      const response = await fetch(API_URL, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      if (data.success) {
        const loanedGames = data.data.filter(game => game.status === 'loaned');
        setGames(loanedGames);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
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
      i18n.t('common.delete'),
      i18n.t('loaned.delete_confirm_text', { count: selectedGames.length }),
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
              fetchLoanedGames();
            } catch (error) {
              Alert.alert(i18n.t('common.error'), i18n.t('common.error'));
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const promptReturn = (game) => {
    Alert.alert(
      i18n.t('loaned.return_title'),
      i18n.t('loaned.return_question', { game: game.title, name: game.loaned_to || i18n.t('common.unknown') }),
      [
        { text: i18n.t('common.cancel'), style: "cancel" },
        { text: i18n.t('loaned.return_confirm'), onPress: () => returnGame(game.id) }
      ]
    );
  };

  const returnGame = async (gameId) => {
    setIsLoading(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(API_UPDATE_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: gameId, status: 'completed' })
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert(i18n.t('common.success'), i18n.t('loaned.return_success'));
        fetchLoanedGames();
      } else {
        Alert.alert(i18n.t('common.error'), data.message);
        setIsLoading(false);
      }
    } catch (error) {
      Alert.alert(i18n.t('common.error'), i18n.t('loaned.return_error'));
      setIsLoading(false);
    }
  };

  const openEditModal = (game) => {
    setGameToEdit(game);
    setEditName(game.loaned_to || '');
    setEditDate(game.loaned_date ? new Date(game.loaned_date) : new Date());
    setEditModalVisible(true);
  };

  const handleUpdateLoan = async () => {
    if (!editName.trim()) {
      Alert.alert(i18n.t('common.error'), 'Veuillez renseigner un nom');
      return;
    }

    setIsLoading(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');

      // Formatage manuel strict en YYYY-MM-DD
      const d = new Date(editDate);
      const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const response = await fetch(API_UPDATE_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: gameToEdit.id,
          status: 'loaned',
          loaned_to: editName.trim(),
          loaned_date: formattedDate
        })
      });
      const data = await response.json();

      if (data.success) {
        setEditModalVisible(false);
        fetchLoanedGames();
      } else {
        Alert.alert(i18n.t('common.error'), data.message);
        setIsLoading(false);
      }
    } catch (error) {
      Alert.alert(i18n.t('common.error'), 'Erreur de mise à jour');
      setIsLoading(false);
    }
  };

  const getStandardPlatform = (platformStr) => {
    if (!platformStr) return i18n.t('common.other');
    if (platformStr.includes(',') || platformStr.includes('/') || platformStr.toLowerCase() === 'multiplateforme') return i18n.t('common.multiplatform');
    return platformStr.trim();
  };

  const applyFiltersAndSort = () => {
    let result = [...games];
    if (searchQuery.trim() !== '') result = result.filter(g => g.title.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterPlatform !== 'all') result = result.filter(g => getStandardPlatform(g.platform) === filterPlatform);

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

  // --- NOUVEAU : LA FONCTION POUR LE HEADER DÉFILANT ---
  const renderHeader = () => {
    if (isSelectionMode) return null;

    return (
      <View style={styles.scrollableHeaderContainer}>
        {/* Titre de la page */}
        <Text style={styles.pageTitle}>{i18n.t('loaned.title')}</Text>

        {/* On affiche les filtres et recherche uniquement s'il y a des jeux prêtés dans la collection */}
        {games.length > 0 && (
          <>
            {/* Barre de recherche */}
            <View style={styles.localSearchContainer}>
              <MaterialIcons name="search" size={20} color="#6c7d76" style={styles.localSearchIcon} />
              <TextInput
                style={styles.localSearchInput}
                placeholder={i18n.t('loaned.search_placeholder')}
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

            {/* Boutons de filtres */}
            <View style={styles.filtersRow}>
              <TouchableOpacity style={styles.filterButton} onPress={() => openModal('platform')}>
                <Text style={styles.filterButtonText} numberOfLines={1}>{filterPlatform === 'all' ? i18n.t('common.platforms') : filterPlatform}</Text>
                <MaterialIcons name="arrow-drop-down" size={20} color="#6c7d76" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.filterButton} onPress={() => openModal('sort')}>
                <Text style={styles.filterButtonText} numberOfLines={1}>{sortBy === 'recent' ? i18n.t('common.recent') : sortBy === 'title' ? i18n.t('common.a_z') : sortBy === 'platform' ? i18n.t('common.platform') : i18n.t('common.price')}</Text>
                <MaterialIcons name="arrow-drop-down" size={20} color="#6c7d76" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  };

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
    const formattedDate = item.loaned_date ? new Date(item.loaned_date).toLocaleDateString('fr-FR') : i18n.t('common.unknown');

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
          </View>

          <View style={styles.loanInfoContainer}>
            <Text style={styles.loanInfoText} numberOfLines={1}>
              <MaterialIcons name="person" size={14} color="#f0ad4e" /> {i18n.t('loaned.loaned_to')} <Text style={styles.loanInfoBold}>{item.loaned_to || i18n.t('common.unknown')}</Text>
            </Text>
            <Text style={styles.loanInfoText}>
              <MaterialIcons name="event" size={14} color="#f0ad4e" /> Prêté le: <Text style={styles.loanInfoBold}>{formattedDate}</Text>
            </Text>
          </View>
        </View>

        {isSelected ? (
          <View style={styles.checkOverlay}>
            <MaterialIcons name="check-circle" size={28} color="#dc3545" />
          </View>
        ) : (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(item)}>
              <MaterialIcons name="edit" size={24} color="#4CE5AE" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.returnButton} onPress={() => promptReturn(item)}>
              <MaterialCommunityIcons name="keyboard-return" size={26} color="#f0ad4e" />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#4CE5AE" /></View>;

  return (
    <View style={styles.container}>
      <Tabs.Screen options={{ headerShown: !isSelectionMode }} />

      {/* Header de sélection (mode suppression multiple) */}
      {isSelectionMode && (
        <View style={styles.selectionHeader}>
          <TouchableOpacity onPress={() => { setIsSelectionMode(false); setSelectedGames([]); }}>
            <MaterialIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.selectionText}>{selectedGames.length} {i18n.t('common.selected')}</Text>
        </View>
      )}

      {/* Liste principale englobant maintenant le header défilant et l'état vide */}
      <FlatList
        data={displayedGames}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderGameCard}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {/* On gère intelligemment le message selon que l'on n'a aucun jeu prêté du tout, ou aucun résultat de recherche */}
            <Text style={styles.emptyText}>
              {games.length === 0 ? i18n.t('loaned.empty_text') : i18n.t('loaned.empty_search')}
            </Text>
          </View>
        }
      />

      {/* Bouton de suppression flottant */}
      {isSelectionMode && (
        <TouchableOpacity style={[styles.fab, styles.fabDelete]} onPress={deleteSelectedGames}>
          <MaterialIcons name="delete" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Modale d'édition */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.lendModalOverlay}>
          <View style={styles.lendModalContent}>
            <Text style={styles.lendModalTitle}>Modifier le prêt</Text>
            <TextInput
              style={styles.lendInput}
              placeholder="Prêté à"
              placeholderTextColor="#6c7d76"
              value={editName}
              onChangeText={setEditName}
            />

            <TouchableOpacity style={[styles.lendInput, { justifyContent: 'center' }]} onPress={() => setShowDatePicker(true)}>
              <Text style={{ color: '#fff', fontSize: 16 }}>
                <MaterialIcons name="event" size={16} color="#6c7d76" /> {editDate.toLocaleDateString(i18n.locale)}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <View style={{ backgroundColor: '#202020', borderRadius: 12, padding: 10, marginBottom: 16 }}>
                <DateTimePicker
                  value={editDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  locale={i18n.locale} 
                  themeVariant="dark"
                  textColor="#ffffff"
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === 'android') setShowDatePicker(false);
                    if (selectedDate) setEditDate(selectedDate);
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
              <TouchableOpacity style={[styles.lendModalBtn, styles.lendModalBtnCancel]} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.lendModalBtnTextCancel}>{i18n.t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.lendModalBtn, styles.lendModalBtnConfirm]} onPress={handleUpdateLoan}>
                <Text style={styles.lendModalBtnTextConfirm}>{i18n.t('common.confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* VOUS POUVEZ RAJOUTER VOTRE MODALE DE FILTRES ICI SI ELLE MANQUAIT DANS VOTRE CODE SOURCE */}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollableHeaderContainer: { paddingTop: 20 },
  container: { flex: 1, backgroundColor: '#1b1b1b' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1b1b1b' },

  pageTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#202020', borderRadius: 50, marginBottom: 16, padding: 4 },
  toggleButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 50 },
  toggleButtonActive: { backgroundColor: '#4CE5AE' },
  toggleText: { color: '#6c7d76', fontWeight: 'bold' },
  toggleIcons: { color: '#6c7d76', fontSize: 18 },
  toggleIconsActive: { color: '#111', fontSize: 18 },
  toggleTextActive: { color: '#111' },
  
  selectionHeader: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#dc3545', marginBottom: 16 },
  selectionText: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginLeft: 20 },
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
  
  // --- Le listContainer a été ajusté pour permettre le flexGrow ---
  listContainer: { paddingHorizontal: 16, paddingBottom: 80, flexGrow: 1 },
  
  card: { flexDirection: 'row', backgroundColor: '#202020', borderRadius: 24, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', position: 'relative' },
  cardSelected: { borderColor: '#dc3545', borderWidth: 2, backgroundColor: 'rgba(220, 53, 69, 0.1)' },
  coverSelected: { opacity: 0.5 },
  checkOverlay: { position: 'absolute', right: 20, top: '40%' },
  placeholderCover: { backgroundColor: '#151515' },
  cardInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  gameTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  badgesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8, marginTop: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, gap: 4 },
  badgePlatform: { backgroundColor: '#fff' },
  badgePrice: { backgroundColor: '#2e6c56' },
  badgeMeta: { backgroundColor: '#ed9c01' },
  badgeTextPlatform: { fontSize: 11, fontWeight: 'bold', color: '#111' },
  badgeTextLight: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  cover: { width: 90, height: 140 },
  loanInfoContainer: { backgroundColor: 'rgba(240, 173, 78, 0.1)', padding: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(240, 173, 78, 0.3)', marginTop: 4 },
  loanInfoText: { fontSize: 11, color: '#ccc', marginBottom: 2 },
  loanInfoBold: { fontWeight: 'bold', color: '#fff' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, marginTop: 40 },
  emptyText: { color: '#6c7d76', fontSize: 16, textAlign: 'center', marginBottom: 20 },
  fab: { position: 'absolute', bottom: 25, right: 25, width: 60, height: 60, borderRadius: 30, backgroundColor: '#4CE5AE', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabDelete: { backgroundColor: '#dc3545' },

  actionButtons: { flexDirection: 'row', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.05)' },
  editButton: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  returnButton: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  lendModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  lendModalContent: { backgroundColor: '#1b1b1b', width: '100%', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#333' },
  lendModalTitle: { color: '#f0ad4e', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  lendInput: { backgroundColor: '#202020', color: '#fff', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#333', marginBottom: 16, height: 55 },
  lendModalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  lendModalBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  lendModalBtnCancel: { backgroundColor: 'transparent', borderColor: '#6c7d76', borderRadius: 35 },
  lendModalBtnConfirm: { backgroundColor: '#f0ad4e', borderColor: '#f0ad4e', borderRadius: 35 },
  lendModalBtnTextCancel: { color: '#ccc', fontWeight: 'bold', fontSize: 16 },
  lendModalBtnTextConfirm: { color: '#111', fontWeight: 'bold', fontSize: 16 }
});