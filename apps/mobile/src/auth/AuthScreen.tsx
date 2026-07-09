import { Button, Text, View } from 'react-native';

export type AuthScreenProps = {
  onSignInWithGoogle: () => void;
  onSignInWithApple: () => void;
  authenticating: boolean;
};

export const AuthScreen = ({ onSignInWithGoogle, onSignInWithApple, authenticating }: AuthScreenProps) => (
  <View accessibilityLabel="Entrar no Territory Rush">
    <Text testID="auth-title">Territory Rush</Text>
    <Button
      testID="sign-in-google"
      title="Entrar com Google"
      disabled={authenticating}
      onPress={onSignInWithGoogle}
    />
    <Button
      testID="sign-in-apple"
      title="Entrar com Apple"
      disabled={authenticating}
      onPress={onSignInWithApple}
    />
  </View>
);
