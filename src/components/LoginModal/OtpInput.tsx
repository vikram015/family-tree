import React, { useRef } from "react";
import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";
import { brand } from "../../theme/brand";

const OtpCell = styled("input")({
  flex: 1,
  minWidth: 0,
  width: "100%",
  height: 56,
  textAlign: "center",
  fontSize: 22,
  fontWeight: 700,
  color: brand.ink,
  background: "#fbfdff",
  border: "1px solid rgba(15,23,42,0.12)",
  borderRadius: 12,
  outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s",
  "&:focus": {
    borderColor: brand.primary,
    boxShadow: "0 0 0 3px rgba(13,110,253,0.15)",
  },
  "&:disabled": { opacity: 0.6 },
});

interface OtpInputProps {
  length: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length,
  value,
  onChange,
  onComplete,
  disabled,
  autoFocus,
}) => {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  const focusIndex = (index: number) => {
    const el = inputsRef.current[index];
    if (el) {
      el.focus();
      el.select();
    }
  };

  const commit = (next: string[]) => {
    const joined = next.join("").slice(0, length);
    onChange(joined);
    if (joined.length === length && !joined.includes("")) {
      onComplete?.(joined);
    }
    return joined;
  };

  const fillFrom = (index: number, chars: string) => {
    const next = digits.slice();
    const toWrite = chars.slice(0, length - index).split("");
    toWrite.forEach((c, i) => {
      next[index + i] = c;
    });
    commit(next);
    focusIndex(Math.min(index + toWrite.length, length - 1));
  };

  const handleChange = (index: number, raw: string) => {
    const onlyDigits = raw.replace(/\D/g, "");
    if (!onlyDigits) return;
    if (onlyDigits.length > 1) {
      fillFrom(index, onlyDigits);
      return;
    }
    const next = digits.slice();
    next[index] = onlyDigits;
    commit(next);
    if (index < length - 1) {
      focusIndex(index + 1);
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = digits.slice();
      if (digits[index]) {
        next[index] = "";
        commit(next);
      } else if (index > 0) {
        next[index - 1] = "";
        commit(next);
        focusIndex(index - 1);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusIndex(index - 1);
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      focusIndex(index + 1);
    }
  };

  const handlePaste = (
    index: number,
    e: React.ClipboardEvent<HTMLInputElement>,
  ) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (pasted) fillFrom(index, pasted);
  };

  return (
    <Box sx={{ display: "flex", gap: 1.25, mb: 0.5 }}>
      {digits.map((digit, index) => (
        <OtpCell
          key={index}
          ref={(el: HTMLInputElement | null) => {
            inputsRef.current[index] = el;
          }}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={(e) => handlePaste(index, e)}
          onFocus={(e) => e.currentTarget.select()}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          autoFocus={autoFocus && index === 0}
          maxLength={1}
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </Box>
  );
};

export default OtpInput;
