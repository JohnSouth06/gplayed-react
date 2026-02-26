import * as SecureStore from 'expo-secure-store';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingId, setAddingId] = useState(null); // Pour savoir quel jeu est en train d'être ajouté

  // N'oublie pas de mettre ton URL
  const API_SEARCH_URL = 'https://www.g-played.com/api/index.php?action=api_search_igdb';
  const API_SAVE_URL = 'https://www.g-played.com/api/index.php?action=api_save_game';

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
      if (data.success) {
        setResults(data.data);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de chercher le jeu.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddGame = async (game) => {
    setAddingId(game.id);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(API_SAVE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rawg_id: game.id,
          title: game.name,
          platform: 'Multiplateforme', // Valeur par défaut, l'utilisateur pourra modifier plus tard
          status: 'wishlist', // On l'ajoute par défaut à la wishlist ou "not_started"
          background_image: game.background_image
        })
      });
      
      const data = await response.json();
      if (data.success) {
        Alert.alert('Succès', `${game.name} a été ajouté à votre collection !`);
      } else {
        Alert.alert('Oups', data.message);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter le jeu.');
    } finally {
      setAddingId(null);
    }
  };

  const renderResult = ({ item }) => (
    <View style={styles.card}>
      {item.background_image ? (
        <Image source={{ uri: item.background_image }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.placeholderCover]} />
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.gameTitle} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.gameYear}>{item.released || 'Année inconnue'}</Text>
      </View>
      <TouchableOpacity 
        style={styles.addButton} 
        onPress={() => handleAddGame(item)}
        disabled={addingId === item.id}
      >
        {addingId === item.id ? (
          <ActivityIndicator color="#1b1b1b" size="small" />
        ) : (
          <Text style={styles.addButtonText}>+</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Ajouter un jeu</Text>
      
      {/* Barre de recherche (Inspirée de .search-box) */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher sur IGDB..."
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
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderResult}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1b1b1b' }, // Couleur de fond exacte de ton body dark mode
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', padding: 20, paddingTop: 60 },
  
  // Design de la barre de recherche
  searchBox: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#202020', // Équivalent de --bs-tertiary-bg
    borderRadius: 50, // Comme dans ton CSS
    borderWidth: 1,
    borderColor: '#333',
  },
  searchInput: {
    color: '#fff',
    paddingHorizontal: 20,
    height: 50,
    fontSize: 16,
  },

  listContainer: { paddingHorizontal: 16, paddingBottom: 20 },
  
  // Design des cartes de résultats
  card: { 
    flexDirection: 'row', 
    backgroundColor: '#202020', 
    borderRadius: 24, // Le border-radius de tes game-card-modern
    marginBottom: 16, 
    overflow: 'hidden',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cover: { width: 80, height: 100 },
  placeholderCover: { backgroundColor: '#151515' },
  
  cardInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  gameTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  gameYear: { fontSize: 13, color: '#6c7d76', fontWeight: '600' }, // sec-color de ton CSS
  
  // Bouton d'action Primaire
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4CE5AE', // main-color
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  addButtonText: {
    color: '#1b1b1b',
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 26,
  }
});