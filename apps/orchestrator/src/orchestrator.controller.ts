import {Body, Controller, Get, HttpStatus, Param, Post, Query, Res, UseGuards} from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import {PostDownloadBodyDto} from "./dtos/PostDownloadBody.dto";
import {v4 as uuidv4} from 'uuid';
import {TrustedSourceGuard} from "./guards/TrustedSource.guard";
import {ConfigService} from "@nestjs/config";

@Controller()
export class OrchestratorController {
  private tempMemory = {};
  constructor(private orchestratorService: OrchestratorService, private configService: ConfigService) {}

  @UseGuards(TrustedSourceGuard)
  @Get('/health')
  async health() {
    return {status: 'ok'};
  }

  @Get('/next-document')
  async getNextDocument(@Res() res, @Query('forceStatus') forceStatus: string) {
    try {
      const id = uuidv4();
      if (forceStatus === 'not_found') {
        return res.status(HttpStatus.NOT_FOUND).json({status: 'not_found'});
      }
      this.tempMemory[id] = 'ocr-locked';
      return res.status(HttpStatus.OK).json({
        id,
        storagePath: `${this.configService.get('storage_path')}/${id}.pdf`,
        status: 'downloaded',
      });
    } catch (e) {
      console.log(e);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({status: 'error', message: e.message});
    }
  }

  @Get('/document/:id')
  async getDocumentInfo(@Res() res, @Param('id') id: string, @Query('forceStatus') forceStatus: string) {
    try {
      return res.status(HttpStatus.OK).json({
        id,
        storagePath: `${this.configService.get('storage_path')}/${id}.pdf`,
        status: this.tempMemory[id] || 'ocr_in_progress',
      });
    } catch (e) {
      console.log(e);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({status: 'error', message: e.message});
    }
  }

  @Post('/ocr_updates')
  async postOcr(@Body() body: any, @Res() res) {
    if (!body.id) {
      return res.status(HttpStatus.BAD_REQUEST).json({status: 'error', message: 'Missing job_id'});
    }
    this.tempMemory[body.id] = body.status;
    console.log(body);
    // await this.orchestratorService.postOcr(body.id);
    return res.status(HttpStatus.OK).json({status: 'ok'});
  }
}
