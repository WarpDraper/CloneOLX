export interface IUserLogin {
    email: string;
    password: string;
    recapthcaToken: string; // саме "thca"
    action: string;
}