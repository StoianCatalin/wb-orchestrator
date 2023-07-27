import {Injectable} from '@nestjs/common';
import {delay} from "@app/common/utils/delay";
import {ConfigService} from "@nestjs/config";
import {main as CDEP_crawler} from "../crawlers/cdep";
import {main as mdezvoltarii_crawler} from "../crawlers/mdezvoltarii";
import {main as meducatiei_crawler} from "../crawlers/meducatiei";
import {main as mfinante_crawler} from "../crawlers/mfinante";
import {main as mmediu_crawler} from "../crawlers/mmediu";
import {main as mtransport_crawler} from "../crawlers/mtransport";
import {main as senat_crawler} from "../crawlers/senat";
import {main as mae_crawler} from "../crawlers/mae";
import {main as mjustitiei_crawler} from "../crawlers/mjustitie";
import {main as mai_crawler} from "../crawlers/mai";
import {main as mapn_crawler} from "../crawlers/mapn";
import {main as cdeppl_crawler} from "../crawlers/cdep-pl";
import { main as senatpl_crawler } from '../crawlers/senat-pl';
import { main as magriculturii_crawler } from '../crawlers/magriculturii';
import { main as mcercetarii_crawler } from '../crawlers/mcercetarii';
import { main as mculturii_crawler } from '../crawlers/mculturii';
import { main as meconomiei_crawler } from '../crawlers/meconomiei';
import { main as menergiei_crawler } from '../crawlers/menergiei';
import { main as mfamiliei_crawler } from '../crawlers/mfamiliei';
import { main as minvestitiilor_crawler } from '../crawlers/minvestitiilor';
import { main as mmuncii_crawler } from '../crawlers/mmuncii';
import { main as msanatatii_crawler } from '../crawlers/msanatatii';
import { main as msport_crawler } from '../crawlers/msport';
import { main as mturism_crawler } from '../crawlers/mturism';
import {ApiService} from "@app/common/api/api.service";
import {IDocumentOutgoingDTO, ProcessingStatus} from "@app/common/interfaces/Document";
import * as moment from 'moment';
import {v4} from 'uuid';
import {OrchestratorService} from "./orchestrator.service";
import {downloadFileAndReturnHash} from "@app/common/utils/downloadFileAndReturnHash";
import {RobotStatus} from "@app/common/interfaces/Robot";
import getCrawlerId from "../utils/get_crawler_id";
import getDocumentId from "../utils/getDocumentId";


@Injectable()
export class SuitService {
  constructor(private configService: ConfigService, private apiService: ApiService, private orchestratorService: OrchestratorService) {
  }

  async checkIfRobotExists() {
    try {
      console.log("Check if robot exists");
      const {data} = await this.apiService.getRobot(this.configService.get('scrapper_name'));
      return data;
    } catch (e) {
      const {data} = await this.apiService.createRobot(this.configService.get('scrapper_name'));
      return data;
    }
  }

  async run() {
    const robot_name = this.configService.get('scrapper_name');
    if (!robot_name) {
      throw new Error("No scrapper name provided. Please set the SCRAPPER_NAME environment variable.");
    }
    const robot = await this.checkIfRobotExists();
    try {
      const result = await this.chooseAndRunCrawler();
      const nameOfLastDocument = robot_name === 'camera_deputatilor_pl' || robot_name === 'senat_pl' ?
        await this.postScrapingWithFields(result) : await this.postScrapping(result);
      await this.apiService.updateRobot(robot.id, {
        status: RobotStatus.FUNCTIONAL,
        info: nameOfLastDocument ? `Robotul a rulat cu success. Ultimul document descarcat: ${nameOfLastDocument}` : 'Nu sunt fisiere noi de analizat.',
      });
    } catch (e) {
      const urlRegex = /(https?:\/\/[^\s]+)/;
      const url = e.message.match(urlRegex) && e.message.match(urlRegex).length > 1 && e.message.match(urlRegex)[1];
      await this.apiService.updateRobot(robot.id, {
        status: RobotStatus.NOT_FUNCTIONAL,
        info: `Portalul nu este disponibil. ${url ? `Ultimul link incercat: ${url}` : e.message}`,
      });
    }
    await delay(this.configService.get('delay_between_runs'));
    await this.run();
  }

  async chooseAndRunCrawler() {
    switch (this.configService.get('scrapper_name')) {
      case 'camera_deputatilor':
        return await CDEP_crawler({timestamp: Date.now() - 1000 * 60 * 60 * 2 });
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
      case 'mae':
        return await mae_crawler({});
      case 'mjustitie':
        return await mjustitiei_crawler({});
      case 'mai':
        return await mai_crawler({});
      case 'mapn':
        return await mapn_crawler({});
      case 'camera_deputatilor_pl':
        return await cdeppl_crawler({});
      case 'senat_pl':
        return await senatpl_crawler({});
      case 'magriculturii':
        return await magriculturii_crawler({});
      case 'mcercetarii':
        return await mcercetarii_crawler({});
      case 'mculturii':
        return await mculturii_crawler({});
      case 'meconomiei':
        return await meconomiei_crawler({});
      case 'menergiei':
        return await menergiei_crawler({});
      case 'mfamiliei':
        return await mfamiliei_crawler({});
      case 'minvestitiilor':
        return await minvestitiilor_crawler({});
      case 'mmuncii':
        return await mmuncii_crawler({});
      case 'msanatatii':
        return await msanatatii_crawler({});
      case 'msport':
        return await msport_crawler({});
      case 'mturism':
        return await mturism_crawler({});
      default:
        return;
    }
  }

