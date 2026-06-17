export interface IRegisterUser {
    name: string;
    lastName: string;
    phone: string;
    email: string;
    password: string;
    avatarUrl?: File | null;
}