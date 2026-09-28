import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useAuthStore } from '../../store/auth.store';
import { ApiService } from '../../services/api.service';
import apiClient from '../../services/api.service';
import { AuthResponse } from '@fieldops/shared';

// Lazy-loaded after login — avoids loading socket.io + TaskManager at startup
const getSocketService = () =>
  import('../../services/socket.service').then((m) => m.default);
const getLocationService = () =>
  import('../../services/location.service').then((m) => m.default);

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra as { apiUrl?: string })?.apiUrl ||
  'http://localhost:3001';

export default function LoginScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [networkError, setNetworkError] = useState('');

  const validate = (): boolean => {
    let valid = true;
    setEmailError('');
    setPasswordError('');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Enter a valid email address');
      valid = false;
    }
    if (!password || password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      valid = false;
    }
    return valid;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setNetworkError('');
    setLoading(true);
    try {
      const response = await ApiService.login(email.trim().toLowerCase(), password);
      const data = response.data as AuthResponse;

      setAuth(
        data.user,
        data.tokens.accessToken,
        data.tokens.refreshToken,
        data.tokens.expiresIn,
      );

      router.replace('/(tabs)/home');

      // Connect socket and start location AFTER navigation (lazy, non-blocking)
      getSocketService()
        .then((s) => s.connect(data.tokens.accessToken))
        .catch(() => {});
      getLocationService()
        .then((l) => l.startBackgroundTracking())
        .catch(() => {});
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string }; status?: number };
        code?: string;
        message?: string;
      };

      if (!axiosError.response) {
        // No response — network/connection failure
        const isTimeout = axiosError.code === 'ECONNABORTED';
        setNetworkError(
          isTimeout
            ? `Request timed out. Is the API running at ${API_URL}?`
            : `Cannot reach server at ${API_URL}\n\nMake sure:\n• Your phone and PC are on the same Wi-Fi\n• The API server is running\n• Port 3001 is allowed in Windows Firewall`,
        );
      } else {
        const status = axiosError.response.status;
        const msg = axiosError.response.data?.message;
        if (status === 401 || status === 403) {
          setNetworkError(
            status === 403
              ? 'Access denied. This app is for workers only.'
              : 'Invalid email or password.',
          );
        } else {
          setNetworkError(msg ?? `Server error (${status}). Please try again.`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      await apiClient.get('/auth/me').catch(() => null); // will 401 but proves connectivity
      Alert.alert('✅ Connected', `Reached ${API_URL} successfully.`);
    } catch {
      Alert.alert('❌ No Connection', `Cannot reach ${API_URL}\n\nCheck firewall and Wi-Fi.`);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>FO</Text>
          </View>
          <Text style={styles.title}>FieldOps</Text>
          <Text style={styles.subtitle}>Worker Portal</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              value={email}
              onChangeText={(v) => { setEmail(v); setEmailError(''); }}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor="#9CA3AF"
            />
            {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, passwordError ? styles.inputError : null]}
              value={password}
              onChangeText={(v) => { setPassword(v); setPasswordError(''); }}
              placeholder="••••••••"
              secureTextEntry
              placeholderTextColor="#9CA3AF"
            />
            {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
          </View>

          {!!networkError && (
            <View style={styles.networkErrorBox}>
              <Text style={styles.networkErrorText}>{networkError}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestConnection}
            activeOpacity={0.7}
          >
            <Text style={styles.testButtonText}>Test Connection</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>FieldOps Worker App v1.0</Text>
        <Text style={styles.apiUrlText}>API: {API_URL}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#1D4ED8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 4,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
  },
  loginButton: {
    height: 52,
    backgroundColor: '#1D4ED8',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footerText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 32,
  },
  apiUrlText: {
    textAlign: 'center',
    color: '#D1D5DB',
    fontSize: 10,
    marginTop: 4,
  },
  networkErrorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  networkErrorText: {
    color: '#DC2626',
    fontSize: 13,
    lineHeight: 18,
  },
  testButton: {
    marginTop: 12,
    alignItems: 'center',
    padding: 10,
  },
  testButtonText: {
    color: '#6B7280',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
