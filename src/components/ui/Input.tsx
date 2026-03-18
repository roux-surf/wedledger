'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-charcoal mb-1"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sage focus:border-sage disabled:bg-stone-lighter disabled:text-warm-gray ${
            error ? 'border-rose' : 'border-stone'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-rose-dark">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
