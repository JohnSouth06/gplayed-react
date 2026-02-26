import { MaterialIcons } from '@expo/vector-icons'; // N'oublie pas cet import !
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activeFormat, setActiveFormat] = useState('physical');

  // NOUVEAUX ÉTATS POUR LA SÉLECTION
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedGames, setSelectedGames] = useState([]);

  const API_URL = 'https://www.g-played.com/api/index.php?action=api_get_games';
  const API_DELETE_URL = 'https://www.g-played.com/api/index.php?action=api_delete_game';

  useFocusEffect(
    useCallback(() => {
      fetchGames();
      // On réinitialise la sélection quand on revient sur l'écran
      setIsSelectionMode(false);
      setSelectedGames([]);
    }, [])
  );

  const fetchGames = async () => {
    try {
      const userDataString = await SecureStore.getItemAsync('userData');
      if (userDataString) setUser(JSON.parse(userDataString));

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

  // --- LOGIQUE DE SÉLECTION ---
  const handleLongPress = (id) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedGames([id]);
    }
  };

  const handlePress = (item) => {
    if (isSelectionMode) {
      // On ajoute ou on retire de la sélection
      if (selectedGames.includes(item.id)) {
        const newSelection = selectedGames.filter(gameId => gameId !== item.id);
        setSelectedGames(newSelection);
        if (newSelection.length === 0) setIsSelectionMode(false); // Quitte le mode si plus rien n'est sélectionné
      } else {
        setSelectedGames([...selectedGames, item.id]);
      }
    } else {
      // Navigation normale si on n'est pas en mode sélection
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
              // On exécute toutes les requêtes de suppression en parallèle
              await Promise.all(selectedGames.map(id =>
                fetch(`${API_DELETE_URL}&id=${id}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${token}` }
                })
              ));
              // On rafraîchit la liste
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

  const filteredGames = games.filter(game => game.format === activeFormat && game.status !== 'wishlist');

  const renderGameCard = ({ item }) => {
    const isSelected = selectedGames.includes(item.id);

    return (
      <TouchableOpacity 
        style={[styles.card, isSelected && styles.cardSelected]} // Style dynamique
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
          <Text style={styles.gamePlatform}>{item.platform}</Text>
          <Text style={styles.gameStatus}>{getStatusLabel(item.status)}</Text>
        </View>
        
        {/* Affichage d'une icône "Check" si sélectionné */}
        {isSelected && (
          <View style={styles.checkOverlay}>
            <MaterialIcons name="check-circle" size={28} color="#dc3545" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const avatarUri = user?.avatar 
    ? (user.avatar.startsWith('http') ? user.avatar : `https://www.g-played.com/${user.avatar}`) 
    : 'https://www.g-played.com/uploads/avatars/default.png';

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#4CE5AE" /></View>;

  return (
    <View style={styles.container}>
      {/* HEADER DYNAMIQUE : Change si on est en mode sélection */}
      {isSelectionMode ? (
        <View style={styles.selectionHeader}>
          <TouchableOpacity onPress={() => { setIsSelectionMode(false); setSelectedGames([]); }}>
            <MaterialIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.selectionText}>{selectedGames.length} sélectionné(s)</Text>
        </View>
      ) : (
        <View style={styles.header}>
          <Text style={styles.logoText}>G<Text style={{color: '#4CE5AE'}}>-</Text>Played</Text>
          {user && (
            <TouchableOpacity style={styles.avatarContainer} onPress={() => router.push('/profile')}>
              <Image source={{ uri: avatarUri }} style={styles.headerAvatar} />
            </TouchableOpacity>
          )}
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

      <FlatList
        data={filteredGames}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderGameCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* BOUTON FLOTTANT DYNAMIQUE : + ou Corbeille */}
      {isSelectionMode ? (
        <TouchableOpacity style={[styles.fab, styles.fabDelete]} onPress={deleteSelectedGames}>
          <MaterialIcons name="delete" size={28} color="#fff" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.fab} onPress={() => router.push({ pathname: '/search', params: { defaultStatus: 'not_started', defaultFormat: activeFormat }})}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 60, paddingBottom: 10, paddingHorizontal: 20, alignItems: 'center', position: 'relative' },
  avatarContainer: { position: 'absolute', top: 55, right: 20 },
  headerAvatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' },
  
  // Style de l'en-tête de sélection
  selectionHeader: { paddingTop: 60, paddingBottom: 10, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#dc3545' },
  selectionText: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginLeft: 20 },

  container: { flex: 1, backgroundColor: '#1b1b1b' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1b1b1b' },
  logoText: { fontSize: 32, fontWeight: '900', color: '#fff', fontStyle: 'italic' },

  toggleContainer: { flexDirection: 'row', backgroundColor: '#202020', borderRadius: 50, marginHorizontal: 20, marginBottom: 20, padding: 4 },
  toggleButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 50 },
  toggleButtonActive: { backgroundColor: '#4CE5AE' },
  toggleText: { color: '#6c7d76', fontWeight: 'bold' },
  toggleTextActive: { color: '#111' },

  listContainer: { paddingHorizontal: 16, paddingBottom: 80 },
  card: { flexDirection: 'row', backgroundColor: '#202020', borderRadius: 24, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', position: 'relative' },
  
  // Styles pour les cartes sélectionnées
  cardSelected: { borderColor: '#dc3545', borderWidth: 2, backgroundColor: 'rgba(220, 53, 69, 0.1)' },
  coverSelected: { opacity: 0.5 },
  checkOverlay: { position: 'absolute', right: 20, top: '40%' },

  cover: { width: 100, height: 120 },
  placeholderCover: { backgroundColor: '#151515' },
  cardInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  gameTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  gamePlatform: { fontSize: 14, color: '#aaa', marginBottom: 8 },
  gameStatus: { fontSize: 12, color: '#4CE5AE', fontWeight: 'bold', textTransform: 'uppercase' },
  
  fab: { position: 'absolute', bottom: 25, right: 25, width: 60, height: 60, borderRadius: 30, backgroundColor: '#4CE5AE', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabText: { color: '#111', fontSize: 32, fontWeight: 'bold', lineHeight: 34 },
  
  // Bouton corbeille
  fabDelete: { backgroundColor: '#dc3545' }
});