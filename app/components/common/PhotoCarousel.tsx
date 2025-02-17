// PhotoCarousel.tsx

import React from 'react';
import { FlatList, Image, Dimensions, StyleSheet } from 'react-native';
import { Photo } from '@navigation/types';

type PhotoCarouselProps = {
  photos: Photo[]; // Using the Photo type for better type safety
};

const { width, height } = Dimensions.get('window');
const SEARCH_BAR_HEIGHT = 70; // Ensure this matches your app's layout or pass as prop

const PhotoCarousel: React.FC<PhotoCarouselProps> = ({ photos }) => {
  return (
    <FlatList
      data={photos}
      keyExtractor={(item) => item.id} // Assuming each photo has a unique 'id'
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      renderItem={({ item }) => (
        <Image
          source={{ uri: item.url }}
          style={styles.image}
          accessibilityLabel={`Photo by user ${item.user_id}`}
        />
      )}
      // Prevent vertical scrolling inside the horizontal FlatList
      nestedScrollEnabled={true}
    />
  );
};

const styles = StyleSheet.create({
  image: {
    width: width,
    height: height - SEARCH_BAR_HEIGHT - 60, // Adjusted for search bar and footer
    resizeMode: 'cover',
  },
});

export default React.memo(PhotoCarousel); // Using React.memo for performance optimization
