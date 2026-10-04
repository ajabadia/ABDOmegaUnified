'use client';

/**
 * @purpose Gestiona un formulario de contacto con características de validación y notificaciones para el editor de manifesto OMEGA.
 * @purpose_en Manages a contact form with validation and notification features for the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:8,sig:srojfw
 * @lastUpdated 2026-06-17T22:29:34.245Z
 */


import { useTranslations } from "next-intl";
import { Button } from "./Button";
import { Send, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useContactForm } from "./contact/useContactForm";
import { ContactSuccess } from "./contact/ContactSuccess";
import { ContactField } from "./contact/ContactField";
import { MathChallenge } from "./contact/MathChallenge";

export function ContactForm() {
  const t = useTranslations("contact.form");
  const { 
    status, 
    errorMessage, 
    cooldown, 
    challenge, 
    handleSubmit, 
    resetForm 
  } = useContactForm();

  if (status === "success") {
    return <ContactSuccess onReset={resetForm} t={t} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8" aria-labelledby="contact-title">
      {/* Honeypot Field (Hidden for humans) */}
      <div aria-hidden="true" className="sr-only">
        <input type="hidden" name="bot_field" autoComplete="off" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <ContactField 
          id="name" 
          label={t("name")} 
          name="name" 
          placeholder={t("namePlaceholder")} 
        />
        <ContactField 
          id="email" 
          label={t("email")} 
          name="email" 
          type="email" 
          placeholder={t("emailPlaceholder")} 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <ContactField 
          id="subject" 
          label={t("subject")} 
          name="subject" 
          placeholder={t("subjectPlaceholder")} 
          className="md:col-span-2"
        />
        <MathChallenge challenge={challenge} label={t("challenge")} />
      </div>

      <ContactField 
        id="message" 
        label={t("message")} 
        name="message" 
        placeholder={t("messagePlaceholder")} 
        isTextArea 
        rows={6} 
      />

      <AnimatePresence>
        {status === "error" && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-body"
            role="alert"
            aria-live="assertive"
          >
            <AlertCircle size={18} />
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        type="submit"
        aria-label="Submit contact form"
        disabled={status === "loading" || cooldown}
        className="w-full py-8 text-sm uppercase tracking-widest font-black bg-primary text-zinc-950 group"
      >
        {status === "loading" ? (
          <Loader2 className="animate-spin mr-2" size={20} />
        ) : (
          <Send className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform mr-2" size={20} />
        )}
        {t("submit")}
      </Button>

      {/* Security Notice */}
      <p className="text-[9px] text-zinc-700 uppercase tracking-widest text-center">
        {t("security")}
      </p>
    </form>
  );
}
