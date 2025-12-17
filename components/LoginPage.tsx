// import React, { useEffect, useState } from 'react';
// import { User } from '../types';
// import { clsx } from 'clsx';
// import { twMerge } from 'tailwind-merge';
// import { ArrowRight, Zap, Settings, Save, AlertCircle, Copy, Info, Lock } from 'lucide-react';
// import { saveUserToken } from '../services/gmailSyncService';
// import { exchangeCodeForToken, fetchUserProfile } from '../services/authService';

// declare global {
//   interface Window {
//     google: any;
//   }
// }

// interface LoginPageProps {
//   onLogin: (user: User) => void;
// }

// function cn(...inputs: (string | undefined | null | false)[]) {
//   return twMerge(clsx(inputs));
// }

// // Helper to get Env Vars (Vite or Process)
// const getEnvVar = (key: string): string | undefined => {
//   try {
//     // @ts-ignore
//     if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
//       // @ts-ignore
//       return import.meta.env[key];
//     }
//   } catch (e) {}
//   try {
//     if (typeof process !== 'undefined' && process.env && process.env[key]) {
//       return process.env[key];
//     }
//   } catch (e) {}
//   return undefined;
// };

// const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
//   const [error, setError] = useState<string | null>(null);
//   const [manualId, setManualId] = useState('');
//   const [manualSecret, setManualSecret] = useState('');
//   const [origin, setOrigin] = useState('');
//   const [isLoading, setIsLoading] = useState(false);

//   useEffect(() => {
//     if (typeof window !== 'undefined') {
//         setOrigin(window.location.origin);
//     }
//   }, []);

//   // Priority: Env -> LocalStorage (Fallback only if Env is missing)
//   const envClientId = getEnvVar('VITE_GOOGLE_CLIENT_ID') || getEnvVar('GOOGLE_CLIENT_ID');
//   const envClientSecret = getEnvVar('VITE_GOOGLE_CLIENT_SECRET') || getEnvVar('GOOGLE_CLIENT_SECRET');

//   const [clientId, setClientId] = useState<string | null>(envClientId || localStorage.getItem('hypermail_google_client_id') || null);
//   const [clientSecret, setClientSecret] = useState<string | null>(envClientSecret || localStorage.getItem('hypermail_google_client_secret') || null);

//   const isUsingEnv = !!(envClientId && envClientSecret);

//   // OAuth 2.0 Authorization Code Flow
//   const handleGoogleLogin = () => {
//     if (!window.google || !clientId || !clientSecret) {
//       setError("Configuration missing. Client ID and Secret are required.");
//       return;
//     }

//     try {
//         const client = window.google.accounts.oauth2.initCodeClient({
//           client_id: clientId,
//           scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send profile email',
//           ux_mode: 'popup',
//           callback: async (response: any) => {
//             if (response.code) {
//                setIsLoading(true);
//                try {
//                    // Exchange code for tokens (Access + Refresh)
//                    const tokens = await exchangeCodeForToken(clientId, clientSecret, response.code, origin);
                   
//                    // Fetch Profile
//                    const profile = await fetchUserProfile(tokens.access_token);
                   
//                    const user: User = {
//                        id: profile.sub,
//                        name: profile.name,
//                        email: profile.email,
//                        accessToken: tokens.access_token,
//                        refreshToken: tokens.refresh_token,
//                        expiresAt: Date.now() + (tokens.expires_in * 1000),
//                        clientId: clientId, 
//                        clientSecret: clientSecret
//                    };

//                    // 1. Persist tokens to local storage (Requested fallback)
//                    // We keep Access/Refresh tokens in LS for reliability if Supabase fails.
//                    const userForStorage = { ...user };
//                    // SECURITY: Do NOT store Client Secret in LocalStorage
//                    delete userForStorage.clientSecret; 
//                    delete userForStorage.clientId;
                   
//                    localStorage.setItem('hypermail_user', JSON.stringify(userForStorage));

