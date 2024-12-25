import LoginForm from '@/components/LoginForm';
import { Center } from '@/components/ui/center';

const LoginScreen = () => {
  return (
    <Center className="bg-white dard:bg-black w-full h-full">
      <LoginForm />
    </Center>
  );
};

export default LoginScreen;
