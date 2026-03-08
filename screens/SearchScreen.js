import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import i18n from '../config/i18n';

export default function SearchScreen() {
  const { defaultStatus, defaultFormat } = useLocalSearchParams();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const router = useRouter();

  // GESTION DES DOUBLONS AVEC LA COLLECTION DE L'UTILISATEUR
  const [myGames, setMyGames] = useState([]);

  // GESTION DE LA MODALE PLATEFORME
  const [isPlatformModalVisible, setPlatformModalVisible] = useState(false);
  const [gameToAdd, setGameToAdd] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [newPlatformText, setNewPlatformText] = useState('');
  const [availablePlatforms, setAvailablePlatforms] = useState([
    'PS5', 'PS4', 'Xbox Series', 'Xbox One', 'Nintendo Switch', 'PC'
  ]);

  const API_GET_GAMES_URL = 'https://www.g-played.com/api/index.php?action=api_get_games';
  const API_SEARCH_URL = 'https://www.g-played.com/api/index.php?action=api_search_igdb';
  const API_SAVE_URL = 'https://www.g-played.com/api/index.php?action=api_save_game';

  // Récupérer la collection actuelle à l'ouverture de la page pour bloquer les doublons
  useFocusEffect(
    useCallback(() => {
      fetchMyGames();
    }, [])
  );

  const fetchMyGames = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;
      const response = await fetch(API_GET_GAMES_URL, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      if (data.success) setMyGames(data.data);
    } catch (error) {
      console.error("Erreur récupération collection:", error);
    }
  };

  // 1. FONCTION DE NORMALISATION (IGDB -> Base locale)
  const normalizePlatform = (igdbName) => {
    if (!igdbName) return 'Inconnu';
    const lower = igdbName.toLowerCase();
    
    if (lower.includes('playstation 5') || lower === 'ps5') return 'PS5';
    if (lower.includes('playstation 4') || lower === 'ps4') return 'PS4';
    if (lower.includes('playstation 3') || lower === 'ps3') return 'PS3';
    if (lower.includes('xbox series')) return 'Xbox Series';
    if (lower.includes('xbox one')) return 'Xbox One';
    if (lower.includes('switch') || lower.includes('nintendo switch')) return 'Nintendo Switch';
    if (lower.includes('pc') || lower.includes('windows')) return 'PC';
    if (lower.includes('mac')) return 'Mac';
    if (lower.includes('linux')) return 'Linux';
    
    return igdbName; // Retourne le nom exact d'IGDB si la console n'est pas dans nos raccourcis
  };

  // 2. EXTRACTION DES PLATEFORMES FOURNIES PAR LE PHP
  const extractPlatforms = (game) => {
    let extracted = [];
    if (game.platforms && Array.isArray(game.platforms)) {
      game.platforms.forEach(plat => {
        extracted.push(normalizePlatform(plat));
      });
    }

    // Nettoyage des doublons générés par la normalisation
    extracted = [...new Set(extracted)].filter(p => p && p !== 'Inconnu');
    return extracted.length > 0 ? extracted : null;
  };

  const handleSearch = async () => {
    if (query.length < 2) return;
    setIsSearching(true);

    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(`${API_SEARCH_URL}&q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
 
      let rawResults = data.data || data.results || data || [];
      const expandedResults = [];
      
      rawResults.forEach((game, index) => {
        const plats = extractPlatforms(game);
        const baseId = game.id || `temp_${index}`;
        
        if (plats) {
          // Création d'une ligne de résultat pour chaque plateforme trouvée et traduite
          plats.forEach((platName, pIndex) => {
            expandedResults.push({
              ...game,
              uniqueKey: `${baseId}_${pIndex}`, 
              singlePlatform: platName
            });
          });
        } else {
          expandedResults.push({
            ...game,
            uniqueKey: `${baseId}_inconnu`,
            singlePlatform: 'Inconnu'
          });
        }
      });

      setResults(expandedResults);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de chercher le jeu.');
    } finally {
      setIsSearching(false);
    }
  };

  const openAddModal = (game) => {
    setGameToAdd(game);
    // On pré-sélectionne la plateforme traduite
    if (game.singlePlatform && game.singlePlatform !== 'Inconnu') {
      setSelectedPlatform(game.singlePlatform);
      
      if (!availablePlatforms.includes(game.singlePlatform)) {
        setAvailablePlatforms(prev => [...prev, game.singlePlatform]);
      }
    } else {
      setSelectedPlatform('');
    }
    setPlatformModalVisible(true);
  };

  const confirmAddGame = async () => {
    if (!selectedPlatform) {
      Alert.alert('Erreur', 'Veuillez sélectionner une plateforme.');
      return;
    }

    setPlatformModalVisible(false);
    setAddingId(gameToAdd.uniqueKey);

    let imageToSave = gameToAdd.background_image || (gameToAdd.cover ? gameToAdd.cover.url : null);
    if (imageToSave && imageToSave.startsWith('//')) {
      imageToSave = `https:${imageToSave}`;
    }

    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(API_SAVE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rawg_id: gameToAdd.id,
          title: gameToAdd.name,
          platform: selectedPlatform, 
          status: defaultStatus || 'not_started', 
          format: defaultFormat || 'physical', 
          background_image: imageToSave,
          metacritic: gameToAdd.metacritic
        })
      });
      
      const data = await response.json();
      if (data.success) {
        Alert.alert(i18n.t('common.success'), `${gameToAdd.name} (${selectedPlatform}) ${i18n.t('common.game_added')} !`);
        fetchMyGames(); 
      } else {
        Alert.alert(i18n.t('common.error'), data.message || i18n.t('common.error_adding_game'));
      }
    } catch (error) {
      Alert.alert(i18n.t('common.error'), i18n.t('common.error_adding_game'));
    } finally {
      setAddingId(null);
      setGameToAdd(null);
    }
  };

  const addNewPlatform = () => {
    const plat = newPlatformText.trim();
    if (plat && !availablePlatforms.includes(plat)) {
      setAvailablePlatforms([...availablePlatforms, plat]);
      setSelectedPlatform(plat);
      setNewPlatformText('');
    }
  };

  const renderResult = ({ item }) => {
    let imageUrl = item.background_image || (item.cover ? item.cover.url : null);
    if (imageUrl && imageUrl.startsWith('//')) {
      imageUrl = `https:${imageUrl}`;
    }

    let year = 'Année inconnue';
    if (item.first_release_date) {
      year = new Date(item.first_release_date * 1000).getFullYear();
    } else if (item.released) {
      year = item.released.split('-')[0];
    }

    // 3. VÉRIFICATION DU DOUBLON : On compare l'ID/Nom ET la Plateforme
    const isAlreadyInCollection = myGames.some(g =>
      (g.rawg_id == item.id || g.title.toLowerCase() === item.name.toLowerCase()) &&
      g.platform === item.singlePlatform
    );

    return (
      <View style={styles.card}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.placeholderCover]} />
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.gameTitle} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.gameYear}>{year} • {item.singlePlatform}</Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.addButton, isAlreadyInCollection && styles.addedButton]} 
          onPress={() => {
            if (isAlreadyInCollection) {
              Alert.alert(i18n.t('common.already_acquired'), `${i18n.t('common.already_added')} ${item.singlePlatform}.`);
            } else {
              openAddModal(item);
            }
          }}
          disabled={addingId === item.uniqueKey}
        >
          {addingId === item.uniqueKey ? (
            <ActivityIndicator color="#1b1b1b" size="small" />
          ) : isAlreadyInCollection ? (
            <MaterialIcons name="check" size={24} color="#111" />
          ) : (
            <Text style={styles.addButtonText}>+</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          onPress={() => {
            if (router.canGoBack()) {
              router.back(); // Retourne exactement à l'écran précédent
            } else {
              router.navigate('/home'); // Sécurité
            }
          }} 
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t('common.add_game')}</Text>
      </View>
      
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder={i18n.t('common.search_placeholder')}
          placeholderTextColor="#6c7d76"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
      </View>

      {isSearching ? (
        <ActivityIndicator size="large" color="#4CE5AE" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.uniqueKey} 
          renderItem={renderResult}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={isPlatformModalVisible} transparent animationType="slide" onRequestClose={() => setPlatformModalVisible(false)} >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{i18n.t('common.confirm_platform')}</Text>
            <Text style={styles.modalSubtitle}>{gameToAdd?.name}</Text>
            
            <FlatList
              data={availablePlatforms}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected = selectedPlatform === item;
                return (
                  <TouchableOpacity style={styles.modalOption} onPress={() => setSelectedPlatform(item)}>
                    <Text style={[styles.modalOptionText, isSelected && { color: '#4CE5AE', fontWeight: 'bold' }]}>{item}</Text>
                    <MaterialIcons name={isSelected ? "radio-button-checked" : "radio-button-unchecked"} size={24} color={isSelected ? "#4CE5AE" : "#6c7d76"} />
                  </TouchableOpacity>
                )
              }}
              style={{ maxHeight: 250 }}
              showsVerticalScrollIndicator={false}
            />

            <View style={styles.newPlatformContainer}>
              <TextInput
                style={[styles.searchInput, styles.newPlatformInput]}
                placeholder={i18n.t('common.other_platform')}
                placeholderTextColor="#6c7d76"
                value={newPlatformText}
                onChangeText={setNewPlatformText}
              />
              <TouchableOpacity style={styles.addPlatformBtn} onPress={addNewPlatform}>
                <MaterialIcons name="add" size={24} color="#111" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.saveButton, styles.cancelButton]} onPress={() => setPlatformModalVisible(false)}>
                <Text style={[styles.saveButtonText, { color: '#fff' }]}>{i18n.t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={confirmAddGame}>
                <Text style={styles.saveButtonText}>{i18n.t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1b1b1b' },
  headerContainer: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20 },
  backButton: { marginRight: 16, padding: 4 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  searchBox: { marginHorizontal: 16, marginBottom: 20, backgroundColor: '#202020', borderRadius: 50, borderWidth: 1, borderColor: '#333' },
  searchInput: { color: '#fff', paddingHorizontal: 20, height: 50, fontSize: 16 },
  listContainer: { paddingHorizontal: 16, paddingBottom: 20 },
  card: { flexDirection: 'row', backgroundColor: '#202020', borderRadius: 24, marginBottom: 16, overflow: 'hidden', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cover: { width: 80, height: 100 },
  placeholderCover: { backgroundColor: '#151515' },
  cardInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  gameTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  gameYear: { fontSize: 13, color: '#6c7d76', fontWeight: '600' },
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4CE5AE', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  addedButton: { backgroundColor: '#333' }, // Style du bouton quand on a déjà le jeu (grisé)
  addButtonText: { color: '#1b1b1b', fontSize: 24, fontWeight: 'bold', lineHeight: 26 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1b1b1b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%', borderWidth: 1, borderColor: '#333' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4, textAlign: 'center' },
  modalSubtitle: { color: '#ccc', fontSize: 14, marginBottom: 16, textAlign: 'center' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
  modalOptionText: { color: '#ccc', fontSize: 16 },
  newPlatformContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 10 },
  newPlatformInput: { flex: 1, height: 44, backgroundColor: '#202020', borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  addPlatformBtn: { backgroundColor: '#4CE5AE', width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalActions: { flexDirection: 'row', marginTop: 24, gap: 12 },
  saveButton: { flex: 1, backgroundColor: '#4CE5AE', borderRadius: 12, padding: 16, alignItems: 'center' },
  cancelButton: { backgroundColor: '#333' },
  saveButtonText: { color: '#111', fontSize: 16, fontWeight: 'bold' }
});