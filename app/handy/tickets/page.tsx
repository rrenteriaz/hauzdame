// app/handy/tickets/page.tsx
import Page from "@/lib/ui/Page";
import ListContainer from "@/lib/ui/ListContainer";
import ListRow from "@/lib/ui/ListRow";
import ListThumb from "@/lib/ui/ListThumb";

// Mock data para UI (sin modelo real aún)
const MOCK_TICKETS = [
  {
    id: "1",
    title: "Reparación de grifo en cocina",
    property: "Casa Los Pinos",
    status: "Pendiente",
    priority: "Alta",
    date: "2024-01-15",
  },
  {
    id: "2",
    title: "Cambio de bombilla en habitación principal",
    property: "Departamento Centro",
    status: "En progreso",
    priority: "Media",
    date: "2024-01-14",
  },
  {
    id: "3",
    title: "Mantenimiento de calefacción",
    property: "Casa Los Pinos",
    status: "Programado",
    priority: "Alta",
    date: "2024-01-20",
  },
  {
    id: "4",
    title: "Limpieza de drenaje",
    property: "Departamento Centro",
    status: "Completado",
    priority: "Media",
    date: "2024-01-12",
  },
  {
    id: "5",
    title: "Instalación de persianas",
    property: "Villa San Juan",
    status: "Pendiente",
    priority: "Baja",
    date: "2024-01-18",
  },
];

export default function HandyTicketsPage() {
  return (
    <Page title="Tickets">
      <ListContainer>
        {MOCK_TICKETS.map((ticket, index) => {
          const isLast = index === MOCK_TICKETS.length - 1;
          
          return (
            <ListRow
              key={ticket.id}
              href={`/handy/tickets/${ticket.id}`}
              isLast={isLast}
              ariaLabel={`Ver detalles de ticket ${ticket.title}`}
            >
              <ListThumb src={null} alt={ticket.property} />
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-medium text-neutral-900 truncate">
                  {ticket.title}
                </h3>
                <p className="text-xs text-neutral-500 truncate mt-0.5">
                  {ticket.property} · {ticket.date}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    ticket.status === "Completado"
                      ? "bg-green-100 text-green-700"
                      : ticket.status === "En progreso"
                      ? "bg-blue-100 text-blue-700"
                      : ticket.status === "Programado"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-neutral-100 text-neutral-700"
                  }`}>
                    {ticket.status}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    ticket.priority === "Alta"
                      ? "bg-red-100 text-red-700"
                      : ticket.priority === "Media"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-neutral-100 text-neutral-700"
                  }`}>
                    {ticket.priority}
                  </span>
                </div>
              </div>
            </ListRow>
          );
        })}
      </ListContainer>
    </Page>
  );
}

