import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import HeaderAvatar from '../../components/HeaderAvatar'; // <-- NOUVEL IMPORT

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        // 1. ON ACTIVE LA BARRE NATIVE
        headerShown: true, 
        
        // 2. LE STYLE DE LA BARRE
        headerStyle: {
          backgroundColor: '#1b1b1b',
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255, 255, 255, 0.05)',
          elevation: 0, // Enlève l'ombre sur Android
          shadowOpacity: 0, // Enlève l'ombre sur iOS
        },
        
        // 3. LE LOGO À GAUCHE
        headerTitleAlign: 'left',
        headerTitle: () => (
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#fff', fontStyle: 'italic' }}>
            G<Text style={{ color: '#4CE5AE' }}>-</Text>Played
          </Text>
        ),
        
        // 4. L'AVATAR À DROITE
        headerRight: () => <HeaderAvatar />,

        // ... Laisse le reste de tes options tabBarStyle intactes ...
        tabBarStyle: {
          backgroundColor: '#1b1b1b',
          borderTopWidth: 1,
          borderTopColor: 'rgba(255, 255, 255, 0.05)',
          height: 60,
          paddingBottom: 8,
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