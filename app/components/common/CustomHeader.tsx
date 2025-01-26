// app/components/common/CustomHeader.tsx

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

type CustomHeaderProps = {
  // You can extend props in the future if needed
};

const CustomHeader: React.FC<CustomHeaderProps> = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        {/* Optional Icon */}
        <Feather name="camera" size={24} color="#000" style={styles.icon} />
        {/* "doggo" Text */}
        <Text style={styles.title}>doggo</Text>
      </View>
    </SafeAreaView>
  );
};

const HEADER_HEIGHT = 100; // Adjust as needed

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    backgroundColor: 'transparent', // Transparent to overlay content
    zIndex: 1000, // Ensure header is on top
    justifyContent: 'center',
    paddingHorizontal: 20, // Adjust padding as needed
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 10, // Space between icon and text
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000', // Adjust text color as needed
  },
});

export default CustomHeader;
