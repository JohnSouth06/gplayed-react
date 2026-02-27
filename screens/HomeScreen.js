import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Tabs, useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFormat, setActiveFormat] = useState('physical');

  // États pour la sélection
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedGames, setSelectedGames] = useState([]);

  // NOUVEAU : États pour les filtres et le tri
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState(null); // 'platform', 'status', ou 'sort'

  const API_URL = 'https://www.g-played.com/api/index.php?action=api_get_games';
  const API_DELETE_URL = 'https://www.g-played.com/api/index.php?action=api_delete_game';

  useFocusEffect(
    useCallback(() => {
      fetchGames();
      setIsSelectionMode(false);
      setSelectedGames([]);
    }, [])
  );

  const fetchGames = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;

      const response = await fetch(API_URL, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) setGames(data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    const statusMap = { 'not_started': 'À faire', 'playing': 'En cours', 'completed': 'Terminé', 'dropped': 'Abandonné', 'wishlist': 'Souhait', 'loaned': 'Prêté' };
    return statusMap[status] || status;
  };

  const handleLongPress = (id) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedGames([id]);
    }
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
      "Supprimer les jeux",
      `Voulez-vous vraiment retirer ces ${selectedGames.length} jeux de votre ludothèque ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
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
              Alert.alert('Erreur', 'Impossible de supprimer les jeux.');
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  // --- LOGIQUE DE FILTRAGE ET DE TRI ---
  const getStandardPlatform = (platformStr) => {
    if (!platformStr) return 'Autre';
    // S'il y a une virgule, c'est que plusieurs plateformes sont renseignées -> Multiplateforme
    if (platformStr.includes(',') || platformStr.includes('/') || platformStr.toLowerCase() === 'multiplateforme') {
      return 'Multiplateforme';
    }
    return platformStr.trim();
  };

  const applyFiltersAndSort = () => {
    let result = games.filter(game => game.format === activeFormat && game.status !== 'wishlist');

    if (searchQuery.trim() !== '') {
      result = result.filter(g => g.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (filterPlatform !== 'all') {
      result = result.filter(g => getStandardPlatform(g.platform) === filterPlatform);
    }
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

  const openModal = (type) => {
    setModalType(type);
    setModalVisible(true);
  };

  // Fonction pour afficher le logo de la plateforme
  const getPlatformIcon = (platformStr) => {
    if (!platformStr) return <MaterialIcons name="videogame-asset" size={16} color="#aaa" />;

    const platL = platformStr.toLowerCase();

    // Multiplateforme
    if (platL.includes(',') || platL.includes('/') || platL.includes('multiplateforme')) {
      return <MaterialIcons name="devices" size={16} color="#aaa" />;
    }
    // PlayStation
    else if (platL.includes('ps') || platL.includes('playstation')) {
      return <MaterialCommunityIcons name="sony-playstation" size={16} color="#aaa" />;
    }
    // Xbox
    else if (platL.includes('xbox')) {
      return <MaterialCommunityIcons name="microsoft-xbox" size={16} color="#aaa" />;
    }
    // Nintendo Switch
    else if (platL.includes('switch') || platL.includes('nintendo')) {
      return <MaterialCommunityIcons name="nintendo-switch" size={16} color="#aaa" />;
    }
    // PC
    else if (platL.includes('pc') || platL.includes('windows')) {
      return <MaterialCommunityIcons name="microsoft-windows" size={16} color="#aaa" />;
    }

    // Par défaut
    return <MaterialIcons name="videogame-asset" size={16} color="#aaa" />;
  };

  const renderGameCard = ({ item }) => {
    const isSelected = selectedGames.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.cardSelected]}
        activeOpacity={0.7}
        onLongPress={() => handleLongPress(item.id)}
        onPress={() => handlePress(item)}
      >
        {item.image_url ? (
          <Image source={{ uri: `https://www.g-played.com/${item.image_url}` }} style={[styles.cover, isSelected && styles.coverSelected]} />
        ) : (
          <View style={[styles.cover, styles.placeholderCover]} />
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.gameTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.platformContainer}>
            {getPlatformIcon(item.platform)}
            <Text style={styles.gamePlatform}>{item.platform}</Text>
          </View>
          <Text style={styles.gameStatus}>{getStatusLabel(item.status)}</Text>
        </View>
        {isSelected && (
          <View style={styles.checkOverlay}>
            <MaterialIcons name="check-circle" size={28} color="#dc3545" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Contenu dynamique de la Modal selon le bouton cliqué
  const getModalOptions = () => {
    if (modalType === 'platform') {
      return uniquePlatforms.map(p => ({ id: p, label: p === 'all' ? 'Tous' : p }));
    }
    if (modalType === 'status') {
      return [
        { id: 'all', label: 'Tous les statuts' },
        { id: 'not_started', label: 'À faire' },
        { id: 'playing', label: 'En cours' },
        { id: 'completed', label: 'Terminé' },
        { id: 'dropped', label: 'Abandonné' }
      ];
    }
    if (modalType === 'sort') {
      return [
        { id: 'recent', label: 'Ajouts récents' },
        { id: 'title', label: 'De A à Z' },
        { id: 'platform', label: 'Par Plateforme' },
        { id: 'price', label: 'Prix décroissant' }
      ];
    }
    return [];
  };

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#4CE5AE" /></View>;

  return (
    <View style={styles.container}>
      <Tabs.Screen options={{ headerShown: !isSelectionMode }} />

      {isSelectionMode && (
        <View style={styles.selectionHeader}>
          <TouchableOpacity onPress={() => { setIsSelectionMode(false); setSelectedGames([]); }}>
            <MaterialIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.selectionText}>{selectedGames.length} sélectionné(s)</Text>
        </View>
      )}

      {!isSelectionMode && (
        <View style={styles.toggleContainer}>
          <TouchableOpacity style={[styles.toggleButton, activeFormat === 'physical' && styles.toggleButtonActive]} onPress={() => setActiveFormat('physical')}>
            <Text style={[styles.toggleText, activeFormat === 'physical' && styles.toggleTextActive]}>Physique</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toggleButton, activeFormat === 'digital' && styles.toggleButtonActive]} onPress={() => setActiveFormat('digital')}>
            <Text style={[styles.toggleText, activeFormat === 'digital' && styles.toggleTextActive]}>Digital</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* NOUVEAU : Barre de recherche locale */}
      {!isSelectionMode && (
        <View style={styles.localSearchContainer}>
          <MaterialIcons name="search" size={20} color="#6c7d76" style={styles.localSearchIcon} />
          <TextInput
            style={styles.localSearchInput}
            placeholder="Rechercher un jeu..."
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
      )}

      {/* NOUVEAU : Barre des filtres */}
      {!isSelectionMode && (
        <View style={styles.filtersRow}>
          <TouchableOpacity style={styles.filterButton} onPress={() => openModal('platform')}>
            <Text style={styles.filterButtonText} numberOfLines={1}>
              {filterPlatform === 'all' ? 'Plateformes' : filterPlatform}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={20} color="#6c7d76" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterButton} onPress={() => openModal('status')}>
            <Text style={styles.filterButtonText} numberOfLines={1}>
              {filterStatus === 'all' ? 'Statut' : getStatusLabel(filterStatus)}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={20} color="#6c7d76" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterButton} onPress={() => openModal('sort')}>
            <Text style={styles.filterButtonText} numberOfLines={1}>
              {sortBy === 'recent' ? 'Récent' : sortBy === 'title' ? 'A - Z' : sortBy === 'platform' ? 'Plateforme' : 'Prix'}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={20} color="#6c7d76" />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={displayedGames}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderGameCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.emptyText}>Aucun jeu ne correspond à vos filtres.</Text>}
      />

      {isSelectionMode ? (
        <TouchableOpacity style={[styles.fab, styles.fabDelete]} onPress={deleteSelectedGames}>
          <MaterialIcons name="delete" size={28} color="#fff" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.fab} onPress={() => router.push({ pathname: '/search', params: { defaultStatus: 'not_started', defaultFormat: activeFormat } })}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {/* NOUVEAU : Modal Menu (BottomSheet) pour les options */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalType === 'platform' ? 'Choisir une plateforme' : modalType === 'status' ? 'Choisir un statut' : 'Trier par'}
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
                    <Text style={[styles.modalOptionText, isActive && styles.modalOptionTextActive]}>
                      {item.label}
                    </Text>
                    {isActive && <MaterialIcons name="check" size={20} color="#4CE5AE" />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1b1b1b' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1b1b1b' },

  selectionHeader: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#dc3545', marginBottom: 20 },
  selectionText: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginLeft: 20 },

  toggleContainer: { flexDirection: 'row', backgroundColor: '#202020', borderRadius: 50, marginHorizontal: 20, marginBottom: 16, marginTop: 16, padding: 4 },
  toggleButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 50 },
  toggleButtonActive: { backgroundColor: '#4CE5AE' },
  toggleText: { color: '#6c7d76', fontWeight: 'bold' },
  toggleTextActive: { color: '#111' },

