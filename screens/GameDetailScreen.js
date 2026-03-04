import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import i18n from '../config/i18n';

export default function GameDetailScreen() {
  const router = useRouter();
  const { gameData } = useLocalSearchParams();
  const game = gameData ? JSON.parse(gameData) : null;

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

  if (!game) return <View style={styles.container}><Text style={styles.errorText}>{i18n.t('gamedetail.not_found')}</Text></View>;

  const handleUpdate = async () => {
    setIsSaving(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(API_UPDATE_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: game.id, title, platform, status, user_rating: rating, metacritic_score: metacritic, genres, estimated_price: price, comment
        })
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert(i18n.t('common.success'), i18n.t('gamedetail.success_save'));
        router.back();
      } else {
        Alert.alert(i18n.t('common.error'), data.message);
      }
    } catch (error) {
      Alert.alert(i18n.t('common.network_error'), i18n.t('gamedetail.error_save'));
    } finally {
      setIsSaving(false);
    }
  };

  const statuses = [
    { id: 'not_started', label: i18n.t('status.not_started') },
    { id: 'playing', label: i18n.t('status.playing') },
    { id: 'completed', label: i18n.t('status.completed') },
    { id: 'dropped', label: i18n.t('status.dropped') },
    { id: 'wishlist', label: i18n.t('status.wishlist') }
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
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
        
        <Text style={styles.label}>{i18n.t('gamedetail.label_title')}</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} />

        <Text style={styles.label}>{i18n.t('gamedetail.label_platform')}</Text>
        <TextInput style={styles.input} value={platform} onChangeText={setPlatform} />

        <Text style={styles.label}>{i18n.t('gamedetail.label_status')}</Text>
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
            <Text style={styles.label}>{i18n.t('gamedetail.label_user_rating')}</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={rating} onChangeText={setRating} />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>{i18n.t('gamedetail.label_metacritic')}</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={metacritic} onChangeText={setMetacritic} />
          </View>
        </View>

        <Text style={styles.label}>{i18n.t('gamedetail.label_genres')}</Text>
        <TextInput style={styles.input} value={genres} onChangeText={setGenres} />

        <Text style={styles.label}>{i18n.t('gamedetail.label_price')}</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={price} onChangeText={setPrice} />

        <Text style={styles.label}>{i18n.t('gamedetail.label_comment')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={4}
          value={comment}
          onChangeText={setComment}
          textAlignVertical="top"
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleUpdate} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color="#111" /> : <Text style={styles.saveButtonText}>{i18n.t('common.save')}</Text>}
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