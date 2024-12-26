import { auth } from '@/FirebaseConfig';
import { Avatar, AvatarFallbackText, AvatarImage } from './ui/avatar';
import { VStack } from './ui/vstack';
import { Heading } from './ui/heading';
import { useAssets } from 'expo-asset';

const UserAvatar = ({ size }: { size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' }) => {
  const user = auth.currentUser!;
  const [assets] = useAssets([require('../assets/images/empty-avatar.png')]);
  return (
    <VStack className="justify-center items-center gap-2">
      <Avatar size={size}>
        <AvatarFallbackText>
          {user.displayName}
        </AvatarFallbackText>
        <AvatarImage
          source={{
            uri: user.photoURL ?? assets?.[0].uri
          }}
        />
      </Avatar>
      <Heading size={size}>{user.displayName ?? user.email}</Heading>
    </VStack>
  );
};

export default UserAvatar;
