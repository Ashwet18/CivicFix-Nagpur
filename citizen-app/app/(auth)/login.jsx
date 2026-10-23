import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/auth';
import FormInput from '../../components/FormInput';
import Colors from '../../constants/colors';

// ── Validation helpers ────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(email, password) {
  const errors = {};
  if (!email.trim())              errors.email    = 'Email is required.';
  else if (!EMAIL_RE.test(email)) errors.email    = 'Enter a valid email address.';
  if (!password)                  errors.password = 'Password is required.';
  else if (password.length < 6)   errors.password = 'Password must be at least 6 characters.';
  return errors;
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, authError, clearAuthError } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [errors,   setErrors]   = useState({});

  const passwordRef = useRef(null);

  // Clear server-level error when user starts typing again
  const handleEmailChange = (v) => {
    setEmail(v);
    if (errors.email || authError) { setErrors((e) => ({ ...e, email: '' })); clearAuthError(); }
  };
  const handlePasswordChange = (v) => {
    setPassword(v);
    if (errors.password || authError) { setErrors((e) => ({ ...e, password: '' })); clearAuthError(); }
  };

  const handleLogin = async () => {
    const fieldErrors = validate(email, password);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    const ok = await login(email.trim(), password);
    if (ok) {
      // Navigate to the main tab app on success
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Brand header ── */}
        <View style={styles.header}>
          <Text style={styles.appIcon}>🏙️</Text>
          <Text style={styles.appName}>CivicFix Nagpur</Text>
          <Text style={styles.tagline}>Civic issues resolved, together.</Text>
        </View>

        {/* ── Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>
          <Text style={styles.cardSubtitle}>
            Use your registered account to continue.
          </Text>

          {/* Server / mock error banner */}
          {!!authError && (
            <View style={styles.errorBanner} accessibilityRole="alert">
              <Text style={styles.errorBannerText}>⚠ {authError}</Text>
            </View>
          )}

          <FormInput
            label="Email Address"
            value={email}
            onChangeText={handleEmailChange}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            autoCapitalize="none"
            error={errors.email}
            editable={!isLoading}
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <FormInput
            label="Password"
            value={password}
            onChangeText={handlePasswordChange}
            placeholder="Enter your password"
            secureEntry
            autoComplete="current-password"
            textContentType="password"
            error={errors.password}
            editable={!isLoading}
            inputRef={passwordRef}
            onSubmitEditing={handleLogin}
          />

          {/* Login button */}
          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Sign in to CivicFix"
            accessibilityState={{ disabled: isLoading, busy: isLoading }}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Mock hint */}
          <View style={styles.mockHint}>
            <Text style={styles.mockHintText}>
              🧪 Dev mock — use{' '}
              <Text style={styles.mockCred}>citizen@civicfix.dev</Text>
              {' '}/ {' '}
              <Text style={styles.mockCred}>Demo@1234</Text>
            </Text>
          </View>
        </View>

        {/* ── Register link ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/register')}
            accessibilityRole="link"
            accessibilityLabel="Go to registration screen"
          >
            <Text style={styles.footerLink}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.primary },

  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 40,
  },

  // Brand header
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  appIcon: { fontSize: 52, marginBottom: 8 },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 13,
    color: '#90CAF9',
    marginTop: 4,
  },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 18,
  },

  // Error banner
  errorBanner: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#C62828',
  },
  errorBannerText: {
    fontSize: 13,
    color: '#C62828',
    lineHeight: 18,
  },

  // Primary button
  primaryButton: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.65,
    elevation: 0,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Mock hint
  mockHint: {
    marginTop: 16,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 10,
  },
  mockHintText: {
    fontSize: 11,
    color: '#795548',
    textAlign: 'center',
    lineHeight: 16,
  },
  mockCred: {
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: { fontSize: 14, color: '#BBDEFB' },
  footerLink: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
