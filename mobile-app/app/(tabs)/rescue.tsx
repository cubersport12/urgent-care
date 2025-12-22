import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme-color';
import { StyleSheet } from 'react-native';

export default function RescueScreen() {
  const { layout2: headerBackground, neutral: headerIcon } = useAppTheme();
  
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: headerBackground, dark: headerBackground }}
      headerImage={
        <IconSymbol
          size={310}
          color={headerIcon}
          name="cross.fill"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
          }}>
          Спасение
        </ThemedText>
      </ThemedView>
      <ThemedText>
        Раздел находится в разработке. Скоро здесь появится полезная информация.
      </ThemedText>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    // color will be set dynamically
    bottom: -90,
    alignSelf: 'center',
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
});
