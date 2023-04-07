import {Injectable} from '@nestjs/common';
import {delay} from "@app/common/utils/delay";
import {ConfigService} from "@nestjs/config";
import { main as CDEP_crawler } from "../crawlers/cdep";
import { main as mdezvoltarii_crawler } from "../crawlers/mdezvoltarii";
import { main as meducatiei_crawler } from "../crawlers/meducatiei";
import { main as mfinante_crawler } from "../crawlers/mfinante";
import { main as mmediu_crawler } from "../crawlers/mmediu";
import { main as mtransport_crawler } from "../crawlers/mtransport";
import { main as senat_crawler } from "../crawlers/senat";
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
        return await CDEP_crawler({ timestamp: Date.now() });
      case 'senat':
        return await senat_crawler({});
      case 'mdezvoltarii':
        return await mdezvoltarii_crawler({});
      case 'meducatiei':
        return await meducatiei_crawler({});
        case 'mfinante':
        return await mfinante_crawler({});
      case 'mmediu':
        return await mmediu_crawler({});
      case 'mtransport':
        return await mtransport_crawler({});
      default:
        return;
    }
  }

  async postScrapping(result) {
    // check if project already exists
    // if not, create it
    // TODO: get project by title
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
          console.log('Document type', document.type, 'Skipping...');
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
              processingStatus: ProcessingStatus.created,
            });
            console.log('Download document...', document.link);
            try {
              await downloadFileAndReturnHash(`${this.configService.get('storage_path')}/${newDocument.id}.pdf`, document.link);
              console.log('File downloaded', document.link);
              await this.apiService.updateDocument(newDocument.id, {
                storagePath: `${this.configService.get('storage_path')}/${newDocument.id}.pdf`,
                processingStatus: ProcessingStatus.downloaded,
              })
            } catch (e) {
              await this.apiService.updateDocument(newDocument.id, {
                processingStatus: ProcessingStatus.unable_to_download,
              })
              console.log('Cannot download document', document.link, e.message);
            }
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
