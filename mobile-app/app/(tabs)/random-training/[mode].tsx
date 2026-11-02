import RandomTrainingMode from '@/components/random-training-mode';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function TrainingModeScreen() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  if (mode !== 'ordinary' && mode !== 'marathon') return <Redirect href="/(tabs)/random-training" />;
  return <RandomTrainingMode marathon={mode === 'marathon'} />;
}
