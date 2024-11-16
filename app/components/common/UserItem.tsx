// app/components/common/UserItem.tsx

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Dimensions, 
  FlatList 
} from 'react-native';

type UserItemProps = {
  name: string;
  photos: any[]; // Use appropriate type for local images
  onPress: () => void;
};

const { width } = Dimensions.get('window');

const UserItem: React.FC<UserItemProps> = ({ name, photos, onPress }) => {

  const renderPhoto = ({ item }: { item: any }) => (
    <Image source={item} style={styles.photo} />
  );

  return (
    <View style={styles.container}>
      <View style={styles.photosContainer}>
        <FlatList
          data={photos}
          renderItem={renderPhoto}
          keyExtractor={(item, index) => `${index}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
        />
        <TouchableOpacity style={styles.nameContainer} onPress={onPress}>
          <Text style={styles.nameText}>{name}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  photosContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 15,
    overflow: 'hidden',
  },
  photo: {
    width: width - 40,
    height: '100%',
    resizeMode: 'cover',
  },
  nameContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  nameText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default React.memo(UserItem);