//                    // 2. Persist Tokens to Supabase (Secure Store Backup)
//                    try {
//                        await saveUserToken(
//                            user.email, 
//                            user.accessToken!, 
//                            user.id, 
//                            user.refreshToken, 
//                            user.expiresAt
//                        );
//                    } catch (dbErr) {
//                        console.warn("Failed to backup token to Supabase, continuing with LocalStorage only.", dbErr);
//                    }

//                    onLogin(user);

//                } catch (err: any) {
//                    console.error("Token Exchange Error:", err);
//                    setError(err.message || "Failed to exchange authorization code.");
//                } finally {
//                    setIsLoading(false);
//                }
//             } else {
//                 setError("Login cancelled or failed to get authorization code.");
//             }
//           },
//         });
//         client.requestCode();
//     } catch (err) {
//         console.error("Auth Error:", err);
//         setError("Error initializing Google Auth.");
//     }
//   };

//   const handleSaveConfig = () => {
//       if (manualId.trim() && manualSecret.trim()) {
//           // Only save to LS if user manually enters them (no Env available)
//           localStorage.setItem('hypermail_google_client_id', manualId.trim());
//           localStorage.setItem('hypermail_google_client_secret', manualSecret.trim());
//           setClientId(manualId.trim());
//           setClientSecret(manualSecret.trim());
//           setError(null);
//       } else {
//           setError("Both Client ID and Secret are required.");
//       }
//   };

//   const handleResetConfig = () => {
//       localStorage.removeItem('hypermail_google_client_id');
//       localStorage.removeItem('hypermail_google_client_secret');
//       setClientId(null);
//       setClientSecret(null);
//       setManualId('');
//       setManualSecret('');
//   };

//   const handleDemoLogin = () => {
//     const demoUser: User = {
//       id: 'demo-user',
//       name: 'Elon Musk',
//       email: 'elon@tesla.com',
//       accessToken: 'mock_token',
//       expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
//     };
//     // Persist demo user so refresh works
//     localStorage.setItem('hypermail_user', JSON.stringify(demoUser));
//     onLogin(demoUser);
//   };

//   const copyOrigin = () => {
//       navigator.clipboard.writeText(origin);
//       alert(`Copied ${origin} to clipboard!`);
//   };

//   return (
//     <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground overflow-hidden relative">
//       {/* Abstract Background */}
//       <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
//           <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/30 rounded-full blur-[120px]"></div>
//           <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px]"></div>
//       </div>

//       <div className="w-full max-w-md p-8 rounded-xl border border-border bg-card/50 backdrop-blur-xl shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-500">
//         <div className="text-center mb-8">
//           <div className="w-12 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
//              <span className="font-bold text-xl">H</span>
//           </div>
//           <h1 className="text-2xl font-bold tracking-tight mb-2">Welcome to Hypermail</h1>
//           <p className="text-muted-foreground text-sm">Experience the fastest email client ever made.</p>
//         </div>

//         <div className="space-y-4 flex flex-col items-center">
          
//           {clientId && clientSecret ? (
//             <div className="w-full space-y-4">
//                  <button 
//                     onClick={handleGoogleLogin}
//                     disabled={isLoading}
//                     className="w-full flex items-center justify-center space-x-3 bg-white text-black border border-gray-300 hover:bg-gray-50 py-2.5 rounded-md font-medium transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
//                 >
//                     {isLoading ? (
//                         <span>Authenticating...</span>
//                     ) : (
//                         <>
//                             <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
//                             <span>Sign in with Google</span>
//                         </>
//                     )}
//                 </button>

