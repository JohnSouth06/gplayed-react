import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Tabs, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HeaderAvatar from '../../components/HeaderAvatar';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  const [hasLoanedGames, setHasLoanedGames] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const checkLoanedStatus = async () => {
        try {
          const token = await SecureStore.getItemAsync('userToken');
          if (!token) return;
          const response = await fetch('https://www.g-played.com/api/index.php?action=api_get_games', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          if (data.success) {
            // S'il y a au moins 1 jeu prêté, on passe la variable à true
            setHasLoanedGames(data.data.some(game => game.status === 'loaned'));
          }
        } catch (error) {
          console.error(error);
        }
      };
      checkLoanedStatus();
    }, [])
  );

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{

        headerShown: true,

        tabBarShowLabel: false,

        headerStyle: {
          backgroundColor: '#1b1b1b',
          borderBottomWidth: 0,
          elevation: 0, // Enlève l'ombre sur Android
          shadowOpacity: 0, // Enlève l'ombre sur iOS
          height: 110,
        },

        headerTitleContainerStyle: {
          paddingBottom: 15, // Espace créé sous le logo
          justifyContent: 'center',
        },

        headerRightContainerStyle: {
          paddingBottom: 15, // Espace créé sous l'avatar
        },

        headerTitleAlign: 'center',
        headerTitle: () => (
          <Image
            source={require('../../assets/images/logo.svg')}
            style={{ width: 150, height: 27 }}
            contentFit="contain"
          />
        ),

        headerRight: () => <HeaderAvatar />,

        tabBarStyle: {
          backgroundColor: '#1b1b1b',
          borderTopWidth: 0,
          height: 60,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#4CE5AE',
        tabBarInactiveTintColor: '#6c7d76',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' }
      }}
    >

      {/* ==========================================
          1. ÉCRANS CACHÉS DU MENU BAS
          (On utilise href: null pour les masquer)
          ========================================== */}
      <Tabs.Screen name="search" options={{ href: null }} />

      {/* ==========================================
          2. ÉCRANS VISIBLES DANS LE MENU
          ========================================== */}

      <Tabs.Screen
        name="home"
        options={{
          title: 'Jeux',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="gamepad-variant" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="loaned"
        options={{
          title: 'Prêts',
          href: hasLoanedGames ? '/loaned' : null,
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="handshake-outline" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="wishlist"
        options={{
          title: 'Souhaits',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="hand-heart-outline" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="psntrophies"
        options={{
          title: 'PSN Trophies',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="trophy" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="chart-areaspline-variant" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="progression"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="book-edit-outline" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="community"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account-group" size={24} color={color} />,
        }}
      />



    </Tabs>
  );
}

const styles = StyleSheet.create({
});