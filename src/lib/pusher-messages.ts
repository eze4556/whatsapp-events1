import pusher from './pusher'

export interface Message {
  id: string
  eventId: string
  guestName: string
  guestPhone: string
  message: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: Date
  approvedAt?: Date
}

// Array global para mantener los mensajes en memoria
let globalMessages: Message[] = []

// Enviar mensaje (invitado → admin)
export const sendMessage = async (eventId: string, guestName: string, message: string, guestPhone: string) => {
  const messageData: Message = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    eventId,
    guestName,
    guestPhone,
    message,
    status: 'pending',
    createdAt: new Date()
  }

  // Ya no agrego aquí a globalMessages

  await fetch('/api/pusher-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: `event-${eventId}`,
      event: 'client-new-message',
      data: messageData
    })
  })

  return messageData
}

// Aprobar mensaje (admin)
export const approveMessage = async (messageId: string, eventId: string) => {
  globalMessages = globalMessages.map(msg =>
    msg.id === messageId
      ? { ...msg, status: 'approved' as const, approvedAt: new Date() }
      : msg
  )

  await fetch('/api/pusher-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: `event-${eventId}`,
      event: 'client-message-approved',
      data: { messageId, approvedAt: new Date() }
    })
  })
}

// Rechazar mensaje (admin)
export const rejectMessage = async (messageId: string, eventId: string) => {
  globalMessages = globalMessages.map(msg =>
    msg.id === messageId
      ? { ...msg, status: 'rejected' as const }
      : msg
  )

  await fetch('/api/pusher-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: `event-${eventId}`,
      event: 'client-message-rejected',
      data: { messageId }
    })
  })
}

// Suscribirse a mensajes en tiempo real
export const subscribeToMessages = (eventId: string, callback: (messages: Message[]) => void) => {
  const channel = pusher.subscribe(`event-${eventId}`)

  // Filtrar mensajes del evento actual
  const eventMessages = globalMessages.filter(msg => msg.eventId === eventId)

  // Escuchar nuevos mensajes
  channel.bind('client-new-message', (message: Message) => {
    if (message.eventId === eventId) {
      // Evitar duplicados
      if (!globalMessages.some(msg => msg.id === message.id)) {
        globalMessages.push(message)
      }
      const updatedMessages = globalMessages.filter(msg => msg.eventId === eventId)
      callback(updatedMessages)
    }
  })

  // Escuchar mensajes aprobados
  channel.bind('client-message-approved', (data: { messageId: string, approvedAt: Date }) => {
    globalMessages = globalMessages.map(msg =>
      msg.id === data.messageId
        ? { ...msg, status: 'approved' as const, approvedAt: data.approvedAt }
        : msg
    )
    const updatedMessages = globalMessages.filter(msg => msg.eventId === eventId)
    callback(updatedMessages)
  })

  // Escuchar mensajes rechazados
  channel.bind('client-message-rejected', (data: { messageId: string }) => {
    globalMessages = globalMessages.map(msg =>
      msg.id === data.messageId
        ? { ...msg, status: 'rejected' as const }
        : msg
    )
    const updatedMessages = globalMessages.filter(msg => msg.eventId === eventId)
    callback(updatedMessages)
  })

  // Enviar mensajes actuales inmediatamente
  callback(eventMessages)

  // Función para desuscribirse
  return () => {
    pusher.unsubscribe(`event-${eventId}`)
  }
}
