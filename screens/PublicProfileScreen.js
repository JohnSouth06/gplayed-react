import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getRegionalPrice } from '../config/currency';
import i18n from '../config/i18n';

export default function PublicProfileScreen({ username, avatarUrl }) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [games, setGames] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeFormat, setActiveFormat] = useState('physical');
    const [imgError, setImgError] = useState(false);

    const [filterPlatform, setFilterPlatform] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [sortBy, setSortBy] = useState('recent');
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState(null);

    // URL ciblée sur la collection publique de l'utilisateur
    const API_URL = `https://www.g-played.com/api/index.php?action=api_get_public_collection&username=${username}`;
    const initial = username ? username.charAt(0).toUpperCase() : '?';
    const decodedAvatarUrl = avatarUrl ? decodeURIComponent(avatarUrl) : null;

    useFocusEffect(
        useCallback(() => {
            fetchUserGames();
        }, [username])
    );

    const fetchUserGames = async () => {
        setIsLoading(true);
        try {
            const token = await SecureStore.getItemAsync('userToken');
            const response = await fetch(API_URL, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await response.json();

            if (data.success) {
                // Le backend renvoie 'games' pour la route api_get_public_collection
                setGames(data.games || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusConfig = (status) => {
        const config = {
            'not_started': { label: i18n.t('status.not_started'), icon: 'inbox', color: '#ccc' },
            'playing': { label: i18n.t('status.playing'), icon: 'play-circle-outline', color: '#4CE5AE' },
            'completed': { label: i18n.t('status.completed'), icon: 'emoji-events', color: '#ed9c01' },
            'dropped': { label: i18n.t('status.dropped'), icon: 'cancel', color: '#dc3545' },
            'wishlist': { label: i18n.t('status.wishlist'), icon: 'favorite-border', color: '#e83e8c' },
            'loaned': { label: i18n.t('status.loaned'), icon: 'handshake', color: '#f0ad4e' }
        };
        return config[status] || { label: status, icon: 'info-outline', color: '#aaa' };
    };

    const getStandardPlatform = (platformStr) => {
        if (!platformStr) return i18n.t('common.other');
        if (platformStr.includes(',') || platformStr.includes('/') || platformStr.toLowerCase() === 'multiplateforme') return i18n.t('common.multiplatform');
        return platformStr.trim();
    };

    // Application des onglets, barre de recherche et filtres
    const applyFiltersAndSort = () => {
        let result = games.filter(game => game.format === activeFormat && game.status !== 'wishlist');

        if (searchQuery.trim() !== '') {
            result = result.filter(g => g.title.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        if (filterPlatform !== 'all') {
            result = result.filter(g => getStandardPlatform(g.platform) === filterPlatform);
        }
        if (filterStatus !== 'all') {
            result = result.filter(g => g.status === filterStatus);
        }

        result.sort((a, b) => {
            if (sortBy === 'title') return a.title.localeCompare(b.title);
            if (sortBy === 'platform') return getStandardPlatform(a.platform).localeCompare(getStandardPlatform(b.platform));
            if (sortBy === 'price') return (b.estimated_price || 0) - (a.estimated_price || 0);
            return b.id - a.id;
        });
        return result;
    };

    const displayedGames = applyFiltersAndSort();
    const totalGamesCount = games.filter(game => game.format === activeFormat && game.status !== 'wishlist').length;

    const platformSet = new Set(games.map(g => getStandardPlatform(g.platform)));
    const uniquePlatforms = ['all', ...Array.from(platformSet).sort()];

    const openModal = (type) => { setModalType(type); setModalVisible(true); };

    const getPlatformIcon = (platformStr, iconColor = '#aaa') => {
        if (!platformStr) return <MaterialIcons name="videogame-asset" size={14} color={iconColor} />;
        const platL = platformStr.toLowerCase();
        if (platL.includes(',') || platL.includes('/') || platL.includes('multiplateforme')) return <MaterialIcons name="devices" size={14} color={iconColor} />;
        else if (platL.includes('ps') || platL.includes('playstation')) return <MaterialCommunityIcons name="sony-playstation" size={14} color="#0a57ae" />;
        else if (platL.includes('xbox')) return <MaterialCommunityIcons name="microsoft-xbox" size={14} color="#0f780f" />;
        else if (platL.includes('switch') || platL.includes('nintendo')) return <MaterialCommunityIcons name="nintendo-switch" size={14} color="#e60012" />;
        else if (platL.includes('pc') || platL.includes('windows')) return <MaterialCommunityIcons name="microsoft-windows" size={14} color="#09e0fe" />;
        return <MaterialIcons name="videogame-asset" size={14} color={iconColor} />;
    };

    const renderGameCard = ({ item }) => {
        const statusConfig = getStatusConfig(item.status);
        let finalImageUrl = null;
        if (item.image_url) {
            if (item.image_url.startsWith('http')) finalImageUrl = item.image_url;
            else if (item.image_url.startsWith('//')) finalImageUrl = `https:${item.image_url}`;
            else finalImageUrl = `https://www.g-played.com/${item.image_url}`;
        }

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: `/game/${item.id}`, params: { gameData: JSON.stringify(item), isReadOnly: true } })}
            >
                {finalImageUrl ? (
                    <ExpoImage source={{ uri: finalImageUrl }} style={styles.cover} contentFit="cover" />
                ) : (
                    <View style={[styles.cover, styles.placeholderCover]} />
                )}
                <View style={styles.cardInfo}>
                    <Text style={styles.gameTitle} numberOfLines={1}>{item.title}</Text>

                    <View style={styles.badgesContainer}>
                        <View style={[styles.badge, styles.badgePlatform]}>
                            {getPlatformIcon(item.platform, '#111')}
                            <Text style={styles.badgeTextPlatform}>{item.platform}</Text>
                        </View>
                        {getRegionalPrice(item) ? (
                            <View style={[styles.badge, styles.badgePrice]}>
                                <MaterialIcons name="sell" size={12} color="#fff" />
                                <Text style={styles.badgeTextLight}>{getRegionalPrice(item)}</Text>
                            </View>
                        ) : null}
                    </View>

                    <View style={styles.statusRow}>
                        <View style={styles.statusBadge}>
                            <MaterialIcons name={statusConfig.icon} size={14} color={statusConfig.color} />
                            <Text style={[styles.gameStatus, { color: statusConfig.color }]}>
                                {statusConfig.label}
                            </Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const getModalOptions = () => {
        if (modalType === 'platform') return uniquePlatforms.map(p => ({ id: p, label: p === 'all' ? i18n.t('common.all') : p }));
        if (modalType === 'status') {
            return [
                { id: 'all', label: i18n.t('status.all_status') },
                { id: 'not_started', label: i18n.t('status.not_started') },
                { id: 'playing', label: i18n.t('status.playing') },
                { id: 'completed', label: i18n.t('status.completed') },
                { id: 'dropped', label: i18n.t('status.dropped') }
            ];
        }
        if (modalType === 'sort') {
            return [
                { id: 'recent', label: i18n.t('sort.recent') },
                { id: 'title', label: i18n.t('sort.title') },
                { id: 'platform', label: i18n.t('sort.platform') },
                { id: 'price', label: i18n.t('sort.price') }
            ];
        }
        return [];
    };

    if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#4CE5AE" /></View>;

    return (
        <View style={styles.container}>
            {/* 1. EN-TÊTE : Titre dynamique traduit */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>

                <View style={styles.headerProfile}>
                    {decodedAvatarUrl && decodedAvatarUrl !== 'null' && decodedAvatarUrl !== '' && !imgError ? (
                        <ExpoImage
                            source={{ uri: decodedAvatarUrl }}
                            style={styles.headerAvatar}
                            contentFit="cover"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <View style={styles.headerAvatarPlaceholder}>
                            <Text style={styles.headerAvatarInitial}>{initial}</Text>
                        </View>
                    )}
                    <Text style={styles.pageTitle} numberOfLines={1}>
                        {i18n.t('profile.title_with_count', { name: username, count: totalGamesCount })}
                    </Text>
                </View>
            </View>

            {/* 2. ONGLETS PHYSIQUE / DIGITAL */}
            <View style={styles.toggleContainer}>
                <TouchableOpacity style={[styles.toggleButton, activeFormat === 'physical' && styles.toggleButtonActive]} onPress={() => setActiveFormat('physical')}>
                    <Text style={[styles.toggleText, activeFormat === 'physical' && styles.toggleTextActive]}><MaterialCommunityIcons name="minidisc" style={[styles.toggleIcons, activeFormat === 'physical' && styles.toggleIconsActive]} /> {i18n.t('home.tab_physical')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toggleButton, activeFormat === 'digital' && styles.toggleButtonActive]} onPress={() => setActiveFormat('digital')}>
                    <Text style={[styles.toggleText, activeFormat === 'digital' && styles.toggleTextActive]}><MaterialCommunityIcons name="cloud-outline" style={[styles.toggleIcons, activeFormat === 'digital' && styles.toggleIconsActive]} /> {i18n.t('home.tab_digital')}</Text>
                </TouchableOpacity>
            </View>

            {/* 3. BARRE DE RECHERCHE INTERNE */}
            <View style={styles.localSearchContainer}>
                <MaterialIcons name="search" size={20} color="#6c7d76" style={styles.localSearchIcon} />
                <TextInput
                    style={styles.localSearchInput}
                    placeholder={i18n.t('profile.search_placeholder_user', { name: username })}
                    placeholderTextColor="#6c7d76"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <MaterialIcons name="cancel" size={20} color="#6c7d76" />
                    </TouchableOpacity>
                )}
            </View>

            {/* 4. FILTRES DE TRI (Plateforme, Statut, Tri) */}
            <View style={styles.filtersRow}>
                <TouchableOpacity style={styles.filterButton} onPress={() => openModal('platform')}>
                    <Text style={styles.filterButtonText} numberOfLines={1}>
                        {filterPlatform === 'all' ? i18n.t('common.platforms') : filterPlatform}
                    </Text>
                    <MaterialIcons name="arrow-drop-down" size={20} color="#6c7d76" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.filterButton} onPress={() => openModal('status')}>
                    <Text style={styles.filterButtonText} numberOfLines={1}>
                        {filterStatus === 'all' ? i18n.t('common.status') : getStatusConfig(filterStatus).label}
                    </Text>
                    <MaterialIcons name="arrow-drop-down" size={20} color="#6c7d76" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.filterButton} onPress={() => openModal('sort')}>
                    <Text style={styles.filterButtonText} numberOfLines={1}>
                        {sortBy === 'recent' ? i18n.t('common.recent') : sortBy === 'title' ? i18n.t('common.a_z') : sortBy === 'platform' ? i18n.t('common.platform') : i18n.t('common.price')}
                    </Text>
                    <MaterialIcons name="arrow-drop-down" size={20} color="#6c7d76" />
                </TouchableOpacity>
            </View>

            {/* 5. LISTE DES JEUX */}
            <FlatList
                data={displayedGames}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderGameCard}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={<Text style={styles.emptyText}>{i18n.t('home.empty_text')}</Text>}
            />

            {/* 6. MODAL POUR LES FILTRES */}
            <Modal visible={modalVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
               {i18n.t('common.select_option')}
            </Text>
                        <FlatList
                            data={getModalOptions()}
                            keyExtractor={item => item.id}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => {
                                const isActive = (modalType === 'platform' && filterPlatform === item.id) ||
                                    (modalType === 'status' && filterStatus === item.id) ||
                                    (modalType === 'sort' && sortBy === item.id);
                                return (
                                    <TouchableOpacity
                                        style={styles.modalOption}
                                        onPress={() => {
                                            if (modalType === 'platform') setFilterPlatform(item.id);
                                            if (modalType === 'status') setFilterStatus(item.id);
                                            if (modalType === 'sort') setSortBy(item.id);
                                            setModalVisible(false);
                                        }}
                                    >
                                        <Text style={[styles.modalOptionText, isActive && styles.modalOptionTextActive]}>{item.label}</Text>
                                        {isActive && <MaterialIcons name="check" size={20} color="#4CE5AE" />}
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1b1b1b' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1b1b1b' },
    header: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 60, marginBottom: 16 },
    backButton: { marginRight: 16 },
    headerProfile: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    headerAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12, borderWidth: 1, borderColor: '#333' },
    headerAvatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4CE5AE', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    headerAvatarInitial: { fontSize: 20, fontWeight: 'bold', color: '#111' },
    pageTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', flexShrink: 1 },
    toggleContainer: { flexDirection: 'row', backgroundColor: '#202020', borderRadius: 50, marginHorizontal: 20, marginBottom: 16, padding: 4 },
    toggleButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 50 },
    toggleButtonActive: { backgroundColor: '#4CE5AE' },
    toggleText: { color: '#6c7d76', fontWeight: 'bold' },
    toggleIcons: { color: '#6c7d76', fontSize: 18 },
    toggleIconsActive: { color: '#111', fontSize: 18 },
    toggleTextActive: { color: '#111' },
    localSearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#202020', borderRadius: 12, borderWidth: 1, borderColor: '#333', marginHorizontal: 20, marginBottom: 16, paddingHorizontal: 12, height: 44 },
    localSearchIcon: { marginRight: 8 },
    localSearchInput: { flex: 1, color: '#fff', fontSize: 14 },
    filtersRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, gap: 10 },
    filterButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#202020', borderWidth: 1, borderColor: '#333', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
    filterButtonText: { color: '#ccc', fontSize: 13, fontWeight: '600' },
    listContainer: { paddingHorizontal: 16, paddingBottom: 40 },
    card: { flexDirection: 'row', backgroundColor: '#202020', borderRadius: 24, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cover: { width: 100, height: '100%' },
    placeholderCover: { backgroundColor: '#151515' },
    cardInfo: { flex: 1, padding: 12, justifyContent: 'center' },
    gameTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
    badgesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8, marginTop: 4 },
    badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, gap: 4 },
    badgePlatform: { backgroundColor: '#fff' },
    badgePrice: { backgroundColor: '#2e6c56' },
    badgeTextPlatform: { fontSize: 11, fontWeight: 'bold', color: '#111' },
    badgeTextLight: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
    statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    gameStatus: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
    emptyText: { color: '#6c7d76', textAlign: 'center', marginTop: 40, fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#1b1b1b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '60%', borderWidth: 1, borderColor: '#333' },
    modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
    modalOptionText: { color: '#ccc', fontSize: 16 },
    modalOptionTextActive: { color: '#4CE5AE', fontWeight: 'bold' }
});