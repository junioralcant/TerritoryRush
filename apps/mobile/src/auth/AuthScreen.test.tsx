import { fireEvent, render, screen } from '@testing-library/react-native';
import { AuthScreen } from './AuthScreen';

describe('AuthScreen', () => {
  it('triggers the provider sign-in callbacks', () => {
    const onSignInWithGoogle = jest.fn();
    const onSignInWithApple = jest.fn();
    render(
      <AuthScreen
        authenticating={false}
        onSignInWithGoogle={onSignInWithGoogle}
        onSignInWithApple={onSignInWithApple}
      />,
    );

    fireEvent.press(screen.getByTestId('sign-in-google'));
    fireEvent.press(screen.getByTestId('sign-in-apple'));

    expect(onSignInWithGoogle).toHaveBeenCalledTimes(1);
    expect(onSignInWithApple).toHaveBeenCalledTimes(1);
  });
});
