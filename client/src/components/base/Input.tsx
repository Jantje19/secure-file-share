import React, { DetailedHTMLProps, HTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

export type InputProps = DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> & {
  containerProps?: DetailedHTMLProps<LabelHTMLAttributes<HTMLLabelElement>, HTMLLabelElement>;
  labelProps?: DetailedHTMLProps<HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>;
  label: string;
};

function Input({
  label,
  containerProps: { className: containerClassName = '', ...containerProps } = {},
  labelProps: { className: labelClassName = '', ...labelProps } = {},
  className = '',
  ...props
}: InputProps): React.JSX.Element {
  return (
    <label
      className={twMerge(`
				rounded-full py-2 px-4
				bg-primary-default/10 dark:bg-black/20 border-2 border-primary-default
				outline-primary-default focus-within:outline
        disabled:opacity-55 disabled:pointer-events-none
				${containerClassName}
			`)}
      {...containerProps}
    >
      <span className={`pr-2 border-r border-x-black/50 dark:border-x-white/50 opacity-75 ${labelClassName}`} {...labelProps}>
        {label}
      </span>
      <input className={`pl-2 bg-transparent outline-none text-lg ${className}`} {...props} />
    </label>
  );
}

export default Input;
