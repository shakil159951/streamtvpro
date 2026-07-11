import React from 'react';
import { Channel } from '../types';
import { ChannelLogo } from './ChannelLogo';

interface ChannelItemProps {
  channel: Channel;
  isActive: boolean;
  onPlay: (channel: Channel) => void;
  customLogo?: string;
  isAdmin: boolean;
  onUpdateLogo: (channelName: string, logoUrl: string | null) => void;
  isMobile?: boolean;
}

export const ChannelItem = React.memo(({ channel, isActive, onPlay, customLogo, isAdmin, onUpdateLogo, isMobile }: ChannelItemProps) => {
  return (
    <div 
      onClick={() => onPlay(channel)}
      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all border relative overflow-hidden group cursor-pointer ${isActive ? 'bg-white/10 border-primary/20 shadow-sm' : 'border-transparent hover:bg-white/5'}`}
    >
      {isActive && <div className="absolute inset-y-0 left-0 w-1 bg-primary shadow-sm" />}
      <ChannelLogo 
        channel={channel} 
        className="w-10 h-10 shrink-0" 
        customLogo={customLogo} 
        isAdmin={isAdmin} 
        onUpdateLogo={onUpdateLogo} 
      />
      <div className="flex-1 min-w-0 text-left">
        <div className={`truncate ${isMobile ? 'text-sm' : 'text-[13px]'} font-semibold transition-colors ${isActive ? 'text-primary' : 'text-slate-200 group-hover:text-white'}`}>{channel.name}</div>
        <div className={`truncate text-[10px] uppercase tracking-widest text-slate-500 mt-0.5 font-medium ${isMobile ? 'leading-tight' : ''}`}>{channel.group}</div>
      </div>
    </div>
  );
});