// NOUVEAU : Styles de la barre de recherche locale
  localSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202020',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 44,
  },
  localSearchIcon: { marginRight: 8 },
  localSearchInput: { flex: 1, color: '#fff', fontSize: 14 },

  // NOUVEAU : Styles de la barre de filtres
  filtersRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, gap: 10 },
  filterButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#202020', borderWidth: 1, borderColor: '#333', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  filterButtonText: { color: '#ccc', fontSize: 13, fontWeight: '600' },

  // NOUVEAU : Styles de la Modal
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

  cover: { width: 100, height: 120 },
  placeholderCover: { backgroundColor: '#151515' },
  cardInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  gameTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  gamePlatform: { fontSize: 14, color: '#aaa', marginBottom: 8 },
  gameStatus: { fontSize: 12, color: '#4CE5AE', fontWeight: 'bold', textTransform: 'uppercase' },

  emptyText: { color: '#6c7d76', textAlign: 'center', marginTop: 40, fontSize: 16 },

  fab: { position: 'absolute', bottom: 25, right: 25, width: 60, height: 60, borderRadius: 30, backgroundColor: '#4CE5AE', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabText: { color: '#111', fontSize: 32, fontWeight: 'bold', lineHeight: 34 },
  fabDelete: { backgroundColor: '#dc3545' },

  platformContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
  gamePlatform: { fontSize: 14, color: '#aaa' }
});