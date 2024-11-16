// app/data/demoProfiles.tsx

import { Profile } from '@navigation/types';

export const demoProfiles: Profile[] = [
  {
    id: '1',
    name: 'person1',
    photos: [
      require('@assets/images/person1_1.png'),
      require('@assets/images/person1_2.png'),
      require('@assets/images/person1_3.png'),
    ],
  },
  {
    id: '2',
    name: 'person2',
    photos: [
      require('@assets/images/person2_1.png'),
      require('@assets/images/person2_2.png'),
      require('@assets/images/person2_3.png'),
    ],
  },
  // Add more users with local photos
];
