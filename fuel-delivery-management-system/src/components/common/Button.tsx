import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  variant = 'primary',
  disabled = false,
  className = '',
}) => {
  const baseStyle = 'px-4 py-2 rounded transition duration-300';
  const variantStyle = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600',
    secondary: 'bg-gray-300 text-black hover:bg-gray-400',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };

  return (
    <button
      className={`${baseStyle} ${variantStyle[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
};

export default Button;