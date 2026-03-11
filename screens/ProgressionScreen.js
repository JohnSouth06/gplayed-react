import { MaterialIcons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// Ajout de l'import i18n
import i18n from '../config/i18n';

export default function ProgressionScreen() {
  const [history, setHistory] = useState([]);
  const [selectableGames, setSelectableGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- ÉTATS DU CHRONOMÈTRE ---
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // --- ÉTATS DE LA MODALE ---
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isGamePickerVisible, setIsGamePickerVisible] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [durationHours, setDurationHours] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const API_BASE = 'https://www.g-played.com/api/index.php';

  useFocusEffect(
    useCallback(() => {
      fetchProgressData();
    }, [])
  );

  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else if (!isTimerRunning && timerSeconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const fetchProgressData = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(`${API_BASE}?action=api_get_progress`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      if (data.success) {
        setHistory(data.history);
        setSelectableGames(data.games);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleStopTimer = () => {
    setIsTimerRunning(false);
    if (timerSeconds > 60) {
      const h = Math.floor(timerSeconds / 3600);
      const m = Math.floor((timerSeconds % 3600) / 60);
      setDurationHours(h.toString());
      setDurationMinutes(m.toString());
      setTimerSeconds(0);
      setIsModalVisible(true);
    } else {
      setTimerSeconds(0);
    }
  };

  const handleSubmitProgress = async () => {
    if (!selectedGame) {
      Alert.alert(i18n.t('common.error'), i18n.t('progression.error_no_game'));
      return;
    }
    const h = parseInt(durationHours) || 0;
    const m = parseInt(durationMinutes) || 0;

    if (h === 0 && m === 0) {
      Alert.alert(i18n.t('common.error'), i18n.t('progression.error_duration'));
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const logDate = new Date().toISOString().split('T')[0];

      const response = await fetch(`${API_BASE}?action=api_add_progress`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: selectedGame.id,
          log_date: logDate,
          duration_hours: h,
          duration_minutes: m,
          notes: notes
        })
      });

      const data = await response.json();
      if (data.success) {
        setIsModalVisible(false);
        setDurationHours('');
        setDurationMinutes('');
        setNotes('');
        setSelectedGame(null);
        fetchProgressData();
        Alert.alert(i18n.t('common.success'), i18n.t('progression.success_save'));
      } else {
        Alert.alert(i18n.t('common.error'), data.message);
      }
    } catch (error) {
      Alert.alert(i18n.t('common.error'), i18n.t('common.network_error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProgress = (id) => {
    Alert.alert(i18n.t('common.delete'), i18n.t('progression.confirm_delete'), [
      { text: i18n.t('common.cancel'), style: "cancel" },
      {
        text: i18n.t('common.delete'), style: "destructive", onPress: async () => {
          const token = await SecureStore.getItemAsync('userToken');
          await fetch(`${API_BASE}?action=api_delete_progress&id=${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
          fetchProgressData();
        }
      }
    ]);
  };

  const renderHistoryItem = ({ item }) => {
    const formattedDate = new Date(item.log_date).toLocaleDateString();
    const hours = Math.floor(item.duration_minutes / 60);
    const mins = item.duration_minutes % 60;
    let imageUrl = item.game_image?.startsWith('http') ? item.game_image : `https://www.g-played.com/${item.game_image}`;

    return (
      <View style={styles.historyCard}>
        <ExpoImage source={{ uri: imageUrl }} style={styles.historyCover} contentFit="cover" cachePolicy="memory-disk" />
        <View style={styles.historyInfo}>
          <Text style={styles.historyTitle} numberOfLines={1}>{item.game_title}</Text>
          <View style={styles.historyMetaRow}>
            <View style={styles.historyBadge}>
              <MaterialIcons name="schedule" size={14} color="#4CE5AE" />
              <Text style={styles.historyDuration}>{hours}h {mins > 0 ? `${mins}m` : ''}</Text>
            </View>
            <Text style={styles.historyDate}>{formattedDate}</Text>
          </View>
          {item.notes ? <Text style={styles.historyNotes} numberOfLines={2}>"{item.notes}"</Text> : null}
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteProgress(item.id)}>
          <MaterialIcons name="delete-outline" size={22} color="#dc3545" />
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#4CE5AE" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>{i18n.t('progression.title')}</Text>
        <TouchableOpacity style={styles.addBtnHeader} onPress={() => { setIsGamePickerVisible(false); setIsModalVisible(true); }}>
          <MaterialIcons name="add" size={24} color="#111" />
        </TouchableOpacity>
      </View>

      <View style={styles.timerCard}>
        <Text style={styles.timerLabel}>{i18n.t('progression.current_session')}</Text>
        <Text style={styles.timerDisplay}>{formatTime(timerSeconds)}</Text>
        <View style={styles.timerControls}>
          <TouchableOpacity
            style={[styles.timerBtn, isTimerRunning ? styles.timerBtnPause : styles.timerBtnStart]}
            onPress={() => setIsTimerRunning(!isTimerRunning)}
          >
            <MaterialIcons name={isTimerRunning ? "pause" : "play-arrow"} size={32} color={isTimerRunning ? "#f0ad4e" : "#111"} />
          </TouchableOpacity>
          {(timerSeconds > 0 || isTimerRunning) && (
            <TouchableOpacity style={[styles.timerBtn, styles.timerBtnStop]} onPress={handleStopTimer}>
              <MaterialIcons name="stop" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={styles.sectionTitle}>{i18n.t('progression.history_title')}</Text>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderHistoryItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.emptyText}>{i18n.t('progression.empty_text')}</Text>}
      />

      {/* MODALE UNIQUE (Correction iOS & Traductions) */}
      <Modal 
        visible={isModalVisible} 
        transparent 
        animationType="slide"
        onRequestClose={() => isGamePickerVisible ? setIsGamePickerVisible(false) : setIsModalVisible(false)}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalContent, isGamePickerVisible && { height: '70%' }]}>
            {isGamePickerVisible ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                  <TouchableOpacity onPress={() => setIsGamePickerVisible(false)}>
                    <MaterialIcons name="arrow-back" size={24} color="#4CE5AE" />
                  </TouchableOpacity>
                  <Text style={[styles.modalTitle, { flex: 1, marginBottom: 0 }]}>{i18n.t('progression.choose_game')}</Text>
                </View>
                <FlatList
                  data={selectableGames}
                  keyExtractor={item => item.id.toString()}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.pickerOption} onPress={() => { setSelectedGame(item); setIsGamePickerVisible(false); }}>
                      <Text style={styles.pickerOptionText}>{item.title}</Text>
                    </TouchableOpacity>
                  )}
                />
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>{i18n.t('progression.modal_title')}</Text>
                <Text style={styles.label}>{i18n.t('progression.label_game')}</Text>
                <TouchableOpacity style={styles.gameSelectBtn} onPress={() => setIsGamePickerVisible(true)}>
                  <Text style={[styles.gameSelectText, !selectedGame && { color: '#6c7d76' }]}>
                    {selectedGame ? selectedGame.title : i18n.t('progression.choose_game')}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={24} color="#6c7d76" />
                </TouchableOpacity>

                <Text style={styles.label}>{i18n.t('progression.label_duration')}</Text>
                <View style={styles.durationRow}>
                  <TextInput style={styles.durationInput} placeholder="0" placeholderTextColor="#6c7d76" keyboardType="numeric" value={durationHours} onChangeText={setDurationHours} />
                  <Text style={styles.durationUnit}>h</Text>
                  <TextInput style={styles.durationInput} placeholder="0" placeholderTextColor="#6c7d76" keyboardType="numeric" value={durationMinutes} onChangeText={setDurationMinutes} maxLength={2} />
                  <Text style={styles.durationUnit}>m</Text>
                </View>

                <Text style={styles.label}>{i18n.t('progression.label_notes')}</Text>
                <TextInput style={[styles.input, styles.textArea]} placeholder={i18n.t('progression.placeholder_notes')} placeholderTextColor="#6c7d76" multiline value={notes} onChangeText={setNotes} />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => setIsModalVisible(false)}>
                    <Text style={styles.cancelBtnText}>{i18n.t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} onPress={handleSubmitProgress} disabled={isSubmitting}>
                    {isSubmitting ? <ActivityIndicator color="#111" /> : <Text style={styles.saveBtnText}>{i18n.t('common.save')}</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1b1b1b' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1b1b1b' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20 },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  addBtnHeader: { backgroundColor: '#4CE5AE', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  timerCard: { backgroundColor: '#202020', marginHorizontal: 20, borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#333', marginBottom: 24 },
  timerLabel: { color: '#6c7d76', fontSize: 12, fontWeight: 'bold', letterSpacing: 1, marginBottom: 8 },
  timerDisplay: { fontSize: 48, fontWeight: '300', color: '#fff', fontVariant: ['tabular-nums'] },
  timerControls: { flexDirection: 'row', gap: 16, marginTop: 20, alignItems: 'center' },
  timerBtn: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  timerBtnStart: { backgroundColor: '#4CE5AE' },
  timerBtnPause: { backgroundColor: 'rgba(240, 173, 78, 0.2)', borderWidth: 2, borderColor: '#f0ad4e' },
  timerBtnStop: { backgroundColor: '#dc3545', width: 48, height: 48, borderRadius: 24 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginHorizontal: 20, marginBottom: 16 },
  listContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  historyCard: { flexDirection: 'row', backgroundColor: '#202020', borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  historyCover: { width: 50, height: 65, borderRadius: 8, backgroundColor: '#151515' },
  historyInfo: { flex: 1, marginLeft: 12 },
  historyTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  historyMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  historyBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(76, 229, 174, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, gap: 4 },
  historyDuration: { color: '#4CE5AE', fontSize: 12, fontWeight: 'bold' },
  historyDate: { color: '#6c7d76', fontSize: 12 },
  historyNotes: { color: '#aaa', fontSize: 13, fontStyle: 'italic' },
  deleteBtn: { padding: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1b1b1b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: '#333' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  label: { color: '#6c7d76', fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
  gameSelectBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#202020', borderWidth: 1, borderColor: '#333', borderRadius: 12, padding: 16 },
  gameSelectText: { color: '#fff', fontSize: 15, flex: 1 },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  durationInput: { flex: 1, backgroundColor: '#202020', color: '#fff', borderRadius: 12, padding: 16, fontSize: 18, borderWidth: 1, borderColor: '#333', textAlign: 'center' },
  durationUnit: { color: '#6c7d76', fontSize: 18, fontWeight: 'bold' },
  input: { backgroundColor: '#202020', color: '#fff', borderRadius: 12, padding: 16, fontSize: 15, borderWidth: 1, borderColor: '#333' },
  textArea: { height: 100, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  actionBtn: { flex: 1, padding: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 35 },
  cancelBtn: { backgroundColor: 'transparent', borderColor: '#6c7d76', borderRadius: 35 },
  saveBtn: { backgroundColor: '#4CE5AE', borderColor: '#4CE5AE', borderRadius: 35 },
  cancelBtnText: { color: '#ccc', fontWeight: 'bold', fontSize: 16 },
  saveBtnText: { color: '#111', fontWeight: 'bold', fontSize: 16 },
  pickerOption: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
  pickerOptionText: { color: '#fff', fontSize: 16 }
});