import React, { ButtonHTMLAttributes, DetailedHTMLProps } from 'react';
import { twMerge } from 'tailwind-merge';

export type ButtonProps = DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;

function Button({ children, className = '', ...props }: ButtonProps): React.JSX.Element {
  return (
    <button
      className={twMerge(`
        bg-primary-default py-2 px-4
        tracking-wider text-sm font-semibold rounded-full cursor-pointer text-white
        border-4 border-transparent focus:border-primary-dark
        disabled:opacity-55 disabled:pointer-events-none
        ${className}
      `)}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
