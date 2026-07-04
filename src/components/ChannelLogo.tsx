import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Tv, Save, Upload, Trash2, Edit2, RotateCcw } from 'lucide-react';
import { Channel } from '../types';

interface ChannelLogoProps {
    channel: Channel;
    className?: string;
    customLogo?: string;
    isAdmin?: boolean;
    onUpdateLogo?: (channelName: string, logoUrl: string | null) => void;
}

const GRADIENTS = [
    'bg-gradient-to-br from-purple-500 to-indigo-600',
    'bg-gradient-to-br from-pink-500 to-rose-600',
    'bg-gradient-to-br from-emerald-400 to-teal-600',
    'bg-gradient-to-br from-blue-400 to-blue-700',
    'bg-gradient-to-br from-orange-400 to-red-500',
    'bg-gradient-to-br from-yellow-400 to-orange-500',
    'bg-gradient-to-br from-cyan-400 to-blue-500',
    'bg-gradient-to-br from-fuchsia-500 to-purple-600',
    'bg-gradient-to-br from-lime-400 to-green-600',
    'bg-gradient-to-br from-sky-400 to-indigo-500',
    'bg-gradient-to-br from-rose-400 to-red-600',
    'bg-gradient-to-br from-violet-500 to-fuchsia-600',
    'bg-gradient-to-br from-teal-400 to-emerald-600',
    'bg-gradient-to-br from-amber-400 to-orange-600',
    'bg-gradient-to-br from-indigo-400 to-cyan-500',
    'bg-gradient-to-br from-pink-400 to-purple-500',
    'bg-gradient-to-br from-green-400 to-teal-500',
    'bg-gradient-to-br from-red-400 to-rose-600',
    'bg-gradient-to-br from-blue-500 to-indigo-700',
    'bg-gradient-to-br from-purple-400 to-pink-600',
];

const CACHE: Record<string, boolean> = {};

