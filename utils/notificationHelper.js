import * as Notifications from 'expo-notifications';
import i18n from '../config/i18n';

// --- NOTIFICATION DE SORTIE D'UN JEU (WISHLIST) ---
export const scheduleGameReleaseNotifications = async (game) => {
    if (!game.release_date) return;

    const releaseDate = new Date(game.release_date);
    const now = new Date();

    // Si le jeu est déjà sorti, on ne planifie rien
    if (releaseDate < now) {
        return; 
    }

    const scheduleOptions = [
        { daysBefore: 3, messageKey: 'notifications.release_3_days' },
        { daysBefore: 1, messageKey: 'notifications.release_1_day' },
        { daysBefore: 0, messageKey: 'notifications.release_today' },
    ];

    for (const option of scheduleOptions) {
        // --- VRAIE DATE --- // const triggerDate = new Date(releaseDate);
        const triggerDate = new Date();
        triggerDate.setSeconds(triggerDate.getSeconds() + 10); // Dans 10 secondes
        // ---
        
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
                trigger: {
                    type: 'date',
                    date: triggerDate,
                },
            });
        }
    }
};
// --- NOTIFICATION TEST ---
export const sendTestNotification = async () => {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: "🔔 Test GPlayed",
            body: "Les notifications fonctionnent parfaitement !",
        },
        trigger: { seconds: 5 }, // Se déclenche dans 5 secondes
    });
};

// --- NOTIFICATION DE PRET DE JEU ---
export const scheduleLoanReminderNotification = async (game) => {
    // Si pas de date de prêt, on utilise la date actuelle
    const loanDate = game.loaned_date ? new Date(game.loaned_date) : new Date();
    const now = new Date();

    const scheduleOptions = [
        { daysAfter: 14, message: `Cela fait 2 semaines que vous avez prêté ${game.title} à ${game.loaned_to || 'quelqu\'un'}.` },
        { daysAfter: 30, message: `Cela fait 1 mois que vous avez prêté ${game.title} à ${game.loaned_to || 'quelqu\'un'}.` },
    ];

    for (const option of scheduleOptions) {
        const triggerDate = new Date(loanDate);
        triggerDate.setDate(loanDate.getDate() + option.daysAfter);
        triggerDate.setHours(12, 0, 0, 0); // Rappel à midi

        if (triggerDate > now) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: `🎮 GPlayed : Rappel de prêt`,
                    body: option.message,
                    data: { gameId: game.id, type: 'loan' },
                },
                trigger: {
                    type: 'date',
                    date: triggerDate,
                },
            });
        }
    }
};