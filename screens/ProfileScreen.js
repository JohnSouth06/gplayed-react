import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import i18n from '../config/i18n';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Formulaire de profil
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState('fr');
  const [localAvatar, setLocalAvatar] = useState(null);

  // États Steam
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [syncProgress, setSyncProgress] = useState(0);

  // URL API
  const API_BASE = 'https://www.g-played.com/api/index.php';

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const userDataString = await SecureStore.getItemAsync('userData');
    if (userDataString) {
      const parsedUser = JSON.parse(userDataString);
      setUser(parsedUser);
      setUsername(parsedUser.username || '');
      setEmail(parsedUser.email || '');
      setLanguage(parsedUser.language || 'fr');
    }
  };

  // --- GESTION DU PROFIL ---

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setLocalAvatar(result.assets[0].uri);
    }
  };

  const handleUpdateProfile = async () => {
    setIsLoading(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      
      // On utilise FormData car on envoie potentiellement un fichier image
      const formData = new FormData();
      formData.append('username', username);
      formData.append('email', email);
      formData.append('language', language);
      if (password) formData.append('new_password', password);
      
      if (localAvatar) {
        const filename = localAvatar.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;
        formData.append('avatar', { uri: localAvatar, name: filename, type });
      }

      const response = await fetch(`${API_BASE}?action=api_update_profile`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        // Mettre à jour le SecureStore avec les nouvelles infos
        const updatedUser = { ...user, username, email, language };
        if (data.new_avatar) updatedUser.avatar = data.new_avatar;
        await SecureStore.setItemAsync('userData', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setPassword('');
        Alert.alert(i18n.t('common.success'), 'Profil mis à jour !');
      } else {
        Alert.alert(i18n.t('common.error'), data.message || 'Erreur lors de la mise à jour.');
      }
    } catch (error) {
      Alert.alert(i18n.t('common.error'), 'Erreur réseau.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- GESTION DES DONNÉES (IMPORT/EXPORT) ---

  const handleExportJson = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(`${API_BASE}?action=api_export_json`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // On lit la réponse en texte brut d'abord pour éviter le crash 
      // si PHP renvoie une erreur au lieu d'un JSON
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Erreur API (non-JSON) :", responseText);
        Alert.alert('Erreur serveur', 'Le fichier généré par le serveur est invalide.');
        return;
      }
      
      // Création du fichier local
      const fileUri = FileSystem.documentDirectory + `gplayed_collection_${new Date().toISOString().split('T')[0]}.json`;
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data, null, 2), { encoding: 'utf8' });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Exporter ma collection G-Played',
          UTI: 'public.json'
        });
      } else {
        Alert.alert('Succès', 'Fichier téléchargé en interne, mais le partage n\'est pas disponible.');
      }
    } catch (error) {
      console.error("Erreur Export:", error);
      Alert.alert(i18n.t('common.error'), 'Erreur lors de l\'exportation.');
    }
  };

  const handleImportJson = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (!result.canceled) {
        setIsLoading(true);
        const token = await SecureStore.getItemAsync('userToken');
        
        const fileUri = result.assets[0].uri;
        const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: 'utf8' });
        
        const response = await fetch(`${API_BASE}?action=api_import_json`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: fileContent
        });
        
        const data = await response.json();
        Alert.alert('Importation', data.message || `${data.count} jeux importés !`);
      }
    } catch (error) {
      console.error("Erreur Import:", error);
      Alert.alert(i18n.t('common.error'), 'Erreur lors de l\'importation.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- PARTAGE ---

  const handleShareProfile = async () => {
    try {
      const result = await Share.share({
        message: `Découvrez ma collection de jeux vidéo sur G-Played ! https://www.g-played.com/index.php?action=share&id=${user.id}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  // --- ZONE DE DANGER ---

  const handleDeleteAccount = () => {
    Alert.alert(
      "Supprimer le compte",
      "ATTENTION : Cette action est irréversible. Toute votre collection sera effacée.",
      [
        { text: i18n.t('common.cancel'), style: "cancel" },
        { 
          text: "Supprimer définitivement", 
          style: "destructive",
          onPress: async () => {
            const token = await SecureStore.getItemAsync('userToken');
            await fetch(`${API_BASE}?action=api_delete_account`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }});
            await SecureStore.deleteItemAsync('userToken');
            await SecureStore.deleteItemAsync('userData');
            router.replace('/');
          } 
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(i18n.t('profile.logout_title'), i18n.t('profile.logout_question'), [
      { text: i18n.t('common.cancel'), style: "cancel" },
      { text: i18n.t('profile.logout_button'), style: "destructive", onPress: async () => {
          await SecureStore.deleteItemAsync('userToken');
          await SecureStore.deleteItemAsync('userData');
          router.replace('/');
        } 
      }
    ]);
  };

  // --- STEAM (Identique à la version précédente) ---
  const handleSteamAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const returnUrl = Linking.createURL('steam-callback');
      const authUrl = `${API_BASE}?action=api_steam_login&token=${token}&redirect=${encodeURIComponent(returnUrl)}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, returnUrl);
      if (result.type === 'success') startSteamSync(token);
    } catch (error) { Alert.alert('Erreur', 'Impossible de joindre Steam.'); }
  };

  const startSteamSync = async (token) => {
    setIsSyncing(true); setSyncProgress(0); setSyncStatus('Récupération...');
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    try {
      const listRes = await fetch(`${API_BASE}?action=api_steam_games`, { headers });
      const listData = await listRes.json();
      if (!listData.success) throw new Error(listData.error);
      const games = listData.games; const total = games.length;
      if (total === 0) { setSyncStatus('À jour !'); setSyncProgress(100); setTimeout(() => setIsSyncing(false), 2000); return; }

      let processed = 0;
      for (const game of games) {
        setSyncStatus(`Importation: ${game.name}`);
        await fetch(`${API_BASE}?action=api_steam_import_single`, { method: 'POST', headers, body: JSON.stringify(game) });
        processed++; setSyncProgress(Math.round((processed / total) * 100));
      }
      setSyncStatus('Terminé !'); await fetch(`${API_BASE}?action=api_steam_complete`, { headers });
      setTimeout(() => setIsSyncing(false), 2000);
    } catch (e) {
      setSyncStatus("Erreur de synchronisation."); setTimeout(() => setIsSyncing(false), 3000);
    }
  };

  if (!user) return <View style={styles.container} />;

  // Affichage dynamique de l'avatar (priorité à la sélection locale pour l'aperçu)
  let displayAvatar = 'https://www.g-played.com/uploads/avatars/default.png';
  if (localAvatar) displayAvatar = localAvatar;
  else if (user?.avatar) displayAvatar = user.avatar.startsWith('http') ? user.avatar : `https://www.g-played.com/${user.avatar}`;

  // Formatage de la date (si l'API la renvoie)
  const memberSince = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back-ios" size={24} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={pickAvatar} style={styles.avatarContainer}>
          <Image source={{ uri: displayAvatar }} style={styles.avatar} />
          <View style={styles.avatarEditBadge}>
            <MaterialIcons name="edit" size={14} color="#111" />
          </View>
        </TouchableOpacity>
        
        <Text style={styles.username}>{user.username}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <Text style={styles.memberSince}>Membre depuis le {memberSince}</Text>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
        {/* SECTION 1 : Paramètres du compte */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paramètres du profil</Text>
          
          <Text style={styles.label}>Nom d'utilisateur</Text>
          <TextInput style={styles.input} value={username} onChangeText={setUsername} />
          
          <Text style={styles.label}>Adresse e-mail</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          
          <Text style={styles.label}>Nouveau mot de passe (optionnel)</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Laisser vide pour ne pas changer" placeholderTextColor="#6c7d76" />

          <TouchableOpacity style={styles.primaryButton} onPress={handleUpdateProfile} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#111" /> : <Text style={styles.primaryButtonText}>Mettre à jour</Text>}
          </TouchableOpacity>
        </View>

        {/* SECTION 3 : Steam */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Intégrations</Text>
          <Text style={styles.descText}>Synchronisez vos jeux PC depuis votre compte Steam.</Text>
          <TouchableOpacity style={styles.steamButton} onPress={handleSteamAuth}>
            <FontAwesome5 name="steam" size={20} color="#fff" />
            <Text style={styles.steamText}>Importer mes jeux Steam</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION 4 : Partage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profil public</Text>
          <Text style={styles.descText}>Partagez votre collection avec vos amis.</Text>
          <TouchableOpacity style={styles.actionButton} onPress={handleShareProfile}>
            <MaterialIcons name="share" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Partager mon profil</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION 5 : Déconnexion et Suppression */}
        <View style={[styles.section, styles.dangerZone]}>
          <Text style={[styles.sectionTitle, {color: '#dc3545'}]}>Zone de danger</Text>
          
          <TouchableOpacity style={styles.dangerButtonOutline} onPress={handleLogout}>
            <Text style={styles.dangerButtonText}>Se déconnecter</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dangerButtonFilled} onPress={handleDeleteAccount}>
            <Text style={styles.dangerButtonTextFilled}>Supprimer mon compte</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Modal Steam */}
      <Modal visible={isSyncing} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <FontAwesome5 name="sync" size={32} color="#66c0f4" style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Synchronisation Steam</Text>
            <Text style={styles.modalStatus}>{syncStatus}</Text>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { width: `${syncProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>{syncProgress}%</Text>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1b1b1b' },
  header: { alignItems: 'center', paddingTop: 60, paddingBottom: 30, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', backgroundColor: '#202020' },
  backButton: { position: 'absolute', top: 60, left: 20, zIndex: 10, padding: 10 },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#4CE5AE' },
  avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#4CE5AE', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#202020' },
  username: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  email: { fontSize: 14, color: '#aaa', marginBottom: 4 },
  memberSince: { fontSize: 12, color: '#6c7d76' },
  
  scrollContent: { padding: 20 },
  section: { backgroundColor: '#202020', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#333' },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  descText: { color: '#aaa', fontSize: 13, marginBottom: 16 },
  
  label: { color: '#6c7d76', fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#1b1b1b', color: '#fff', borderRadius: 10, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#444' },
  
  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#444', alignItems: 'center' },
  langBtnActive: { borderColor: '#4CE5AE', backgroundColor: 'rgba(76, 229, 174, 0.1)' },
  langText: { color: '#ccc', fontWeight: 'bold' },
  langTextActive: { color: '#4CE5AE' },

  primaryButton: { backgroundColor: '#4CE5AE', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 24 },
  primaryButtonText: { color: '#111', fontSize: 16, fontWeight: 'bold' },

  rowButtons: { flexDirection: 'row', gap: 12 },
  outlineButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#4CE5AE', gap: 8 },
  outlineButtonText: { color: '#4CE5AE', fontWeight: 'bold', fontSize: 13 },

  steamButton: { flexDirection: 'row', backgroundColor: '#171a21', borderWidth: 1, borderColor: '#66c0f4', borderRadius: 10, padding: 14, alignItems: 'center', justifyContent: 'center' },
  steamText: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginLeft: 10 },

  actionButton: { flexDirection: 'row', backgroundColor: '#333', borderRadius: 10, padding: 14, alignItems: 'center', justifyContent: 'center', gap: 10 },
  actionButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  dangerZone: { borderColor: 'rgba(220, 53, 69, 0.3)' },
  dangerButtonOutline: { borderWidth: 1, borderColor: '#dc3545', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 12 },
  dangerButtonText: { color: '#dc3545', fontWeight: 'bold', fontSize: 15 },
  dangerButtonFilled: { backgroundColor: '#dc3545', borderRadius: 10, padding: 14, alignItems: 'center' },
  dangerButtonTextFilled: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#202020', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  modalTitle: { color: '#66c0f4', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  modalStatus: { color: '#ccc', fontSize: 14, textAlign: 'center', marginBottom: 20, height: 40 },
  progressBarContainer: { width: '100%', height: 20, backgroundColor: '#171a21', borderRadius: 10, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%', backgroundColor: '#66c0f4' },
  progressText: { color: '#fff', fontWeight: 'bold' }
});