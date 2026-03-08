import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ResetPasswordScreen() {
  const router = useRouter();
  // Expo Router récupère automatiquement le "token" présent dans l'URL de l'email
  const { token } = useLocalSearchParams(); 

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const API_RESET_PASSWORD = 'https://www.g-played.com/api/index.php?action=api_reset_password';

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(API_RESET_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await response.json();

      if (data.success) {
        Alert.alert("Succès", data.message, [
          { text: "OK", onPress: () => router.replace('/') } // Retour à la page de connexion
        ]);
      } else {
        Alert.alert("Erreur", data.message);
      }
    } catch (error) {
      Alert.alert("Erreur réseau", "Impossible de joindre le serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nouveau mot de passe</Text>
      <Text style={styles.subtitle}>Veuillez saisir votre nouveau mot de passe ci-dessous.</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Nouveau mot de passe"
          placeholderTextColor="#888"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
          <MaterialIcons name={showPassword ? "visibility" : "visibility-off"} size={24} color="#888" />
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Confirmer le mot de passe"
          placeholderTextColor="#888"
          secureTextEntry={!showPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={isLoading}>
        {isLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Valider</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={() => router.replace('/')}>
        <Text style={styles.cancelText}>Annuler</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#ccc', textAlign: 'center', marginBottom: 40 },
  inputContainer: { position: 'relative', marginBottom: 16 },
  input: { backgroundColor: '#1e1e1e', color: '#fff', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#333' },
  eyeIcon: { position: 'absolute', right: 16, top: 16 },
  button: { backgroundColor: '#4CE5AE', borderRadius: 35, padding: 16, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
  cancelButton: { marginTop: 20, alignItems: 'center' },
  cancelText: { color: '#6c7d76', fontSize: 16 }
});