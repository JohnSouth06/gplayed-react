import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import i18n from '../config/i18n';

export default function PSNTrophiesScreen() {
    const router = useRouter();
    const [games, setGames] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    const [selectedGame, setSelectedGame] = useState(null);
    const [trophies, setTrophies] = useState([]);
    const [isModalVisible, setModalVisible] = useState(false);
    const [isLoadingTrophies, setIsLoadingTrophies] = useState(false);

    const [psnId, setPsnId] = useState('');
    const [isSyncModalVisible, setSyncModalVisible] = useState(false);

    const API_GET_GAMES = 'https://www.g-played.com/api/index.php?action=api_get_psn_games';
    const API_GET_TROPHIES = 'https://www.g-played.com/api/index.php?action=api_get_psn_trophies';
    const API_SYNC = 'https://www.g-played.com/api/index.php?action=api_psn_sync';

    const getTrophyImage = (type) => {
        if (!type) return null;
        switch (type.toLowerCase()) {
            case 'platinum': return require('../assets/images/platinum.png');
            case 'gold': return require('../assets/images/gold.png');
            case 'silver': return require('../assets/images/silver.png');
            case 'bronze': return require('../assets/images/bronze.png');
            default: return null;
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchPsnGames();
        }, [])
    );

    const fetchPsnGames = async () => {
        setIsLoading(true);
        try {
            const token = await SecureStore.getItemAsync('userToken');
            const response = await fetch(API_GET_GAMES, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setGames(data.games);
            }
        } catch (error) {
            console.error("Erreur récupération jeux PSN:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const openGameTrophies = async (game) => {
        setSelectedGame(game);
        setModalVisible(true);
        setIsLoadingTrophies(true);
        setTrophies([]);

        try {
            const token = await SecureStore.getItemAsync('userToken');
            const response = await fetch(`${API_GET_TROPHIES}&psn_game_id=${game.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                const sortedTrophies = data.trophies.sort((a, b) => {
                    if (a.is_obtained === b.is_obtained) return 0;
                    return a.is_obtained ? 1 : -1;
                });
                setTrophies(sortedTrophies);
            }
        } catch (error) {
            Alert.alert(i18n.t('common.error'), i18n.t('psn.trophies_not_found'));
        } finally {
            setIsLoadingTrophies(false);
        }
    };

    const handleSync = async () => {
        if (!psnId.trim()) {
            // Utilisation de la clé d'erreur dédiée
            Alert.alert(i18n.t('common.error'), i18n.t('psn.psn_id_error'));
            return;
        }
        setSyncModalVisible(false);
        setIsSyncing(true);
        try {
            const token = await SecureStore.getItemAsync('userToken');
            const response = await fetch(API_SYNC, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ psn_id: psnId.trim() })
            });
            const data = await response.json();
            if (data.success) {
                // Utilisation du message de succès dédié
                Alert.alert(i18n.t('common.success'), i18n.t('psn.syncing_success'));
                fetchPsnGames();
            } else {
                Alert.alert(i18n.t('common.error'), data.message);
            }
        } catch (error) {
            Alert.alert(i18n.t('common.network_error'), i18n.t('common.network_error'));
        } finally {
            setIsSyncing(false);
        }
    };

    const searchTrophyOnYoutube = (gameName, trophyName) => {
        const query = encodeURIComponent(`${gameName} ${trophyName} guide`);
        Linking.openURL(`https://www.youtube.com/results?search_query=${query}`);
    };

    const isFr = i18n.locale.startsWith('fr');

    const renderGameCard = ({ item }) => (
        <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => openGameTrophies(item)}>
            {item.image_url ? (
                <ExpoImage source={{ uri: item.image_url }} style={styles.cover} contentFit="cover" />
            ) : (
                <View style={[styles.cover, styles.placeholderCover]} />
            )}
            <View style={styles.cardInfo}>
                <Text style={styles.gameTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.badgesContainer}>
                    <View style={styles.badge}>
                        <ExpoImage source={getTrophyImage('platinum')} style={styles.trophyIconSmall} contentFit="contain" />
                        <Text style={styles.badgeTextDark}>{item.plat || 0}</Text>
                    </View>
                    <View style={styles.badge}>
                        <ExpoImage source={getTrophyImage('gold')} style={styles.trophyIconSmall} contentFit="contain" />
                        <Text style={styles.badgeTextDark}>{item.gold || 0}</Text>
                    </View>
                    <View style={styles.badge}>
                        <ExpoImage source={getTrophyImage('silver')} style={styles.trophyIconSmall} contentFit="contain" />
                        <Text style={styles.badgeTextDark}>{item.silver || 0}</Text>
                    </View>
                    <View style={styles.badge}>
                        <ExpoImage source={getTrophyImage('bronze')} style={styles.trophyIconSmall} contentFit="contain" />
                        <Text style={styles.badgeTextDark}>{item.bronze || 0}</Text>
                    </View>
                </View>
                <View style={styles.progressContainer}>
                    <Text style={styles.progressText}>{item.obtained_trophies || 0} / {item.total_trophies || 0} {i18n.t('psn.earned_trophies')}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderTrophyRow = ({ item }) => {
        const trophyName = isFr && item.title_fr ? item.title_fr : item.title;
        const isEarned = item.is_obtained == 1 || item.is_obtained === true;

        return (
            <View style={[styles.trophyCard, isEarned ? styles.trophyEarned : styles.trophyUnearned]}>
                <View style={styles.trophyIconContainer}>
                    <ExpoImage
                        source={getTrophyImage(item.type)}
                        style={styles.modalTrophyImage}
                        contentFit="contain"
                    />
                </View>
                <View style={styles.trophyInfo}>
                    <Text style={[styles.trophyName, isEarned && styles.trophyNameEarned]}>{trophyName}</Text>
                    <Text style={styles.trophyType}>
                        {i18n.t(`psn.${item.type?.toLowerCase()}`).toUpperCase()}
                    </Text>
                </View>
                {!isEarned && (
                    <TouchableOpacity
                        style={styles.youtubeButton}
                        onPress={() => searchTrophyOnYoutube(selectedGame.title, trophyName)}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <MaterialCommunityIcons name="youtube" size={24} color="#dc3545" />
                            <Text style={{ color: '#dc3545', fontWeight: 'bold', fontSize: 12 }}>{i18n.t('psn.youtube_guide')}</Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <MaterialIcons name="arrow-back-ios" size={22} color="#fff" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
                <Text style={styles.pageTitle}>{i18n.t('psn.title')}</Text>
                <TouchableOpacity style={styles.syncButton} onPress={() => setSyncModalVisible(true)}>
                    <MaterialCommunityIcons name="sync" size={24} color="#111" />
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.centered}><ActivityIndicator size="large" color="#4CE5AE" /></View>
            ) : (
                <FlatList
                    data={games}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderGameCard}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={<Text style={styles.emptyText}>{i18n.t('psn.empty_text')}</Text>}
                />
            )}

            {/* LOADER BLOQUANT TRADUIT */}
            <Modal visible={isSyncing} transparent animationType="fade">
                <View style={styles.syncOverlayBlocker}>
                    <View style={styles.syncLoaderBox}>
                        <ActivityIndicator size="large" color="#4CE5AE" />
                        <Text style={styles.syncLoaderText}>{i18n.t('psn.syncing_now')}</Text>
                        <Text style={styles.syncLoaderSubtext}>{i18n.t('psn.sync_wait')}</Text>
                    </View>
                </View>
            </Modal>

            {/* MODALE SAISIE TRADUITE */}
            <Modal visible={isSyncModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.syncModalContent}>
                        <Text style={styles.modalTitle}>{i18n.t('psn.sync_title')}</Text>
                        <Text style={styles.modalSubtitle}>{i18n.t('psn.sync_subtitle')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={i18n.t('psn.sync_placeholder')}
                            placeholderTextColor="#6c7d76"
                            value={psnId}
                            onChangeText={setPsnId}
                            autoCapitalize="none"
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setSyncModalVisible(false)}>
                                <Text style={styles.modalBtnTextCancel}>{i18n.t('common.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, styles.modalBtnConfirm]} onPress={handleSync}>
                                <Text style={styles.modalBtnTextConfirm}>{i18n.t('psn.sync_button')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODALE TROPHÉES */}
            <Modal visible={isModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlayFull}>
                    <View style={styles.trophiesModalContent}>
                        <View style={styles.trophiesHeader}>
                            <Text style={[styles.modalTitle, { flex: 1, textAlign: 'left' }]} numberOfLines={1}>{selectedGame?.title}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <MaterialIcons name="close" size={28} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        {isLoadingTrophies ? (
                            <ActivityIndicator size="large" color="#4CE5AE" style={{ marginTop: 50 }} />
                        ) : (
                            <FlatList
                                data={trophies}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={renderTrophyRow}
                                contentContainerStyle={{ paddingBottom: 40 }}
                                showsVerticalScrollIndicator={false}
                                ListEmptyComponent={<Text style={styles.emptyText}>{i18n.t('psn.trophies_not_found')}</Text>}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1b1b1b' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1b1b1b' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#202020', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
    pageTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    syncButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4CE5AE', justifyContent: 'center', alignItems: 'center' },
    listContainer: { paddingHorizontal: 16, paddingBottom: 40 },
    emptyText: { color: '#6c7d76', textAlign: 'center', marginTop: 40, fontSize: 16 },

    // Fiches de jeux
    card: { flexDirection: 'row', backgroundColor: '#202020', borderRadius: 24, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cover: { width: 100, height: '100%' },
    placeholderCover: { width: 100, height: '100%', backgroundColor: '#151515' },
    cardInfo: { flex: 1, padding: 12, justifyContent: 'center' },
    gameTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
    badgesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 8, backgroundColor: '#fff', gap: 4 },
    badgeTextDark: { fontSize: 13, fontWeight: 'bold', color: '#111' },
    trophyIconSmall: { width: 12, height: 16 }, // Ratio 9:12
    progressContainer: { marginTop: 4 },
    progressText: { color: '#6c7d76', fontSize: 12, fontWeight: 'bold' },

    // Loader Bloquant
    syncOverlayBlocker: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
    syncLoaderBox: { backgroundColor: '#1b1b1b', padding: 30, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
    syncLoaderText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 20 },
    syncLoaderSubtext: { color: '#fff', fontSize: 16 },

    // Modale Saisie
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
    syncModalContent: { backgroundColor: '#1b1b1b', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#333' },
    modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    modalSubtitle: { color: '#fff', fontSize: 16, marginBottom: 10, textAlign: 'center' },
    input: { backgroundColor: '#202020', color: '#fff', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#333', marginBottom: 24 },
    modalActions: { flexDirection: 'row', gap: 12 },
    modalBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
    modalBtnCancel: { backgroundColor: 'transparent', borderColor: '#6c7d76' },
    modalBtnConfirm: { backgroundColor: '#4CE5AE', borderColor: '#4CE5AE' },
    modalBtnTextCancel: { color: '#ccc', fontWeight: 'bold' },
    modalBtnTextConfirm: { color: '#111', fontWeight: 'bold' },

    // Modale Trophées
    modalOverlayFull: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    trophiesModalContent: { backgroundColor: '#1b1b1b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, height: '85%', borderWidth: 1, borderColor: '#333' },
    trophiesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#333' },

    trophyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#202020', borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1 },
    trophyEarned: { borderColor: 'rgba(76, 229, 174, 0.3)', opacity: 0.6 },
    trophyUnearned: { borderColor: '#333' },
    trophyIconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#151515', justifyContent: 'center', alignItems: 'center', marginRight: 12 },

    // NOUVEAU : Style pour l'image de trophée dans la modale
    modalTrophyImage: { width: 24, height: 32 }, // Ratio 9:12 plus grand pour la modale

    trophyInfo: { flex: 1, paddingRight: 10 },
    trophyName: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
    trophyNameEarned: { textDecorationLine: 'line-through', color: '#888' },
    trophyType: { color: '#6c7d76', fontSize: 11, fontWeight: 'bold' },
    youtubeButton: { padding: 8, backgroundColor: 'rgba(220, 53, 69, 0.1)', borderRadius: 12 }
});