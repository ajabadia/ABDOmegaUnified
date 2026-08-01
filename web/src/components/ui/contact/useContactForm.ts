"use client";

/**
 * @purpose Gestiona el formulario de contacto para verificar la humanidad y enviar datos a la API.
 * @purpose_en Manages the contact form for verifying user humanity and sending data to the API.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:hkdob4
 * @lastUpdated 2026-06-15T10:51:29.148Z
 */


import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useTranslations } from "next-intl";

export function useContactForm() {
  const t = useTranslations("contact.form");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [cooldown, setCooldown] = useState(false);
  const [challenge, setChallenge] = useState<{ a: number; b: number; answer: number } | null>(null);

  useEffect(() => {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    Promise.resolve().then(() => {
      setChallenge({ a, b, answer: a + b });
    });
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (cooldown) return;
    setStatus("loading");
    setErrorMessage("");

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    if (data.bot_field) {
      setStatus("success");
      return;
    }

    if (!challenge || Number(data.challenge) !== challenge.answer) {
      setStatus("error");
      setErrorMessage(t("challengeError") || "Verification challenge failed. Are you human?");
      return;
    }

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          challenge_expected: challenge?.answer
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t("error"));
      }

      setStatus("success");
      setCooldown(true);
      setTimeout(() => setCooldown(false), 5000);
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      setStatus("error");
      const msg = error instanceof Error ? error.message : t("error");
      setErrorMessage(msg);
    }
  };

  const resetForm = () => setStatus("idle");

  return {
    status,
    errorMessage,
    cooldown,
    challenge,
    handleSubmit,
    resetForm
  };
}
