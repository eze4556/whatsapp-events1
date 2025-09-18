'use client'

import { useState, useEffect } from 'react'
import { getEventByCode, getMessages, subscribeToMessages, Event, Message } from '@/lib/firebase'
import { MessageCircle, QrCode } from 'lucide-react'

export default function PublicPage() {
  const [event, setEvent] = useState<Event | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const eventCode = urlParams.get('event')
    
    if (eventCode) {
      loadEventByCode(eventCode)
    } else {
      setIsLoading(false)
    }
  }, [])

  const loadEventByCode = async (code: string) => {
    try {
      const eventData = await getEventByCode(code)
      if (eventData) {
        setEvent(eventData)
        setIsLoading(false)
      } else {
        console.error('Event not found')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Error loading event:', error)
      setIsLoading(false)
    }
  }

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    if (!event) return

    const unsubscribe = subscribeToMessages(event.id, (messages) => {
      setMessages(messages)
    })

    return () => unsubscribe()
  }, [event])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-800 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
          <p>Cargando evento...</p>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-800 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Evento no encontrado</h1>
          <p className="text-gray-400">Verifica que la URL sea correcta</p>
        </div>
      </div>
    )
  }

  const approvedMessages = messages.filter(m => m.status === 'approved')
  
  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: event.backgroundColor,
        color: event.textColor,
        backgroundImage: event.backgroundImage ? `url(${event.backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Header */}
      <div 
        className="border-b p-6"
        style={{ 
          backgroundColor: event.backgroundImage ? 'rgba(0,0,0,0.7)' : undefined,
          backdropFilter: event.backgroundImage ? 'blur(10px)' : undefined
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-2">
            {event.displayName}
          </h1>
          <div className="flex items-center justify-center opacity-90">
            <QrCode className="w-6 h-6 mr-2" />
            <span className="text-lg">Escaneá el QR para participar</span>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto p-6">
        <div 
          className="rounded-lg p-6 min-h-[70vh] overflow-y-auto"
          style={{ 
            backgroundColor: event.backgroundImage ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.1)',
            backdropFilter: event.backgroundImage ? 'blur(10px)' : undefined
          }}
        >
          <div className="space-y-4">
            {approvedMessages.length === 0 ? (
              <div className="text-center py-12 opacity-90">
                <MessageCircle className="w-16 h-16 mx-auto mb-6 opacity-50" />
                <h2 className="text-xl font-semibold mb-2">¡Esperando mensajes!</h2>
                <p>Los mensajes aparecerán aquí cuando sean aprobados por el administrador</p>
              </div>
            ) : (
              approvedMessages.map((message) => (
                <div key={message.id} className="flex items-start space-x-3 animate-fadeIn">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0"
                    style={{ 
                      backgroundColor: event.textColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                      color: event.textColor
                    }}
                  >
                    {message.guestName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold">{message.guestName}</span>
                      <span className="text-xs opacity-70">
                        {new Date(message.createdAt).toLocaleString('es-ES')}
                      </span>
                    </div>
                    <div 
                      className="rounded-lg px-4 py-3 break-words"
                      style={{ 
                        backgroundColor: event.textColor === '#ffffff' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        backdropFilter: 'blur(5px)'
                      }}
                    >
                      {message.message}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 opacity-70">
          <p className="text-sm">
            WhatsApp Events - Mensajes en tiempo real
          </p>
        </div>
      </div>
    </div>
  )
}
