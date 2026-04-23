import { FontAwesome5, FontAwesome6 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import i18n from '../config/i18n';

// Permet de finaliser la session d'authentification si le navigateur est fermé
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  const API_URL = 'https://www.g-played.com/api/index.php?action=api_login';
  const API_SOCIAL_VERIFY_URL = 'https://www.g-played.com/api/index.php?action=api_mobile_verify';
  const API_FORGOT_PASSWORD = 'https://www.g-played.com/api/index.php?action=api_forgot_password';

  // Écoute les URL de redirection entrantes (Deep Linking)
  const url = Linking.useURL();

  useEffect(() => {
    if (url) {
      handleDeepLink(url);
    }
  }, [url]);

  const handleDeepLink = (incomingUrl) => {
    const parsedUrl = Linking.parse(incomingUrl);

    if ((!parsedUrl.path || parsedUrl.path === '/') && parsedUrl.queryParams?.token) {
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

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      Alert.alert(i18n.t('common.error'), "Veuillez saisir votre email.");
      return;
    }
    setIsSendingReset(true);
    try {
      const appRedirectUrl = Linking.createURL('reset-password');

      const response = await fetch(API_FORGOT_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail,
          redirect_url: appRedirectUrl
        }),
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert(i18n.t('common.success'), "Un lien de réinitialisation vous a été envoyé par email.");
        setForgotModalVisible(false);
      } else {
        Alert.alert(i18n.t('common.error'), data.message);
      }
    } catch (error) {
      Alert.alert(i18n.t('common.error'), "Erreur réseau.");
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    try {
      const redirectUrl = Linking.createURL('/');

      // On pointe vers /api/index.php avec l'action correspondante
      const authUrl = `https://www.g-played.com/api/index.php?action=api_login_${provider}&app_redirect=${encodeURIComponent(redirectUrl)}`;

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

        <TouchableOpacity onPress={() => setForgotModalVisible(true)} style={{ marginTop: 15 }}>
          <Text style={{ color: '#6c7d76', textAlign: 'center' }}>{i18n.t('login.forgot_password')}</Text>
        </TouchableOpacity>


        <Modal visible={forgotModalVisible} transparent animationType="fade" onRequestClose={() => setForgotModalVisible(false)}>
          <View style={styles.lendModalOverlay}>
            <View style={styles.lendModalContent}>
              <Text style={[styles.lendModalTitle, { color: '#4CE5AE' }]}>
                {i18n.t('login.reset_title', { defaultValue: 'Réinitialiser le mot de passe' })}
              </Text>
              <Text style={styles.lendModalText}>
                Saisissez votre email pour recevoir un lien de réinitialisation.
              </Text>
              <TextInput
                style={styles.lendInput}
                placeholder="Email"
                placeholderTextColor="#6c7d76"
                value={forgotEmail}
                onChangeText={setForgotEmail}
                autoFocus
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <View style={styles.lendModalActions}>
                <TouchableOpacity style={[styles.lendModalBtn, styles.lendModalBtnCancel]} onPress={() => setForgotModalVisible(false)}>
                  <Text style={styles.lendModalBtnTextCancel}>{i18n.t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.lendModalBtn, styles.lendModalBtnConfirm, { backgroundColor: '#4CE5AE', borderColor: '#4CE5AE' }]}
                  onPress={handleForgotPassword}
                  disabled={isSendingReset}
                >
                  {isSendingReset ? (
                    <ActivityIndicator color="#111" />
                  ) : (
                    <Text style={styles.lendModalBtnTextConfirm}>{i18n.t('common.send', { defaultValue: 'Envoyer' })}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  button: { backgroundColor: '#4CE5AE', borderRadius: 35, padding: 16, alignItems: 'center' },
  buttonText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
  forgotButton: { marginTop: 15, alignSelf: 'center' },
  forgotText: { color: '#6c7d76', fontSize: 14 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  divider: { flex: 1, height: 1, backgroundColor: '#333' },
  dividerText: { color: '#888', paddingHorizontal: 10 },
  googleButton: { backgroundColor: '#fff', marginBottom: 12 },
  googleButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  discordButton: { backgroundColor: '#5865F2' },
  discordButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  lendModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  lendModalContent: { backgroundColor: '#1b1b1b', width: '100%', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#333' },
  lendModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  lendModalText: { color: '#ccc', fontSize: 15, marginBottom: 20, textAlign: 'center' },
  lendInput: { backgroundColor: '#202020', color: '#fff', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#333', marginBottom: 24 },
  lendModalActions: { flexDirection: 'row', gap: 12 },
  lendModalBtn: { flex: 1, padding: 14, borderRadius: 35, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  lendModalBtnCancel: { backgroundColor: 'transparent', borderColor: '#6c7d76' },
  lendModalBtnConfirm: { backgroundColor: '#4CE5AE', borderColor: '#4CE5AE' },
  lendModalBtnTextCancel: { color: '#ccc', fontWeight: 'bold', fontSize: 16 },
  lendModalBtnTextConfirm: { color: '#111', fontWeight: 'bold', fontSize: 16 },
});