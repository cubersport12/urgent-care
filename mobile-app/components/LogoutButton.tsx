import { LogOut } from 'lucide-react-native';
import { Button, ButtonIcon, ButtonText } from './ui/button';
import { supabase } from '@/supabase';

const LogoutButton = ({ className }: { className?: string }) => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };
  return (
    <Button onPress={() => void handleLogout()} className={className} action="negative">
      <ButtonIcon as={LogOut} />
      <ButtonText>
        Выйти из аккаунта
      </ButtonText>
    </Button>
  );
};

export default LogoutButton;
