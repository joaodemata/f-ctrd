import { useEffect, useRef, useState } from 'react';
import { subscribeServerEvents, type ServerEventType } from '../api/events';

// Llama a `onEvent` cuando el hub de C-TRD publica `typeEvent` y tambien al reconectar, porque durante la caida
// pudieron perderse eventos. Retorna si el websocket esta conectado, para usar polling solo mientras no lo este
export function useServerEvent(typeEvent: ServerEventType, onEvent: () => void): boolean {
  const [connected, setConnected] = useState(false);

  // El handler cambia en cada render; la suscripcion solo depende del tipo de evento
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(
    () =>
      subscribeServerEvents(
        (event) => {
          if (event.typeEvent === typeEvent) onEventRef.current();
        },
        (status, reconnected) => {
          setConnected(status === 'open');
          if (reconnected) onEventRef.current();
        },
      ),
    [typeEvent],
  );

  return connected;
}
