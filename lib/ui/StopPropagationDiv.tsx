"use client";

import { ComponentProps } from "react";

/**
 * Wrapper de div que previene la propagación de eventos.
 * Útil cuando un div está dentro de otro elemento clickeable.
 */
export default function StopPropagationDiv({
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      {...props}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

