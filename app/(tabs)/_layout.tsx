import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // On cache le header du haut par défaut
        tabBarStyle: {
          backgroundColor: '#1b1b1b', // Fond sombre
          borderTopWidth: 1,
          borderTopColor: 'rgba(255, 255, 255, 0.05)',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#4CE5AE', // Vert G-Played
        tabBarInactiveTintColor: '#6c7d76', // Gris secondaire
        tabBarLabelStyle: {
          fontSize: 10, // Un peu plus petit pour faire rentrer les 6 menus proprement
          fontWeight: '600',
        }
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
          tabBarIcon: ({ color }) => <MaterialIcons name="collections-bookmark" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="loaned"
        options={{
          title: 'Prêts',
          tabBarIcon: ({ color }) => <MaterialIcons name="handshake" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="wishlist"
        options={{
          title: 'Souhaits',
          tabBarIcon: ({ color }) => <MaterialIcons name="favorite-border" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="progression"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color }) => <MaterialIcons name="menu-book" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }) => <MaterialIcons name="bar-chart" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="community"
        options={{
          title: 'Réseau',
          tabBarIcon: ({ color }) => <MaterialIcons name="groups" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}