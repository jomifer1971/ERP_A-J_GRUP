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
  obra: string,
  bypassActivoCheck: boolean = false,
  jefeTelegramChatId?: string
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

  if (!config.activo && !bypassActivoCheck) {
    return { success: false, error: 'Notificaciones apagadas' };
  }

  // Auto-resolve Jefe de Equipo's Telegram Chat ID from the name database
  let finalJefeTelegramId = jefeTelegramChatId;
  if (!finalJefeTelegramId && operario) {
    try {
      const usersSaved = localStorage.getItem('aj_users_v2');
      if (usersSaved) {
        const users = JSON.parse(usersSaved) as any[];
        // Look for the operator by name match (case-insensitive & trimmed)
        const worker = users.find(u => 
          u.nombre.toLowerCase().trim() === operario.toLowerCase().trim()
        );
        if (worker && worker.jefeId) {
          const jefe = users.find(u => u.id === worker.jefeId);
          if (jefe && jefe.telegramChatId) {
            finalJefeTelegramId = jefe.telegramChatId;
          }
        }
      }
    } catch (err) {
      console.warn('Error resolviendo Jefe de Equipo de forma automática:', err);
    }
  }

  const esGpsAlarma = mensaje.toUpperCase().includes('GPS') || mensaje.toUpperCase().includes('SPOOFING') || mensaje.toUpperCase().includes('FRAUDE');
  const emoji = esGpsAlarma ? '🚨❌' : tipo === 'RETRASO' ? '⚠️' : tipo === 'AUSENCIA' ? '🚨' : '🔔';
  const tituloEvento = esGpsAlarma 
    ? '¡INTENTO DE FRAUDE DETECTADO!' 
    : tipo === 'RETRASO' 
      ? 'Fichaje Tardío' 
      : tipo === 'AUSENCIA' 
        ? 'Falta de Fichaje' 
        : 'Prueba de Conexión';

  const textoMensaje = `${emoji} *Alerta de Seguridad - A&J Grup*\n\n` +
    `• *Evento:* ${tituloEvento}\n` +
    `• *Operario:* ${operario}\n` +
    `• *Obra/Destino:* ${obra}\n` +
    `• *Detalle:* ${mensaje}\n` +
    `• *Fecha:* ${new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` +
    (esGpsAlarma ? '\n\n🛡️ _Escudo Anti-Fraude GPS Activo_' : '');

  const resultados: string[] = [];
  let algunExito = false;

  // 1. Dispatch through Telegram Bot (Highly flexible, instant & 100% free)
  if (config.telegramToken) {
    // Send to Master (CEO/Admin)
    if (config.telegramChatId) {
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
          resultados.push('Telegram CEO: OK');
        } else {
          const errorData = await response.json().catch(() => ({}));
          resultados.push(`Telegram CEO falló: ${errorData.description || response.statusText}`);
        }
      } catch (err: any) {
        resultados.push(`Telegram CEO Error: ${err.message || err}`);
      }
    }

    // Send to Jefe de Equipo (Team Leader) if assigned and different
    if (finalJefeTelegramId && finalJefeTelegramId !== config.telegramChatId) {
      try {
        const url = `https://api.telegram.org/bot${config.telegramToken}/sendMessage`;
        
        // Add specific footer indicating it was sent to team leader role
        const textoJefe = textoMensaje + `\n\n👥 _Información enviada al Jefe de Equipo de este operario_`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: finalJefeTelegramId,
            text: textoJefe,
            parse_mode: 'Markdown'
          })
        });

        if (response.ok) {
          algunExito = true;
          resultados.push('Telegram Jefe: OK');
        } else {
          const errorData = await response.json().catch(() => ({}));
          resultados.push(`Telegram Jefe falló: ${errorData.description || response.statusText}`);
        }
      } catch (err: any) {
        resultados.push(`Telegram Jefe Error: ${err.message || err}`);
      }
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
