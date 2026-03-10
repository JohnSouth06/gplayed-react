import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import i18n from '../config/i18n';

export default function CommunityScreen() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [followingIds, setFollowingIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const API_URL = 'https://www.g-played.com/api/index.php';

  useFocusEffect(
    useCallback(() => {
      fetchCommunity();
    }, [])
  );

  const fetchCommunity = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(`${API_URL}?action=api_get_community`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
        setFollowingIds(data.following);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFollow = async (targetId, isCurrentlyFollowing) => {
    const action = isCurrentlyFollowing ? 'unfollow' : 'follow';
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(`${API_URL}?action=api_toggle_follow&id=${targetId}&do=${action}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        // Mise à jour locale de l'état pour éviter un rechargement complet
        if (isCurrentlyFollowing) {
          setFollowingIds(followingIds.filter(id => id !== targetId));
        } else {
          setFollowingIds([...followingIds, targetId]);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const renderUserCard = ({ item }) => {
    const isFollowing = followingIds.includes(item.id);
    const initial = item.username.charAt(0).toUpperCase();
    const yearJoined = new Date(item.created_at).getFullYear();

    return (
      <View style={styles.card}>
        {/* ... reste de l'avatar ... */}
        <Text style={styles.username} numberOfLines={1}>{item.username}</Text>
        <Text style={styles.memberSince}>
            {i18n.t('community.member_since')} {yearJoined}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.viewButton}
            onPress={() => router.push(`/profile/${item.username}`)}
          >
            <MaterialIcons name="visibility" size={18} color="#ccc" />
            <Text style={styles.viewButtonText}>{i18n.t('community.btn_view')}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.followButton, isFollowing && styles.followingButton]}
            onPress={() => handleToggleFollow(item.id, isFollowing)}
          >
            <MaterialIcons 
              name={isFollowing ? "person-remove" : "person-add"} 
              size={18} 
              color={isFollowing ? "#6c7d76" : "#111"} 
            />
            <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
              {isFollowing ? i18n.t('community.btn_following') : i18n.t('community.btn_follow')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
};

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#4CE5AE" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>{i18n.t('community.title')}</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderUserCard}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>{i18n.t('community.empty')}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1b1b1b' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginHorizontal: 20, marginTop: 20, marginBottom: 16 },
  listContainer: { paddingHorizontal: 10, paddingBottom: 40 },
  card: { flex: 1, backgroundColor: '#202020', margin: 8, borderRadius: 24, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  avatarContainer: { marginBottom: 12 },
  avatar: { width: 70, height: 70, borderRadius: 35 },
  avatarPlaceholder: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#4CE5AE', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 28, fontWeight: 'bold', color: '#111' },
  username: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  memberSince: { color: '#6c7d76', fontSize: 12, marginBottom: 16 },
  actions: { width: '100%', gap: 8 },
  viewButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2a2a2a', paddingVertical: 8, borderRadius: 50, gap: 6 },
  viewButtonText: { color: '#ccc', fontSize: 13, fontWeight: '600' },
  followButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4CE5AE', paddingVertical: 8, borderRadius: 50, gap: 6 },
  followingButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#333' },
  followButtonText: { color: '#111', fontSize: 13, fontWeight: 'bold' },
  followingButtonText: { color: '#6c7d76' },
  emptyText: { color: '#6c7d76', textAlign: 'center', marginTop: 40, fontSize: 16 }
});