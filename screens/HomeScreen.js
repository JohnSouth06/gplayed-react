import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const getStatusLabel = (status) => {
    const statusMap = {
      'not_started': 'À faire',
      'playing': 'En cours',
      'completed': 'Terminé',
      'dropped': 'Abandonné',
      'wishlist': 'Souhait',
      'loaned': 'Prêté'
    };
    return statusMap[status] || status; // Retourne le statut traduit, ou le brut si inconnu
  };
  const router = useRouter();
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  
  // NOUVEAU : État pour le format (Physique par défaut)
  const [activeFormat, setActiveFormat] = useState('physical');

  const API_URL = 'https://www.g-played.com/api/index.php?action=api_get_games';

  useFocusEffect(
    useCallback(() => {
      fetchGames();
    }, [])
  );

  const fetchGames = async () => {
    try {
      const userDataString = await SecureStore.getItemAsync('userData');
      if (userDataString) {
        setUser(JSON.parse(userDataString));
      }

      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;

      const response = await fetch(API_URL, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setGames(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // NOUVEAU : Filtrer les jeux selon le format choisi
  const filteredGames = games.filter(game => game.format === activeFormat && game.status !== 'wishlist');

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
        <Text style={styles.gameStatus}>{getStatusLabel(item.status)}</Text>
      </View>
    </TouchableOpacity>
  );

 const avatarUri = user?.avatar 
    ? (user.avatar.startsWith('http') ? user.avatar : `https://www.g-played.com/${user.avatar}`) 
    : 'https://www.g-played.com/uploads/avatars/default.png';

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#4CE5AE" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logoText}>G<Text style={{color: '#4CE5AE'}}>-</Text>Played</Text>
        
        {user && (
          <TouchableOpacity style={styles.avatarContainer} onPress={() => router.push('/profile')}>
            <Image source={{ uri: avatarUri }} style={styles.headerAvatar} />
          </TouchableOpacity>
        )}
      </View>
      
      {/* NOUVEAU : Toggle Physique / Digital reprenant le style de ton CSS */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[styles.toggleButton, activeFormat === 'physical' && styles.toggleButtonActive]}
          onPress={() => setActiveFormat('physical')}
        >
          <Text style={[styles.toggleText, activeFormat === 'physical' && styles.toggleTextActive]}>Physique</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleButton, activeFormat === 'digital' && styles.toggleButtonActive]}
          onPress={() => setActiveFormat('digital')}
        >
          <Text style={[styles.toggleText, activeFormat === 'digital' && styles.toggleTextActive]}>Digital</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredGames}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderGameCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => router.push({
          pathname: '/search',
          params: { 
            defaultStatus: 'not_started',
            defaultFormat: activeFormat
          }
        })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { 
    paddingTop: 60, 
    paddingBottom: 10, 
    paddingHorizontal: 20, 
    alignItems: 'center', 
    position: 'relative' 
  },
  avatarContainer: { position: 'absolute', top: 55, right: 20 },
  headerAvatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' },

  container: { flex: 1, backgroundColor: '#1b1b1b' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1b1b1b' },

  logoText: { fontSize: 32, fontWeight: '900', color: '#fff', fontStyle: 'italic' },

  toggleContainer: { flexDirection: 'row', backgroundColor: '#202020', borderRadius: 50, marginHorizontal: 20, marginBottom: 20, padding: 4 },
  toggleButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 50 },
  toggleButtonActive: { backgroundColor: '#4CE5AE' },
  toggleText: { color: '#6c7d76', fontWeight: 'bold' },
  toggleTextActive: { color: '#111' },

  listContainer: { paddingHorizontal: 16, paddingBottom: 80 },
  card: { flexDirection: 'row', backgroundColor: '#202020', borderRadius: 24, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cover: { width: 100, height: 120 },
  placeholderCover: { backgroundColor: '#151515' },
  cardInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  gameTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  gamePlatform: { fontSize: 14, color: '#aaa', marginBottom: 8 },
  gameStatus: { fontSize: 12, color: '#4CE5AE', fontWeight: 'bold', textTransform: 'uppercase' },
  
  fab: { position: 'absolute', bottom: 25, right: 25, width: 60, height: 60, borderRadius: 30, backgroundColor: '#4CE5AE', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabText: { color: '#111', fontSize: 32, fontWeight: 'bold', lineHeight: 34 }
});