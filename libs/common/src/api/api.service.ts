import { Injectable } from '@nestjs/common';
import {ConfigService} from "@nestjs/config";
import {HttpService} from "@nestjs/axios";
import {Project} from "@app/common/interfaces/Project";
import {firstValueFrom} from "rxjs";
import {IDocumentIncomingDTO, IDocumentOutgoingDTO, ProcessingStatus, Status} from "@app/common/interfaces/Document";

@Injectable()
export class ApiService {
  baseUrl: string;

  constructor(private configService: ConfigService, private httpService: HttpService) {
    this.baseUrl = this.configService.get('api_url');
  }

  createProject(project: Project) {
    return firstValueFrom(this.httpService.post(`${this.baseUrl}/project`, project, {
      headers: {
        'Content-Type': 'application/json',
        'authorization': this.configService.get('api_key')
      }
    }));
  }

  async getProjects(): Promise<Project[]> {
    const result = await firstValueFrom(this.httpService.get(`${this.baseUrl}/project`, {
      headers: {
        'Content-Type': 'application/json',
        'authorization': this.configService.get('api_key'),
      }
    }));
    return result.data;
  }

  async findProjectBy({ title }): Promise<Project[]> {
    try {
      const result = await firstValueFrom(this.httpService.get(`${this.baseUrl}/project/find?title=${encodeURIComponent(title)}`, {
        headers: {
          'Content-Type': 'application/json',
          'authorization': this.configService.get('api_key'),
        }
      }));
      return result.data;
    } catch (e) {
      return null;
    }
  }

  async findDocumentBy({ project }): Promise<IDocumentOutgoingDTO[]> {
    const result = await firstValueFrom(this.httpService.get(`${this.baseUrl}/document?project=${encodeURIComponent(project)}`, {
      headers: {
        'Content-Type': 'application/json',
        'authorization': this.configService.get('api_key'),
      }
    }));
    return result.data;
  }

  async getDownloadedDocuments() {
    const result = await firstValueFrom(this.httpService.get(`${this.baseUrl}/document?processingStatus=${ProcessingStatus.downloaded}`, {
      headers: {
        'Content-Type': 'application/json',
        'authorization': this.configService.get('api_key'),
      }
    }));

    return result.data;
  }

  async lockDocument(documentId: string) {
    const result = await firstValueFrom(this.httpService.put(`${this.baseUrl}/document/${documentId}`, { processingStatus: ProcessingStatus["locked"] }, {
      headers: {
        'Content-Type': 'application/json',
        'authorization': this.configService.get('api_key'),
      }
    }));

    return result.data;
  }

  async createDocument(document: IDocumentIncomingDTO): Promise<IDocumentOutgoingDTO> {
    const result = await firstValueFrom(this.httpService.post(`${this.baseUrl}/document`, document, {
      headers: {
        'Content-Type': 'application/json',
        'authorization': this.configService.get('api_key'),
      }
    }));
    return result.data;
  }

  async updateDocument(documentId: string, data: any) {
    const result = await firstValueFrom(this.httpService.put(`${this.baseUrl}/document/${documentId}`, data, {
      headers: {
        'Content-Type': 'application/json',
        'authorization': this.configService.get('api_key'),
      }
    }));
    return result.data;
  }

  async getDocument(documentId: string): Promise<IDocumentOutgoingDTO> {
    const result = await firstValueFrom(this.httpService.get(`${this.baseUrl}/document/${documentId}`, {
      headers: {
        'Content-Type': 'application/json',
        'authorization': this.configService.get('api_key'),
      }
    }));

    return result.data;
  }

  async updateDocumentStatus(documentId: string, status: Status) {
    const result = await firstValueFrom(this.httpService.put(`${this.baseUrl}/document/${documentId}`, { status }, {
      headers: {
        'Content-Type': 'application/json',
        'authorization': this.configService.get('api_key'),
      }
    }));

    return result.data;
  }
}
