import type { SVGProps } from "react";

/**
 * Brand glyphs are inlined (lucide no longer ships brand marks) so the footer
 * has no third-party icon dependency.
 */
export function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.25-1.5 1.55-1.5H17V4.4c-.3-.04-1.3-.14-2.45-.14-2.42 0-4.05 1.48-4.05 4.19v2.05H8v3h2.5V21h3Z" />
    </svg>
  );
}

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" {...props}>
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="16.9" cy="7.1" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LinkedInIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M6.5 9.5H4V20h2.5V9.5ZM5.25 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM20 20h-2.5v-5.6c0-1.35-.5-2.15-1.6-2.15-1 0-1.6.67-1.6 2.1V20H11.8V9.5h2.4v1.15c.5-.8 1.4-1.4 2.7-1.4 1.95 0 3.1 1.25 3.1 3.9V20Z" />
    </svg>
  );
}

export function YouTubeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M21.6 8.2c-.2-1.05-.9-1.85-1.95-2.05C17.9 5.8 14.9 5.8 12 5.8s-5.9 0-7.65.35C3.3 6.35 2.6 7.15 2.4 8.2 2.15 9.5 2.15 11 2.15 12s0 2.5.25 3.8c.2 1.05.9 1.85 1.95 2.05 1.75.35 4.75.35 7.65.35s5.9 0 7.65-.35c1.05-.2 1.75-1 1.95-2.05.25-1.3.25-2.8.25-3.8s0-2.5-.25-3.8ZM10 15.2V8.8l5.2 3.2-5.2 3.2Z" />
    </svg>
  );
}
