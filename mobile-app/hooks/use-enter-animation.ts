import { Animation } from '@/constants/theme';
import {
  FadeIn,
  FadeInDown,
  FadeOut,
  type EntryAnimationsValues,
} from 'react-native-reanimated';

const EASE_OUT_EXPO = [0.19, 1, 0.22, 1] as const;

export function staggerEnter(index: number, distance = 20) {
  return FadeInDown.delay(index * Animation.stagger)
    .duration(Animation.enterDuration)
    .springify()
    .damping(18)
    .stiffness(120);
}

export function fadeEnter(index = 0) {
  return FadeIn.delay(index * Animation.stagger).duration(500);
}

export function fadeExit() {
  return FadeOut.duration(200);
}

export function slideEnter(direction: 1 | -1) {
  return FadeInDown.duration(300).withInitialValues({
    transform: [{ translateX: direction > 0 ? 30 : -30 }],
  });
}

export const enterEasing = EASE_OUT_EXPO;

export type EnterValues = EntryAnimationsValues;
