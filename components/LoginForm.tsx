import { VStack } from '@/components/ui/vstack';
import { Formik } from 'formik';
import {
  FormControl,
  FormControlError,
  FormControlErrorIcon,
  FormControlErrorText,
  FormControlHelper,
  FormControlHelperText,
  FormControlLabel,
  FormControlLabelText
} from '@/components/ui/form-control';
import { Input, InputField } from '@/components/ui/input';
import { AlertCircleIcon } from '@/components/ui/icon';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import { LogIn, AtSign, Chrome } from 'lucide-react-native';
import { HStack } from './ui/hstack';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/FirebaseConfig';
import { useEffect, useState } from 'react';
import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode,
  isSuccessResponse,
  isNoSavedCredentialFoundResponse
} from '@react-native-google-signin/google-signin';



type LoginFormData = {
  email: string;
  password: string;
};

const LoginEmailForm = () => {
  const [error, setError] = useState<string | null>(null);
  const handleSignIn = async (data: LoginFormData) => {
    try {
      console.log('logining...', data);
      const userCredential = await signInWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      console.info(userCredential);
    }
    catch (error) {
      const errorString = String(error);
      console.log(`Login error: ${errorString}`);
      setError(errorString);
    }
  };
  return (
    <Formik
      initialValues={{ email: '', password: '' } satisfies LoginFormData}
      validate={(values: LoginFormData) => {
        const errors: Partial<LoginFormData> = {};
        if (!values.email) {
          errors.email = 'Required';
        }
        else if (
          !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)
        ) {
          errors.email = 'Email введен некорректно';
        }
        return errors;
      }}
      onSubmit={async (values, { setSubmitting }) => {
        setSubmitting(true);
        await handleSignIn(values);
        setSubmitting(false);
      }}
    >
      {({
        values,
        errors,
        setFieldValue,
        handleSubmit,
        isSubmitting
      }) => (
        <View className="gap-1">
          <FormControl
            isRequired={true}
            isInvalid={errors.email != null}
          >
            <FormControlLabel>
              <FormControlLabelText>Почта</FormControlLabelText>
            </FormControlLabel>
            <Input className="my-1">
              <InputField
                type="text"
                placeholder="Почта"
                value={values.email}
                onChangeText={text => void setFieldValue('email', text, true)}
              />
            </Input>
            <FormControlHelper>
              <FormControlHelperText>
                Введите email
              </FormControlHelperText>
            </FormControlHelper>
            <FormControlError>
              <FormControlErrorIcon as={AlertCircleIcon} />
              <FormControlErrorText>
                Введен некорреткный email
              </FormControlErrorText>
            </FormControlError>
          </FormControl>
          <FormControl
            isRequired={true}
            isInvalid={errors.password != null}
          >
            <FormControlLabel>
              <FormControlLabelText>Пароль</FormControlLabelText>
            </FormControlLabel>
            <Input className="my-1">
              <InputField
                type="password"
                placeholder="Пароль"
                value={values.password}
                onChangeText={text => void setFieldValue('password', text, true)}
              />
            </Input>
            <FormControlHelper>
              <FormControlHelperText>
                Введите не менее 6 символов
              </FormControlHelperText>
            </FormControlHelper>
            <FormControlError>
              <FormControlErrorIcon as={AlertCircleIcon} />
              <FormControlErrorText>
                Пароль не может быть меньше 6 символов
              </FormControlErrorText>
            </FormControlError>
          </FormControl>
          {
            error && (
              <Text className="text-error-200">Неверный логин или пароль</Text>
            )
          }
          <Button variant="solid" action="primary" className="w-full" onPress={() => handleSubmit()} disabled={isSubmitting}>
            <ButtonIcon as={LogIn} />
            <ButtonText>Войти</ButtonText>
          </Button>
          <Button variant="link" action="secondary" className="w-full" disabled={isSubmitting}>
            <ButtonIcon as={AtSign} />
            <ButtonText>Зарегистрироваться</ButtonText>
          </Button>
        </View>
      )}
    </Formik>
  );
};

/* const AppleLoginButton = () => {
  const handleSignIn = async() => {
    const appleAuthRequestResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });
    const { identityToken, nonce } = appleAuthRequestResponse;
    if (identityToken) {
      // 3). create a Firebase `AppleAuthProvider` credential
      const appleCredential = AppleAuthProvider.credential(identityToken, nonce);

      // 4). use the created `AppleAuthProvider` credential to start a Firebase auth request,
      //     in this example `signInWithCredential` is used, but you could also call `linkWithCredential`
      //     to link the account to an existing user
      const userCredential = await signInWithCredential(auth, appleCredential);

      // user is now signed in, any Firebase `onAuthStateChanged` listeners you have will trigger
      console.warn(`Firebase authenticated via Apple, UID: ${userCredential.user.uid}`);
    } else {
      // handle this - retry?
    }
  }
  };
  return (
    <Button className="grow" variant="solid" action="secondary" size="lg">
      <ButtonIcon as={Apple} />
      <ButtonText>Apple</ButtonText>
    </Button>
  );
}; */

const GoogleLoginButton = () => {
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '968549272760-1efe2ldo7kbm2a7qr3nuasiegcc33rau.apps.googleusercontent.com'
    });
  }, [])
  const signIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        // read user's info
        console.log('isSuccessResponse', response.data);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      else if (isNoSavedCredentialFoundResponse(response as any)) {
        console.log('need createAccount', response.data);
        // Android and Apple only.
        // No saved credential found (user has not signed in yet, or they revoked access)
        // call `createAccount()`
      }
    }
    catch (error) {
      console.error(error);
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            // Android-only, you probably have hit rate limiting.
            // You can still call `presentExplicitSignIn` in this case.
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            // Android: play services not available or outdated.
            // Get more details from `error.userInfo`.
            // Web: when calling an unimplemented api (requestAuthorization)
            // or when the Google Client Library is not loaded yet.
            break;
          default:
          // something else happened
        }
      }
      else {
        // an error that's not related to google sign in occurred
      }
    }
  };
  return (
    <Button onPress={() => void signIn()} className="grow" variant="solid" action="secondary" size="lg">
      <ButtonIcon as={Chrome} />
      <ButtonText>Google</ButtonText>
    </Button>
  );
};

const LoginProviders = () => {
  return (
    <HStack className="w-full justify-end gap-1">
      <GoogleLoginButton />
      {/*    <AppleLoginButton /> */}
    </HStack>
  );
};

const LoginForm = () => {
  return (
    <VStack className="w-full p-16 gap-1">
      <LoginEmailForm />
      <LoginProviders />
    </VStack>
  );
};

export default LoginForm;
