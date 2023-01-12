import { Injectable } from '@nestjs/common';
import {ConfigService} from "@nestjs/config";
import {HttpService} from "@nestjs/axios";
import {Project} from "@app/common/interfaces/Project";
import {firstValueFrom} from "rxjs";
import {IDocumentIncomingDTO, IDocumentOutgoingDTO} from "@app/common/interfaces/Document";

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
    console.log(`${this.baseUrl}/project`)
    const result = await firstValueFrom(this.httpService.get(`${this.baseUrl}/project`, {
      headers: {
        'Content-Type': 'application/json',
        'authorization': this.configService.get('api_key'),
      }
    }));
    return result.data;
  }

  async findProjectBy({ title }): Promise<Project[]> {
    console.log(`${this.baseUrl}/project/find?title=${title}`)
    const result = await firstValueFrom(this.httpService.get(`${this.baseUrl}/project/find?title=${encodeURIComponent(title)}`, {
      headers: {
        'Content-Type': 'application/json',
        'authorization': this.configService.get('api_key'),
      }
    }));
    return result.data;
  }

  async findDocumentBy({ project }): Promise<IDocumentOutgoingDTO[]> {
    console.log(`${this.baseUrl}/document?project=${encodeURIComponent(project)}`)
    const result = await firstValueFrom(this.httpService.get(`${this.baseUrl}/document?project=${encodeURIComponent(project)}`, {
      headers: {
        'Content-Type': 'application/json',
        'authorization': this.configService.get('api_key'),
      }
    }));
    return result.data;
  }

  async createDocument(document: IDocumentIncomingDTO): Promise<IDocumentOutgoingDTO[]> {
    console.log(document)
    const result = await firstValueFrom(this.httpService.post(`${this.baseUrl}/document`, document, {
      headers: {
        'Content-Type': 'application/json',
        'authorization': this.configService.get('api_key'),
      }
    }));
    return result.data;
  }
}
