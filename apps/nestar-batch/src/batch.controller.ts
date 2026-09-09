import { Controller, Get, Logger } from '@nestjs/common';
import { BatchService } from './batch.service';
import { Cron, Interval, Timeout } from '@nestjs/schedule';
import { BATCH_ROLLBACK, BATCH_TOP_AGENTS, BATCH_TOP_PROPERTIES } from './lib/config';

@Controller()
export class BatchController {
  private logger: Logger = new Logger('BatchContorller');

  constructor(private readonly BatchService: BatchService) {}


  @Timeout(1000)
  handleTimeout() {
    this.logger.debug("BATCH Server READY!")
  }

  @Cron("00 * * * * *", {name: BATCH_ROLLBACK})
  public async batchRollback() {
    try {
      this.logger["context"] = BATCH_ROLLBACK;
      this.logger.debug('EXECUTED!');
    } catch (err) {
      this.logger.error(err);
    }


  }

  @Cron("10 * * * * *", {name: BATCH_TOP_PROPERTIES})
  public async batchProperties() {
    try {
      this.logger["context"] = BATCH_TOP_PROPERTIES;
      this.logger.debug('EXECUTED!');
    } catch (err) {
      this.logger.error(err);
    }
  }

  @Cron("20 * * * * *", {name: BATCH_TOP_AGENTS })
  public async batchAgents() {
    try {
      this.logger["context"] = BATCH_TOP_AGENTS;
      this.logger.debug('EXECUTED!');
    } catch (err) {
      this.logger.error(err);
    }
  }


  /*
  @Interval(1000)
  handleInterval() {
    this.logger.debug("INTERVAL TEST")
  }
  */

  @Get()
  getHello(): string {
    return this.BatchService.getHello();
  }
}
