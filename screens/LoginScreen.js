import { FontAwesome5, FontAwesome6 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import i18n from '../config/i18n';

// Permet de finaliser la session d'authentification si le navigateur est fermé
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const API_URL = 'https://www.g-played.com/api/index.php?action=api_login';
  const API_SOCIAL_VERIFY_URL = 'https://www.g-played.com/api/index.php?action=api_mobile_verify';

  // Écoute les URL de redirection entrantes (Deep Linking)
  const url = Linking.useURL();

  useEffect(() => {
    if (url) {
      handleDeepLink(url);
    }
  }, [url]);

  const handleDeepLink = (incomingUrl) => {
    const parsedUrl = Linking.parse(incomingUrl);
    if (parsedUrl.queryParams?.token) {
      verifyMobileToken(parsedUrl.queryParams.token);
    }
  };

  // Envoie le token crypté au dossier API pour l'échanger contre un vrai token API
  const verifyMobileToken = async (signedToken) => {
    setIsLoading(true);
    try {
      const response = await fetch(API_SOCIAL_VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ token: signedToken }),
      });

      const data = await response.json();

      if (data.success) {
        await SecureStore.setItemAsync('userToken', data.token);
        if (data.user) await SecureStore.setItemAsync('userData', JSON.stringify(data.user));
        
        router.replace('/home');
        Alert.alert(i18n.t('common.success', { defaultValue: 'Succès' }), i18n.t('login.success_msg', { defaultValue: 'Connexion réussie' }));
      } else {
        Alert.alert(i18n.t('common.error', { defaultValue: 'Erreur' }), data.message || i18n.t('login.error_invalid'));
      }
    } catch (error) {
      console.error(error);
      Alert.alert(i18n.t('common.network_error', { defaultValue: 'Erreur réseau' }), i18n.t('login.error_network'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStandardLogin = async () => {
    if (!username || !password) {
      Alert.alert(i18n.t('common.error'), i18n.t('login.error_empty'));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        await SecureStore.setItemAsync('userToken', data.token);
        if (data.user) await SecureStore.setItemAsync('userData', JSON.stringify(data.user));
        
        router.replace('/home');
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

  const handleSocialLogin = async (provider) => {
    try {
      // Crée une URL de retour dynamique gérée par Expo (ex: exp://.../--/login)
      const redirectUrl = Linking.createURL('login');
      
      // On passe cette URL au backend pour qu'il sache où rediriger après l'authentification web
      const authUrl = `https://www.g-played.com/index.php?action=login_${provider}&app_redirect=${encodeURIComponent(redirectUrl)}`;
      
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      
      if (result.type === 'success' && result.url) {
        handleDeepLink(result.url);
      }
    } catch (error) {
      console.error("Erreur d'authentification sociale:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/images/logo.svg')} style={styles.logo} contentFit="contain" />
      <Text style={styles.subtitle}>{i18n.t('login.title', { defaultValue: 'Connexion' })}</Text>

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

      <TouchableOpacity style={styles.button} onPress={handleStandardLogin} disabled={isLoading}>
        {isLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>{i18n.t('login.button')}</Text>}
      </TouchableOpacity>

      <View style={styles.dividerContainer}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>ou</Text>
        <View style={styles.divider} />
      </View>

      <TouchableOpacity style={[styles.button, styles.googleButton]} onPress={() => handleSocialLogin('google')} disabled={isLoading}>
        <Text style={styles.googleButtonText}><FontAwesome5 name="google" style={[styles.btnIconGoogle, styles.btnIconGoogleActive]} />  Continuer avec Google</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.discordButton]} onPress={() => handleSocialLogin('discord')} disabled={isLoading}>
        <Text style={styles.discordButtonText}><FontAwesome6 name="discord" style={[styles.btnIconDiscord, styles.btnIconDiscordActive]} />  Continuer avec Discord</Text>
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
  button: { backgroundColor: '#4CE5AE', borderRadius: 8, padding: 16, alignItems: 'center', borderRadius: 35 },
  buttonText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
  
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  divider: { flex: 1, height: 1, backgroundColor: '#333' },
  dividerText: { color: '#888', paddingHorizontal: 10 },
  
  googleButton: { backgroundColor: '#fff', marginBottom: 12, borderRadius: 35 },
  googleButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  btnIconGoogle: { color: '#111', fontSize: 16 },
  btnIconGoogleActive: { color: '#111' },
  
  discordButton: { backgroundColor: '#5865F2', borderRadius: 35 },
  discordButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  btnIconDiscord: { color: '#fff', fontSize: 16 },
  btnIconDiscordActive: { color: '#fff' },
});