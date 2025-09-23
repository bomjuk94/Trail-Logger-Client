export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';
export type User = { id: string } | null;
export type Ctx = {
    status: AuthStatus;
    user: User;
    signIn(email?: string, password?: string): Promise<void>;
    register(email?: string, password?: string): Promise<void>;
    signOut(): Promise<void>;
};
export interface SignInProps {
    userName: string
    password: string
    setUserName: React.Dispatch<React.SetStateAction<string>>
    setPassword: React.Dispatch<React.SetStateAction<string>>
}