import { StatusBar } from 'expo-status-bar';
import LoginScreen from '../screens/LoginScreen';

export default function Index() {
  return (
    <>
      <StatusBar style="light" />
      <LoginScreen />
    </>
  );
}