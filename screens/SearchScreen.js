import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import i18n from '../config/i18n';
import { scheduleGameReleaseNotifications } from '../utils/notificationHelper';

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
    "PC (Microsoft Windows)", "Mac", "Linux",
    "PlayStation 5", "PlayStation 4", "PlayStation 3", "PlayStation 2", "PlayStation",
    "PS Vita", "PSP",
    "Xbox Series X|S", "Xbox One", "Xbox 360", "Xbox",
    "Nintendo Switch", "Wii U", "Wii", "GameCube", "Nintendo 64", "SNES", "NES",
    "Nintendo 3DS", "Nintendo DS", "Game Boy Advance", "Game Boy Color", "Game Boy",
    "iOS", "Android",
    "Sega Dreamcast", "Sega Saturn", "Sega Mega Drive/Genesis", "Sega Master System"
  ]);

  // ÉTATS POUR STEAM
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [syncProgress, setSyncProgress] = useState(0);

  const API_BASE = 'https://www.g-played.com/api/index.php';
  const API_GET_GAMES_URL = `${API_BASE}?action=api_get_games`;
  const API_SEARCH_URL = `${API_BASE}?action=api_search_igdb`;
  const API_SAVE_URL = `${API_BASE}?action=api_save_game`;

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

  // --- LOGIQUE STEAM ---
  const handleSteamAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const returnUrl = Linking.createURL('/search');

      const authUrl = `${API_BASE}?action=api_steam_login&token=${token}&redirect=${encodeURIComponent(returnUrl)}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, returnUrl)

      if (result.type === 'success') startSteamSync(token);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de joindre Steam.');
    }
  };

  const startSteamSync = async (token) => {
    setIsSyncing(true); setSyncProgress(0); setSyncStatus('Récupération de la bibliothèque...');
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    try {
      const listRes = await fetch(`${API_BASE}?action=api_steam_games`, { headers });
      const listData = await listRes.json();
      if (!listData.success) throw new Error(listData.error);

      const games = listData.games;
      const total = games.length;

      if (total === 0) {
        setSyncStatus('Votre collection est déjà à jour !');
        setSyncProgress(100);
        setTimeout(() => setIsSyncing(false), 2000);
        return;
      }

      let processed = 0;
      for (const game of games) {
        setSyncStatus(`Importation : ${game.name}`);
        await fetch(`${API_BASE}?action=api_steam_import_single`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            steam_appid: game.appid // L'ID unique Steam
          })
        });
        processed++;
        setSyncProgress(Math.round((processed / total) * 100));
      }

      setSyncStatus('Terminé !');
      await fetch(`${API_BASE}?action=api_steam_complete`, { headers });

      setTimeout(() => {
        setIsSyncing(false);
        fetchMyGames(); // Rafraîchir les doublons
        Alert.alert(
          'Synchronisation terminée',
          `${total} jeux PC ont été ajoutés à votre collection digitale !`,
          [{ text: 'Voir ma collection', onPress: () => router.back() }]
        );
      }, 2000);
    } catch (e) {
      setSyncStatus("Erreur de synchronisation.");
      setTimeout(() => setIsSyncing(false), 3000);
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
    if (lower.includes('switch') || lower.includes('nintendo switch')) return 'Switch';
    if (lower.includes('pc') || lower.includes('windows')) return 'PC';
    if (lower.includes('mac')) return 'Mac';
    if (lower.includes('linux')) return 'Linux';

    return igdbName;
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

    // 1. Extraire les plateformes spécifiques à ce jeu via IGDB
    const platformsForThisGame = extractPlatforms(game);

    // 2. Mettre à jour la liste des plateformes disponibles pour la modale
    // On ne propose maintenant que les plateformes réelles du jeu
    setAvailablePlatforms(platformsForThisGame);

    // 3. Pré-sélectionner la plateforme correspondant à la ligne cliquée
    if (game.singlePlatform && game.singlePlatform !== 'Inconnu') {
      setSelectedPlatform(game.singlePlatform);
    } else {
      setSelectedPlatform('');
    }

    setPlatformModalVisible(true);
  };

  const extractAndTranslateGenres = (genresData) => {
    if (!genresData) return '';

    const genresArray = Array.isArray(genresData) ? genresData : [genresData];

    const genreTranslations = {
      "Role-playing (RPG)": i18n.t('genres.rpg', { defaultValue: "RPG" }),
      "Shooter": i18n.t('genres.shooter', { defaultValue: "Jeu de tir" }),
      "Adventure": i18n.t('genres.adventure', { defaultValue: "Aventure" }),
      "Fighting": i18n.t('genres.fighting', { defaultValue: "Combat" }),
      "Strategy": i18n.t('genres.strategy', { defaultValue: "Stratégie" }),
      "Real Time Strategy (RTS)": i18n.t('genres.rts', { defaultValue: "Stratégie en temps réel" }),
      "Turn-based strategy (TBS)": i18n.t('genres.tbs', { defaultValue: "Stratégie au tour par tour" }),
      "Simulator": i18n.t('genres.simulator', { defaultValue: "Simulation" }),
      "Platform": i18n.t('genres.platform', { defaultValue: "Plateforme" }),
      "Racing": i18n.t('genres.racing', { defaultValue: "Course" }),
      "Sport": i18n.t('genres.sport', { defaultValue: "Sport" }),
      "Puzzle": i18n.t('genres.puzzle', { defaultValue: "Réflexion / Puzzle" }),
      "Music": i18n.t('genres.music', { defaultValue: "Musique" }),
      "Hack and slash/Beat 'em up": i18n.t('genres.hack_and_slash', { defaultValue: "Beat 'em up" }),
      "Card & Board Game": i18n.t('genres.card_board', { defaultValue: "Jeux de plateau" }),
      "Visual Novel": i18n.t('genres.visual_novel', { defaultValue: "Visual Novel" }),
      "Indie": i18n.t('genres.indie', { defaultValue: "Indépendant" }),
      "Arcade": i18n.t('genres.arcade', { defaultValue: "Arcade" }),
      "Point-and-click": i18n.t('genres.point_and_click', { defaultValue: "Point & Click" }),
      "Tactical": i18n.t('genres.tactical', { defaultValue: "Tactique" }),
      "Quiz/Trivia": i18n.t('genres.quiz', { defaultValue: "Quiz" }),
      "Pinball": i18n.t('genres.pinball', { defaultValue: "Flipper" }),
      "MOBA": i18n.t('genres.moba', { defaultValue: "MOBA" })
    };

    const translatedGenres = genresArray.map(g => {
      const genreName = typeof g === 'object' ? g.name : g;
      return genreTranslations[genreName] || genreName; // Traduit ou garde l'original si inconnu
    });

    return translatedGenres.join(', ');
  };

  const confirmAddGame = async () => {
    if (!selectedPlatform) {
      Alert.alert('Erreur', 'Veuillez sélectionner une plateforme.');
      return;
    }

    setPlatformModalVisible(false);
    setAddingId(gameToAdd.uniqueKey);

    // RÉCUPÉRATION DE TOUTES LES PLATEFORMES DU JEU POUR LA BDD
    const allPlatforms = extractPlatforms(gameToAdd).join(', ');

    let imageToSave = gameToAdd.background_image || (gameToAdd.cover ? gameToAdd.cover.url : null);
    if (imageToSave && imageToSave.startsWith('//')) {
      imageToSave = `https:${imageToSave}`;
    }

    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(API_SAVE_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawg_id: gameToAdd.id,
          title: gameToAdd.name,
          platform: selectedPlatform,
          platforms_list: allPlatforms, // ENVOI DE LA LISTE COMPLÈTE
          status: defaultStatus || 'not_started',
          format: defaultFormat || 'physical',
          background_image: imageToSave,
          metacritic: gameToAdd.metacritic,
          genres: extractAndTranslateGenres(gameToAdd.genres)
        })
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert(i18n.t('common.success'), `${gameToAdd.name} (${selectedPlatform}) ${i18n.t('common.game_added')} !`);
        fetchMyGames();

        const finalStatus = defaultStatus || 'not_started';
        if (finalStatus === 'wishlist') {
          let releaseDate = null;
          if (gameToAdd.first_release_date) {
            releaseDate = new Date(gameToAdd.first_release_date * 1000);
          } else if (gameToAdd.released) {
            releaseDate = new Date(gameToAdd.released);
          }

          if (releaseDate) {
            scheduleGameReleaseNotifications({
              id: gameToAdd.id,
              title: gameToAdd.name,
              release_date: releaseDate
            });
          }
        }

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
              router.back();
            } else {
              router.navigate('/home');
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

      {/* BOUTON STEAM AFFICHÉ UNIQUEMENT SI ON PROVIENT DE L'ONGLET DIGITAL */}
      {defaultFormat === 'digital' && (
        <View style={styles.steamSection}>
          <TouchableOpacity style={styles.steamButton} onPress={handleSteamAuth}>
            <FontAwesome5 name="steam" size={18} color="#fff" />
            <Text style={styles.steamText}>Importer mes jeux Steam</Text>
          </TouchableOpacity>
        </View>
      )}

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

      {/* MODALE CHOIX PLATEFORME */}
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

      {/* MODAL CHARGEMENT STEAM */}
      <Modal visible={isSyncing} transparent={true} animationType="fade">
        <View style={styles.steamModalOverlay}>
          <View style={styles.steamModalContent}>
            <FontAwesome5 name="sync" size={32} color="#66c0f4" style={{ marginBottom: 16 }} />
            <Text style={styles.steamModalTitle}>Synchronisation Steam</Text>
            <Text style={styles.steamModalStatus}>{syncStatus}</Text>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { width: `${syncProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>{syncProgress}%</Text>
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

  // Styles de la section Steam
  steamSection: { marginHorizontal: 16, marginBottom: 20 },
  steamButton: { flexDirection: 'row', backgroundColor: '#171a21', borderWidth: 1, borderColor: '#66c0f4', borderRadius: 50, padding: 14, alignItems: 'center', justifyContent: 'center' },
  steamText: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginLeft: 10 },
  steamModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  steamModalContent: { width: '85%', backgroundColor: '#202020', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  steamModalTitle: { color: '#66c0f4', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  steamModalStatus: { color: '#ccc', fontSize: 14, textAlign: 'center', marginBottom: 20, height: 40 },
  progressBarContainer: { width: '100%', height: 20, backgroundColor: '#171a21', borderRadius: 10, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%', backgroundColor: '#66c0f4' },
  progressText: { color: '#fff', fontWeight: 'bold' },

  listContainer: { paddingHorizontal: 16, paddingBottom: 20 },
  card: { flexDirection: 'row', backgroundColor: '#202020', borderRadius: 24, marginBottom: 16, overflow: 'hidden', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cover: { width: 80, height: 100 },
  placeholderCover: { backgroundColor: '#151515' },
  cardInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  gameTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  gameYear: { fontSize: 13, color: '#6c7d76', fontWeight: '600' },
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4CE5AE', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  addedButton: { backgroundColor: '#333' },
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