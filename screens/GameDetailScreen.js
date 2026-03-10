import { MaterialIcons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import i18n from '../config/i18n';

export default function GameDetailScreen() {
  const router = useRouter();
  const { gameData } = useLocalSearchParams();
  const game = gameData ? JSON.parse(gameData) : null;

  const [title, setTitle] = useState(game?.title || '');
  
  // --- NOUVEAU : GESTION DES PLATEFORMES ---
  const initialPlatforms = game?.platform ? (game.platform === 'Multiplateforme' ? [] : [game.platform]) : [];
  const [selectedPlatforms, setSelectedPlatforms] = useState(initialPlatforms);
  const [isPlatformModalVisible, setPlatformModalVisible] = useState(false);
  const [newPlatformText, setNewPlatformText] = useState('');
  const [availablePlatforms, setAvailablePlatforms] = useState([
    'PS4', 'PS5', 'Xbox One', 'Xbox Series', 'Nintendo Switch', 'PC'
  ]);

  const [status, setStatus] = useState(game?.status || 'not_started');
  const [rating, setRating] = useState(game?.user_rating ? game.user_rating.toString() : '');
  const [metacritic, setMetacritic] = useState(game?.metacritic_score ? game.metacritic_score.toString() : '');
  const [genres, setGenres] = useState(game?.genres || '');
  const [price, setPrice] = useState(game?.estimated_price ? game.estimated_price.toString() : '');
  const [timeMain, setTimeMain] = useState(game?.playtime ? game.playtime.toString() : '');
  const [comment, setComment] = useState(game?.comment || '');
  
  const [isSaving, setIsSaving] = useState(false);

  const API_UPDATE_URL = 'https://www.g-played.com/api/index.php?action=api_update_game';

  if (!game) return <View style={styles.container}><Text style={styles.errorText}>{i18n.t('gamedetail.not_found')}</Text></View>;

  // Fonction pour cocher/décocher une plateforme
  const togglePlatform = (plat) => {
    if (selectedPlatforms.includes(plat)) {
      setSelectedPlatforms(selectedPlatforms.filter(p => p !== plat));
    } else {
      setSelectedPlatforms([...selectedPlatforms, plat]);
    }
  };

  // Fonction pour ajouter une plateforme qui n'est pas dans la liste
  const addNewPlatform = () => {
    const plat = newPlatformText.trim();
    if (plat && !availablePlatforms.includes(plat)) {
      setAvailablePlatforms([...availablePlatforms, plat]);
      setSelectedPlatforms([...selectedPlatforms, plat]); // On la sélectionne automatiquement
      setNewPlatformText(''); // On vide le champ
    }
  };

  const handleUpdate = async () => {
    setIsSaving(true);

    // Détermination de la plateforme finale à enregistrer
    let finalPlatform = '';
    if (selectedPlatforms.length > 1) {
      finalPlatform = 'Multiplateforme';
    } else if (selectedPlatforms.length === 1) {
      finalPlatform = selectedPlatforms[0];
    }

    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(API_UPDATE_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: game.id, title, platform: finalPlatform, status, user_rating: rating, metacritic_score: metacritic, genres, estimated_price: price, comment, playtime: timeMain
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

  // Texte à afficher sur le faux input de plateforme
  let displayPlatformText = 'Sélectionner une plateforme...';
  if (selectedPlatforms.length > 1) {
    displayPlatformText = 'Multiplateforme';
  } else if (selectedPlatforms.length === 1) {
    displayPlatformText = selectedPlatforms[0];
  }
  
  const finalImageUrl = game.image_url 
      ? (game.image_url.startsWith('http') ? game.image_url : `https://www.g-played.com/${game.image_url}`)
      : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back-ios" size={22} color="#fff" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
        
        {finalImageUrl ? (
          <ExpoImage 
            source={{ uri: finalImageUrl }} 
            style={styles.coverImage} 
            contentFit="cover" 
            cachePolicy="memory-disk" 
          />
        ) : (
          <View style={[styles.coverImage, { backgroundColor: '#202020' }]} />
        )}
      </View>

      <View style={styles.formContainer}>
        
        <Text style={styles.label}>{i18n.t('gamedetail.label_title')}</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} />

        {/* NOUVEAU BOUTON PLATEFORME (Remplace le TextInput) */}
        <Text style={styles.label}>{i18n.t('gamedetail.label_platform') || 'PLATEFORME'}</Text>
        <TouchableOpacity style={styles.input} onPress={() => setPlatformModalVisible(true)}>
          <Text style={{ color: selectedPlatforms.length > 0 ? '#fff' : '#6c7d76', fontSize: 15 }}>
             {displayPlatformText}
          </Text>
        </TouchableOpacity>

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

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>{i18n.t('gamedetail.label_price')}</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={price} onChangeText={setPrice} />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Temps de jeu (h)</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={timeMain} onChangeText={setTimeMain} />
          </View>
        </View>

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

      {/* MODAL POUR CHOISIR LES PLATEFORMES */}
      <Modal visible={isPlatformModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choisir les plateformes</Text>
            
            <FlatList
              data={availablePlatforms}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected = selectedPlatforms.includes(item);
                return (
                  <TouchableOpacity style={styles.modalOption} onPress={() => togglePlatform(item)}>
                    <Text style={[styles.modalOptionText, isSelected && { color: '#4CE5AE', fontWeight: 'bold' }]}>{item}</Text>
                    <MaterialIcons name={isSelected ? "check-box" : "check-box-outline-blank"} size={24} color={isSelected ? "#4CE5AE" : "#6c7d76"} />
                  </TouchableOpacity>
                )
              }}
              style={{ maxHeight: 300 }}
              showsVerticalScrollIndicator={false}
            />

            {/* Ajouter une nouvelle plateforme dynamique */}
            <View style={styles.newPlatformContainer}>
              <TextInput
                style={[styles.input, { flex: 1, height: 44, padding: 10, fontSize: 14 }]}
                placeholder="Autre plateforme..."
                placeholderTextColor="#6c7d76"
                value={newPlatformText}
                onChangeText={setNewPlatformText}
              />
              <TouchableOpacity style={styles.addPlatformBtn} onPress={addNewPlatform}>
                <MaterialIcons name="add" size={24} color="#111" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.saveButton, { marginTop: 20 }]} onPress={() => setPlatformModalVisible(false)}>
              <Text style={styles.saveButtonText}>Valider ({selectedPlatforms.length})</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  input: { backgroundColor: '#202020', color: '#fff', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#333', justifyContent: 'center' },
  textArea: { minHeight: 100 },
  saveButton: { backgroundColor: '#4CE5AE', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 30 },
  saveButtonText: { color: '#111', fontSize: 18, fontWeight: 'bold' },

  // Nouveaux styles pour la Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1b1b1b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%', borderWidth: 1, borderColor: '#333' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
  modalOptionText: { color: '#ccc', fontSize: 16 },
  newPlatformContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 10 },
  addPlatformBtn: { backgroundColor: '#4CE5AE', width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
});