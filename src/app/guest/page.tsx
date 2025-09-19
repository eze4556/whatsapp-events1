'use client'

import { useState, useEffect } from 'react'
import { getEventByCode, registerGuest, getGuestByPhone, Event, Guest } from '@/lib/firebase'
import { sendMessage, subscribeToMessages, Message } from '@/lib/pusher-messages'
import { Send, MessageCircle, User, Phone, Monitor } from 'lucide-react'

export default function GuestPage() {
  const [event, setEvent] = useState<Event | null>(null)
  const [guest, setGuest] = useState<Guest | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // Estados para registro
  const [registrationData, setRegistrationData] = useState({
    name: '',
    phone: ''
  })
  const [isRegistering, setIsRegistering] = useState(false)
  const [showPublicView, setShowPublicView] = useState(false)

  // Función helper para convertir fechas de Firebase
  const formatDate = (date: Date | { seconds: number } | string | number | null | undefined) => {
    if (!date) return '--:--'
    
    let dateObj: Date
    
    // Si es un Timestamp de Firebase
    if (date && typeof date === 'object' && 'seconds' in date && typeof date.seconds === 'number') {
      dateObj = new Date(date.seconds * 1000)
    } else if (date instanceof Date) {
      dateObj = date
    } else if (typeof date === 'string' || typeof date === 'number') {
      dateObj = new Date(date)
    } else {
      return '--:--'
    }
    
    // Verificar si la fecha es válida
    if (isNaN(dateObj.getTime())) {
      return '--:--'
    }
    
    return dateObj.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const eventCode = urlParams.get('event')
    
    if (eventCode) {
      loadEventAndCheckGuest(eventCode)
    } else {
      setIsLoading(false)
    }
  }, [])

  const loadEventAndCheckGuest = async (code: string) => {
    try {
      const eventData = await getEventByCode(code)
      if (!eventData) {
        alert('Evento no encontrado')
        setIsLoading(false)
        return
      }
      
      setEvent(eventData)
      
      // Verificar si hay un invitado registrado en localStorage
      const savedPhone = localStorage.getItem(`guest_phone_${eventData.id}`)
      if (savedPhone) {
        const guestData = await getGuestByPhone(eventData.id, savedPhone)
        if (guestData) {
          setGuest(guestData)
          setIsLoading(false)
          return
        }
      }
      
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading event:', error)
      alert('Error al cargar el evento')
      setIsLoading(false)
    }
  }

  const handleRegistration = async () => {
    if (!registrationData.name.trim() || !registrationData.phone.trim() || !event) return

    setIsRegistering(true)
    try {
      const newGuest = await registerGuest(event.id, registrationData.name.trim(), registrationData.phone.trim())
      setGuest(newGuest)
      
      // Guardar en localStorage para futuras visitas
      localStorage.setItem(`guest_phone_${event.id}`, registrationData.phone.trim())
      
      setIsRegistering(false)
    } catch (error) {
      console.error('Error registering guest:', error)
      alert('Error al registrarse. Intenta de nuevo.')
      setIsRegistering(false)
    }
  }

  const sendMessageHandler = async () => {
    if (!newMessage.trim() || !guest || !event) return

    setIsSubmitting(true)
    try {
      sendMessage(event.id, guest.name, newMessage.trim(), guest.phone)
      setNewMessage('')
      setIsSubmitting(false)
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Error al enviar el mensaje. Intenta de nuevo.')
      setIsSubmitting(false)
    }
  }

  // Suscribirse a mensajes cuando hay un invitado registrado
  useEffect(() => {
    if (!event || !guest) return

    const unsubscribe = subscribeToMessages(event.id, (messages) => {
      setMessages(messages)
    })

    return () => unsubscribe()
  }, [event, guest])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">
            Cargando evento...
          </h1>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 text-center">
          <h1 className="text-xl font-bold text-gray-800 mb-4">
            Evento no encontrado
          </h1>
          <p className="text-gray-600">Verifica que el QR sea correcto</p>
        </div>
      </div>
    )
  }

  // Si no está registrado, mostrar formulario de registro
  if (!guest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-6 mt-8">
            <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
              📱 Registrarse en el Evento
            </h1>
            
            <div className="mb-6 text-center">
              <h2 className="text-lg font-semibold text-gray-700">{event.name}</h2>
              <p className="text-sm text-gray-500">Completa tus datos para participar</p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleRegistration(); }}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Tu nombre:
                </label>
                <input
                  type="text"
                  value={registrationData.name}
                  onChange={(e) => setRegistrationData({...registrationData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                  placeholder="Ej: María"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Tu teléfono:
                </label>
                <input
                  type="tel"
                  value={registrationData.phone}
                  onChange={(e) => setRegistrationData({...registrationData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                  placeholder="Ej: +54 9 11 1234-5678"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isRegistering}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                {isRegistering ? 'Registrando...' : 'Registrarse y Participar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Si está registrado, mostrar chat tipo WhatsApp
  const approvedMessages = messages.filter(m => m.status === 'approved')

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-green-500 text-white p-4">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold">{event.name}</h1>
            <p className="text-sm opacity-90">Hola {guest.name} 👋</p>
          </div>
          <button
            onClick={() => setShowPublicView(!showPublicView)}
            className={`p-2 rounded-lg transition-colors ${
              showPublicView 
                ? 'bg-white bg-opacity-30 hover:bg-opacity-40' 
                : 'bg-white bg-opacity-20 hover:bg-opacity-30'
            }`}
            title={showPublicView ? "Ocultar pantalla pública" : "Ver pantalla pública"}
          >
            <Monitor className="w-5 h-5 text-green-600" />
          </button>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="flex-1 flex">
        {/* Chat Messages */}
        <div className={`${showPublicView ? 'w-1/2' : 'w-full'} overflow-y-auto p-4`}>
          <div className="max-w-md mx-auto space-y-4">
            {approvedMessages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Los mensajes aparecerán aquí cuando sean aprobados</p>
              </div>
            ) : (
              approvedMessages.map((message) => (
                <div key={message.id} className={`flex ${message.guestName === guest.name ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-4 py-2 rounded-lg ${
                    message.guestName === guest.name 
                      ? 'bg-green-500 text-white' 
                      : 'bg-white text-gray-800'
                  }`}>
                    {message.guestName !== guest.name && (
                      <p className="text-xs font-semibold mb-1">{message.guestName}</p>
                    )}
                    <p>{message.message}</p>
                    <p className={`text-xs mt-1 ${
                      message.guestName === guest.name ? 'text-green-100' : 'text-gray-500'
                    }`}>
                      {formatDate(message.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Vista Pública */}
        {showPublicView && (
          <div className="w-1/2 border-l border-gray-300">
            <div 
              className="h-full"
              style={{ 
                backgroundColor: event.backgroundColor,
                color: event.textColor,
                backgroundImage: event.backgroundImage ? `url(${event.backgroundImage})` : undefined,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center center'
              }}
            >
              {/* Header de la pantalla pública */}
              <div 
                className="border-b p-4"
                style={{ 
                  backgroundColor: event.backgroundImage ? 'rgba(0,0,0,0.7)' : undefined,
                  backdropFilter: event.backgroundImage ? 'blur(10px)' : undefined
                }}
              >
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-1">
                    {event.displayName}
                  </h2>
                  <div className="flex items-center justify-center opacity-90 text-sm">
                    <Monitor className="w-4 h-4 mr-1" />
                    <span>Pantalla Pública</span>
                  </div>
                </div>
              </div>

              {/* Mensajes de la pantalla pública */}
              <div className="p-4 h-full overflow-y-auto">
                <div className="space-y-3">
                  {approvedMessages.length === 0 ? (
                    <div className="text-center py-8 opacity-90">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">¡Esperando mensajes!</h3>
                      <p className="text-sm">Los mensajes aparecerán aquí cuando sean aprobados</p>
                    </div>
                  ) : (
                    approvedMessages.map((message, index) => (
                      <div 
                        key={message.id} 
                        className={`flex items-end space-x-2 ${
                          index % 2 === 0 ? 'animate-slideInLeft' : 'animate-slideInRight'
                        }`}
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        {/* Avatar */}
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                          style={{ 
                            background: 'linear-gradient(135deg, #25d366, #128c7e)',
                            color: 'white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}
                        >
                          {message.guestName.charAt(0).toUpperCase()}
                        </div>
                        
                        {/* Mensaje */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1 mb-1">
                            <span className="font-semibold text-xs opacity-90">{message.guestName}</span>
                            <span className="text-xs opacity-60">
                              {formatDate(message.createdAt)}
                            </span>
                          </div>
                          
                          {/* Burbuja de mensaje */}
                          <div 
                            className="rounded-lg px-3 py-2 text-sm break-words relative"
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
            </div>
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="bg-white border-t p-4">
        <div className="max-w-md mx-auto flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessageHandler()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
            placeholder="Escribe tu mensaje..."
            disabled={isSubmitting}
          />
          <button
            onClick={sendMessageHandler}
            disabled={!newMessage.trim() || isSubmitting}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white p-2 rounded-lg transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 text-center mt-2">
          Los mensajes serán revisados antes de aparecer
        </p>
      </div>
    </div>
  )
}
