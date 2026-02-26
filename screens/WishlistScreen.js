import { MaterialIcons } from '@expo/vector-icons';
import { Tabs, useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function WishlistScreen() {
  const router = useRouter();
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedGames, setSelectedGames] = useState([]);

  const API_URL = 'https://www.g-played.com/api/index.php?action=api_get_games';
  const API_DELETE_URL = 'https://www.g-played.com/api/index.php?action=api_delete_game';

  useFocusEffect(
    useCallback(() => {
      fetchWishlist();
      setIsSelectionMode(false);
      setSelectedGames([]);
    }, [])
  );

  const fetchWishlist = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;

      const response = await fetch(API_URL, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        const wishlistGames = data.data.filter(game => game.status === 'wishlist');
        setGames(wishlistGames);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
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
      `Voulez-vous vraiment retirer ces ${selectedGames.length} jeux de votre liste de souhaits ?`,
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
                fetch(`${API_DELETE_URL}&id=${id}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${token}` }
                })
              ));
              setIsSelectionMode(false);
              setSelectedGames([]);
              fetchWishlist();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer les jeux.');
              setIsLoading(false);
            }
          }
        }
      ]
    );
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
          <Text style={styles.gamePlatform}>{item.platform}</Text>
          <Text style={styles.gamePrice}>{item.estimated_price ? `${item.estimated_price} €` : 'Prix inconnu'}</Text>
        </View>

        {isSelected && (
          <View style={styles.checkOverlay}>
            <MaterialIcons name="check-circle" size={28} color="#dc3545" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#4CE5AE" /></View>;

  return (
    <View style={styles.container}>
      {/* MAGIE : Cache le header natif si on est en mode sélection ! */}
      <Tabs.Screen options={{ headerShown: !isSelectionMode }} />

      {isSelectionMode ? (
        <View style={styles.selectionHeader}>
          <TouchableOpacity onPress={() => { setIsSelectionMode(false); setSelectedGames([]); }}>
            <MaterialIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.selectionText}>{selectedGames.length} sélectionné(s)</Text>
        </View>
      ) : (
        <Text style={styles.pageTitle}>Mes Souhaits</Text>
      )}

      {games.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Votre liste de souhaits est vide.</Text>
          <TouchableOpacity 
            style={styles.searchButton} 
            onPress={() => router.push({ pathname: '/search', params: { defaultStatus: 'wishlist', defaultFormat: 'physical' }})}
          >
            <Text style={styles.searchButtonText}>Chercher un jeu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={games}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderGameCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {isSelectionMode ? (
        <TouchableOpacity style={[styles.fab, styles.fabDelete]} onPress={deleteSelectedGames}>
          <MaterialIcons name="delete" size={28} color="#fff" />
        </TouchableOpacity>
      ) : (
        games.length > 0 && (
          <TouchableOpacity style={styles.fab} onPress={() => router.push({ pathname: '/search', params: { defaultStatus: 'wishlist', defaultFormat: 'physical' }})}>
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1b1b1b' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1b1b1b' },
  
  // Nouveau style pour le titre de la page
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginHorizontal: 20, marginTop: 20, marginBottom: 20 },

  selectionHeader: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#dc3545', marginBottom: 20 },
  selectionText: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginLeft: 20 },

  listContainer: { paddingHorizontal: 16, paddingBottom: 20 },
  card: { flexDirection: 'row', backgroundColor: '#202020', borderRadius: 24, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', position: 'relative' },
  
  cardSelected: { borderColor: '#dc3545', borderWidth: 2, backgroundColor: 'rgba(220, 53, 69, 0.1)' },
  coverSelected: { opacity: 0.5 },
  checkOverlay: { position: 'absolute', right: 20, top: '40%' },

  cover: { width: 100, height: 120 },
  placeholderCover: { backgroundColor: '#151515' },
  cardInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  gameTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  gamePlatform: { fontSize: 14, color: '#aaa', marginBottom: 8 },
  gamePrice: { fontSize: 14, color: '#4CE5AE', fontWeight: 'bold' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { color: '#6c7d76', fontSize: 16, textAlign: 'center', marginBottom: 20 },
  searchButton: { backgroundColor: 'rgba(76, 229, 174, 0.1)', borderColor: '#4CE5AE', borderWidth: 1, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 50 },
  searchButtonText: { color: '#4CE5AE', fontWeight: 'bold', fontSize: 16 },

  fab: { position: 'absolute', bottom: 25, right: 25, width: 60, height: 60, borderRadius: 30, backgroundColor: '#4CE5AE', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabText: { color: '#111', fontSize: 32, fontWeight: 'bold', lineHeight: 34 },
  fabDelete: { backgroundColor: '#dc3545' }
});