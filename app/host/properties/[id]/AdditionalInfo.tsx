import Link from "next/link";

interface AdditionalInfoProps {
  propertyId: string;
  returnTo: string;
}

export default function AdditionalInfo({ propertyId, returnTo }: AdditionalInfoProps) {
  const infoHref = `/host/properties/${propertyId}/additional?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <Link
      href={infoHref}
      className="flex items-center justify-between py-2 group hover:opacity-80 transition-opacity"
    >
      <h2 className="text-base font-semibold text-neutral-800">
        Información adicional
      </h2>
      <svg
        className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 transition-colors"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </Link>
  );
}


