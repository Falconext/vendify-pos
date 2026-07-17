export const STORE_PURCHASE_WHATSAPP_RAW = '991065217';
export const STORE_PURCHASE_WHATSAPP_NUMBER = '51991065217';

export const buildStorePurchaseWhatsappUrl = (message?: string) => {
  const text = String(message || '').trim();
  return `https://wa.me/${STORE_PURCHASE_WHATSAPP_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};

export const withStorePurchaseWhatsapp = <T extends Record<string, any> | null | undefined>(tienda: T): T => {
  if (!tienda) return tienda;
  return {
    ...tienda,
    whatsappTienda: STORE_PURCHASE_WHATSAPP_NUMBER,
    diseno: {
      ...(tienda as any).diseno,
      whatsappTienda: STORE_PURCHASE_WHATSAPP_NUMBER,
    },
  } as T;
};
