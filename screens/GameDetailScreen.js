import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function GameDetailScreen() {
  const router = useRouter();
  const { gameData } = useLocalSearchParams();
  const game = gameData ? JSON.parse(gameData) : null;

  // TOUS LES ÉTATS DU JEU (Alignés sur ton GameController.php)
  const [title, setTitle] = useState(game?.title || '');
  const [platform, setPlatform] = useState(game?.platform || '');
  const [status, setStatus] = useState(game?.status || 'not_started');
  const [rating, setRating] = useState(game?.user_rating ? game.user_rating.toString() : '');
  const [metacritic, setMetacritic] = useState(game?.metacritic_score ? game.metacritic_score.toString() : '');
  const [genres, setGenres] = useState(game?.genres || '');
  const [price, setPrice] = useState(game?.estimated_price ? game.estimated_price.toString() : '');
  const [comment, setComment] = useState(game?.comment || '');
  
  const [isSaving, setIsSaving] = useState(false);

  const API_UPDATE_URL = 'https://www.g-played.com/api/index.php?action=api_update_game';

  if (!game) return <View style={styles.container}><Text style={styles.errorText}>Jeu introuvable</Text></View>;

  const handleUpdate = async () => {
    setIsSaving(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(API_UPDATE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: game.id,
          title: title,
          platform: platform,
          status: status,
          user_rating: rating,
          metacritic_score: metacritic,
          genres: genres,
          estimated_price: price,
          comment: comment
        })
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('Succès', 'Modifications enregistrées !');
        router.back();
      } else {
        Alert.alert('Erreur', data.message);
      }
    } catch (error) {
      Alert.alert('Erreur réseau', 'Impossible de sauvegarder.');
    } finally {
      setIsSaving(false);
    }
  };

  const statuses = [
    { id: 'not_started', label: 'À faire' },
    { id: 'playing', label: 'En cours' },
    { id: 'completed', label: 'Terminé' },
    { id: 'dropped', label: 'Abandonné' },
    { id: 'wishlist', label: 'Souhait' }
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* On masque le header natif */}

      <View style={styles.header}>
        {/* Nouveau bouton de retour flottant sur l'image */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back-ios" size={22} color="#fff" style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        {game.image_url ? (
          <Image source={{ uri: `https://www.g-played.com/${game.image_url}` }} style={styles.coverImage} />
        ) : (
          <View style={[styles.coverImage, { backgroundColor: '#202020' }]} />
        )}
      </View>

      <View style={styles.formContainer}>
        
        <Text style={styles.label}>Titre du jeu</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Plateforme</Text>
        <TextInput style={styles.input} value={platform} onChangeText={setPlatform} />

        <Text style={styles.label}>Statut</Text>
        <View style={styles.statusContainer}>
          {statuses.map((s) => (
            <TouchableOpacity 
              key={s.id} 
              style={[styles.statusButton, status === s.id && styles.statusButtonActive]}
              onPress={() => setStatus(s.id)}
            >
              <Text style={[styles.statusText, status === s.id && styles.statusTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Note Utilisateur</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={rating} onChangeText={setRating} />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Metacritic</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={metacritic} onChangeText={setMetacritic} />
          </View>
        </View>

        <Text style={styles.label}>Genres (séparés par virgule)</Text>
        <TextInput style={styles.input} value={genres} onChangeText={setGenres} />

        <Text style={styles.label}>Prix estimé (€)</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={price} onChangeText={setPrice} />

        <Text style={styles.label}>Commentaire / Avis</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={4}
          value={comment}
          onChangeText={setComment}
          textAlignVertical="top"
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleUpdate} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color="#111" /> : <Text style={styles.saveButtonText}>Enregistrer</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backButton: { position: 'absolute', top: 50, left: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },

  container: { flex: 1, backgroundColor: '#1b1b1b' },
  errorText: { color: '#fff', fontSize: 18, textAlign: 'center', marginTop: 50 },
  header: { height: 200 },
  coverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  
  formContainer: { padding: 20, marginTop: -20, backgroundColor: '#1b1b1b', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  label: { fontSize: 12, color: '#6c7d76', fontWeight: 'bold', marginBottom: 6, textTransform: 'uppercase', marginTop: 16 },
  
  statusContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#202020', borderWidth: 1, borderColor: '#333' },
  statusButtonActive: { backgroundColor: 'rgba(76, 229, 174, 0.15)', borderColor: '#4CE5AE' },
  statusText: { color: '#ccc', fontWeight: '600', fontSize: 13 },
  statusTextActive: { color: '#4CE5AE' },

  row: { flexDirection: 'row', gap: 16 },
  col: { flex: 1 },

  input: { backgroundColor: '#202020', color: '#fff', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#333' },
  textArea: { minHeight: 100 },

  saveButton: { backgroundColor: '#4CE5AE', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 30 },
  saveButtonText: { color: '#111', fontSize: 18, fontWeight: 'bold' }
});