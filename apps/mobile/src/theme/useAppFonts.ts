import { useFonts } from 'expo-font';
import {
  Saira_600SemiBold,
  Saira_700Bold,
  Saira_800ExtraBold,
  Saira_900Black_Italic,
} from '@expo-google-fonts/saira';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';

/**
 * Loads the Saira + Manrope weights used across the app. Returns `true` once the
 * fonts are ready; the app renders a branded splash until then.
 */
export const useAppFonts = (): boolean => {
  const [loaded] = useFonts({
    Saira_600SemiBold,
    Saira_700Bold,
    Saira_800ExtraBold,
    Saira_900Black_Italic,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  return loaded;
};
