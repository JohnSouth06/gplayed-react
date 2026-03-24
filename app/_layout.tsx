import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

// Empêche le splash screen natif de disparaître tout de suite
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const animationRef = useRef<LottieView>(null);
  const [isAppReady, setIsAppReady] = useState(false);
  const [isLooping, setIsLooping] = useState(false);

  useEffect(() => {
    // Simulation du temps de chargement de l'application (ex: 3 secondes)
    // À remplacer par votre vraie logique de chargement (vérification token, polices, etc.)
    const timer = setTimeout(() => {
      setIsAppReady(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#1b1b1b' }}>
      {/* Tant que l'app n'est pas prête OU que l'intro n'est pas terminée, 
        on affiche l'animation Lottie 
      */}
      {!isAppReady || !isLooping ? (
        <LottieView
          ref={animationRef}
          // Assurez-vous que le chemin vers votre fichier JSON est correct
          source={require('../assets/animations/splash.json')} 
          autoPlay
          loop={isLooping} // Faux au départ pour jouer l'intro (0 à 90) une seule fois
          onAnimationFinish={() => {
            if (!isLooping) {
              setIsLooping(true);
              // L'intro est finie, on lance la boucle spécifique (frame 45 à 90)
              animationRef.current?.play(45, 90);
            }
          }}
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        /* L'application est prête et l'intro est finie, on affiche le contenu */
        <Stack
          // Ces options s'appliqueront instantanément à TOUTES tes pages
          screenOptions={{
            headerShown: false, // Cache le header natif partout par défaut
            contentStyle: { backgroundColor: '#1b1b1b' }, // Force le fond noir natif
            animation: 'slide_from_right', // Ajoute une belle animation fluide de transition
          }}
          // Dès que le layout est rendu, on cache définitivement le splash screen natif en arrière-plan
          onLayout={() => SplashScreen.hideAsync()}
        >
          {/* Tu n'as même plus besoin de lister toutes les pages, 
              Expo les trouvera tout seul, mais on garde l'index pour être sûr */}
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      )}
    </View>
  );
}