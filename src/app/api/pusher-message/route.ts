import { NextRequest, NextResponse } from 'next/server'
import Pusher from 'pusher'

const pusher = new Pusher({
  appId: '2053317',
  key: '0bd455430523b265ba9f',
  secret: '4ecec29dd32be0dfa843',
  cluster: 'us2',
  useTLS: true
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { channel, event, data } = body

  await pusher.trigger(channel, event, data)

  return NextResponse.json({ success: true })
}
