// app/components/common/CustomHeader.tsx

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { colors, typography, shadows } from '@styles/theme';

interface CustomHeaderProps {
  translateY?: Animated.Value;
  opacity?: Animated.Value;
}

const CustomHeader: React.FC<CustomHeaderProps> = ({ translateY = new Animated.Value(0), opacity = new Animated.Value(1) }) => {
  return (
    <Animated.View
      style={[
        styles.header,
        {
          transform: [{ translateY }],
          opacity
        }
      ]}
    >
      <Text style={styles.title}>doggo</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 44,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    ...shadows.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});

export default CustomHeader;
