import fs from 'fs';

let content = fs.readFileSync('src/components/Player.tsx', 'utf8');

const errorTarget = `{error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20 transition-all duration-500">
                <div className="relative flex items-center justify-center mb-8">
                    <div className="absolute w-24 h-24 border border-red-500/20 rounded-full" />
                    <div className="absolute w-16 h-16 border border-red-500/40 rounded-full" />
                    <div className="w-10 h-10 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.3)] z-10">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Playback Interrupted</h3>
                <p className="text-slate-400 mb-8 px-4 text-center max-w-md text-base">{error}</p>
                
                <div className="border border-slate-800 bg-black rounded-xl px-6 py-5 max-w-md w-[90%] mx-4 shadow-xl">
                    <p className="text-slate-400 text-sm sm:text-base text-center leading-relaxed">
                        If the video is not playing, try changing the <span className="text-[#00d2a0] font-semibold">player engine</span><br className="hidden sm:block" /> from the top right corner.
                    </p>
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
                        </>
                    )}
                </div>
            </div>
        )}`;

if (content.includes(errorTarget)) {
    content = content.replace(errorTarget, errorReplacement);
    console.log("Patched error");
} else {
    console.log("Could not find error target");
}

fs.writeFileSync('src/components/Player.tsx', content);

