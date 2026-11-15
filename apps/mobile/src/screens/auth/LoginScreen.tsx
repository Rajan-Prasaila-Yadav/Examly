// apps/mobile/src/screens/auth/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useAuth } from '../../auth/auth-context';
import { Mail, Lock, Eye, EyeOff, GraduationCap, ArrowRight } from 'lucide-react-native';

export function LoginScreen({ onForgotPassword }: { onForgotPassword?: () => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    const res = await login(email.trim(), password);
    setLoading(false);

    if (!res.success && res.error) {
      setErrorMessage(res.error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#060709" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header Branding */}
        <View style={styles.brandRow}>
          <View style={styles.iconBadge}>
            <GraduationCap size={28} color="#8B80F5" />
          </View>
          <Text style={styles.logoText}>
            exam<Text style={styles.logoAccent}>ly</Text>
          </Text>
          <Text style={styles.subTitle}>Student Learning & Computer-Based Testing</Text>
        </View>

        {/* Card Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign in to your account</Text>
          <Text style={styles.cardDesc}>Enter your institutional credentials to access your classes and tests.</Text>

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Email input */}
          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputContainer}>
            <Mail size={18} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="student@institute.edu"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Password input */}
          <View style={styles.passwordRow}>
            <Text style={styles.label}>Password</Text>
            {onForgotPassword && (
              <TouchableOpacity onPress={onForgotPassword}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.inputContainer}>
            <Lock size={18} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••••••"
              placeholderTextColor="#64748B"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              {showPassword ? <EyeOff size={18} color="#94A3B8" /> : <Eye size={18} color="#94A3B8" />}
            </TouchableOpacity>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.loginButtonText}>Sign In</Text>
                <ArrowRight size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign In Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => {
              setErrorMessage('Android Google Client ID is being registered in Console. Use Quick Demo Student below to test instantly!');
            }}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Quick Demo Fill Button */}
          <TouchableOpacity
            style={styles.demoButton}
            onPress={() => {
              setEmail('developerajan@gmail.com');
              setPassword('Rajan123@');
              setErrorMessage('');
            }}
          >
            <Text style={styles.demoButtonText}>⚡ Auto-Fill Student (Rajan)</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerHelp}>
          Need help logging in? Contact your institution administrator.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060709',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  brandRow: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconBadge: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: 'rgba(91, 79, 207, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 128, 245, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  logoAccent: {
    color: '#8B80F5',
  },
  subTitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#0E111A',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1E2333',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 20,
    lineHeight: 18,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
    marginBottom: 6,
  },
  passwordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  forgotText: {
    fontSize: 11,
    color: '#8B80F5',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B29',
    borderWidth: 1,
    borderColor: '#252C42',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  eyeButton: {
    padding: 6,
  },
  loginButton: {
    backgroundColor: '#5B4FCF',
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1E2333',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161B29',
    borderColor: '#252C42',
    borderWidth: 1,
    borderRadius: 14,
    height: 48,
    gap: 10,
  },
  googleIcon: {
    fontSize: 17,
    fontWeight: '900',
    color: '#4285F4',
  },
  googleButtonText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
  demoButton: {
    marginTop: 12,
    backgroundColor: 'rgba(91, 79, 207, 0.12)',
    borderColor: 'rgba(91, 79, 207, 0.4)',
    borderWidth: 1,
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoButtonText: {
    color: '#A594FD',
    fontSize: 13,
    fontWeight: '700',
  },
  footerHelp: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 11,
    marginTop: 24,
  },
});
