import { Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'ws';
import * as WebSocket from "ws"
interface MessagePayLoad {
  event: string;
  text: string;
}
interface InfoPayLoad {
  event: string;
  totalClients: number;
}

@WebSocketGateway({ transports: ['websocket'], secret: false })
export class SocketGateway implements OnGatewayInit {
  private logger: Logger = new Logger("SocketEventsGateway")
  private summaryClient: number = 0

  @WebSocketServer()
  server: Server

  public afterInit(server: Server): void {
    this.logger.verbose(`WebSocket Server Initialized & total [${this.summaryClient}]`)
  }
  //client--> websocketga ulangan clientlar
  handleConnection(client: WebSocket, ...args: any[]) {
    this.summaryClient++
    this.logger.verbose(`== Connection & total [${this.summaryClient}] ==`)

    const infoMsg: InfoPayLoad = {
      event: "info",
      totalClients: this.summaryClient
    }
    this.emitMessage(infoMsg)
  }
  handleDisconnect(client: WebSocket) {
    this.summaryClient--
    this.logger.verbose(`== Disconnect & total [${this.summaryClient}] ==`)

    const infoMsg: InfoPayLoad = {
      event: "info",
      totalClients: this.summaryClient
    }
    this.broadcastMessage(client, infoMsg)
  }
  @SubscribeMessage('message')
  public async handleMessage(client: WebSocket, payload: string): Promise<void> {
    const newMessage: MessagePayLoad = { event: "message", text: payload }

    this.logger.verbose(`NEW MESSAGE: ${payload}`)
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
