import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import i18n from '../config/i18n';
import { scheduleGameReleaseNotifications } from '../utils/notificationHelper';

const DetailRow = ({ label, value }) => {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
};

export default function GameDetailScreen() {
  const router = useRouter();
  const { gameData } = useLocalSearchParams();

  const game = gameData ? JSON.parse(gameData) : null;

  // --- ÉTATS ---
  const [activeTab, setActiveTab] = useState('manage'); // 'manage' ou 'info'
  const [selectedPlatform, setSelectedPlatform] = useState(game?.platform || '');
  const [availablePlatforms, setAvailablePlatforms] = useState(() => {
    if (game?.platforms_list) {
      return game.platforms_list.split(',').map(p => p.trim());
    }
    return [game?.platform].filter(Boolean);
  });

  const [isPlatformModalVisible, setPlatformModalVisible] = useState(false);
  const [newPlatformText, setNewPlatformText] = useState('');

  const title = game?.title || 'Titre inconnu';
  const genres = game?.genres || '';

  const [format, setFormat] = useState(game?.format || 'physical');
  const [status, setStatus] = useState(game?.status || 'not_started');
  const [rating, setRating] = useState(game?.user_rating ? game.user_rating.toString() : '');
  const [metacritic, setMetacritic] = useState(game?.metacritic_score ? game.metacritic_score.toString() : '');
  const [price, setPrice] = useState(game?.estimated_price ? game.estimated_price.toString() : '');
  const [timeMain, setTimeMain] = useState(game?.playtime ? game.playtime.toString() : '');
  const [comment, setComment] = useState(game?.comment || '');

  const [isSaving, setIsSaving] = useState(false);

  const [isImageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const screenshotArray = React.useMemo(() => {
    if (!game?.screenshots) return [];
    const rawArray = Array.isArray(game.screenshots)
      ? game.screenshots
      : game.screenshots.split(',').map(s => s.trim()).filter(s => s !== "");

    return rawArray.map(url => {
      if (url.startsWith('http')) return url;
      const cleanPath = url.startsWith('/') ? url.substring(1) : url;
      return `https://www.g-played.com/${cleanPath}`;
    });
  }, [game?.screenshots]);

  const API_UPDATE_URL = 'https://www.g-played.com/api/index.php?action=api_update_game';

  if (!game) return <View style={styles.container}><Text style={styles.errorText}>{i18n.t('gamedetail.not_found')}</Text></View>;

  const handleUpdate = async () => {
    if (!selectedPlatform) {
      Alert.alert(i18n.t('common.error'), 'Veuillez sélectionner une plateforme.');
      return;
    }

    setIsSaving(true);

    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(API_UPDATE_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: game.id,
          title,
          platform: selectedPlatform,
          status,
          format,
          user_rating: rating,
          metacritic_score: metacritic,
          genres,
          estimated_price: price,
          comment,
          playtime: timeMain
        })
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert(i18n.t('common.success'), i18n.t('gamedetail.success_save'));
        if (status === 'wishlist' && game.release_date) {
          scheduleGameReleaseNotifications({
            id: game.id,
            title: title,
            release_date: new Date(game.release_date)
          });
        }
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
    { id: 'finished', label: i18n.t('status.finished') },
    { id: 'completed', label: i18n.t('status.completed') },
    { id: 'dropped', label: i18n.t('status.dropped') },
    { id: 'wishlist', label: i18n.t('status.wishlist') }
  ];

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
        <View style={styles.titleContainer}>
          <Text style={styles.gameTitleReadOnly}>{title}</Text>
          {genres ? <Text style={styles.gameGenresReadOnly}>{genres}</Text> : null}
        </View>

        {/* --- SÉLECTEUR D'ONGLETS --- */}
        <View style={styles.tabToggleContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'manage' && styles.tabButtonActive]}
            onPress={() => setActiveTab('manage')}
          >
            <Text style={[styles.tabToggleText, activeTab === 'manage' && styles.tabToggleTextActive]}>
              {i18n.t('gamedetail.tab_manage')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'info' && styles.tabButtonActive]}
            onPress={() => setActiveTab('info')}
          >
            <Text style={[styles.tabToggleText, activeTab === 'info' && styles.tabToggleTextActive]}>
              {i18n.t('gamedetail.tab_info')}
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'manage' ? (
          /* --- ONGLET GESTION --- */
          <View>
            <Text style={styles.label}>{i18n.t('gamedetail.label_format')}</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, format === 'physical' && styles.toggleButtonActive]}
                onPress={() => setFormat('physical')}
              >
                <Text style={[styles.toggleText, format === 'physical' && styles.toggleTextActive]}>
                  <MaterialCommunityIcons name="minidisc" style={[styles.toggleIcons, format === 'physical' && styles.toggleIconsActive]} /> {i18n.t('home.tab_physical')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, format === 'digital' && styles.toggleButtonActive]}
                onPress={() => setFormat('digital')}
              >
                <Text style={[styles.toggleText, format === 'digital' && styles.toggleTextActive]}>
                  <MaterialCommunityIcons name="cloud-outline" style={[styles.toggleIcons, format === 'digital' && styles.toggleIconsActive]} /> {i18n.t('home.tab_digital')}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>{i18n.t('gamedetail.label_platform')}</Text>
            <TouchableOpacity style={styles.input} onPress={() => setPlatformModalVisible(true)}>
              <Text style={{ color: selectedPlatform ? '#fff' : '#6c7d76', fontSize: 15 }}>
                {selectedPlatform || 'Sélectionner une plateforme...'}
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
        ) : (
          /* --- ONGLET INFOS & MÉDIAS --- */
          <View style={styles.infoTabContent}>
            <View style={styles.metaBox}>
              <DetailRow label={i18n.t('gamedetail.label_developer')} value={game.developer} />
              <DetailRow label={i18n.t('gamedetail.label_publisher')} value={game.publisher} />
              <DetailRow label={i18n.t('gamedetail.label_modes')} value={game.game_modes} />
            </View>

            {game.description && (
              <View style={styles.descriptionBox}>
                <Text style={styles.sectionLabel}>{i18n.t('gamedetail.label_description')}</Text>
                <Text style={styles.descriptionText}>{game.description}</Text>
              </View>
            )}

            {game.screenshots && (
              <View style={styles.screenshotBox}>
                <Text style={styles.sectionLabel}>{i18n.t('gamedetail.label_screenshots')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.screenshotList}>
                  {(() => {
                    // 1. On transforme la donnée en tableau proprement
                    const screenshotArray = Array.isArray(game.screenshots)
                      ? game.screenshots
                      : game.screenshots.split(',').map(s => s.trim()).filter(s => s !== "");

                    // 2. On affiche chaque image dans un bouton cliquable
                    return screenshotArray.map((url, index) => {
                      let finalUrl = url;
                      if (!url.startsWith('http')) {
                        const cleanPath = url.startsWith('/') ? url.substring(1) : url;
                        finalUrl = `https://www.g-played.com/${cleanPath}`;
                      }

                      return (
                        <TouchableOpacity
                          key={index}
                          onPress={() => {
                            setSelectedImageIndex(index);
                            setImageViewerVisible(true);
                          }}
                        >
                          <ExpoImage
                            source={{ uri: finalUrl }}
                            style={styles.screenshotItem}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={200}
                          />
                        </TouchableOpacity>
                      );
                    });
                  })()}
                </ScrollView>
              </View>
            )}
          </View>
        )}
      </View>

      <Modal visible={isPlatformModalVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPlatformModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choisir une plateforme</Text>
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
              style={{ maxHeight: 300 }}
              showsVerticalScrollIndicator={false}
            />
            <TouchableOpacity style={[styles.saveButton, { marginTop: 20 }]} onPress={() => setPlatformModalVisible(false)}>
              <Text style={styles.saveButtonText}>Valider</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={isImageViewerVisible} transparent={false} animationType="fade">
        <View style={styles.fullScreenContainer}>
          {/* Bouton Fermer */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setImageViewerVisible(false)}
          >
            <MaterialIcons name="close" size={30} color="#fff" />
          </TouchableOpacity>

          <FlatList
            data={screenshotArray}
            horizontal
            pagingEnabled
            initialScrollIndex={selectedImageIndex}
            getItemLayout={(data, index) => ({
              length: styles.fullScreenImage.width,
              offset: styles.fullScreenImage.width * index,
              index,
            })}
            keyExtractor={(_, index) => index.toString()}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.fullScreenImageContainer}>
                <ExpoImage
                  source={{ uri: item }}
                  style={styles.fullScreenImage}
                  contentFit="contain"
                />
              </View>
            )}
          />
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: { marginBottom: 25, alignItems: 'center', paddingHorizontal: 10, },
  gameTitleReadOnly: { fontSize: 26, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8, },
  gameGenresReadOnly: { fontSize: 14, color: '#fff', textAlign: 'center', fontWeight: '300' },

  backButton: { position: 'absolute', top: 50, left: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#1b1b1b' },
  errorText: { color: '#fff', fontSize: 18, textAlign: 'center', marginTop: 50 },
  header: { height: 200 },
  coverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  formContainer: { padding: 20, marginTop: -20, backgroundColor: '#1b1b1b', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  label: { fontSize: 12, color: '#6c7d76', fontWeight: 'bold', marginBottom: 6, textTransform: 'uppercase', marginTop: 16 },

  toggleContainer: { flexDirection: 'row', backgroundColor: '#202020', borderRadius: 50, marginBottom: 8, marginTop: 4, padding: 4, borderWidth: 1, borderColor: '#333' },
  toggleButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 50 },
  toggleButtonActive: { backgroundColor: '#4CE5AE' },
  toggleText: { color: '#6c7d76', fontWeight: 'bold' },
  toggleIcons: { color: '#6c7d76', fontSize: 18 },
  toggleIconsActive: { color: '#111', fontSize: 18 },
  toggleTextActive: { color: '#111' },

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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1b1b1b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%', borderWidth: 1, borderColor: '#333' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
  modalOptionText: { color: '#ccc', fontSize: 16 },

  // Nouveaux Styles pour les Onglets
  tabToggleContainer: { flexDirection: 'row', backgroundColor: '#202020', borderRadius: 12, marginBottom: 20, padding: 4, borderWidth: 1, borderColor: '#333' },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabButtonActive: { backgroundColor: '#333', borderWidth: 1, borderColor: '#4CE5AE' },
  tabToggleText: { color: '#6c7d76', fontWeight: 'bold', fontSize: 14 },
  tabToggleTextActive: { color: '#4CE5AE' },

  infoTabContent: { marginTop: 10 },
  metaBox: { backgroundColor: '#202020', borderRadius: 16, padding: 16, marginBottom: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  detailLabel: { color: '#6c7d76', fontSize: 13, fontWeight: 'bold' },
  detailValue: { color: '#fff', fontSize: 13, flex: 1, textAlign: 'right', marginLeft: 10 },

  sectionLabel: { fontSize: 12, color: '#4CE5AE', fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' },
  descriptionBox: { marginBottom: 25 },
  descriptionText: { color: '#ccc', fontSize: 14, lineHeight: 22 },

  screenshotBox: { marginBottom: 20 },
  screenshotList: { marginTop: 10 },
  screenshotItem: { width: 280, height: 158, borderRadius: 12, marginRight: 12, backgroundColor: '#202020' },

  fullScreenContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  fullScreenImageContainer: { width: require('react-native').Dimensions.get('window').width, height: '100%', justifyContent: 'center', alignItems: 'center' },
  fullScreenImage: { width: require('react-native').Dimensions.get('window').width, height: '100%' },
  closeButton: { position: 'absolute', top: 50, right: 20, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 5 },
});