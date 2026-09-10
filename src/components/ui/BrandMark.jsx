import React from 'react';

// Identity-provider logos for the sign-in buttons.
//
// Deliberately NOT in Icon.jsx. That file is one monochrome set drawn with
// `stroke="currentColor"` so every glyph inherits the surrounding text colour;
// these are fixed-colour brand marks that must NOT recolour, and each is
// governed by the provider's published branding rules. Mixing them would mean a
// second `if (name === …)` special case in Icon on top of the one WhatsApp
// already needs, and a real risk of someone later "tidying" a brand logo into
// currentColor and breaking the terms we display it under.
//
// Rendered inline rather than loaded as files: the CSP in vercel.json is
// `img-src 'self'`, and inline SVG is DOM rather than an image request, so
// there is nothing to allowlist and no extra round trip on the sign-in page.
//
// Sizes and wording are set by the buttons in auth.css and the `auth_oauth_*`
// strings. Google and Microsoft both require their mark at a minimum size with
// unmodified colours and the approved verb — "Continue with …" is on both
// approved lists.

const MARKS = {
  // Google "G". Four paths, four fixed brand colours — never recolour it.
  google: (
    <>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18A10.98 10.98 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.83z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </>
  ),

  // Microsoft's four squares. The gap between them is part of the mark.
  microsoft: (
    <>
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M12 1h10v10H12z" />
      <path fill="#00A4EF" d="M1 12h10v10H1z" />
      <path fill="#FFB900" d="M12 12h10v10H12z" />
    </>
  ),

  // LinkedIn's "in" box, single brand blue.
  linkedin: (
    <path
      fill="#0A66C2"
      d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"
    />
  ),
};

/** True when a logo exists, so callers can skip a provider they cannot draw. */
export function hasBrandMark(name) {
  return Object.prototype.hasOwnProperty.call(MARKS, name);
}

/**
 * A provider logo at its own fixed colours.
 * Decorative: the button's text already names the provider.
 */
export function BrandMark({ name, size = 18, className = '' }) {
  const mark = MARKS[name];
  if (!mark) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox={name === 'microsoft' ? '0 0 23 23' : '0 0 24 24'}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {mark}
    </svg>
  );
}
