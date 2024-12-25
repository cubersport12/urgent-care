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
import { Button, ButtonText } from '@/components/ui/button';
import { View } from 'react-native';

type LoginFormData = {
  email: string;
  password: string;
};

const LoginEmailForm = () => {
  return (
    <VStack className="w-full p-16">
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
        onSubmit={(values, { setSubmitting }) => {
          console.info(values, setSubmitting);
        }}
      >
        {({
          values,
          errors,
          setFieldValue,
          handleSubmit,
          isSubmitting
        }) => (
          <View>
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
            <Button variant="solid" action="primary" className="w-fit self-end mt-4" size="sm" onPress={() => handleSubmit()} disabled={isSubmitting}>
              <ButtonText>Войти</ButtonText>
            </Button>
          </View>
        )}
      </Formik>
    </VStack>
  );
};

const LoginForm = () => {
  return (
    <LoginEmailForm />
  );
};

export default LoginForm;
