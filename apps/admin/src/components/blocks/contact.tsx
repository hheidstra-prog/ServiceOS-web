"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Send, CheckCircle2 } from "lucide-react";
import { getBlockBackgroundProps } from "./block-helpers";

interface ContactData {
  heading?: string;
  subheading?: string;
  description?: string;
  showForm?: boolean;
  showInfo?: boolean;
  showMap?: boolean;
  email?: string;
  phone?: string;
  address?: string;
  background?: string;
}

const inputClassName =
  "block w-full border border-[var(--color-input-border)] bg-[var(--color-surface-alt)] px-4 py-3 text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-muted)] focus:border-[var(--color-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/25 transition-colors";

export function ContactBlock({ data }: { data: Record<string, unknown> }) {
  if (!data) return null;
  const raw = data as unknown as ContactData;
  const contact = { ...raw, description: raw.description || raw.subheading };
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // TODO: Implement form submission
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setSubmitted(true);
    setIsSubmitting(false);
  };

  const hasInfo = contact.showInfo !== false && (contact.email || contact.phone || contact.address);
  const bg = getBlockBackgroundProps(raw.background || "default");

  return (
    <section className={bg.className} style={bg.style}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {(contact.heading || contact.description) && (
          <div className="text-center mb-12">
            {contact.heading && <h2 className="section-heading">{contact.heading}</h2>}
            {contact.description && (
              <p className="mt-4 text-lg text-[var(--color-on-surface-secondary)]">{contact.description}</p>
            )}
          </div>
        )}

        <div className={`grid gap-12 ${hasInfo ? "lg:grid-cols-5" : "max-w-2xl mx-auto"}`}>
          {/* Contact Info */}
          {hasInfo && (
            <div className="lg:col-span-2 flex flex-col justify-center space-y-8">
              {contact.email && (
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: "var(--color-primary-500)", color: "white" }}
                  >
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-on-surface-muted)] uppercase tracking-wide">Email</p>
                    <a
                      href={`mailto:${contact.email}`}
                      className="mt-1 block text-[var(--color-on-surface)] hover:text-[var(--color-link)] transition-colors"
                    >
                      {contact.email}
                    </a>
                  </div>
                </div>
              )}

              {contact.phone && (
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: "var(--color-primary-500)", color: "white" }}
                  >
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-on-surface-muted)] uppercase tracking-wide">Phone</p>
                    <a
                      href={`tel:${contact.phone}`}
                      className="mt-1 block text-[var(--color-on-surface)] hover:text-[var(--color-link)] transition-colors"
                    >
                      {contact.phone}
                    </a>
                  </div>
                </div>
              )}

              {contact.address && (
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: "var(--color-primary-500)", color: "white" }}
                  >
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-on-surface-muted)] uppercase tracking-wide">Address</p>
                    <p className="mt-1 text-[var(--color-on-surface)] whitespace-pre-line">
                      {contact.address}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Contact Form */}
          {contact.showForm !== false && (
            <div className={`${hasInfo ? "lg:col-span-3" : ""}`}>
              <div
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-6 sm:p-8 shadow-sm"
              >
                {submitted ? (
                  <div className="text-center py-12">
                    <div
                      className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
                      style={{ background: "var(--color-primary-500)" }}
                    >
                      <CheckCircle2 className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-xl font-semibold text-[var(--color-on-surface)]">
                      Message Sent!
                    </p>
                    <p className="mt-2 text-[var(--color-on-surface-secondary)]">
                      We&apos;ll get back to you as soon as possible.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitted(false);
                        setFormState({ name: "", email: "", phone: "", subject: "", message: "" });
                      }}
                      className="mt-6 text-sm font-medium text-[var(--color-link)] hover:text-[var(--color-link-hover)] transition-colors"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Name & Email row */}
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="contact-name"
                          className="block text-sm font-medium text-[var(--color-on-surface)] mb-2"
                        >
                          Name
                        </label>
                        <input
                          type="text"
                          id="contact-name"
                          required
                          placeholder="Your name"
                          value={formState.name}
                          onChange={(e) =>
                            setFormState({ ...formState, name: e.target.value })
                          }
                          className={inputClassName}
                          style={{ borderRadius: "var(--radius-input)" }}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="contact-email"
                          className="block text-sm font-medium text-[var(--color-on-surface)] mb-2"
                        >
                          Email
                        </label>
                        <input
                          type="email"
                          id="contact-email"
                          required
                          placeholder="you@example.com"
                          value={formState.email}
                          onChange={(e) =>
                            setFormState({ ...formState, email: e.target.value })
                          }
                          className={inputClassName}
                          style={{ borderRadius: "var(--radius-input)" }}
                        />
                      </div>
                    </div>

                    {/* Phone & Subject row */}
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="contact-phone"
                          className="block text-sm font-medium text-[var(--color-on-surface)] mb-2"
                        >
                          Phone <span className="text-[var(--color-on-surface-muted)] font-normal">(optional)</span>
                        </label>
                        <input
                          type="tel"
                          id="contact-phone"
                          placeholder="Your phone number"
                          value={formState.phone}
                          onChange={(e) =>
                            setFormState({ ...formState, phone: e.target.value })
                          }
                          className={inputClassName}
                          style={{ borderRadius: "var(--radius-input)" }}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="contact-subject"
                          className="block text-sm font-medium text-[var(--color-on-surface)] mb-2"
                        >
                          Subject <span className="text-[var(--color-on-surface-muted)] font-normal">(optional)</span>
                        </label>
                        <input
                          type="text"
                          id="contact-subject"
                          placeholder="How can we help?"
                          value={formState.subject}
                          onChange={(e) =>
                            setFormState({ ...formState, subject: e.target.value })
                          }
                          className={inputClassName}
                          style={{ borderRadius: "var(--radius-input)" }}
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="contact-message"
                        className="block text-sm font-medium text-[var(--color-on-surface)] mb-2"
                      >
                        Message
                      </label>
                      <textarea
                        id="contact-message"
                        rows={5}
                        required
                        placeholder="Tell us about your project or question..."
                        value={formState.message}
                        onChange={(e) =>
                          setFormState({ ...formState, message: e.target.value })
                        }
                        className={`${inputClassName} resize-none`}
                        style={{ borderRadius: "var(--radius-input)" }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        "Sending..."
                      ) : (
                        <>
                          Send Message
                          <Send className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
