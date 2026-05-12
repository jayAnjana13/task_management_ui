import React, { memo } from 'react';
import { cn, getInitials } from '@/lib/utils';

interface AvatarProps {
  src?: string;
  alt?: string;
  firstName?: string;
  lastName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

const Avatar = memo(function Avatar({
  src,
  alt,
  firstName = '',
  lastName = '',
  size = 'md',
  className,
}: AvatarProps) {
  const initials = getInitials(firstName, lastName);
  const fullName = `${firstName} ${lastName}`.trim() || alt || 'User';

  if (src) {
    return (
      <img
        src={src}
        alt={fullName}
        className={cn(
          'rounded-full object-cover',
          sizeClasses[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-primary-100 font-medium text-primary-700',
        sizeClasses[size],
        className
      )}
      title={fullName}
    >
      {initials || '?'}
    </div>
  );
});

Avatar.displayName = 'Avatar';

export { Avatar };
