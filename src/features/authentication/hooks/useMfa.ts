/**
 * HIPAA Compliance: MFA Enrollment & Verification
 * 
 * Hook that checks if the current user needs to enroll in MFA,
 * and provides functions for TOTP enrollment and verification.
 * 
 * Required by HIPAA Security Rule § 164.312(d) - Person or Entity Authentication
 * As of 2025, MFA is MANDATORY (no longer "addressable").
 */

import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useState } from 'react';

/** Roles that MUST have MFA enabled */
const MFA_REQUIRED_ROLES = ['super_admin', 'doctor'] as const;

/** Clinic roles that MUST have MFA enabled */
const MFA_REQUIRED_CLINIC_ROLES = ['owner', 'director', 'admin_staff'] as const;

export type MfaStatus = 'loading' | 'not_required' | 'needs_enrollment' | 'needs_verification' | 'verified';

export interface MfaState {
  /** Current MFA status */
  status: MfaStatus;
  /** QR code URI for TOTP enrollment (only when status is 'needs_enrollment') */
  qrCodeUri: string | null;
  /** Secret key for manual TOTP entry */
  secret: string | null;
  /** Factor ID for the enrolled TOTP factor */
  factorId: string | null;
  /** Error message if any */
  error: string | null;
  /** Start MFA enrollment (generates QR code) */
  startEnrollment: () => Promise<void>;
  /** Verify a TOTP code */
  verifyCode: (code: string) => Promise<boolean>;
  /** Check if a role requires MFA */
  isRoleRequiringMfa: (role: string | null, clinicRole?: string | null) => boolean;
}

export function useMfa(
  userRole: string | null | undefined,
  clinicRole?: string | null
): MfaState {
  const [status, setStatus] = useState<MfaStatus>('loading');
  const [qrCodeUri, setQrCodeUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isRoleRequiringMfa = useCallback((role: string | null, cRole?: string | null): boolean => {
    if (!role) return false;
    if ((MFA_REQUIRED_ROLES as readonly string[]).includes(role)) return true;
    if (cRole && (MFA_REQUIRED_CLINIC_ROLES as readonly string[]).includes(cRole)) return true;
    return false;
  }, []);

  // Check MFA status on mount
  useEffect(() => {
    const checkMfa = async () => {
      try {
        // Check if MFA is needed for this role
        if (!isRoleRequiringMfa(userRole ?? null, clinicRole)) {
          setStatus('not_required');
          return;
        }

        // Get current MFA factors
        const { data, error: mfaError } = await supabase.auth.mfa.listFactors();
        
        if (mfaError) {
          setError(mfaError.message);
          setStatus('needs_enrollment');
          return;
        }

        const totpFactors = data?.totp || [];
        const verifiedFactors = totpFactors.filter(f => f.status === 'verified');

        if (verifiedFactors.length === 0) {
          // User needs to enroll in MFA
          setStatus('needs_enrollment');
        } else {
          // Check if there's an active verified session (AAL2)
          const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          
          if (aalError) {
            setError(aalError.message);
            setStatus('needs_verification');
            return;
          }

          if (aalData?.currentLevel === 'aal2') {
            setStatus('verified');
          } else {
            setFactorId(verifiedFactors[0].id);
            setStatus('needs_verification');
          }
        }
      } catch (err) {
        setError('Error al verificar estado de MFA');
        setStatus('needs_enrollment');
      }
    };

    if (userRole) {
      checkMfa();
    }
  }, [userRole, clinicRole, isRoleRequiringMfa]);

  const startEnrollment = useCallback(async () => {
    try {
      setError(null);
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'ExpedienteDLM Authenticator',
      });

      if (enrollError) {
        setError(enrollError.message);
        return;
      }

      if (data) {
        setFactorId(data.id);
        setQrCodeUri(data.totp.uri);
        setSecret(data.totp.secret);
      }
    } catch {
      setError('Error al iniciar inscripción MFA');
    }
  }, []);

  const verifyCode = useCallback(async (code: string): Promise<boolean> => {
    try {
      setError(null);

      if (!factorId) {
        setError('No se encontró factor MFA');
        return false;
      }

      // Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) {
        setError(challengeError.message);
        return false;
      }

      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) {
        setError('Código incorrecto. Intente de nuevo.');
        return false;
      }

      setStatus('verified');
      return true;
    } catch {
      setError('Error al verificar código MFA');
      return false;
    }
  }, [factorId]);

  return {
    status,
    qrCodeUri,
    secret,
    factorId,
    error,
    startEnrollment,
    verifyCode,
    isRoleRequiringMfa,
  };
}
