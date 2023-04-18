import { Injectable } from '@nestjs/common';
import {ConfigService} from "@nestjs/config";
import {HttpService} from "@nestjs/axios";
import {Project} from "@app/common/interfaces/Project";
import {firstValueFrom} from "rxjs";
import {IDocumentIncomingDTO, IDocumentOutgoingDTO, ProcessingStatus, Status} from "@app/common/interfaces/Document";


@Injectable()
export class ApiService {
  baseUrl: string;
  headers: any;

  constructor(private configService: ConfigService, private httpService: HttpService) {
    this.baseUrl = this.configService.get('api_url');
    this.headers = {
      'Content-Type': 'application/json',
      'cache-control': 'no-cache',
      'authorization': this.configService.get('api_key'),
    };
  }

  getRobot(name: string) {
    return firstValueFrom(this.httpService.get(`${this.baseUrl}/robot/${name}`, {
      headers: this.headers,
    }));
  }

  createRobot(name: string) {
    return firstValueFrom(this.httpService.post(`${this.baseUrl}/robot`, {
      name,
    }, {
      headers: this.headers,
    }));
  }

  updateRobot(id: string, data: any) {
    return firstValueFrom(this.httpService.put(`${this.baseUrl}/robot/${id}`, data, {
      headers: this.headers,
    }));
  }

  createProject(project: Project) {
    return firstValueFrom(this.httpService.post(`${this.baseUrl}/project`, project, {
      headers: this.headers,
    }));
  }

  async getProjects(): Promise<Project[]> {
    const result = await firstValueFrom(this.httpService.get(`${this.baseUrl}/project`, {
      headers: this.headers,
    }));
    return result.data;
  }

  async findProjectBy({ title }): Promise<Project[]> {
    try {
      const result = await firstValueFrom(this.httpService.get(`${this.baseUrl}/project/find?title=${encodeURIComponent(title)}`, {
        headers: this.headers,
      }));
      return result.data;
    } catch (e) {
      return null;
    }
  }

  async findDocumentBy({ project }): Promise<IDocumentOutgoingDTO[]> {
    const result = await firstValueFrom(this.httpService.get(`${this.baseUrl}/document?project=${encodeURIComponent(project)}`, {
      headers: this.headers,
    }));
    return result.data;
  }

  async getDownloadedDocuments() {
    const result = await firstValueFrom(this.httpService.get(`${this.baseUrl}/document?processingStatus=${ProcessingStatus.downloaded}`, {
      headers: this.headers,
    }));

    return result.data;
  }

  async lockDocument(documentId: string) {
    const result = await firstValueFrom(this.httpService.put(`${this.baseUrl}/document/${documentId}`, { processingStatus: ProcessingStatus["locked"] }, {
      headers: this.headers,
    }));

    return result.data;
  }

  async createDocument(document: IDocumentIncomingDTO): Promise<IDocumentOutgoingDTO> {
    const result = await firstValueFrom(this.httpService.post(`${this.baseUrl}/document`, document, {
      headers: this.headers,
    }));
    return result.data;
  }

  async updateDocument(documentId: string, data: any) {
    const result = await firstValueFrom(this.httpService.put(`${this.baseUrl}/document/${documentId}`, data, {
      headers: this.headers,
    }));
    return result.data;
  }

  async getDocument(documentId: string): Promise<IDocumentOutgoingDTO> {
    const result = await firstValueFrom(this.httpService.get(`${this.baseUrl}/document/${documentId}`, {
      headers: this.headers,
    }));

    return result.data;
  }

  async updateDocumentStatus(documentId: string, status: Status) {
    const result = await firstValueFrom(this.httpService.put(`${this.baseUrl}/document/${documentId}`, { status }, {
      headers: this.headers,
    }));

    return result.data;
  }
}
