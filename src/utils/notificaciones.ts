/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ConfigNotificaciones {
  telegramToken: string;
  telegramChatId: string;
  webhookUrl: string;
  correoAvisos: string;
  activo: boolean;
}

export const DEFAULT_CONFIG_NOTIF: ConfigNotificaciones = {
  telegramToken: '',
  telegramChatId: '',
  webhookUrl: '',
  correoAvisos: '',
  activo: false
};

/**
 * Sends a real-time notification via Telegram Bot or custom JSON webhook if configured
 */
export async function enviarNotificacionReal(
  tipo: 'RETRASO' | 'AUSENCIA' | 'PRUEBA',
  operario: string,
  mensaje: string,
  obra: string
): Promise<{ success: boolean; error?: string; detalles?: string }> {
  
  // Load configuration from local storage
  const saved = localStorage.getItem('aj_config_notificaciones');
  if (!saved) {
    return { success: false, error: 'Sin configurar' };
  }

  let config: ConfigNotificaciones;
  try {
    config = JSON.parse(saved);
  } catch (e) {
    return { success: false, error: 'Configuración corrupta' };
  }

  if (!config.activo) {
    return { success: false, error: 'Notificaciones apagadas' };
  }

  const emoji = tipo === 'RETRASO' ? '⚠️' : tipo === 'AUSENCIA' ? '🚨' : '🔔';
  const textoMensaje = `${emoji} *Alerta de Fichaje - A&J Grup*\n\n` +
    `• *Evento:* ${tipo === 'RETRASO' ? 'Fichaje Tardío' : tipo === 'AUSENCIA' ? 'Falta de Fichaje' : 'Prueba de Conexión'}\n` +
    `• *Operario:* ${operario}\n` +
    `• *Obra/Destino:* ${obra}\n` +
    `• *Detalle:* ${mensaje}\n` +
    `• *Fecha:* ${new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`;

  const resultados: string[] = [];
  let algunExito = false;

  // 1. Dispatch through Telegram Bot (Highly flexible, instant & 100% free)
  if (config.telegramToken && config.telegramChatId) {
    try {
      const url = `https://api.telegram.org/bot${config.telegramToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: config.telegramChatId,
          text: textoMensaje,
          parse_mode: 'Markdown'
        })
      });

      if (response.ok) {
        algunExito = true;
        resultados.push('Telegram: OK');
      } else {
        const errorData = await response.json().catch(() => ({}));
        resultados.push(`Telegram falló: ${errorData.description || response.statusText}`);
      }
    } catch (err: any) {
      resultados.push(`Telegram Error: ${err.message || err}`);
    }
  }

  // 2. Dispatch through Custom Webhook (Make, Zapier, Twilio, IFTTT, PowerAutomate etc.)
  if (config.webhookUrl) {
    try {
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evento: tipo,
          operario,
          mensaje,
          obra,
          fecha: new Date().toISOString(),
          textoFormateado: textoMensaje
        })
      });

      if (response.ok) {
        algunExito = true;
        resultados.push('Webhook post: OK');
      } else {
        resultados.push(`Webhook falló con estado ${response.status}`);
      }
    } catch (err: any) {
      resultados.push(`Webhook Error: ${err.message || err}`);
    }
  }

  if (algunExito) {
    return { success: true, detalles: resultados.join(', ') };
  } else {
    return { success: false, error: resultados.length > 0 ? resultados.join('; ') : 'No se han rellenado canales' };
  }
}