export function ChannelLogo({ channel, className = "", customLogo, isAdmin, onUpdateLogo }: ChannelLogoProps) {
    const [status, setStatus] = useState<'loading' | 'loaded' | 'avatar' | 'icon'>('loading');
    const [currentSrcIndex, setCurrentSrcIndex] = useState(0);
    const [sources, setSources] = useState<string[]>([]);
    const [hasFadedIn, setHasFadedIn] = useState(false);
    const [showAdminMenu, setShowAdminMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
        const newSources: string[] = [];
        
        if (customLogo === 'none') {
            // Do not push any sources, force avatar
        } else {
            if (customLogo) {
                newSources.push(customLogo);
            }
            if (channel.logo && channel.logo !== customLogo) {
                newSources.push(channel.logo);
            }
        }

        let startIdx = 0;
        while (startIdx < newSources.length && CACHE[newSources[startIdx]] === false) {
            startIdx++;
        }
        
        setSources(newSources);
        setCurrentSrcIndex(startIdx);
        setStatus(startIdx < newSources.length ? 'loading' : 'avatar');
        setHasFadedIn(false);
    }, [channel.logo, channel.url, customLogo]);

    useEffect(() => {
        if (status === 'loading' && sources[currentSrcIndex]) {
            if (CACHE[sources[currentSrcIndex]] === false) {
                handleImageError();
            } else if (CACHE[sources[currentSrcIndex]] === true) {
                setStatus('loaded');
                setHasFadedIn(true);
            }
        }
    }, [currentSrcIndex, status, sources]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowAdminMenu(false);
            }
        };
        if (showAdminMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showAdminMenu]);

    const handleImageLoad = () => {
        setStatus('loaded');
        setHasFadedIn(true);
        if (sources[currentSrcIndex]) {
            CACHE[sources[currentSrcIndex]] = true;
        }
    };

    const handleImageError = () => {
        if (sources[currentSrcIndex]) {
            CACHE[sources[currentSrcIndex]] = false;
        }
        if (currentSrcIndex < sources.length - 1) {
            setCurrentSrcIndex(prev => prev + 1);
        } else {
            setStatus('avatar');
        }
    };

    const initials = useMemo(() => {
        const name = channel.name || '';
        const cleanName = name.replace(/[^a-zA-Z0-9]/g, '');
        if (cleanName.length >= 2) {
            return cleanName.substring(0, 2).toUpperCase();
        }
        return cleanName.substring(0, 1).toUpperCase();
    }, [channel.name]);

    const gradient = useMemo(() => {
        let hash = 0;
        for (let i = 0; i < channel.name.length; i++) {
            hash = channel.name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % GRADIENTS.length;
        return GRADIENTS[index];
    }, [channel.name]);

    const currentSrc = sources[currentSrcIndex];
    const isAutoDetected = currentSrcIndex > 0 && currentSrc !== channel.logo && currentSrc !== customLogo;

    const onMenuAction = (e: React.MouseEvent, action: () => void) => {
        e.preventDefault();
        e.stopPropagation();
        action();
        setShowAdminMenu(false);
    };

    return (
        <div className={`relative overflow-visible flex items-center justify-center rounded-lg bg-[#1a1a1a] shadow-inner group/logo ${className}`}>
            {status !== 'avatar' && status !== 'icon' && currentSrc && (
                <img
                    src={currentSrc}
                    alt={channel.name}
                    loading="lazy"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    className={`w-full h-full object-contain p-1 transition-opacity duration-500 ease-in-out ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
                />
            )}
            
            {(status === 'loading' && !hasFadedIn) && (
                <div className="absolute inset-0 flex items-center justify-center animate-pulse bg-white/5 rounded-lg" />
            )}

            {status === 'avatar' && initials && (
                <div className={`absolute inset-0 flex items-center justify-center rounded-lg shadow-inner ${gradient} transition-opacity duration-300`}>
                    <span className="text-white font-bold text-sm sm:text-base drop-shadow-md tracking-wider">
                        {initials}
                    </span>
                </div>
            )}

            {(status === 'avatar' && !initials) || status === 'icon' ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[#252525] rounded-lg transition-opacity duration-300">
                    <Tv className="w-1/2 h-1/2 text-slate-500" />
                </div>
            ) : null}

            {isAdmin && (
                <>
                    <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAdminMenu(true); }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-teal-950 rounded-full flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity z-10 shadow-md hover:scale-110"
                        title="Edit Logo"
                    >
                        <Edit2 className="w-3 h-3" />
                    </button>
                    {showAdminMenu && (
                        <div ref={menuRef} className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-3 py-2 border-b border-slate-700 bg-slate-800/50">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logo Settings</span>
                            </div>
                            
                            {isAutoDetected && status === 'loaded' && (
                                <button onClick={(e) => onMenuAction(e, () => onUpdateLogo?.(channel.name, currentSrc))} className="w-full px-3 py-2 text-left text-xs text-white hover:bg-slate-700 flex items-center gap-2 transition-colors">
                                    <Save className="w-3 h-3 text-primary" />
                                    Save Detected Logo
                                </button>
                            )}

                            <button onClick={(e) => onMenuAction(e, () => {
                                const url = window.prompt('Enter custom logo URL:', customLogo || channel.logo || '');
                                if (url) onUpdateLogo?.(channel.name, url);
                            })} className="w-full px-3 py-2 text-left text-xs text-white hover:bg-slate-700 flex items-center gap-2 transition-colors">
                                <Upload className="w-3 h-3 text-blue-400" />
                                Custom Logo URL
                            </button>

                            {customLogo && (
                                <button onClick={(e) => onMenuAction(e, () => onUpdateLogo?.(channel.name, null))} className="w-full px-3 py-2 text-left text-xs text-white hover:bg-slate-700 flex items-center gap-2 transition-colors">
                                    <RotateCcw className="w-3 h-3 text-amber-400" />
                                    Restore Default
                                </button>
                            )}

                            {(customLogo || channel.logo || currentSrcIndex > 0) && (
                                <button onClick={(e) => onMenuAction(e, () => onUpdateLogo?.(channel.name, 'none'))} className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-slate-700 flex items-center gap-2 transition-colors border-t border-slate-700">
                                    <Trash2 className="w-3 h-3" />
                                    Remove Logo
                                </button>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
