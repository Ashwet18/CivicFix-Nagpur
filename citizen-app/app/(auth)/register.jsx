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
// Password must be ≥8 chars, contain a digit and an uppercase letter
const STRONG_PW = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

function validate(name, email, password, confirm) {
  const errors = {};

  if (!name.trim())
    errors.name = 'Full name is required.';
  else if (name.trim().length < 2)
    errors.name = 'Name must be at least 2 characters.';

  if (!email.trim())
    errors.email = 'Email is required.';
  else if (!EMAIL_RE.test(email.trim()))
    errors.email = 'Enter a valid email address.';

  if (!password)
    errors.password = 'Password is required.';
  else if (!STRONG_PW.test(password))
    errors.password =
      'Password must be at least 8 characters, include one uppercase letter and one number.';

  if (!confirm)
    errors.confirm = 'Please confirm your password.';
  else if (confirm !== password)
    errors.confirm = 'Passwords do not match.';

  return errors;
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading, authError, clearAuthError } = useAuth();

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [errors,   setErrors]   = useState({});

  const emailRef    = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef  = useRef(null);

  // Clear errors on change
  const mkHandler = (setter, field) => (v) => {
    setter(v);
    if (errors[field] || authError) {
      setErrors((e) => ({ ...e, [field]: '' }));
      clearAuthError();
    }
  };

  const handleRegister = async () => {
    const fieldErrors = validate(name, email, password, confirm);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    const ok = await register(name.trim(), email.trim(), password);
    if (ok) {
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
          <Text style={styles.tagline}>Join and help your city.</Text>
        </View>

        {/* ── Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create Account</Text>
          <Text style={styles.cardSubtitle}>
            Create a local demo session. The backend does not currently provide account registration.
          </Text>

          <View style={styles.mockHint} accessibilityRole="alert">
            <Text style={styles.mockHintText}>
              No account will be created or password sent to the server. Do not use a real password.
            </Text>
          </View>

          {/* Demo error banner */}
          {!!authError && (
            <View style={styles.errorBanner} accessibilityRole="alert">
              <Text style={styles.errorBannerText}>⚠ {authError}</Text>
            </View>
          )}

          <FormInput
            label="Full Name"
            value={name}
            onChangeText={mkHandler(setName, 'name')}
            placeholder="e.g. Priya Sharma"
            autoComplete="name"
            textContentType="name"
            autoCapitalize="words"
            error={errors.name}
            editable={!isLoading}
            onSubmitEditing={() => emailRef.current?.focus()}
          />

          <FormInput
            label="Email Address"
            value={email}
            onChangeText={mkHandler(setEmail, 'email')}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            autoCapitalize="none"
            error={errors.email}
            editable={!isLoading}
            inputRef={emailRef}
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <FormInput
            label="Password"
            value={password}
            onChangeText={mkHandler(setPassword, 'password')}
            placeholder="Min. 8 chars, 1 uppercase, 1 number"
            secureEntry
            autoComplete="new-password"
            textContentType="newPassword"
            error={errors.password}
            editable={!isLoading}
            inputRef={passwordRef}
            onSubmitEditing={() => confirmRef.current?.focus()}
          />

          <FormInput
            label="Confirm Password"
            value={confirm}
            onChangeText={mkHandler(setConfirm, 'confirm')}
            placeholder="Re-enter your password"
            secureEntry
            autoComplete="new-password"
            textContentType="newPassword"
            error={errors.confirm}
            editable={!isLoading}
            inputRef={confirmRef}
            onSubmitEditing={handleRegister}
          />

          {/* Register button */}
          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Create a local demo session"
            accessibilityState={{ disabled: isLoading, busy: isLoading }}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Create Demo Session</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Login link ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="link"
            accessibilityLabel="Go back to sign in screen"
          >
            <Text style={styles.footerLink}>Sign In</Text>
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
  mockHint: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  mockHintText: {
    fontSize: 12,
    color: '#795548',
    lineHeight: 18,
  },

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
