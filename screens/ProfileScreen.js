import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import i18n from '../config/i18n';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const userDataString = await SecureStore.getItemAsync('userData');
    if (userDataString) {
      setUser(JSON.parse(userDataString));
    }
  };

  const handleLogout = () => {
    Alert.alert(
      i18n.t('profile.logout_title'),
      i18n.t('profile.logout_question'),
      [
        { text: i18n.t('common.cancel'), style: "cancel" },
        { 
          text: i18n.t('profile.logout_button'), 
          style: "destructive",
          onPress: async () => {
            await SecureStore.deleteItemAsync('userToken');
            await SecureStore.deleteItemAsync('userData');
            router.replace('/');
          } 
        }
      ]
    );
  };

  if (!user) return <View style={styles.container} />;

  const avatarUri = user?.avatar 
    ? (user.avatar.startsWith('http') ? user.avatar : `https://www.g-played.com/${user.avatar}`) 
    : 'https://www.g-played.com/uploads/avatars/default.png';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back-ios" size={24} color="#fff" />
        </TouchableOpacity>

        <Image source={{ uri: avatarUri }} style={styles.avatar} />
        <Text style={styles.username}>{user.username}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>{i18n.t('profile.logout_button')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1b1b1b' },
  header: { alignItems: 'center', paddingTop: 60, paddingBottom: 40, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', position: 'relative' },
  backButton: { position: 'absolute', top: 60, left: 20, zIndex: 10, padding: 10 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#4CE5AE', marginBottom: 16 },
  username: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  email: { fontSize: 14, color: '#6c7d76' },
  menuContainer: { padding: 20, marginTop: 20 },
  logoutButton: { backgroundColor: 'rgba(220, 53, 69, 0.1)', borderWidth: 1, borderColor: '#dc3545', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
  logoutText: { color: '#dc3545', fontSize: 16, fontWeight: 'bold' }
});