/**
 * Button component types - platform agnostic
 */

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
}

export interface ButtonStyles {
  container: Record<string, unknown>;
  text: Record<string, unknown>;
  loader: Record<string, unknown>;
}