//                 {!isUsingEnv && (
//                     <div>
//                         {/* <div className="flex items-start space-x-2">
//                             <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
//                             <div className="text-xs text-muted-foreground">
//                                 <p className="font-medium text-foreground mb-1">Configuration Help</p>
//                                 <p className="mb-2">Ensure your Google Cloud Project is set to <strong>Web Application</strong> and includes this origin:</p>
//                                 <div 
//                                     onClick={copyOrigin}
//                                     className="bg-background border border-border rounded px-2 py-1.5 font-mono text-[10px] text-foreground flex items-center justify-between cursor-pointer hover:border-primary/50 transition-colors group"
//                                 >
//                                     <span className="truncate">{origin}</span>
//                                     <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100" />
//                                 </div>
//                             </div>
//                         </div> */}
//                     </div>
//                 )}
//             </div>
//           ) : (
//              <div className="w-full space-y-3">
//                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-yellow-500 text-xs text-center">
//                     Google Client Configuration Required
//                  </div>
                 
//                  <div className="space-y-2">
//                      <input 
//                         className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
//                         placeholder="Client ID (e.g., 123...apps.googleusercontent.com)"
//                         value={manualId}
//                         onChange={(e) => setManualId(e.target.value)}
//                      />
//                      <div className="relative">
//                         <input 
//                             className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary pr-8"
//                             placeholder="Client Secret (e.g., GOCSPX-...)"
//                             type="password"
//                             value={manualSecret}
//                             onChange={(e) => setManualSecret(e.target.value)}
//                         />
//                         <Lock className="w-4 h-4 text-muted-foreground absolute right-2 top-2.5 opacity-50" />
//                      </div>
//                      <button 
//                         onClick={handleSaveConfig}
//                         className="w-full bg-primary text-primary-foreground px-3 py-2 rounded-md hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
//                      >
//                         <Save className="w-4 h-4" />
//                         <span>Save Configuration</span>
//                      </button>
//                  </div>
//                  <p className="text-[10px] text-muted-foreground text-center">
//                     Stored locally. Required for Refresh Tokens (Offline Access).
//                  </p>
//              </div>
//           )}

//           <div className="w-full flex items-center space-x-2 pt-2">
//                <button 
//                 onClick={handleDemoLogin}
//                 className={cn(
//                     "flex-1 flex items-center justify-center space-x-2 bg-secondary text-secondary-foreground py-2.5 rounded-md font-medium transition-all hover:bg-secondary/80",
//                 )}
//               >
//                 <span>Enter Demo</span>
//                 <ArrowRight className="w-4 h-4" />
//               </button>
//           </div>
            
//           {/* Only show Reset if manual config was used/stored */}
//           {(!isUsingEnv && (clientId || clientSecret)) && (
//               <button 
//                 onClick={handleResetConfig}
//                 className="text-[10px] text-muted-foreground hover:text-foreground flex items-center space-x-1"
//               >
//                   <Settings className="w-3 h-3" />
//                   <span>Reset Configuration</span>
//               </button>
//           )}

//           {error && (
//             <div className="w-full bg-destructive/10 border border-destructive/20 rounded-md p-3 text-destructive text-xs flex items-center space-x-2">
//                 <AlertCircle className="w-4 h-4" />
//                 <span>{error}</span>
//             </div>
//           )}
//         </div>

//         <div className="mt-8 pt-6 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
//             <div className="flex items-center space-x-1">
//                 <Zap className="w-3 h-3" />
//                 <span>Powered by Gemini 2.5</span>
//             </div>
//             <div>v1.1.0</div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default LoginPage;

import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ArrowRight, Zap, Settings, Save, AlertCircle, Copy, Info, Lock } from 'lucide-react';
import { saveUserToken } from '../services/gmailSyncService';
import { fetchUserProfile } from '../services/authService';

declare global {
  interface Window {
    google: any;
  }
}

