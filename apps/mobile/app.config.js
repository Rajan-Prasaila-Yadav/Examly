module.exports = ({ config }) => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  return {
    ...config,
    scheme: 'examly',
    plugins: [
      ...(config.plugins || []).filter((plugin) =>
        (Array.isArray(plugin) ? plugin[0] : plugin) !== '@react-native-google-signin/google-signin'),
      'expo-secure-store',
      ['expo-video', { supportsPictureInPicture: true }],
      ...(iosClientId ? [[
        '@react-native-google-signin/google-signin',
        { iosUrlScheme: iosClientId.split('.').reverse().join('.') },
      ]] : ['@react-native-google-signin/google-signin']),
    ],
  };
};
