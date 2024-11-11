// app/components/common/Footer.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Footer: React.FC = () => {
  return (
    <View style={styles.footer}>
      <Text style={styles.text}>© 2024 My App</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    height: 80,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#fff',
  },
  text: {
    fontSize: 14,
    color: '#777',
  },
});

export default Footer;
