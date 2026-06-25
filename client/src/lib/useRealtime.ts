import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket } from './socket';
import { toast } from '../components/toast';

/** Подключение к WebSocket и инвалидация кэша при изменениях доски/уведомлениях. */
export function useRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    const socket = connectSocket();

    const onBoard = () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['order'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
      qc.invalidateQueries({ queryKey: ['production'] });
    };
    const onNotification = (payload: { title?: string }) => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      if (payload?.title) toast.info(payload.title);
    };

    socket.on('board:changed', onBoard);
    socket.on('notification:new', onNotification);

    return () => {
      socket.off('board:changed', onBoard);
      socket.off('notification:new', onNotification);
    };
  }, [qc]);
}