  async postScrapingWithFields(results) {
    const robot_name = this.configService.get('scrapper_name');
    let lastDownloadedDocument = '';
    for (const project of results[robot_name]) {
      let projectExists = await this.apiService.findProjectBy({title: project.name});
      const documents = project.fields.find(field => field.name === 'documents').value;
      if (!projectExists || !projectExists[0]) {
        console.log('Create project', project.name);
        const fields = robot_name === 'camera_deputatilor_pl' ? await this.getFieldsForCDEPProject(project) : await this.getFieldsForSenatProject(project);
        console.log({
          ...fields,
          source: this.configService.get('scrapper_name'),
          title: project.name,
          publicationDate: project.date || moment().format('DD-MM-YYYY'),
          url: project.currentUrl,
        });
        const {data: remoteProject} = await this.apiService.createProject({
          ...fields,
          source: this.configService.get('scrapper_name'),
          title: project.name,
          publicationDate: project.date || moment().format('DD-MM-YYYY'),
          url: project.currentUrl,
        });
        lastDownloadedDocument = await this.updateDocumentsForProject(remoteProject.id, documents, [], this.configService.get('scrapper_name'));
        break;
      } else {
        console.log('Update project', project.name);
        const fields = await this.getFieldsForCDEPProject(project);
        await this.apiService.updateProject(projectExists[0].id, { ...fields, source: this.configService.get('scrapper_name') });
        lastDownloadedDocument = await this.updateDocumentsForProject(projectExists[0].id, documents, projectExists[0].documents, this.configService.get('scrapper_name'));
      }
    }
    return lastDownloadedDocument;
  }

  async postScrapping(result) {
    let lastDownloadedDocument = '';
    for (const project of result[this.configService.get('scrapper_name')]) {
      let projectExists = await this.apiService.findProjectBy({title: project.name});
      if (!projectExists || !projectExists[0]) {
        console.log('Create project', project.name);
        const {data: remoteProject} = await this.apiService.createProject({
          title: project.name,
        });
        lastDownloadedDocument = await this.updateDocumentsForProject(remoteProject.id, project.documents, [], this.configService.get('scrapper_name'));
        break;
      } else {
        lastDownloadedDocument = await this.updateDocumentsForProject(projectExists[0].id, project.documents, projectExists[0].documents, this.configService.get('scrapper_name'));
      }
    }
    return lastDownloadedDocument;
  }

  async updateDocumentsForProject(projectId: string, documents: any[], remoteDocuments: IDocumentOutgoingDTO[], source: string) {
    let lastDownloadedDocument = '';
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
              identifier: `${getCrawlerId(source)}${getDocumentId()}`,
              title: document.title,
              project: projectId,
              link: document.link,
              publicationDate: document.date ? moment(document.date, 'DD-MM-YYYY').toISOString() : moment().toISOString(),
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
              lastDownloadedDocument = document.title;
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
    return lastDownloadedDocument;
  }

  async getFieldsForCDEPProject(project) {
    const fields = {};
    for (const field of project.fields) {
      if (field.name === 'documents') {
        continue;
      }
      switch (field.name) {
        case 'Nr. înregistrare B.P.I.':
          // fields['numarInregistrareBPI'] = field.value;
          break;
        case 'Nr. înregistrare Camera Deputatilor':
          fields['numarInregistrareCDep'] = field.value;
          break;
        case 'Nr. înregistrare Senat':
          fields['numarInregistrareSenat'] = field.value;
          break;
        case 'Procedura legislativa':
          fields['proceduraLegislativa'] = field.value;
          break;
        case 'Camera decizionala':
          fields['cameraDecizionala'] = field.value;
          break;
        case 'Tip initiativa':
          fields['tipInitiativa'] = field.value;
          break;
        case 'Procedura de urgenta':
          fields['esteProceduraDeUrgenta'] = field.value === 'da';
          break;
        case 'Initiator - la data initierii':
          fields['initiator'] = field.value;
          break;
        default:
          break;
      }
    }
    return fields;
  }

  async getFieldsForSenatProject(project) {
    const fields = {};
    for (const field of project.fields) {
      if (field.name === 'documents') {
        continue;
      }
      switch (field.name) {
        case 'Număr de înregistrare Camera Deputaților':
          fields['numarInregistrareCDep'] = field.value || '-';
          break;
        case 'Avizul Consiliului Legislativ':
          fields['numarInregistrareSenat'] = field.value;
          break;
        case 'Procedura legislativa':
          fields['proceduraLegislativa'] = field.value;
          break;
        case 'Camera decizionala':
          fields['cameraDecizionala'] = field.value;
          break;
        case 'Tip inițiativă':
          fields['tipInitiativa'] = field.value;
          break;
        case 'Termen adoptare':
          fields['termenAdoptare'] = field.value;
          break;
        case 'Stadiu':
          fields['stadiu'] = field.value;
          break;
        case 'Procedura de urgență':
          fields['esteProceduraDeUrgenta'] = field.value === 'Da';
          break;
        case 'Inițiatori':
          fields['initiator'] = field.value;
          break;
        default:
          break;
      }
    }
    return fields;
  }

}
