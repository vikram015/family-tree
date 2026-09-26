import { useEffect, useRef, useState } from "react";
import {
  ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { firebaseAuth } from "../../firebase";
import { ApiService } from "../../services/apiService";
import { useSmsOtpAutofill } from "../hooks/useSmsOtpAutofill";
import { OTP_LENGTH } from "../../config/otp";

/**
 * The phone + OTP sign-in flow, independent of how it's presented.
 *
 * It lived inside `LoginModal`, which meant the full-page login could only be
 * that modal in disguise. reCAPTCHA lifecycle, resend backoff and WebOTP
 * autofill are subtle enough that a second copy would drift within a release,
 * so the modal and the page now drive the same hook.
 */

const OTP_RESEND_BASE_DELAY_SECONDS = 30;
const OTP_RESEND_MAX_DELAY_SECONDS = 5 * 60;

/** Doubling backoff per send, capped — 30s, 1m, 2m, 4m, 5m, 5m… */
export function getOtpResendDelaySeconds(sendCount: number) {
  if (sendCount <= 0) {
    return 0;
  }

  return Math.min(
    OTP_RESEND_BASE_DELAY_SECONDS * 2 ** (sendCount - 1),
    OTP_RESEND_MAX_DELAY_SECONDS,
  );
}

/** "45s" / "2m 05s" — used in prose. */
export function formatCooldown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

/** "00:42" — the clock format, for a countdown sitting beside a Resend button. */
export function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

// Map raw Firebase auth error codes to friendly, user-facing copy. We never show
// the raw Firebase code/message to the user — technical details are logged to the
// console for debugging instead.
const GENERIC_SEND_ERROR =
  "We couldn't send the OTP right now. Please try again in a moment.";
const GENERIC_VERIFY_ERROR = "We couldn't verify that code. Please try again.";

function getFriendlySendOtpError(code: string): string {
  switch (code) {
    case "auth/invalid-phone-number":
    case "auth/missing-phone-number":
      return "Please enter a valid 10-digit mobile number.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a while before trying again.";
    case "auth/quota-exceeded":
      return "We're unable to send OTPs at the moment. Please try again later.";
    case "auth/captcha-check-failed":
      return "Verification failed. Please reload the page and try again.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection and try again.";
    default:
      return GENERIC_SEND_ERROR;
  }
}

function getFriendlyVerifyOtpError(code: string): string {
  switch (code) {
    case "auth/invalid-verification-code":
      return "The code you entered is incorrect. Please try again.";
    case "auth/code-expired":
      return "This code has expired. Please request a new OTP.";
    case "auth/missing-verification-code":
      return "Please enter the code we sent you.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection and try again.";
    default:
      return GENERIC_VERIFY_ERROR;
  }
}

export interface PhoneOtpAuth {
  phone: string;
  setPhone: (value: string) => void;
  otp: string;
  setOtp: (value: string) => void;
  error: string;
  successMessage: string;
  loading: boolean;
  /** True once a code has been sent — i.e. the form is on its second step. */
  awaitingCode: boolean;
  resendCooldownSeconds: number;
  handleSendOtp: (event: React.FormEvent) => Promise<void>;
  handleResendOtp: () => Promise<void>;
  handleVerifyOtp: (event: React.FormEvent) => Promise<void>;
  /** Back to number entry, tearing down the verifier. */
  changeNumber: () => void;
  /** Full reset, for closing and reopening the modal. */
  reset: () => void;
  /** Must be rendered somewhere in the tree — Firebase renders reCAPTCHA into it. */
  recaptchaContainerRef: React.RefObject<HTMLDivElement>;
}

export function usePhoneOtpAuth(onSuccess?: () => void): PhoneOtpAuth {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);
  const [otpSendCount, setOtpSendCount] = useState(0);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);

  const clearRecaptcha = () => {
    try {
      recaptchaRef.current?.clear();
    } catch {
      // Verifier may already be torn down — ignore.
    }
    recaptchaRef.current = null;
    // Firebase's clear() can leave residual grecaptcha markup in the container,
    // which makes a later render() throw "reCAPTCHA has already been rendered in
    // this element". Emptying the node guarantees a clean re-render.
    if (recaptchaContainerRef.current) {
      recaptchaContainerRef.current.innerHTML = "";
    }
  };

  const initializeRecaptcha = async () => {
    if (!recaptchaContainerRef.current) {
      throw new Error("reCAPTCHA container not ready. Please try again.");
    }

    // Firebase app-verification tokens are one-time use, so create a fresh
    // verifier for each OTP send/resend attempt.
    clearRecaptcha();

    // Render into a brand-new child element rather than the persistent
    // container. grecaptcha tracks the element it rendered into by reference, so
    // reusing the same node throws "reCAPTCHA has already been rendered in this
    // element" (e.g. after "Change mobile number"). A fresh node each time is
    // always clean.
    const host = document.createElement("div");
    recaptchaContainerRef.current.appendChild(host);

    recaptchaRef.current = new RecaptchaVerifier(firebaseAuth, host, {
      size: "invisible",
      callback: () => {},
      "expired-callback": () => {
        setError("reCAPTCHA expired. Please try again.");
        clearRecaptcha();
      },
    });

    await recaptchaRef.current.render();
  };

  useEffect(() => {
    return () => {
      clearRecaptcha();
    };
  }, []);

  useEffect(() => {
    if (resendCooldownSeconds <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setResendCooldownSeconds((currentSeconds) =>
        currentSeconds > 0 ? currentSeconds - 1 : 0,
      );
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [resendCooldownSeconds]);

  const resetOtpFlow = () => {
    setOtp("");
    setConfirmationResult(null);
    setOtpSendCount(0);
    setResendCooldownSeconds(0);
    // Tear down the verifier so returning to the number entry (e.g. "Change
    // mobile number") can render a fresh reCAPTCHA on the next send.
    clearRecaptcha();
  };

  const sendOtp = async () => {
    if (confirmationResult && resendCooldownSeconds > 0) {
      setError(
        `Please wait ${formatCooldown(resendCooldownSeconds)} before requesting another OTP.`,
      );
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      setError("Please enter a valid 10-digit mobile number");
      return false;
    }

    const fullPhoneNumber = `+91${phone}`;

    try {
      setError("");
      setSuccessMessage("");
      setLoading(true);

      await initializeRecaptcha();

      if (!recaptchaRef.current) {
        throw new Error("reCAPTCHA failed to initialize. Please try again.");
      }

      const result = await signInWithPhoneNumber(
        firebaseAuth,
        fullPhoneNumber,
        recaptchaRef.current,
      );
      setConfirmationResult(result);
      const nextSendCount = otpSendCount + 1;
      const nextCooldownSeconds = getOtpResendDelaySeconds(nextSendCount);
      setOtpSendCount(nextSendCount);
      setResendCooldownSeconds(nextCooldownSeconds);
      setSuccessMessage(
        nextSendCount === 1
          ? "OTP sent successfully."
          : `OTP resent successfully. You can request another code in ${formatCooldown(nextCooldownSeconds)}.`,
      );
      return true;
    } catch (err: any) {
      clearRecaptcha();
      const code = err?.code || "";
      const message = err?.message || "Failed to send OTP";
      // Keep detailed error visible for debugging auth misconfiguration issues.
      // eslint-disable-next-line no-console
      console.error("Phone auth send OTP failed", {
        err,
        code,
        message,
        fullPhoneNumber,
      });
      setError(getFriendlySendOtpError(code));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendOtp();
  };

  const handleResendOtp = async () => {
    await sendOtp();
  };

  const verifyOtp = async (code: string) => {
    if (!confirmationResult) {
      setError("Please request OTP first");
      return;
    }

    const trimmedCode = code.trim();
    if (trimmedCode.length < OTP_LENGTH) {
      setError(`Please enter the ${OTP_LENGTH}-digit code`);
      return;
    }

    try {
      setError("");
      setSuccessMessage("");
      setLoading(true);

      await confirmationResult.confirm(trimmedCode);

      // Record the login (best-effort — never block sign-in on this).
      try {
        await ApiService.recordLoginEvent();
      } catch (loginEventErr) {
        console.warn("Failed to record login event:", loginEventErr);
      }

      setPhone("");
      resetOtpFlow();
      onSuccess?.();
    } catch (err: any) {
      const code = err?.code || "";
      // Log technical details for debugging; show friendly copy to the user.
      // eslint-disable-next-line no-console
      console.error("Phone auth verify OTP failed", {
        err,
        code,
        message: err?.message,
      });
      setError(getFriendlyVerifyOtpError(code));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyOtp(otp);
  };

  // Auto-fetch the SMS OTP (Android Chrome via WebOTP) while the OTP step is
  // showing. Fill the field and submit automatically once the full code arrives.
  useSmsOtpAutofill(
    Boolean(confirmationResult) && !loading,
    (code) => {
      setOtp(code);
      if (code.length >= OTP_LENGTH) {
        void verifyOtp(code);
      }
    },
    OTP_LENGTH,
  );

  return {
    phone,
    setPhone,
    otp,
    setOtp,
    error,
    successMessage,
    loading,
    awaitingCode: Boolean(confirmationResult),
    resendCooldownSeconds,
    handleSendOtp,
    handleResendOtp,
    handleVerifyOtp,
    changeNumber: () => {
      resetOtpFlow();
      setSuccessMessage("");
      setError("");
    },
    reset: () => {
      clearRecaptcha();
      setPhone("");
      setError("");
      setSuccessMessage("");
      resetOtpFlow();
    },
    recaptchaContainerRef,
  };
}
