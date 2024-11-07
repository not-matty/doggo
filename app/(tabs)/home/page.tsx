// app/home/page.tsx

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from 'react-native-vector-icons/Feather';

export default function HomePage() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Messages Icon in Top Right Corner */}
      <TouchableOpacity
        onPress={() => router.push('/messages/page')}
        style={styles.messagesIcon}
      >
        <Feather name="send" size={30} color="#000" />
      </TouchableOpacity>

      {/* Yarn Circle */}
      <TouchableOpacity
        onPress={() => router.push('/search/page')}
        style={styles.yarn}
      >
        <Text style={styles.yarnText}>🧶</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff',
  },
  messagesIcon: {
    position: 'absolute',
    top: 70,
    right: 10,
    padding: 10,
  },
  yarn: { 
    width: 200, 
    height: 200, 
    borderRadius: 100, 
    backgroundColor: '#ff4d4d', 
    justifyContent: 'center', 
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: '80%',
  },
  yarnText: { 
    fontSize: 60, 
    color: '#fff',
  },
});
