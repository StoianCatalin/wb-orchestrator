import {Body, Controller, Get, HttpStatus, Post, Res, UseGuards} from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import {PostDownloadBodyDto} from "./dtos/PostDownloadBody.dto";
import {TrustedSourceGuard} from "./guards/TrustedSource.guard";

@Controller()
export class OrchestratorController {
  constructor(private orchestratorService: OrchestratorService) {}

  @UseGuards(TrustedSourceGuard)
  @Get('/health')
  async health() {
    return {status: 'ok'};
  }

  @UseGuards(TrustedSourceGuard)
  @Post('/post-download')
  async postDownload(@Body() body: PostDownloadBodyDto, @Res() res) {
    try {
      console.log('post-download', body.documentId);
      await this.orchestratorService.postDownload(body.documentId);
      return res.status(HttpStatus.OK).json({status: 'ok'});
    } catch (e) {
      console.log(e);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({status: 'error', message: e.message});
    }

  }

  @Post('/ocr_done')
  async postOcr(@Body() body: any, @Res() res) {
    if (!body.job_id) {
      return res.status(HttpStatus.BAD_REQUEST).json({status: 'error', message: 'Missing job_id'});
    }
    console.log('ocr_done', body.job_id);
    await this.orchestratorService.postOcr(body.job_id);
    return res.status(HttpStatus.OK).json({status: 'ok'});
  }
}
