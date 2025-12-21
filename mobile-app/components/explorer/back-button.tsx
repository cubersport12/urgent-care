import { Button } from '@/components/ui/button';

type BackButtonProps = {
  onPress: () => void;
  label: string;
};

export function BackButton({ onPress, label }: BackButtonProps) {
  return (
    <Button
      title={label}
      onPress={onPress}
      variant="default"
      size="small"
      icon="chevron.left"
      iconPosition="left"
    />
  );
}

