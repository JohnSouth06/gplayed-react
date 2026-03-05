import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import i18n from '../config/i18n';

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const API_URL = 'https://www.g-played.com/api/index.php?action=api_login';

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert(i18n.t('common.error'), i18n.t('login.error_empty'));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ username: username, password: password }),
      });

      const data = await response.json();

      if (data.success) {
        await SecureStore.setItemAsync('userToken', data.token);
        if (data.user) await SecureStore.setItemAsync('userData', JSON.stringify(data.user));
        
        router.replace('/home');
        Alert.alert(i18n.t('common.success'), i18n.t('login.success_msg'));
      } else {
        Alert.alert(i18n.t('common.error'), data.message || i18n.t('login.error_invalid'));
      }
    } catch (error) {
      console.error(error);
      Alert.alert(i18n.t('common.network_error'), i18n.t('login.error_network'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/images/logo.svg')} style={styles.logo} contentFit="contain" />
      <Text style={styles.subtitle}>{i18n.t('login.title')}</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={i18n.t('login.username')}
          placeholderTextColor="#888"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder={i18n.t('login.password')}
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading}>
        {isLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>{i18n.t('login.button')}</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', padding: 24 },
  logo: { width: 280, height: 50, alignSelf: 'center', marginBottom: 15 },
  subtitle: { fontSize: 16, color: '#ccc', textAlign: 'center', marginBottom: 48 },
  inputContainer: { marginBottom: 24 },
  input: { backgroundColor: '#1e1e1e', color: '#fff', borderRadius: 8, padding: 16, marginBottom: 16, fontSize: 16, borderWidth: 1, borderColor: '#333' },
  button: { backgroundColor: '#4CE5AE', borderRadius: 8, padding: 16, alignItems: 'center' },
  buttonText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
});