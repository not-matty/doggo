import React from 'react';
import { View, StyleSheet } from 'react-native';
import globalStyles from '@styles/globalStyles';

type GlobalLayoutProps = {
  children: React.ReactNode;
};

const GlobalLayout: React.FC<GlobalLayoutProps> = ({ children }) => {
  return (
    <View style={globalStyles.container}>
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
});

export default GlobalLayout;