interface LoginPageProps {
  onLogin: (user: User) => void;
}

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// Helper to get Env Vars (Vite or Process)
const getEnvVar = (key: string): string | undefined => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {}
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {}
  return undefined;
};

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [error, setError] = useState<string | null>(null);
  const [manualId, setManualId] = useState('');
  const [manualSecret, setManualSecret] = useState('');
  const [origin, setOrigin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        setOrigin(window.location.origin);
    }
  }, []);

  // Priority: Env -> LocalStorage (Fallback only if Env is missing)
  const envClientId = getEnvVar('VITE_GOOGLE_CLIENT_ID') || getEnvVar('GOOGLE_CLIENT_ID');
  // Secret is optional for Implicit Flow
  const envClientSecret = getEnvVar('VITE_GOOGLE_CLIENT_SECRET') || getEnvVar('GOOGLE_CLIENT_SECRET');

  const [clientId, setClientId] = useState<string | null>(envClientId || localStorage.getItem('hypermail_google_client_id') || null);
  const [clientSecret, setClientSecret] = useState<string | null>(envClientSecret || localStorage.getItem('hypermail_google_client_secret') || null);

  const isUsingEnv = !!envClientId;

  // OAuth 2.0 Implicit Flow (Token Client)
  // This removes the need for "offline access" scope and Client Secret exchange.
  const handleGoogleLogin = () => {
    if (!window.google || !clientId) {
      setError("Configuration missing. Client ID is required.");
      return;
    }

    try {
        // Use initTokenClient for Implicit Flow (No refresh token, no secret needed)
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send profile email',
          callback: async (response: any) => {
            if (response.access_token) {
               setIsLoading(true);
               try {
                   // Direct access token usage
                   const accessToken = response.access_token;
                   const expiresIn = response.expires_in; // seconds
                   
                   // Fetch Profile
                   const profile = await fetchUserProfile(accessToken);
                   
                   const user: User = {
                       id: profile.sub,
                       name: profile.name,
                       email: profile.email,
                       accessToken: accessToken,
                       // No refresh token in implicit flow
                       refreshToken: undefined,
                       expiresAt: Date.now() + (expiresIn * 1000),
                       clientId: clientId, 
                       clientSecret: clientSecret || undefined
                   };

                   // 1. Persist tokens to local storage
                   const userForStorage = { ...user };
                   delete userForStorage.clientSecret; 
                   delete userForStorage.clientId;
                   
                   localStorage.setItem('hypermail_user', JSON.stringify(userForStorage));

                   // 2. Persist Tokens to Supabase (Secure Store Backup)
                   try {
                       await saveUserToken(
                           user.email, 
                           user.accessToken!, 
                           user.id, 
                           undefined, // No refresh token
                           user.expiresAt
                       );
                   } catch (dbErr) {
                       console.warn("Failed to backup token to Supabase, continuing with LocalStorage only.", dbErr);
                   }

                   onLogin(user);

               } catch (err: any) {
                   console.error("Profile Fetch Error:", err);
                   setError(err.message || "Failed to fetch user profile.");
               } finally {
                   setIsLoading(false);
               }
            } else {
                setError("Login cancelled or failed to get access token.");
            }
          },
        });
        // Request Access Token directly
        client.requestAccessToken();
    } catch (err) {
        console.error("Auth Error:", err);
        setError("Error initializing Google Auth.");
    }
  };

  const handleSaveConfig = () => {
      if (manualId.trim()) {
          localStorage.setItem('hypermail_google_client_id', manualId.trim());
          setClientId(manualId.trim());
          
          if (manualSecret.trim()) {
            localStorage.setItem('hypermail_google_client_secret', manualSecret.trim());
            setClientSecret(manualSecret.trim());
          }
          
          setError(null);
      } else {
          setError("Client ID is required.");
      }
  };

  const handleResetConfig = () => {
      localStorage.removeItem('hypermail_google_client_id');
      localStorage.removeItem('hypermail_google_client_secret');
      setClientId(null);
      setClientSecret(null);
      setManualId('');
      setManualSecret('');
  };

  const handleDemoLogin = () => {
    const demoUser: User = {
      id: 'demo-user',
      name: 'Elon Musk',
      email: 'elon@tesla.com',
      accessToken: 'mock_token',
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    // Persist demo user so refresh works
    localStorage.setItem('hypermail_user', JSON.stringify(demoUser));
    onLogin(demoUser);
  };

  const copyOrigin = () => {
      navigator.clipboard.writeText(origin);
      alert(`Copied ${origin} to clipboard!`);
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground overflow-hidden relative">
      {/* Abstract Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/30 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md p-8 rounded-xl border border-border bg-card/50 backdrop-blur-xl shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
             <span className="font-bold text-xl">H</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Welcome to Hypermail</h1>
          <p className="text-muted-foreground text-sm">Experience the fastest email client ever made.</p>
        </div>

        <div className="space-y-4 flex flex-col items-center">
          
          {clientId ? (
            <div className="w-full space-y-4">
                 <button 
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center space-x-3 bg-white text-black border border-gray-300 hover:bg-gray-50 py-2.5 rounded-md font-medium transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <span>Authenticating...</span>
                    ) : (
                        <>
                            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                            <span>Sign in with Google</span>
                        </>
                    )}
                </button>

                {!isUsingEnv && (
                    <div className="rounded-md bg-muted/30 border border-border p-3">
                        <div className="flex items-start space-x-2">
                            <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                            <div className="text-xs text-muted-foreground">
                                <p className="font-medium text-foreground mb-1">Configuration Help</p>
                                <p className="mb-2">Ensure your Google Cloud Project is set to <strong>Web Application</strong> and includes this origin:</p>
                                <div 
                                    onClick={copyOrigin}
                                    className="bg-background border border-border rounded px-2 py-1.5 font-mono text-[10px] text-foreground flex items-center justify-between cursor-pointer hover:border-primary/50 transition-colors group"
                                >
                                    <span className="truncate">{origin}</span>
                                    <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
          ) : (
             <div className="w-full space-y-3">
                 <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-yellow-500 text-xs text-center">
                    Google Client Configuration Required
                 </div>
                 
                 <div className="space-y-2">
                     <input 
                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Client ID (e.g., 123...apps.googleusercontent.com)"
                        value={manualId}
                        onChange={(e) => setManualId(e.target.value)}
                     />
                     <div className="relative opacity-50 hover:opacity-100 transition-opacity">
                        <input 
                            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary pr-8"
                            placeholder="Client Secret (Optional)"
                            type="password"
                            value={manualSecret}
                            onChange={(e) => setManualSecret(e.target.value)}
                        />
                        <Lock className="w-4 h-4 text-muted-foreground absolute right-2 top-2.5 opacity-50" />
                     </div>
                     <button 
                        onClick={handleSaveConfig}
                        className="w-full bg-primary text-primary-foreground px-3 py-2 rounded-md hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
                     >
                        <Save className="w-4 h-4" />
                        <span>Save Configuration</span>
                     </button>
                 </div>
                 <p className="text-[10px] text-muted-foreground text-center">
                    Stored locally.
                 </p>
             </div>
          )}

          <div className="w-full flex items-center space-x-2 pt-2">
               <button 
                onClick={handleDemoLogin}
                className={cn(
                    "flex-1 flex items-center justify-center space-x-2 bg-secondary text-secondary-foreground py-2.5 rounded-md font-medium transition-all hover:bg-secondary/80",
                )}
              >
                <span>Enter Demo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
          </div>
            
          {/* Only show Reset if manual config was used/stored */}
          {(!isUsingEnv && (clientId || clientSecret)) && (
              <button 
                onClick={handleResetConfig}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center space-x-1"
              >
                  <Settings className="w-3 h-3" />
                  <span>Reset Configuration</span>
              </button>
          )}

          {error && (
            <div className="w-full bg-destructive/10 border border-destructive/20 rounded-md p-3 text-destructive text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
                <Zap className="w-3 h-3" />
                <span>Powered by Gemini 2.5</span>
            </div>
            <div>v1.1.1 (Implicit)</div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;