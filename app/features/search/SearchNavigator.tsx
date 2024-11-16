// app/features/search/SearchNavigator.tsx

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SearchPage from './SearchPage';
import ProfileDetailsPage from '../profile/ProfileDetailsPage';
import { SearchStackParamList } from '@navigation/types';

const SearchStack = createStackNavigator<SearchStackParamList>();

const SearchNavigator: React.FC = () => {
  return (
    <SearchStack.Navigator>
      <SearchStack.Screen
        name="SearchPage"
        component={SearchPage}
        options={{ headerShown: false }}
      />
      <SearchStack.Screen
        name="ProfileDetails"
        component={ProfileDetailsPage}
        options={{ headerShown: false }}
      />
      {/* Add other search-related screens here if needed */}
    </SearchStack.Navigator>
  );
};

export default SearchNavigator;
