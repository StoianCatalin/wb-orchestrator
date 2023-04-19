import {IDocumentOutgoingDTO} from "@app/common/interfaces/Document";

export interface Project {
  id?: string;
  title: string;

  presentsInterest?: boolean;

  documents?: IDocumentOutgoingDTO[];

  numarInregistrareSenat?: string;
  numarInregistrareGuvern?: string;
  proceduraLegislativa?: string;
  cameraDecizionala?: string;
  termenAdoptare?: string;
  source?: string;
  tipInitiativa?: string;
  caracter?: string;
  esteProceduraDeUrgenta?: boolean;
  stadiu?: string;
  initiator?: string;
  consultati?: string;
  attachments?: string[];
}
