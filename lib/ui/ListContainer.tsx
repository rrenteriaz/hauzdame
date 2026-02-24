// lib/ui/ListContainer.tsx

interface ListContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Contenedor padre para listas row.
 * Proporciona border, rounded, overflow y bg.
 */
export default function ListContainer({ children, className = "" }: ListContainerProps) {
  return (
    <div
      className={`border border-neutral-200 rounded-xl overflow-hidden bg-white ${className}`}
    >
      {children}
    </div>
  );
}

