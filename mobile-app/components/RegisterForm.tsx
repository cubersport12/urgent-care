import { Button, ButtonIcon, ButtonText } from './ui/button';
import { Heading } from './ui/heading';
import { AlertCircleIcon, CloseIcon, Icon } from './ui/icon';
import { Text } from './ui/text';
import { ModalBackdrop, ModalContent, ModalHeader, ModalCloseButton, ModalBody, Modal } from './ui/modal';
import { Formik } from 'formik';
import { View } from 'react-native';
import { FormControl, FormControlError, FormControlErrorIcon, FormControlErrorText, FormControlLabel, FormControlLabelText } from './ui/form-control';
import { AtSign } from 'lucide-react-native';
import { Input, InputField } from './ui/input';
import { useState } from 'react';
import { supabase } from '@/supabase';

type RegisterFormData = {
  email: string;
  password: string;
  confirmPassword: string;
};

const RegisterForm = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [error, setError] = useState<string | null>(null);
  const handleRegister = async (data: RegisterFormData) => {
    try {
      const response = await supabase.auth.signUp({ email: data.email, password: data.password }); // await createUserWithEmailAndPassword(auth, data.email, data.password);
      if (response?.data?.user) {
        await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
        onClose();
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (error: { code: string } | any) {
      if ('code' in error) {
        if (error.code === 'auth/email-already-in-use') {
          setError('Пользователь с такой почтой уже существует');
        }
      }
    }
  };
  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={isOpen}
      onClose={() => {
        onClose();
      }}
      size="md"
    >
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Heading size="md" className="text-typography-950">
            Регистрация
          </Heading>
          <ModalCloseButton>
            <Icon
              as={CloseIcon}
              size="md"
              className="stroke-background-400 group-[:hover]/modal-close-button:stroke-background-700 group-[:active]/modal-close-button:stroke-background-900 group-[:focus-visible]/modal-close-button:stroke-background-900"
            />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          <Formik
            initialValues={{ email: '', password: '', confirmPassword: '' } satisfies RegisterFormData}
            validate={(values: RegisterFormData) => {
              const errors: Partial<RegisterFormData> = {};
              if (!values.email) {
                errors.email = 'Необхоодимо ввести почту';
              }
              else if (
                !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)
              ) {
                errors.email = 'Email введен некорректно';
              }
              if (!values.password?.length) {
                errors.password = 'Необхоодимо ввести пароль';
              }
              if (!values.confirmPassword?.length) {
                errors.confirmPassword = 'Необхоодимо ввести повторно пароль';
              }
              else if (values.confirmPassword !== values.password) {
                errors.confirmPassword = 'Пароли не совпадают';
              }
              return errors;
            }}
            onSubmit={async (values, { setSubmitting }) => {
              setSubmitting(true);
              await handleRegister(values);
              setSubmitting(false);
            }}
          >
            {({
              values,
              errors,
              setFieldValue,
              handleSubmit,
              isValid,
              isSubmitting
            }) => (
              <View className="gap-1 w-full">
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
                  <FormControlError>
                    <FormControlErrorIcon as={AlertCircleIcon} />
                    <FormControlErrorText>
                      {errors.email}
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
                  <FormControlError>
                    <FormControlErrorIcon as={AlertCircleIcon} />
                    <FormControlErrorText>
                      {errors.password}
                    </FormControlErrorText>
                  </FormControlError>
                </FormControl>
                <FormControl
                  isRequired={true}
                  isInvalid={errors.confirmPassword != null}
                >
                  <FormControlLabel>
                    <FormControlLabelText>Подтвердите пароль</FormControlLabelText>
                  </FormControlLabel>
                  <Input className="my-1">
                    <InputField
                      type="password"
                      placeholder="Подтвердите пароль"
                      value={values.confirmPassword}
                      onChangeText={text => void setFieldValue('confirmPassword', text, true)}
                    />
                  </Input>
                  <FormControlError>
                    <FormControlErrorIcon as={AlertCircleIcon} />
                    <FormControlErrorText>
                      {errors.confirmPassword}
                    </FormControlErrorText>
                  </FormControlError>
                </FormControl>
                {
                  error && (
                    <Text className="text-error-200">{error}</Text>
                  )
                }
                <Button variant="solid" action="primary" className="w-full" onPress={() => handleSubmit()} disabled={isSubmitting || !isValid}>
                  <ButtonIcon as={AtSign} />
                  <ButtonText>Зарегистрироваться</ButtonText>
                </Button>
              </View>
            )}
          </Formik>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default RegisterForm;
