import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function WishlistScreen() {
  const router = useRouter();
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const API_URL = 'https://www.g-played.com/api/index.php?action=api_get_games';

  useFocusEffect(
    useCallback(() => {
      fetchWishlist();
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
        // On ne garde QUE les jeux dont le statut est "wishlist"
        const wishlistGames = data.data.filter(game => game.status === 'wishlist');
        setGames(wishlistGames);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderGameCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => {
        router.push({
          pathname: `/game/${item.id}`,
          params: { gameData: JSON.stringify(item) }
        });
      }}
    >
      {item.image_url ? (
        <Image source={{ uri: `https://www.g-played.com/${item.image_url}` }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.placeholderCover]} />
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.gameTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.gamePlatform}>{item.platform}</Text>
        <Text style={styles.gamePrice}>{item.estimated_price ? `${item.estimated_price} €` : 'Prix inconnu'}</Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#4CE5AE" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Souhaits</Text>
      </View>

      {games.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Votre liste de souhaits est vide.</Text>
          <TouchableOpacity style={styles.searchButton} onPress={() => router.push('/search')}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1b1b1b' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1b1b1b' },
  
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff' },

  listContainer: { paddingHorizontal: 16, paddingBottom: 20 },
  card: { flexDirection: 'row', backgroundColor: '#202020', borderRadius: 24, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cover: { width: 100, height: 120 },
  placeholderCover: { backgroundColor: '#151515' },
  cardInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  gameTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  gamePlatform: { fontSize: 14, color: '#aaa', marginBottom: 8 },
  gamePrice: { fontSize: 14, color: '#4CE5AE', fontWeight: 'bold' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { color: '#6c7d76', fontSize: 16, textAlign: 'center', marginBottom: 20 },
  searchButton: { backgroundColor: 'rgba(76, 229, 174, 0.1)', borderColor: '#4CE5AE', borderWidth: 1, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 50 },
  searchButtonText: { color: '#4CE5AE', fontWeight: 'bold', fontSize: 16 }
});