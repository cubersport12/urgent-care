import LogoutButton from '@/components/LogoutButton';
import { Center } from '@/components/ui/center';
import { VStack } from '@/components/ui/vstack';
import UserAvatar from '@/components/UserAvatar';

const ProfileScreen = () => {
  return (
    <Center className="h-full w-full">
      <VStack className="gap-4">
        <UserAvatar size="2xl" />
        <LogoutButton className="mt-auto" />
      </VStack>
    </Center>
  );
};

export default ProfileScreen;
