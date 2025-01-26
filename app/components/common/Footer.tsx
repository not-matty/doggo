// Footer.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type FooterProps = {
  text?: string;
};

const Footer: React.FC<FooterProps> = ({ text = `© ${new Date().getFullYear()} doggo` }) => {
  return (
    <View style={styles.footer}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    height: 60, // Reduced height for a sleeker look
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ddd', // Changed to a visible color
  },
  text: {
    fontSize: 14,
    color: '#777',
  },
});

export default Footer;
