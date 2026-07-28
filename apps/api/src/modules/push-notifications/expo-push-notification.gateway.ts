import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PushNotificationGateway } from './push-notification.gateway';
import type {
  PushGatewayTicket,
  PushNotificationMessage,
} from './push-notifications.types';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const MAX_MESSAGES_PER_REQUEST = 100;

type ExpoPushTicket =
  | {
      status: 'ok';
      id: string;
    }
  | {
      status: 'error';
      details?: {
        error?: string;
      };
    };

@Injectable()
export class ExpoPushNotificationGateway implements PushNotificationGateway {
  constructor(private readonly configService: ConfigService) {}

  async send(
    messages: readonly PushNotificationMessage[],
  ): Promise<readonly PushGatewayTicket[]> {
    const tickets: PushGatewayTicket[] = [];

    for (const messageChunk of this.chunkMessages(messages)) {
      tickets.push(...(await this.sendChunk(messageChunk)));
    }

    return tickets;
  }

  private async sendChunk(
    messages: readonly PushNotificationMessage[],
  ): Promise<PushGatewayTicket[]> {
    const response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: this.createHeaders(),
      body: JSON.stringify(
        messages.map((message) => ({
          ...message,
          sound: 'default',
        })),
      ),
    });

    if (!response.ok) {
      throw new Error(
        `Expo push request failed with status ${response.status}`,
      );
    }

    const responseBody: unknown = await response.json();
    const expoTickets = this.parseTickets(responseBody);

    if (expoTickets.length !== messages.length) {
      throw new Error('Expo push response ticket count does not match request');
    }

    return expoTickets.map((ticket) =>
      ticket.status === 'ok'
        ? {
            status: 'accepted',
            id: ticket.id,
          }
        : {
            status: 'rejected',
            code: ticket.details?.error ?? null,
          },
    );
  }

  private createHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    };
    const accessToken = this.configService.get<string>('EXPO_ACCESS_TOKEN');

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    return headers;
  }

  private parseTickets(responseBody: unknown): ExpoPushTicket[] {
    if (
      !this.isRecord(responseBody) ||
      !Array.isArray(responseBody.data) ||
      !responseBody.data.every((ticket) => this.isExpoPushTicket(ticket))
    ) {
      throw new Error('Expo push response has an invalid format');
    }

    return responseBody.data;
  }

  private isExpoPushTicket(value: unknown): value is ExpoPushTicket {
    if (!this.isRecord(value)) {
      return false;
    }

    if (value.status === 'ok') {
      return typeof value.id === 'string';
    }

    return value.status === 'error';
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private chunkMessages(
    messages: readonly PushNotificationMessage[],
  ): PushNotificationMessage[][] {
    const chunks: PushNotificationMessage[][] = [];

    for (
      let index = 0;
      index < messages.length;
      index += MAX_MESSAGES_PER_REQUEST
    ) {
      chunks.push(messages.slice(index, index + MAX_MESSAGES_PER_REQUEST));
    }

    return chunks;
  }
}
