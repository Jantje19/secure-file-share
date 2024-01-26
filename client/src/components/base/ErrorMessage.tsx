import React, { DetailedHTMLProps, HTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

export type ErrorProps = Omit<DetailedHTMLProps<HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>, 'children'> & {
  children: Error;
};

function ErrorMessage({ children, className = '', ...props }: ErrorProps): React.JSX.Element {
  return (
    <p className={twMerge(`bg-red-600 text-white w-fit py-2 px-4 font-bold rounded-lg ${className}`)} {...props}>
      {children.message || children.toString()}
    </p>
  );
}

export default ErrorMessage;
