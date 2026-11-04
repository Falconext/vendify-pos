import AgendaView from '@/features/admin/agenda/AgendaView';
import AvisoPlanAgenda from '@/features/admin/agenda/AvisoPlanAgenda';
import { useAuthStore } from '@/zustand/auth';
import { hasPlanFeature } from '@/utils/permissions';

/** Mi negocio → Agenda. Solo con la característica `tieneAgenda` del plan. */
export default function AgendaPage() {
  const auth = useAuthStore((s) => s.auth);
  if (!hasPlanFeature(auth, 'tieneAgenda')) return <AvisoPlanAgenda />;
  return <AgendaView />;
}
