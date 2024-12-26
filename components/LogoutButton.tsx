import { LogOut } from 'lucide-react-native';
import { auth } from '@/FirebaseConfig';
import { signOut } from 'firebase/auth';
import { Button, ButtonIcon, ButtonText } from './ui/button';

const LogoutButton = ({ className }: { className?: string }) => {
  const handleLogout = async () => {
    await signOut(auth);
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
