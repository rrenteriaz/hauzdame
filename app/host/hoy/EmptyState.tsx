// app/host/hoy/EmptyState.tsx

interface EmptyStateProps {
  message: string;
}

export default function EmptyState({ message }: EmptyStateProps) {
  const lines = message.split("\n").filter((line) => line.trim() !== "");
  
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
      <div className="space-y-2">
        {lines.map((line, index) => (
          <p
            key={index}
            className="text-base text-neutral-600 leading-relaxed"
          >
            {line.trim()}
          </p>
        ))}
      </div>
    </div>
  );
}

