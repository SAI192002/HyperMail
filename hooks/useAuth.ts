import { useState, useEffect } from 'react';
import { User } from '../types';
import { restoreUserSession, saveUserToken } from '../services/gmailSyncService';
import { refreshAccessToken } from '../services/authService';

// Helper to get Env Vars
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

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  useEffect(() => {
    const initSession = async () => {
        const storedUserRaw = localStorage.getItem('hypermail_user');
        if (storedUserRaw) {
            try {
                const storedUser = JSON.parse(storedUserRaw);
                
                // Allow demo user to bypass check
                if (storedUser.id === 'demo-user') {
                     setUser(storedUser);
                     setIsLoadingSession(false);
                     return;
                }

                if (storedUser.email) {
                    // Resolve Credentials for potential refresh from Env or LocalStorage (manual)
                    const clientId = storedUser.clientId || getEnvVar('VITE_GOOGLE_CLIENT_ID') || getEnvVar('GOOGLE_CLIENT_ID');
                    const clientSecret = storedUser.clientSecret || getEnvVar('VITE_GOOGLE_CLIENT_SECRET') || getEnvVar('GOOGLE_CLIENT_SECRET');
                    
                    // 1. Try Local Storage Tokens First
                    let accessToken = storedUser.accessToken;
                    let refreshToken = storedUser.refreshToken;
                    let expiresAt = storedUser.expiresAt;

                    // 2. If missing locally, try to fetch from Supabase (Backup)
                    if (!accessToken) {
                        try {
                            const sessionData = await restoreUserSession(storedUser.email);
                            if (sessionData) {
                                accessToken = sessionData.accessToken;
                                refreshToken = sessionData.refreshToken;
                                expiresAt = sessionData.expiresAt;
                            }
                        } catch (dbErr) {
                            console.warn("Could not restore session from DB", dbErr);
                        }
                    }

                    // 3. Validation & Refresh Logic
                    const now = Date.now();
                    const isValidToken = accessToken && expiresAt && now < (expiresAt - 60000); // 60s buffer
                    
                    if (isValidToken) {
                        // User is logged in validly
                         setUser({ 
                            ...storedUser, 
                            accessToken,
                            refreshToken,
                            expiresAt,
                            clientId,
                            clientSecret
                        });
                    } else if (refreshToken && clientId && clientSecret) {
                         // Token Expired: Try Refresh
                         console.log("Token expired. Refreshing...");
                         try {
                             const newTokens = await refreshAccessToken(clientId, clientSecret, refreshToken);
                             
                             accessToken = newTokens.access_token;
                             expiresAt = Date.now() + (newTokens.expires_in * 1000);
                             
                             // Save new access token back to LocalStorage (persistence)
                             const updatedUser = { 
                                ...storedUser, 
                                accessToken, 
                                refreshToken, // Keep existing refresh token
                                expiresAt
                             };
                             
                             const userForStorage = { ...updatedUser };
                             delete userForStorage.clientSecret;
                             delete userForStorage.clientId;
                             localStorage.setItem('hypermail_user', JSON.stringify(userForStorage));

                             // Save to Supabase (Backup)
                             try {
                                 await saveUserToken(
                                     storedUser.email,
                                     accessToken,
                                     storedUser.id,
                                     refreshToken,
                                     expiresAt
                                 );
                             } catch (e) {}
                             
                             setUser({ ...updatedUser, clientId, clientSecret });
                             console.log("Token refreshed successfully.");
                         } catch (refreshErr) {
                             console.error("Auto-refresh failed:", refreshErr);
                             handleLogout();
                         }
                    } else {
                        // No valid token and no way to refresh
                        console.warn("Session expired and cannot refresh.");
                        handleLogout();
                    }
                } else {
                    handleLogout();
                }
            } catch (e) {
                console.error("Failed to parse stored user", e);
                localStorage.removeItem('hypermail_user');
            }
        }
        setIsLoadingSession(false);
    };
    initSession();
  }, []);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('hypermail_user');
    setUser(null);
  };

  return {
    user,
    isLoadingSession,
    login: handleLogin,
    logout: handleLogout
  };
};