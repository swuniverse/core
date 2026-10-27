import { navigationIcon } from '../../lib/assets';

interface NavigationIconProps {
  active: boolean;
  name: string;
  size?: 'small' | 'regular';
}

export function NavigationIcon({
  active,
  name,
  size = 'regular',
}: NavigationIconProps) {
  const dimensions = size === 'small' ? 'h-5 w-5' : 'h-6 w-6';

  return (
    <span className={`relative block ${dimensions}`} aria-hidden="true">
      <img
        src={navigationIcon(name)}
        alt=""
        className={`${dimensions} ${active ? 'hidden' : 'block group-hover:hidden'}`}
      />
      <img
        src={navigationIcon(name, true)}
        alt=""
        className={`${dimensions} ${active ? 'block' : 'hidden group-hover:block'}`}
      />
    </span>
  );
}
