// PhotoCarousel.tsx

import React from 'react';
import { FlatList, Image, Dimensions, StyleSheet, View } from 'react-native';
import { Post } from '@navigation/types';

type PhotoCarouselProps = {
  photos: Post[]; // Using the Post type for better type safety
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PHOTO_CONTAINER_HEIGHT = SCREEN_HEIGHT - 120; // Account for header and some padding

const PhotoCarousel: React.FC<PhotoCarouselProps> = ({ photos }) => {
  return (
    <FlatList
      data={photos}
      keyExtractor={(item) => item.id} // Assuming each post has a unique 'id'
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      renderItem={({ item }) => (
        <View style={styles.photoContainer}>
          <Image
            source={{ uri: item.url }}
            style={styles.image}
            resizeMode="contain"
            accessibilityLabel={`Photo by user ${item.user_id}`}
          />
        </View>
      )}
      // Prevent vertical scrolling inside the horizontal FlatList
      nestedScrollEnabled={true}
    />
  );
};

const styles = StyleSheet.create({
  photoContainer: {
    width: SCREEN_WIDTH,
    height: PHOTO_CONTAINER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: PHOTO_CONTAINER_HEIGHT,
  },
});

export default React.memo(PhotoCarousel); // Using React.memo for performance optimization
