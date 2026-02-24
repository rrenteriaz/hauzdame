"use client";

import Link from "next/link";
import { ComponentProps } from "react";

/**
 * Wrapper de Link que previene la propagación de eventos.
 * Útil cuando un Link está dentro de otro elemento clickeable.
 */
export default function StopPropagationLink({
  children,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </Link>
  );
}

