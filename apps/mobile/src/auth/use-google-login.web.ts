import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleLogin() {
  const webClientId = (process.env as any).EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'unconfigured';
  const [request, , promptAsync] = Google.useAuthRequest({
    webClientId,
  });
  return async () => {
    if (!webClientId || !request) {
      throw new Error('Google sign-in is not ready. Please try again.');
    }
    const response = await promptAsync();
    if (response.type === 'cancel' || response.type === 'dismiss') return null;
    if (response.type !== 'success') throw new Error('Google authentication failed.');
    const idToken = response.authentication?.idToken || response.params.id_token;
    const accessToken = response.authentication?.accessToken || response.params.access_token;
    if (!idToken && !accessToken) throw new Error('Google did not return a sign-in token.');
    return { idToken, accessToken };
  };
}
