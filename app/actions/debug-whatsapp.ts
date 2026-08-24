"use server"
import { getWhatsAppMessages } from './whatsapp';
export async function getDebug() {
  try {
    const msgs = await getWhatsAppMessages();
    return { msgs };
  } catch (e: any) {
    return { error: e.message };
  }
}
