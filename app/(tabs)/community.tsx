import { StyleSheet, Text, View } from 'react-native';

export default function PlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Page en construction</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1b1b1b', justifyContent: 'center', alignItems: 'center' },
  text: { color: '#4CE5AE', fontSize: 20, fontWeight: 'bold' }
});