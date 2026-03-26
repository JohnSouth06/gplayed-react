import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Empêche le splash screen natif de se cacher tout seul
SplashScreen.preventAutoHideAsync().catch(() => {
  /* Évite les erreurs si appelé plusieurs fois */
});

export default function RootLayout() {
  const animationRef = useRef<LottieView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current; 
  const [isAppReady, setIsAppReady] = useState(false);
  const [animationFinished, setAnimationFinished] = useState(false);
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);

  useEffect(() => {
    async function prepare() {
      try {
        // Charge tes données ici (ex: 3 secondes)
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (e) {
        console.warn("Erreur de chargement :", e);
      } finally {
        setIsAppReady(true);
      }
    }
    prepare();
  }, []);

  // Dès que l'app est prête ET que l'intro est finie, on lance le fondu
  useEffect(() => {
    if (isAppReady && animationFinished) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setIsOverlayVisible(false);
      });
    }
  }, [isAppReady, animationFinished]);

  return (
    <View 
      style={styles.container} 
      // CRITIQUE : Cache le logo natif dès que ce conteneur est prêt
      onLayout={() => SplashScreen.hideAsync()} 
    >
      {/* L'APPLICATION (Toujours présente dessous) */}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#1b1b1b' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
      </Stack>

      {/* L'ANIMATION LOTTIE (Superposée au-dessus) */}
      {isOverlayVisible && (
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} pointerEvents="none">
          <LottieView
            ref={animationRef}
            // Vérifie bien que ce chemin est correct selon ta structure
            source={require('../assets/animations/splash.json')}
            autoPlay
            resizeMode="contain"
            loop={false}
            style={styles.lottie}
            onAnimationFinish={() => {
              if (isAppReady) {
                setAnimationFinished(true);
              } else {
                // Relance la boucle de maintien frame 45 à 90
                animationRef.current?.play(45, 90);
              }
            }}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1b1b1b',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1b1b1b',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999, // Priorité maximale
  },
  lottie: {
    width: '65%',
    height: '65%',
  },
});