import { Button, type ButtonProps } from './button';

type GradientButtonProps = Pick<ButtonProps, 'title' | 'onPress' | 'disabled' | 'fullWidth' | 'size'>;

/** @deprecated Use `<Button variant="primary" />` — primary is gradient by default */
export function GradientButton({ size = 'medium', ...props }: GradientButtonProps) {
  return <Button variant="primary" size={size} {...props} />;
}
