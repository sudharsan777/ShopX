import React, { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { tokenStorage } from '@/app/service/tokenStorage';

type Session = {
  accessToken: string | null;
  restoring: boolean;
  setAccessToken: (token: string) => void;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const token = await tokenStorage.getAccessToken();
        if (active) setAccessToken(token);
      } catch {
        if (active) setAccessToken(null);
      } finally {
        if (active) setRestoring(false);
      }
    }

    void restoreSession();
    return () => { active = false; };
  }, []);

  const signOut = async () => {
    await tokenStorage.clearTokens();
    setAccessToken(null);
  };

  return (
    <SessionContext.Provider value={{ accessToken, restoring, setAccessToken, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('SessionProvider is required');
  return session;
}
