/**
 * Wrapper para contención de contenido en desktop (lg+).
 * 
 * Aplica:
 * - Centrado horizontal: `lg:mx-auto`
 * - Max-width: `lg:max-w-6xl`
 * - Padding lateral: `lg:px-6`
 * 
 * En mobile (sm/md): No aplica ningún estilo, el contenido fluye normalmente.
 * 
 * Uso:
 * ```tsx
 * <HostWebContainer>
 *   <PageHeader ... />
 *   <section>...</section>
 * </HostWebContainer>
 * ```
 */
export default function HostWebContainer({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`lg:mx-auto lg:max-w-6xl lg:px-6 ${className}`}>
      {children}
    </div>
  );
}

