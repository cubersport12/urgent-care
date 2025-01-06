import { Avatar, AvatarFallbackText, AvatarImage } from './ui/avatar';
import { VStack } from './ui/vstack';
import { Heading } from './ui/heading';
import { useAssets } from 'expo-asset';
import { Button, ButtonText } from './ui/button';
import { supabase } from '@/supabase';
import { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

const UserAvatar = ({ size }: { size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' }) => {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    void supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);
  const [assets] = useAssets([require('../assets/images/empty_avatar.png')]);
  const displayName = session?.user.email;
  return (
    <VStack className="justify-center items-center gap-2">
      <Avatar size={size}>
        <AvatarFallbackText>
          {displayName}
        </AvatarFallbackText>
        <AvatarImage
          source={{
            uri: session?.user.user_metadata?.avatar_url ?? assets?.[0].uri
          }}
        />
      </Avatar>
      <Heading size={size}>{displayName}</Heading>
      {
        !session?.user.email_confirmed_at?.length && (
          <Button size="xs" variant="link" action="secondary" className="text-gray-400">
            <ButtonText>
              Email не подтвержден
            </ButtonText>
          </Button>
        )
      }
    </VStack>
  );
};

export default UserAvatar;
