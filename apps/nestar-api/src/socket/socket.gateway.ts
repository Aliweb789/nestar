import { Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'ws';
import * as WebSocket from "ws"
import { AuthService } from '../components/auth/auth.service';
import { Member } from '../libs/dto/member/member';
import * as url from 'url'
import { MemberUpdate } from '../libs/dto/member/member.update';
import { Message } from '../libs/enums/common.enum';

interface MessagePayLoad {
  event: string;
  text: string;
  memberData: Member
}
interface InfoPayLoad {
  event: string;
  totalClients: number;
  memberData: Member
  action: string
}

@WebSocketGateway({ transports: ['websocket'], secret: false })
export class SocketGateway implements OnGatewayInit {
  private logger: Logger = new Logger("SocketEventsGateway")
  private summaryClient: number = 0
  private clientAuthMap = new Map<WebSocket, Member>()
  private messageList: MessagePayLoad[] = []

  constructor(private authService: AuthService) { }

  @WebSocketServer()
  server: Server

  public afterInit(server: Server): void {
    this.logger.verbose(`WebSocket Server Initialized & total [${this.summaryClient}]`)

  }
  private async retrieveAuth(req: any): Promise<Member> {
    try {
      const parseUrl = url.parse(req.url, true)
      const { token } = parseUrl.query
      console.log('token:', token)
      return await this.authService.verifyToken(token as string)
    } catch (err) {
      return null
    }
  }

  //client--> websocketga ulangan clientlar
  public async handleConnection(client: WebSocket, req: any) {
    const authMember = await this.retrieveAuth(req)
    this.summaryClient++
    this.clientAuthMap.set(client, authMember)
    const clientNickName: string = authMember?.memberNick ?? "Guest"
    this.logger.verbose(`== Connection[${clientNickName}] & total [${this.summaryClient}] ==`)

    const infoMsg: InfoPayLoad = {
      event: "info",
      totalClients: this.summaryClient,
      memberData: authMember,
      action: 'joined'
    }
    this.emitMessage(infoMsg)
    // CLIENT MESSAGES
    client.send(JSON.stringify({ event: 'getMessages', list: this.messageList }))
  }
  public handleDisconnect(client: WebSocket) {
    const authMember = this.clientAuthMap.get(client)
    this.summaryClient--
    this.clientAuthMap.delete(client)

    const clientNickName: string = authMember?.memberNick ?? "Guest"
    this.logger.verbose(`== Disconnection [${clientNickName}] & total [${this.summaryClient}] ==`)

    const infoMsg: InfoPayLoad = {
      event: "info",
      totalClients: this.summaryClient,
      memberData: authMember,
      action: 'left',
    }
    this.broadcastMessage(client, infoMsg)
  }
  @SubscribeMessage('message')
  public async handleMessage(client: WebSocket, payload: string): Promise<void> {
    const authMember = this.clientAuthMap.get(client)
    const newMessage: MessagePayLoad = { event: "message", text: payload, memberData: authMember }
    const clientNick: string = authMember?.memberNick ?? "Guest"
    this.logger.verbose(`NEW MESSAGE [${clientNick}]: ${payload}`)
    this.messageList.push(newMessage)
    if (this.messageList.length > 5) this.messageList.splice(0, this.messageList.length - 5)
    this.emitMessage(newMessage)

  }

  private broadcastMessage(sender: WebSocket, message: InfoPayLoad | MessagePayLoad) {
    this.server.clients.forEach((client) => {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message))
      }
    })
  }

  private emitMessage(message: InfoPayLoad | MessagePayLoad) {
    this.server.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message))
      }

    })
  }
}

/**
  MESSAGE TARGET
  1. Client (only client)
  2. Broadcast (except client)
  3. Emit(all clients)
 */