import { Injectable } from '@nestjs/common';
import {delay} from "@app/common/utils/delay";
import {ConfigService} from "@nestjs/config";
import {CDEP_crawler} from "./crawlers/cdep";
import {ApiService} from "@app/common/api/api.service";
import {IDocumentOutgoingDTO} from "@app/common/interfaces/Document";
import {getFileHash} from "./utils/getFileHash";
import * as moment from 'moment';

@Injectable()
export class SuitService {
  constructor(private configService: ConfigService, private apiService: ApiService) {
  }

  async run() {
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
      case 'cdep':
        return await CDEP_crawler();
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
    for (const project of result[this.configService.get('scrapper_name')]) {

      let projectExists = await this.apiService.findProjectBy({ title: project.lawProject.name });
      if (!projectExists[0]) {
        console.log('Create project', project.lawProject.name);
        const { data: remoteProject } = await this.apiService.createProject({
          title: project.lawProject.name,
        });
        console.log(remoteProject);
        await this.updateDocumentsForProject(remoteProject.id, project.lawProject.pdf, [], this.configService.get('scrapper_name'));
      } else {
        await this.updateDocumentsForProject(projectExists[0].id, project.lawProject.pdf, projectExists[0].documents, this.configService.get('scrapper_name'));
      }
    }
  }

  async updateDocumentsForProject(projectId: string, documents: any[], remoteDocuments: IDocumentOutgoingDTO[], source: string) {
    for (const document of documents) {
      try {
        const md5File = await getFileHash(document.link);
        const remoteDocument = remoteDocuments.find((doc) => {
          return doc.title === document.name && doc.link === document.link;
        });
        if (!remoteDocument && document.name) {
          console.log('Create document', document.link);
          await this.apiService.createDocument({
            identifier: md5File,
            title: document.name,
            project: projectId,
            link: document.link,
            publicationDate: moment(document.date, 'DD-MM-YYYY').toISOString(),
            source,
            status: 'nou',
          });
        } else if (remoteDocument.identifier !== md5File && document.name) {
          // TODO: should update the document
          console.log('Document should be updated', document.link);
        }
      } catch (e: any) {
        console.log(e);
      }
    }
  }

}
