import { useEffect, useState } from 'react';
import { getEvent } from '../api/event.js';

const FALLBACK_EVENT = {
  name: 'ANB Picnic',
  date: 'To be announced',
  time: 'To be announced',
  venue: 'To be announced',
  fee: 'To be announced',
};

export function useEvent() {
  const [event, setEvent] = useState(FALLBACK_EVENT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getEvent()
      .then((data) => {
        if (active) setEvent(data.event);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { event, loading };
}
