import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/auth.store';

export default function IndexScreen() {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/(auth)/login" />;
}
