import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

// Load lazily so Expo Go can still open the app and use password login.
export function useGoogleLogin() {
  return async (): Promise<{ idToken: string } | null> => {
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
      throw new Error('Google sign-in requires the installed Examly app. Open the Examly development build instead of Expo Go.');
    }
    // Expo statically embeds only direct EXPO_PUBLIC_* environment accesses into
    // native release bundles. Do not use a dynamic process.env lookup here.
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    if (!webClientId || (Platform.OS === 'ios' && !iosClientId)) {
      throw new Error('Google sign-in is not configured for this app build.');
    }
    let google: typeof import('@react-native-google-signin/google-signin');
    try {
      google = require('@react-native-google-signin/google-signin');
    } catch {
      throw new Error('This Examly build does not include Google sign-in. Rebuild and install the updated app.');
    }
    const { GoogleSignin, statusCodes, isErrorWithCode } = google;
    GoogleSignin.configure({ webClientId, iosClientId });
    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }
      const response = await GoogleSignin.signIn();
      if (response.type === 'cancelled') return null;
      const idToken = response.data.idToken;
      if (!idToken) throw new Error('Google did not return a sign-in token. Check the app OAuth configuration.');
      return { idToken };
    } catch (error) {
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) return null;
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          throw new Error('Update Google Play services on your phone, then try again.');
        }
        if (error.code === '10' || error.code === 'DEVELOPER_ERROR') {
          throw new Error('Google sign-in configuration does not match this app. Register its package name and signing SHA-1 in Google Cloud.');
        }
      }
      throw error;
    }
  };
}
