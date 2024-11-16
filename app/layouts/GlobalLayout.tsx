import React from 'react';
import { View, StyleSheet } from 'react-native';
import CustomHeader from '@components/common/CustomHeader';
import globalStyles from '@styles/globalStyles';
import { useNavigationState } from '@react-navigation/native';

type GlobalLayoutProps = {
  children: React.ReactNode;
};

const GlobalLayout: React.FC<GlobalLayoutProps> = ({ children }) => {
  // Get the current route name
  const routeName = useNavigationState((state) => {
    if (!state || !state.routes || state.routes.length === 0) {
      return '';
    }
    const currentRoute = state.routes[state.index];
    return currentRoute.name;
  });

  // Define routes where the header should not be shown
  const hideHeaderRoutes = ['Login', 'AuthNavigator', 'MessagesNavigator'];

  const showHeader = !hideHeaderRoutes.includes(routeName);

  return (
    <View style={globalStyles.container}>
      {showHeader && (
        <CustomHeader
          title="doggo"
          showBackButton={false} // Adjust as needed
        />
      )}
      <View style={styles.content}>{children}</View>
      {/* Footer is removed from GlobalLayout as per previous instructions */}
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
});

export default GlobalLayout;
