import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const devFormHtml = `                  <div className="border-t border-white/5 my-4 pt-4 space-y-4">
                    <h3 className="text-xs font-bold text-primary uppercase tracking-widest">Developer Profile</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Image URL</label>
                        <input type="text" value={devConfig?.photo || ''} onChange={e => setDevConfig({...devConfig, photo: e.target.value})} placeholder="https://api.dicebear.com/..." className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary/50 text-slate-200" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Developer Name</label>
                        <input type="text" value={devConfig?.name || ''} onChange={e => setDevConfig({...devConfig, name: e.target.value})} placeholder="FARABI AHMED\\nSHAKIL" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary/50 text-slate-200" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Facebook Handle</label>
                        <input type="text" value={devConfig?.facebookHandle || ''} onChange={e => setDevConfig({...devConfig, facebookHandle: e.target.value})} placeholder="farabiahmedshakil11" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary/50 text-slate-200" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Facebook URL</label>
                        <input type="text" value={devConfig?.facebookUrl || ''} onChange={e => setDevConfig({...devConfig, facebookUrl: e.target.value})} placeholder="https://www.facebook.com/..." className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary/50 text-slate-200" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Telegram Handle</label>
                        <input type="text" value={devConfig?.telegramHandle || ''} onChange={e => setDevConfig({...devConfig, telegramHandle: e.target.value})} placeholder="@farabiSH" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary/50 text-slate-200" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Telegram URL</label>
                        <input type="text" value={devConfig?.telegramUrl || ''} onChange={e => setDevConfig({...devConfig, telegramUrl: e.target.value})} placeholder="https://t.me/..." className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary/50 text-slate-200" />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                     <button 
                       onClick={() => publishConfigToFirebase()} `;

const target1 = `                  <div className="flex gap-3 pt-2">
                     <button 
                       onClick={() => publishConfigToFirebase()} `;

content = content.replace(target1, devFormHtml);

const devFormHtmlMobile = `                        <div className="border-t border-white/5 my-4 pt-4 space-y-4">
                          <h3 className="text-xs font-bold text-primary uppercase tracking-widest">Developer Profile</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">Image URL</label>
                              <input type="text" value={devConfig?.photo || ''} onChange={e => setDevConfig({...devConfig, photo: e.target.value})} placeholder="https://api.dicebear.com/..." className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary/50 text-slate-200" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">Developer Name</label>
                              <input type="text" value={devConfig?.name || ''} onChange={e => setDevConfig({...devConfig, name: e.target.value})} placeholder="FARABI AHMED\\nSHAKIL" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary/50 text-slate-200" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">Facebook Handle</label>
                              <input type="text" value={devConfig?.facebookHandle || ''} onChange={e => setDevConfig({...devConfig, facebookHandle: e.target.value})} placeholder="farabiahmedshakil11" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary/50 text-slate-200" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">Facebook URL</label>
                              <input type="text" value={devConfig?.facebookUrl || ''} onChange={e => setDevConfig({...devConfig, facebookUrl: e.target.value})} placeholder="https://www.facebook.com/..." className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary/50 text-slate-200" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">Telegram Handle</label>
                              <input type="text" value={devConfig?.telegramHandle || ''} onChange={e => setDevConfig({...devConfig, telegramHandle: e.target.value})} placeholder="@farabiSH" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary/50 text-slate-200" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">Telegram URL</label>
                              <input type="text" value={devConfig?.telegramUrl || ''} onChange={e => setDevConfig({...devConfig, telegramUrl: e.target.value})} placeholder="https://t.me/..." className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary/50 text-slate-200" />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 pt-2">
                           <button 
                             onClick={() => publishConfigToFirebase()} `;

const target2 = `                        <div className="flex flex-col gap-3 pt-2">
                           <button 
                             onClick={() => publishConfigToFirebase()} `;

content = content.replace(target2, devFormHtmlMobile);

fs.writeFileSync('src/App.tsx', content);
console.log("Patched form fields in setup tab");
