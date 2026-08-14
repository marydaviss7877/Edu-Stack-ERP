import { useState } from 'react';
import { cn, getInitials } from '../../lib/utils';

interface UserAvatarProps {
  name: string;
  photoUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
  alt?: string;
}

export default function UserAvatar({
  name,
  photoUrl,
  className,
  fallbackClassName,
  alt,
}: UserAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden flex items-center justify-center bg-slate-200 text-slate-600 font-bold',
        className
      )}
      title={name}
    >
      <span className={cn('flex h-full w-full items-center justify-center', fallbackClassName)} aria-hidden="true">
        {getInitials(name || '?')}
      </span>
      {photoUrl && failedUrl !== photoUrl && (
        <img
          src={photoUrl}
          alt={alt ?? `${name} profile photo`}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(photoUrl)}
        />
      )}
    </div>
  );
}
