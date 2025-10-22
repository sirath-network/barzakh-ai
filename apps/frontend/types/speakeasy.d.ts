declare module 'speakeasy' {
  export interface TotpOptions {
    secret: string;
    encoding?: string;
    time?: number;
    step?: number;
    window?: number;
    algorithm?: string;
    digits?: number;
  }

  export interface TotpVerifyOptions {
    secret: string;
    token: string;
    encoding?: string;
    time?: number;
    step?: number;
    window?: number;
    algorithm?: string;
    digits?: number;
  }

  export interface GenerateSecretOptions {
    name: string;
    account?: string;
    issuer?: string;
    length?: number;
    symbols?: boolean;
    qr_codes?: boolean;
    google_auth_qr?: boolean;
    otpauth_url?: boolean;
  }

  export interface GeneratedSecret {
    ascii: string;
    hex: string;
    base32: string;
    otpauth_url?: string;
    qr_code_ascii?: string;
    qr_code_hex?: string;
    qr_code_base32?: string;
    google_auth_qr?: string;
  }

  export namespace totp {
    function verify(options: TotpVerifyOptions): boolean;
  }

  export function totp(options: TotpOptions): string;
  export function totpVerify(options: TotpVerifyOptions): boolean;
  export function generateSecret(options: GenerateSecretOptions): GeneratedSecret;
  export function generateSecretASCII(length?: number, symbols?: boolean): string;
  export function time(options?: { time?: number; step?: number }): number;
}
