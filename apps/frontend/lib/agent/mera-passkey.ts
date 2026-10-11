/**
 * Mera Passkey & WebAuthn PRF (Pseudo-Random Function) Key Derivation for Monad
 * 
 * Implements "One Passkey, Many Keys":
 * 1. Seedless, extensionless biometric login via Mera Passkey (P256).
 * 2. WebAuthn PRF extension derives a deterministic, high-entropy 32-byte master seed.
 * 3. Deterministically derives:
 *    - Monad EOA Wallet (address & private key)
 *    - Scoped Autonomous Trading Session Key (with max allowance & expiry for Kuru/Perpl HFT)
 *    - Client-Side Walrus Memory Encryption Key (for zero-knowledge private trade history)
 *    - ERC-8004 Agent Sub-Delegation Key
 * 4. Automatic Monad identity generation (name, username)
 */

import { keccak256, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export interface MeraDerivedKeys {
  tradingSessionPrivateKey: `0x${string}`;
  walrusMemoryEncryptionKey: string;
  agentDelegationKey: `0x${string}`;
  createdAt: number;
  expiresAt: number;
  maxTradeAllowanceAUSD: number;
}

export interface MonadWalletAccount {
  address: `0x${string}`;
  privateKey: `0x${string}`;
}

export interface MonadIdentity {
  name: string;
  username: string;
}

// Base64URL Encoding / Decoding utilities
export function bufferToBase64URL(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let str = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function base64URLToBuffer(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Deterministically derives an EVM Monad wallet account from a high-entropy seed.
 */
export function deriveMonadWalletFromSeed(masterSeed: string | Uint8Array): MonadWalletAccount {
  const seedBytes = typeof masterSeed === "string" ? Buffer.from(masterSeed) : Buffer.from(masterSeed);
  const walletKeySeed = `${toHex(seedBytes)}_MONAD_EOA_WALLET_V1`;
  const privateKey = keccak256(Buffer.from(walletKeySeed)) as `0x${string}`;
  const account = privateKeyToAccount(privateKey);
  return {
    address: account.address,
    privateKey,
  };
}

/**
 * Generates unique user identity credentials.
 */
export function generateMonadIdentity(): MonadIdentity {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return {
    name: `User #${randomNum}`,
    username: `user_${randomNum}`,
  };
}

/**
 * Derives scoped sub-keys from a WebAuthn PRF output without exposing the passkey master credential.
 */
export async function deriveScopedKeysFromPRF(
  prfSecretBytes: Uint8Array,
  sessionDurationHours: number = 24,
  maxAllowanceAUSD: number = 500
): Promise<MeraDerivedKeys> {
  const prfHex = toHex(prfSecretBytes);

  // 1. Scoped Trading Session Key (Used for sub-second zero-popup signing on Monad)
  const tradingKeySeed = `${prfHex}_MONAD_TRADING_SESSION_KEY_V1`;
  const tradingSessionPrivateKey = keccak256(Buffer.from(tradingKeySeed)) as `0x${string}`;

  // 2. Walrus Memory Encryption Key (Used for encrypting trade strategies & private notes)
  const memoryKeySeed = `${prfHex}_WALRUS_ENCRYPTION_KEY_V1`;
  const walrusMemoryEncryptionKey = keccak256(Buffer.from(memoryKeySeed)).slice(2, 34); // 16 bytes hex for AES/ChaCha

  // 3. ERC-8004 Agent Delegation Key
  const agentKeySeed = `${prfHex}_ERC8004_AGENT_DELEGATE_V1`;
  const agentDelegationKey = keccak256(Buffer.from(agentKeySeed)) as `0x${string}`;

  const now = Date.now();
  const expiresAt = now + sessionDurationHours * 60 * 60 * 1000;

  return {
    tradingSessionPrivateKey,
    walrusMemoryEncryptionKey,
    agentDelegationKey,
    createdAt: now,
    expiresAt,
    maxTradeAllowanceAUSD: maxAllowanceAUSD,
  };
}

/**
 * Validates whether an active Mera session key has remaining allowance and has not expired.
 */
export function isSessionKeyValid(
  session: MeraDerivedKeys,
  requestedAmountAUSD: number
): { valid: boolean; reason?: string } {
  if (Date.now() > session.expiresAt) {
    return { valid: false, reason: "Mera session key has expired. Please authenticate with biometric passkey." };
  }
  if (requestedAmountAUSD > session.maxTradeAllowanceAUSD) {
    return {
      valid: false,
      reason: `Trade amount ($${requestedAmountAUSD} AUSD) exceeds Mera session allowance ($${session.maxTradeAllowanceAUSD} AUSD). Explicit passkey confirmation required.`,
    };
  }
  return { valid: true };
}

/**
 * Checks if WebAuthn / Passkeys are supported by the client browser.
 */
export function isWebAuthnSupported(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

/**
 * Detects if an error from WebAuthn was caused by user cancellation or timeout.
 * W3C WebAuthn throws a DOMException named 'NotAllowedError' or 'AbortError'
 * with message 'The operation either timed out or was not allowed'.
 */
export function isPasskeyCancellation(err: any): boolean {
  if (!err) return false;
  const name = err.name || "";
  const message = (err.message || "").toLowerCase();
  return (
    name === "NotAllowedError" ||
    name === "AbortError" ||
    message.includes("timed out or was not allowed") ||
    message.includes("cancelled") ||
    message.includes("canceled") ||
    message.includes("abort") ||
    message.includes("user denied") ||
    message.includes("not allowed")
  );
}

export interface MeraRegistrationResult {
  credentialId: string;
  publicKey: string;
  email?: string;
  name: string;
  username: string;
  deviceName: string;
  transports: string[];
  prfSupported: boolean;
  rawResponse: {
    clientDataJSON: string;
    attestationObject: string;
  };
}

/**
 * Client-Side Passkey Registration Ceremony.
 */
export async function createMeraPasskey(options: {
  challenge: string;
  email?: string;
  userId?: string;
  name?: string;
  username?: string;
  deviceName?: string;
}): Promise<MeraRegistrationResult> {
  if (!isWebAuthnSupported()) {
    throw new Error("Passkeys are not supported on this browser or device.");
  }

  const userEmail = options.email?.trim() || "";
  const displayName = options.name?.trim() || userEmail || "User";
  const accountIdentifier = userEmail || options.username?.trim() || options.name?.trim() || generateMonadIdentity().username;

  const challengeBuffer = base64URLToBuffer(options.challenge);
  // User ID buffer for WebAuthn (max 64 bytes)
  const idToEncode = options.userId || userEmail || accountIdentifier;
  const userIdBuffer = new TextEncoder().encode(idToEncode.slice(0, 64));

  // WebAuthn creation options with PRF extension
  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
    challenge: challengeBuffer as any,
    rp: {
      name: "Barzakh AI",
      id: window.location.hostname,
    },
    user: {
      id: userIdBuffer,
      name: accountIdentifier, // Email address displayed by Windows Security / Touch ID
      displayName: displayName,
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" },   // ES256
      { alg: -257, type: "public-key" }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform", // Face ID, Touch ID, Windows Hello
      userVerification: "preferred",
      residentKey: "preferred",
    },
    timeout: 60000,
    attestation: "none",
    extensions: {
      prf: {
        eval: {
          first: new Uint8Array(32), // Request deterministic PRF evaluation
        },
      },
    } as any,
  };

  const credential = (await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions,
  })) as PublicKeyCredential;

  if (!credential) {
    throw new Error("Passkey creation was cancelled or returned empty.");
  }

  const rawId = bufferToBase64URL(credential.rawId);
  const response = credential.response as AuthenticatorAttestationResponse;

  const clientDataJSON = bufferToBase64URL(response.clientDataJSON);
  const attestationObject = bufferToBase64URL(response.attestationObject);

  // Check if PRF extension succeeded
  let prfSupported = false;

  try {
    const extResults = credential.getClientExtensionResults() as any;
    if (extResults?.prf?.results?.first) {
      prfSupported = true;
    }
  } catch (e) {
    console.debug("[Passkey] PRF extension not available:", e);
  }

  // Detect device name
  const userAgent = navigator.userAgent;
  let deviceName = options.deviceName || "Passkey";
  if (!options.deviceName) {
    if (/iPhone|iPad|iPod/.test(userAgent)) deviceName = "Apple Face/Touch ID";
    else if (/Macintosh/.test(userAgent)) deviceName = "Mac Touch ID";
    else if (/Windows/.test(userAgent)) deviceName = "Windows Hello";
    else if (/Android/.test(userAgent)) deviceName = "Android Biometrics";
  }

  const transports = (response.getTransports ? response.getTransports() : []) as string[];

  return {
    credentialId: rawId,
    publicKey: attestationObject, // Transmitted for server verification
    email: userEmail || undefined,
    name: displayName,
    username: accountIdentifier,
    deviceName,
    transports,
    prfSupported,
    rawResponse: {
      clientDataJSON,
      attestationObject,
    },
  };
}

export interface MeraAuthenticationResult {
  credentialId: string;
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
  userHandle?: string;
  prfSecretHex?: string;
}

/**
 * Checks if WebAuthn conditional mediation (autofill) is supported.
 */
export async function isConditionalMediationSupported(): Promise<boolean> {
  return (
    typeof window !== "undefined" &&
    !!window.PublicKeyCredential &&
    !!PublicKeyCredential.isConditionalMediationAvailable &&
    (await PublicKeyCredential.isConditionalMediationAvailable())
  );
}

/**
 * Client-Side Mera Passkey Authentication Ceremony.
 */
export async function authenticateWithMeraPasskey(options: {
  challenge: string;
  allowCredentials?: Array<{ id: string; transports?: string[] }>;
  mediation?: CredentialMediationRequirement;
  signal?: AbortSignal;
}): Promise<MeraAuthenticationResult> {
  if (!isWebAuthnSupported()) {
    throw new Error("WebAuthn / Biometric Passkeys are not supported on this browser or device.");
  }

  const challengeBuffer = base64URLToBuffer(options.challenge);

  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge: challengeBuffer as any,
    rpId: window.location.hostname,
    userVerification: "preferred",
    timeout: 60000,
    allowCredentials: options.allowCredentials?.map((c) => ({
      id: base64URLToBuffer(c.id) as any,
      type: "public-key",
      transports: c.transports as any,
    })),
    extensions: {
      prf: {
        eval: {
          first: new Uint8Array(32),
        },
      },
    } as any,
  };

  const getOptions: CredentialRequestOptions = {
    publicKey: publicKeyCredentialRequestOptions,
  };

  if (options.mediation) {
    getOptions.mediation = options.mediation;
  }
  if (options.signal) {
    getOptions.signal = options.signal;
  }

  const assertion = (await navigator.credentials.get(getOptions)) as PublicKeyCredential;

  if (!assertion) {
    throw new Error("Passkey authentication was cancelled or returned empty.");
  }

  const rawId = bufferToBase64URL(assertion.rawId);
  const response = assertion.response as AuthenticatorAssertionResponse;

  let prfSecretHex: string | undefined;
  try {
    const extResults = assertion.getClientExtensionResults() as any;
    if (extResults?.prf?.results?.first) {
      prfSecretHex = toHex(new Uint8Array(extResults.prf.results.first));
    }
  } catch (e) {
    console.debug("[Mera Passkey] PRF evaluation not returned during authentication");
  }

  return {
    credentialId: rawId,
    clientDataJSON: bufferToBase64URL(response.clientDataJSON),
    authenticatorData: bufferToBase64URL(response.authenticatorData),
    signature: bufferToBase64URL(response.signature),
    userHandle: response.userHandle ? bufferToBase64URL(response.userHandle) : undefined,
    prfSecretHex,
  };
}
