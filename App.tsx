import React from 'react';
import { NativeBaseProvider, useColorModeValue } from 'native-base';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen, ProfileScreen } from './components';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const StackNavigator = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NativeBaseProvider>
      <NavigationContainer>
        <AppContent />
      </NavigationContainer>
    </NativeBaseProvider>
  );
}

export const AppContent = () => {
  const backgroundColor = useColorModeValue('warmGray.50', 'coolGray.800');
  return (
    <Tab.Navigator screenOptions={{ header: () => <></> }} initialRouteName="Profile">
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Home" component={HomeScreen} />
    </Tab.Navigator>
  );
};
