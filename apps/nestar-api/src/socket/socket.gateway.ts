import { Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayInit, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Server } from 'ws';

@WebSocketGateway({ transports: ['websocket'], secret: false })
export class SocketGateway implements OnGatewayInit {
  private logger: Logger = new Logger("SocketEventsGateway")
  private summaryClient: number = 0

  public afterInit(server: Server): void {
    this.logger.log(`WebSocket Server Initialized total: ${this.summaryClient}`)
  }
  //client--> websocketga ulangan clientlar
  handleConnection(client: WebSocket, ...args: any[]) {
    this.summaryClient++
    this.logger.log(`== Client connected total: ${this.summaryClient} ==`)
  }
  handleDisconnect(client: WebSocket) {
    this.summaryClient--
    this.logger.log(`== Client disconnected left total:  ${this.summaryClient} ==`)
  }
  @SubscribeMessage('message')
  public handleMessage(client: WebSocket, payload: any): string {
    return 'Hello world!';
  }
}
