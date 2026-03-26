import { ReactNode, ButtonHTMLAttributes, useCallback } from 'react';
import { useAudio } from '../audio';

type ButtonVariant = 'primary' | 'secondary';
type ButtonSize = 'normal' | 'large';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Button visual style
   */
  variant?: ButtonVariant;
  /**
   * Button size
   */
  size?: ButtonSize;
  /**
   * Button content
   */
  children: ReactNode;
  /**
   * Disable the click sound effect
   */
  silent?: boolean;
}

/**
 * Reusable button component with variants and sizes
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'normal',
  children,
  className = '',
  silent = false,
  onClick,
  ...props
}) => {
  const { playSfx } = useAudio();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!silent) {
        void playSfx('ui');
      }
      onClick?.(e);
    },
    [silent, playSfx, onClick],
  );

  const variantClass = `btn-${variant}`;
  const sizeClass = size === 'large' ? 'btn-large' : '';
  const classes = `${variantClass} ${sizeClass} ${className}`.trim();

  return (
    <button className={classes} onClick={handleClick} {...props}>
      {children}
    </button>
  );
};
