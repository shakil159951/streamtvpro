import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `{backendError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                      {backendError}
                    </div>
                  )}
                  {backendSuccess && (
                    <div className="p-3 bg-primary/10 border border-primary/20 text-primary text-xs rounded-xl">
                      {backendSuccess}
                    </div>
                  )}`;

const replacement1 = `{backendError && (
                    <div className="p-4 bg-gradient-to-r from-red-500/10 to-transparent border-l-4 border-red-500 text-red-400 text-sm font-medium rounded-r-xl shadow-sm flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <span>{backendError}</span>
                    </div>
                  )}
                  {backendSuccess && (
                    <div className="p-4 bg-gradient-to-r from-primary/10 to-transparent border-l-4 border-primary text-primary text-sm font-medium rounded-r-xl shadow-sm flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 shrink-0" />
                      <span>{backendSuccess}</span>
                    </div>
                  )}`;

const target2 = `{backendError && (
                          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                            {backendError}
                          </div>
                        )}
                        {backendSuccess && (
                          <div className="p-3 bg-primary/10 border border-primary/20 text-primary text-xs rounded-xl">
                            {backendSuccess}
                          </div>
                        )}`;

const replacement2 = `{backendError && (
                          <div className="p-4 bg-gradient-to-r from-red-500/10 to-transparent border-l-4 border-red-500 text-red-400 text-sm font-medium rounded-r-xl shadow-sm flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span>{backendError}</span>
                          </div>
                        )}
                        {backendSuccess && (
                          <div className="p-4 bg-gradient-to-r from-primary/10 to-transparent border-l-4 border-primary text-primary text-sm font-medium rounded-r-xl shadow-sm flex items-center gap-3">
                            <ShieldCheck className="w-5 h-5 shrink-0" />
                            <span>{backendSuccess}</span>
                          </div>
                        )}`;

if (content.includes(target1)) {
    content = content.replace(target1, replacement1);
    console.log("Patched backend 1");
}

if (content.includes(target2)) {
    content = content.replace(target2, replacement2);
    console.log("Patched backend 2");
}

fs.writeFileSync('src/App.tsx', content);

