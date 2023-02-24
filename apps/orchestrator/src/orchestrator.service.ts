import {Injectable} from '@nestjs/common';
import {ApiService} from "@app/common/api/api.service";
import {AiService} from "./ai/ai.service";

@Injectable()
export class OrchestratorService {
  constructor(private aiService: AiService, private apiService: ApiService) {
  }

  async postDownload(documentId: string) {
    const document = await this.apiService.getDocument(documentId);
    await this.aiService.startOCRProcess(document);
  }

  async postOcr(documentId: string) {
    // const {data: text} = await this.aiService.getOCRText(documentId);
    // console.log('text', text);
    // const {data: quality} = await this.aiService.getOCRQuality(documentId);
    // console.log('quality', quality);
    // await this.apiService.updateDocument(documentId, {
    //   textInterpretationPrecision: quality.ocr_quality_percent,
    //   postOcrContent: text
    // });
  }
}
