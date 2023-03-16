import {Injectable} from '@nestjs/common';
import {delay} from "@app/common/utils/delay";
import {ConfigService} from "@nestjs/config";
import { main as CDEP_crawler } from "../crawlers/cdep";
import {ApiService} from "@app/common/api/api.service";
import {IDocumentOutgoingDTO, ProcessingStatus} from "@app/common/interfaces/Document";
import {downloadFileAndReturnHash} from "../utils/downloadFileAndReturnHash";
import * as moment from 'moment';
import {v4} from 'uuid';
import {OrchestratorService} from "./orchestrator.service";

@Injectable()
export class SuitService {
  constructor(private configService: ConfigService, private apiService: ApiService, private orchestratorService: OrchestratorService) {
    this.run();
  }

  async run() {
    if (!this.configService.get('scrapper_name')) {
      throw new Error("No scrapper name provided. Please set the SCRAPPER_NAME environment variable.");
    }
    try {
      const result = await this.chooseAndRunCrawler();
      await this.postScrapping(result);
    } catch (e) {
      console.log(e);
    }
    await delay(this.configService.get('delay_between_runs'));
    this.run();
  }

  async chooseAndRunCrawler() {
    switch (this.configService.get('scrapper_name')) {
      case 'camera_deputatilor':
        return await CDEP_crawler({ timestamp: Date.now() - 1000 * 60 * 60 * 24 * 2 });
      case 'senat':
        return;
      case 'justitie':
        return;
      case 'monitorul':
        return;
      default:
        return;
    }
  }

  async postScrapping(result) {
    // check if project already exists
    // if not, create it
    // TODO: get project by title
    console.log(result);
    for (const project of result[this.configService.get('scrapper_name')]) {
      let projectExists = await this.apiService.findProjectBy({title: project.name});
      if (!projectExists || !projectExists[0]) {
        console.log('Create project', project.name);
        const {data: remoteProject} = await this.apiService.createProject({
          title: project.name,
        });
        await this.updateDocumentsForProject(remoteProject.id, project.documents, [], this.configService.get('scrapper_name'));
        break;
      } else {
        await this.updateDocumentsForProject(projectExists[0].id, project.documents, projectExists[0].documents, this.configService.get('scrapper_name'));
      }
    }
  }

  async updateDocumentsForProject(projectId: string, documents: any[], remoteDocuments: IDocumentOutgoingDTO[], source: string) {
    for (const document of documents) {
      try {
        const remoteDocument = remoteDocuments.find((doc) => {
          return doc.title === document.title && doc.link === document.link;
        });
        // check if document is pdf, otherwise skip.
        if (document.type !== 'pdf') {
          continue;
        }
        if (!remoteDocument && document.title) {
          try {
            const newDocument = await this.apiService.createDocument({
              identifier: v4(),
              title: document.title,
              project: projectId,
              link: document.link,
              publicationDate: moment(document.date, 'DD-MM-YYYY').toISOString(),
              source,
              status: 'nou',
              processingStatus: ProcessingStatus.downloaded,
            });
            console.log('Download document...', document.link);
            await downloadFileAndReturnHash(`${this.configService.get('storage_path')}/${newDocument.id}.pdf`, document.link);
            console.log('File downloaded', document.link);
            await this.apiService.updateDocument(newDocument.id, {
              storagePath: `${this.configService.get('storage_path')}/${newDocument.id}.pdf`,
            })
          } catch (e) {
            console.log('Cannot create document', document.link, e.message);
          }
          break;
        }
      } catch (e: any) {
        console.log(e);
      }
    }
  }

}
