export interface IUserBody {
  username: string;
  email: string;
  password: string;
  user_type: "individual" | "business"; // New field for user type
  company_name?: string; // Optional for business users
  company_email?: string; // Optional for business users
  plan_type?: string; // Optional, defaults to SMAAPI_FREE
  first_name?: string; // Optional
  last_name?: string; // Optional
  phone_number?: string; // Optional
  avatar_url?: string; // Optional
  bio?: string; // Optional
}

export interface IUserUpdateBody {
  username?: string;
  email?: string;
  password?: string;
  user_type?: "individual" | "business"; // New field for user type
  company_name?: string; // Optional for business users
  company_email?: string; // Optional for business users
  plan_type?: string | "SMAAPI_FREE" | "SMAAPI_PRO" | "SMAAPI_ENTERPRISE"; // Optional, defaults to SMAAPI_FREE
  first_name?: string; // Optional
  last_name?: string; // Optional
  phone_number?: string; // Optional
  avatar_url?: string; // Optional
  bio?: string; // Optional
}

export interface IUserReply {
  user_id: number;
  username: string;
  email: string;
  user_type: "individual" | "business";
  company_name?: string | null;
  company_email?: string | null;
  plan_type: "SMAAPI_FREE" | "SMAAPI_PRO" | "SMAAPI_ENTERPRISE";
  plan_expires_at?: Date | string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone_number?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  is_verified: boolean;
  is_active: boolean;
  created_at: Date | string;
  last_login_at?: string | null;
}

export interface ILoginReply {
  user_id: number;
  username: string;
  email: string;
  token: string;
}

export interface IChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}
