// Vueコンポジション関数 - イベントデータ読み込み用
import { ref, onMounted } from 'vue';
import type { EventData } from './types';

export function useEventData() {
  const data = ref<EventData | null>(null);
  const loading = ref(true);
  const error = ref<Error | null>(null);

  onMounted(async () => {
    try {
      const response = await fetch('/data/event.json');
      if (!response.ok) {
        throw new Error('Failed to fetch event data');
      }
      data.value = await response.json();
    } catch (e) {
      error.value = e as Error;
    } finally {
      loading.value = false;
    }
  });

  return {
    data,
    loading,
    error
  };
}

// 静的インポート用（ビルド時にバンドルされる場合）
import eventData from './event.json';
export const staticEventData: EventData = eventData;
