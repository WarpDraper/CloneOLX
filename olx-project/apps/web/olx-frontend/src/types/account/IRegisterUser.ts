export interface IRegisterUser {
    Email: string;
    Password: string;
    PasswordConfirmation: string;
    FirstName: string;
    LastName: string;
    ImageFile?: File | null;
    WebSite: string;
    About: string;
    PhoneNumber: string;
    SettlementRef: string;
    RecapthcaToken: string;
    Action: string;
    TermsAccepted: boolean;
}


