# Performance Optimization Guide for Doggo App

This guide outlines the steps to implement performance optimizations across the app to improve loading speed and reduce API calls.

## Installed Dependencies

We've added the following packages to improve performance:

```bash
npm install react-native-fast-image @tanstack/react-query
```

## Optimization Components Created

1. **CachedImage Component** (`app/components/common/CachedImage.tsx`)
   - A wrapper around FastImage with built-in caching and error handling
   - Provides placeholder support during loading
   - Handles fallback images when loading fails

2. **SkeletonLoader Components** (`app/components/common/SkeletonLoader.tsx`)
   - Provides animated loading placeholders for various UI elements
   - Includes specialized skeletons for profiles, cards, and grids
   - Improves perceived performance during data loading

3. **React Query Setup** (`app/services/queryClient.ts`)
   - Configures React Query for efficient data fetching and caching
   - Sets up sensible defaults for stale times and retry logic
   - Enables automatic background refetching

4. **Image Utilities** (`app/utils/imageUtils.ts`)
   - Provides functions for responsive image loading
   - Supports generating optimized image URLs for different screen sizes
   - Includes utilities for image prefetching and placeholder generation

## Implementation Steps

### 1. Update App.tsx

Wrap your application with the QueryClientProvider:

```jsx
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@services/queryClient';

// In your App component:
return (
  <QueryClientProvider client={queryClient}>
    {/* Rest of your app */}
  </QueryClientProvider>
);
```

### 2. Replace Image Components

Replace all standard `Image` components with `CachedImage`:

```jsx
// Before
<Image 
  source={{ uri: imageUrl }} 
  style={styles.image} 
/>

// After
<CachedImage 
  source={{ uri: imageUrl }} 
  style={styles.image}
  showPlaceholder={true}
  fallbackSource={require('@assets/images/default-image.png')}
/>
```

### 3. Implement React Query Hooks

Create custom hooks for data fetching:

- `useProfile.ts` - For fetching user profiles
- `usePosts.ts` - For fetching posts with pagination
- `useLikes.ts` - For handling like operations

### 4. Use Skeleton Loaders

Replace loading spinners with skeleton loaders:

```jsx
// Before
{isLoading && <ActivityIndicator size="large" color={colors.primary} />}

// After
{isLoading && <ProfileSkeleton />}
```

### 5. Optimize API Calls

- Implement pagination for all list views
- Use React Query's caching to avoid redundant API calls
- Add proper error handling and retry logic

### 6. Optimize Images

- Use responsive image sizes based on screen dimensions
- Implement lazy loading for off-screen images
- Prefetch critical images for key screens

## Best Practices

1. **Memoize Components**: Use `React.memo()` for pure components to prevent unnecessary re-renders.

2. **Use `useMemo` and `useCallback`**: Optimize expensive calculations and callback functions.

3. **Implement Virtualized Lists**: For long lists, use `FlatList` with proper configuration.

4. **Debounce User Inputs**: Add debouncing for search inputs and other user interactions.

5. **Monitor Performance**: Use React DevTools Profiler to identify bottlenecks.

## Next Steps

1. Implement these optimizations incrementally, starting with the most critical screens.
2. Test performance improvements on both high-end and low-end devices.
3. Consider adding analytics to measure actual loading times and user experience. 