import { Injectable } from '@nestjs/common';
import { ApiService } from '@app/common/api/api.service';
import { AiService } from './ai/ai.service';
import { ProcessingStatus } from '@app/common/interfaces/Document';

@Injectable()
export class OrchestratorService {
  constructor(private aiService: AiService, private apiService: ApiService) {}

  async getNextDocument() {
    const data = await this.apiService.getDownloadedDocuments();
    const {
      documents: { results },
      keywords,
      keywordsHash,
    } = data;
    console.log(results);
    if (results && results.length > 0) {
      return {
        document: results.find(
          (document) =>
            document.processingStatus === ProcessingStatus.downloaded,
        ),
        keywords,
        keywordsHash,
      };
    }
    return null;
  }

  async lockDocument(documentId: string) {
    return this.apiService.lockDocument(documentId);
  }

  async getDocument(documentId: string) {
    return this.apiService.getDocument(documentId);
  }

  async updateDocument(documentId: string, data: any) {
    const payload = {
      textInterpretationPrecision: data.analysis?.ocr_quality,
      processingStatus: data.status,
      postOcrContent: data.analysis?.text,
      totalParts: data.analysis?.total_parts,
      part: data.analysis?.part,
      highlightFile: data.analysis?.highlight_file,
      highlightMetadata: data.analysis?.highlight_metadata,
      ocrFile: data.analysis?.ocr_file,
      numberOfPages: data.analysis?.statistics?.num_pages,
      numberOfIdentifiedTerms: data.analysis?.statistics?.num_kwds,
    };

    return this.apiService.updateDocument(documentId, payload);
  }
}
