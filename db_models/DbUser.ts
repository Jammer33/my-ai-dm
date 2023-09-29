import { AccountStatus } from "../models/General";

export interface DbUser {
    id: number;
    user_token: string;
    username: string;
    email: string;
    password: string;
    is_email_verified: boolean;
    account_status: AccountStatus;
    last_login_at: Date;
    created_at: Date;
    updated_at: Date;
}