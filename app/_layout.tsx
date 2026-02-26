import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      // Ces options s'appliqueront instantanément à TOUTES tes pages
      screenOptions={{
        headerShown: false, // Cache le header natif partout par défaut
        contentStyle: { backgroundColor: '#1b1b1b' }, // Force le fond noir natif (élimine le flash blanc)
        animation: 'slide_from_right', // (Optionnel) Ajoute une belle animation fluide de transition
      }}
    >
      {/* Tu n'as même plus besoin de lister toutes les pages, 
          Expo les trouvera tout seul, mais on garde l'index pour être sûr */}
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}