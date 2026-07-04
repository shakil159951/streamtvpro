import fs from 'fs';

let content = fs.readFileSync('src/components/Player.tsx', 'utf8');

const errorTarget = `{error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-md z-30 pointer-events-auto transition-all duration-500">
                <div className="bg-black/60 border border-white/5 p-8 rounded-3xl max-w-md w-full text-center shadow-[0_0_50px_rgba(0,0,0,0.5)] transform scale-100 animate-in fade-in zoom-in duration-300 mx-4">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3 tracking-tight">Stream Unavailable</h3>
                    <p className="text-slate-400 text-sm mb-8 leading-relaxed px-4">{error.includes('Auto-switching') ? error : 'The stream is currently offline, unsupported, or geo-blocked. Please try another channel or wait for the auto-retry.'}</p>
                    {!error.includes('Auto-switching') && (
                        <>
                        <div className="border border-white/5 bg-white/5 rounded-2xl px-6 py-4 mb-6 shadow-inner text-left">
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Tip: Try changing the <span className="text-primary font-semibold">player engine</span> from the top right corner if it's struggling to play.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <button 
                                onClick={() => { 
                                    setError(''); 
                                    setLoading(true); 
                                    setAutoEngineIndex(0); 
                                    setRetryTick(t => t + 1); 
                                }}
                                className="w-full sm:w-auto px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95 border border-white/10"
                            >
                                Try Again
                            </button>
                            <button 
                                onClick={() => setError('')}
                                className="w-full sm:w-auto px-8 py-3 bg-transparent hover:bg-white/5 text-slate-300 rounded-xl text-sm font-medium transition-colors border border-transparent"
                            >
                                Dismiss
                            </button>
                        </div>
                        </>
                    )}
                </div>
            </div>
        )}`;

const errorReplacement = `{error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/95 backdrop-blur-xl z-40 pointer-events-auto transition-all duration-500">
                <div className="bg-slate-900/60 border border-white/10 p-8 rounded-[2rem] max-w-md w-full text-center shadow-[0_0_80px_rgba(0,0,0,0.8)] transform scale-100 animate-in fade-in zoom-in duration-300 mx-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent"></div>
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20 relative">
                        <div className="absolute inset-0 rounded-full animate-ping bg-red-500/10" style={{ animationDuration: '3s' }}></div>
                        <AlertCircle className="w-10 h-10 text-red-400 relative z-10" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">{error.includes('Auto-switching') ? 'Switching Engine' : 'Playback Failed'}</h3>
                    <p className="text-slate-300 text-sm mb-6 leading-relaxed px-2 font-medium">{error.includes('Auto-switching') ? error : 'The stream is currently offline, unsupported, or geo-blocked.'}</p>
                    
                    {!error.includes('Auto-switching') && (
                        <>
                        <div className="border border-red-500/10 bg-red-500/5 rounded-2xl px-5 py-4 mb-8 shadow-inner text-left overflow-y-auto max-h-32 custom-scrollbar">
                            <p className="text-slate-400 text-xs font-mono break-words leading-relaxed">
                                {error}
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-2">
                            <button 
                                onClick={() => { 
                                    setError(''); 
                                    setLoading(true); 
                                    setAutoEngineIndex(0); 
                                    setRetryTick(t => t + 1); 
                                }}
                                className="w-full sm:w-auto px-8 py-3.5 bg-white text-black hover:bg-slate-200 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-lg"
                            >
                                Try Again
                            </button>
                            <button 
                                onClick={() => setError('')}
                                className="w-full sm:w-auto px-8 py-3.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-sm font-semibold transition-colors border border-white/10"
                            >
                                Dismiss
                            </button>
                        </div>
                        </>
                    )}
                </div>
            </div>
        )}`;

if (content.includes(errorTarget)) {
    content = content.replace(errorTarget, errorReplacement);
    console.log("Patched error overlay");
} else {
    console.log("Could not find error overlay target");
}

fs.writeFileSync('src/components/Player.tsx', content);

