import fs from 'fs';

let content = fs.readFileSync('src/components/Player.tsx', 'utf8');

const loaderTarget = `{loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md z-10 pointer-events-none transition-all duration-500">
                <div className="relative flex items-center justify-center">
                   <div className="absolute inset-0 border-2 border-white/10 rounded-full w-12 h-12"></div>
                   <div className="animate-spin w-12 h-12 border-2 border-primary border-t-transparent border-l-transparent rounded-full shadow-[0_0_15px_rgba(20,184,166,0.3)]" />
                </div>
                <h3 className="mt-6 text-primary font-semibold tracking-[0.25em] uppercase text-[10px] animate-pulse">Connecting</h3>
            </div>
        )}`;

const loaderReplacement = `{loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-30 pointer-events-none transition-all duration-500">
                <div className="relative flex items-center justify-center mb-6">
                   <div className="absolute inset-0 border-[3px] border-white/5 rounded-full w-16 h-16 blur-[1px]"></div>
                   <div className="animate-spin w-16 h-16 border-[3px] border-primary border-t-transparent border-l-transparent rounded-full shadow-[0_0_20px_rgba(20,184,166,0.4)]" />
                   <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(20,184,166,0.8)]" />
                   </div>
                </div>
                <h3 className="text-white/80 font-medium tracking-[0.3em] uppercase text-xs animate-pulse">Initializing</h3>
            </div>
        )}`;

const errorTarget = `{error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20 pointer-events-auto">
                    <div className="bg-slate-900/90 border border-red-500/30 p-6 rounded-2xl max-w-sm text-center backdrop-blur-xl shadow-2xl">
                        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                        <h3 className="text-white font-semibold mb-2">Playback Error</h3>
                        <p className="text-slate-300 text-sm">{error}</p>
                        <button 
                            onClick={() => { setError(''); setLoading(true); tryNativeFirst(0); }}
                            className="mt-6 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            Retry Connection
                        </button>
                    </div>
                </div>
            )}`;

const errorReplacement = `{error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-md z-30 pointer-events-auto transition-all duration-500">
                    <div className="bg-black/60 border border-white/5 p-8 rounded-3xl max-w-md w-full text-center shadow-[0_0_50px_rgba(0,0,0,0.5)] transform scale-100 animate-in fade-in zoom-in duration-300 mx-4">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                            <AlertCircle className="w-8 h-8 text-red-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3 tracking-tight">Stream Unavailable</h3>
                        <p className="text-slate-400 text-sm mb-8 leading-relaxed px-4">{error.includes('Auto-switching') ? error : 'The stream is currently offline, unsupported, or geo-blocked. Please try another channel or wait for the auto-retry.'}</p>
                        {!error.includes('Auto-switching') && (
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                <button 
                                    onClick={() => { 
                                        setError(''); 
                                        setLoading(true); 
                                        setAutoEngineIndex(0); 
                                        if(engine === 'Auto') { setEngine('Auto') } 
                                        tryNativeFirst(0); 
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
                        )}
                    </div>
                </div>
            )}`;

if (content.includes(loaderTarget)) {
    content = content.replace(loaderTarget, loaderReplacement);
    console.log("Patched loader");
} else {
    console.log("Could not find loader target");
}

if (content.includes(errorTarget)) {
    content = content.replace(errorTarget, errorReplacement);
    console.log("Patched error");
} else {
    console.log("Could not find error target");
}

fs.writeFileSync('src/components/Player.tsx', content);

