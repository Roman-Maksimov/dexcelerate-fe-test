import { FC } from 'react';

import { DiscordIcon } from '../icons/DiscordIcon';
import { TelegramIcon } from '../icons/TelegramIcon';
import { TwitterIcon } from '../icons/TwitterIcon';
import { WebsiteIcon } from '../icons/WebsiteIcon';

interface SocialIconsProps {
  socialLinks?: {
    discord?: string;
    telegram?: string;
    twitter?: string;
    website?: string;
  };
}

export const SocialIcons: FC<SocialIconsProps> = ({ socialLinks }) => {
  if (!socialLinks) return null;

  const { discord, telegram, twitter, website } = socialLinks;
  const hasAnyLink = discord || telegram || twitter || website;

  if (!hasAnyLink) return null;

  const iconClass =
    'w-2.5 h-2.5 rounded-full flex items-center justify-center text-white hover:opacity-80 transition-opacity cursor-pointer';

  return (
    <div className="flex items-center space-x-1.5 ml-2">
      {twitter && (
        <a
          href={twitter}
          target="_blank"
          rel="noopener noreferrer"
          className={`${iconClass} bg-gray-700 hover:bg-gray-600`}
          title="Twitter"
        >
          <TwitterIcon />
        </a>
      )}
      {telegram && (
        <a
          href={telegram}
          target="_blank"
          rel="noopener noreferrer"
          className={`${iconClass} bg-blue-500 hover:bg-blue-600`}
          title="Telegram"
        >
          <TelegramIcon />
        </a>
      )}
      {website && (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          className={`${iconClass} bg-green-500 hover:bg-green-600`}
          title="Website"
        >
          <WebsiteIcon />
        </a>
      )}
      {discord && (
        <a
          href={discord}
          target="_blank"
          rel="noopener noreferrer"
          className={`${iconClass} bg-purple-500 hover:bg-purple-600`}
          title="Discord"
        >
          <DiscordIcon />
        </a>
      )}
    </div>
  );
};
