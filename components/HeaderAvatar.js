import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, TouchableOpacity } from 'react-native';

export default function HeaderAvatar() {
  const router = useRouter();
  const [avatarUri, setAvatarUri] = useState('https://www.g-played.com/uploads/avatars/default.png');

  useEffect(() => {
    const loadAvatar = async () => {
      const userDataString = await SecureStore.getItemAsync('userData');
      if (userDataString) {
        const user = JSON.parse(userDataString);
        if (user.avatar) {
          setAvatarUri(user.avatar.startsWith('http') ? user.avatar : `https://www.g-played.com/${user.avatar}`);
        }
      }
    };
    loadAvatar();
  }, []);

  return (
    <TouchableOpacity onPress={() => router.push('/profile')} style={styles.container}>
      <Image source={{ uri: avatarUri }} style={styles.avatar} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { marginRight: 16 },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#4CE5AE' }
});