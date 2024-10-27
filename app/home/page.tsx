import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomePage() {
  const router = useRouter();

  const handleTapOnYarn = () => {
    router.push('/messages/page');  // Navigate to Messages page on tap
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleTapOnYarn} style={styles.yarn}>
        <Text style={styles.yarnText}>🧶</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  yarn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ff4d4d',  // Red color for the yarn
    justifyContent: 'center',
    alignItems: 'center',
  },
  yarnText: {
    fontSize: 60,
    color: '#fff',
  },
});
