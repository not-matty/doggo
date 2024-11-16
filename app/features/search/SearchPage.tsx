// app/features/search/SearchPage.tsx

import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  Keyboard, 
  TouchableWithoutFeedback, 
  FlatList, 
  Text 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SearchStackParamList, User } from '../../navigation/types';
import UserItem from '../../components/common/UserItem';

type SearchPageNavigationProp = StackNavigationProp<SearchStackParamList, 'SearchPage'>;

const demoUsers: User[] = [
  {
    id: 1,
    name: 'person1',
    photos: [
      require('../../assets/images/person1_1.png'),
      require('../../assets/images/person1_2.png'),
      require('../../assets/images/person1_3.png'),
    ],
  },
  {
    id: 2,
    name: 'person2',
    photos: [
      require('../../assets/images/person2_1.png'),
      require('../../assets/images/person2_2.png'),
      require('../../assets/images/person2_3.png'),
    ],
  },
  // Add more users with local photos
];

const SearchPage: React.FC = () => {
  const navigation = useNavigation<SearchPageNavigationProp>();
  const [query, setQuery] = useState('');

  const handleUserClick = (userId: number) => {
    navigation.navigate('ProfileDetails', { userId: userId.toString() });
  };

  const filteredUsers = demoUsers.filter(user => 
    user.name.toLowerCase().includes(query.toLowerCase())
  );

  const renderItem = ({ item }: { item: User }) => (
    <UserItem 
      name={item.name} 
      photos={item.photos}
      onPress={() => handleUserClick(item.id)} 
    />
  );

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={styles.container}>
        <TextInput
          placeholder="Search"
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
        {filteredUsers.length === 0 ? (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>No users found.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            style={styles.userList}
            keyboardDismissMode="on-drag"
          />
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  searchInput: {
    height: 50,
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 20,
    marginTop: 50,
  },
  userList: {
    flex: 1,
  },
  noResults: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsText: {
    fontSize: 18,
    color: '#888',
  },
});

export default SearchPage;
