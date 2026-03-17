import * as FileSystem from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import i18n from '../config/i18n';

export const scheduleGameReleaseNotifications = async (game) => {
    if (!game.release_date) return;

    const releaseDate = new Date(game.release_date);
    const now = new Date();

    const scheduleOptions = [
        { daysBefore: 3, messageKey: 'notifications.release_3_days' },
        { daysBefore: 1, messageKey: 'notifications.release_1_day' },
        { daysBefore: 0, messageKey: 'notifications.release_today' },
    ];

    for (const option of scheduleOptions) {
        const triggerDate = new Date(releaseDate);
        triggerDate.setDate(releaseDate.getDate() - option.daysBefore);
        triggerDate.setHours(10, 0, 0, 0);

        if (triggerDate > now) {
            const statusMessage = i18n.t(option.messageKey);

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: `🎮 GPlayed : ${game.title}`,
                    body: i18n.t('notifications.body', { message: statusMessage, platform: game.platform }),
                    data: { gameId: game.id },
                    android: { channelId: 'default' },
                },
                // SOLUTION 1 : Utiliser un timestamp numérique (souvent plus stable)
                trigger: {
                    type: 'date',
                    date: triggerDate,
                },
            });
        }
    }
};

export const sendTestNotification = async () => {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: "Test de redirection 🚀",
            body: "Cliquez pour voir la fiche du jeu !",
            data: { gameId: 20 },
            android: { channelId: 'default' },
        },
        trigger: {
            type: 'timeInterval',
            seconds: 3,
            repeats: false
        },
    });
};

// --- RAPPEL DE PRET DE JEU ---
export const scheduleLoanReminder = async (game, borrowerName) => {
  let localUri = null;

  // 1. Téléchargement de la jaquette du jeu
  if (game.image_url) {
    try {
      const imageUrl = game.image_url.startsWith('http') 
        ? game.image_url 
        : `https://www.g-played.com/${game.image_url}`;
      
      // Nettoyage du nom de fichier pour éviter les caractères spéciaux dans le cache
      const filename = `game_${game.id}_cover.jpg`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      
      // Utilisation de la méthode moderne recommandée par Expo
      const downloadResumable = FileSystem.createDownloadResumable(imageUrl, fileUri);
      const result = await downloadResumable.downloadAsync();
      localUri = result.uri;
    } catch (e) {
      console.error("Erreur téléchargement jaquette:", e);
    }
  }

  // 2. Envoi de la notification
  await Notifications.scheduleNotificationAsync({
    content: {
      // On retire l'émoji du début pour éviter le bug d'affichage
      title: i18n.t('notifications.loan_title'), 
      body: i18n.t('notifications.loan_body', { 
        game: game.title, 
        person: borrowerName 
      }),
      data: { gameId: game.id },
      
      // Configuration de l'image pour Android et iOS
      attachments: localUri ? [{ url: localUri }] : [],
      android: {
        channelId: 'default',
        // 'largeIcon' affiche la jaquette à droite de la notification
        largeIcon: localUri,
        // Optionnel : 'color' permet de colorer l'icône de l'app si besoin
        color: '#4CE5AE',
      },
    },
    trigger: { 
      type: 'timeInterval',
      seconds: 10, // Gardez 10 pour le test, puis remettez 7 jours
      repeats: false 
    },
  });
};