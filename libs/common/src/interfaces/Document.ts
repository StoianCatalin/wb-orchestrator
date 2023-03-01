export enum Status {
  NOU = 'nou',
  IN_ANALIZA = 'in analiza',
  REVIZUIT = 'revizuit',
}

export enum ProcessingStatus {
  downloaded = 'downloaded',
  'locked' = 'locked',
  'ocr_in_progress' = 'ocr_in_progress',
  'ocr_done' = 'ocr_done',
  'ocr_failed' = 'ocr_failed',
}

export interface IDocumentIncomingDTO {
  title: string;
  project?: string;
  identifier?: string;
  publicationDate: string;
  source: string;
  status: string;
  link?: string;
  storagePath?: string;
  isRulesBreaker?: boolean;
  assignedUser?: string;
  deadline?: Date;
  originalFormat?: string;
  numberOfPages?: number;
  textInterpretationPrecision?: number;
  numberOfIdentifiedArticles?: number;
  numberOfIdentifiedTerms?: number;
  attachments?: string[];
  processingStatus?: ProcessingStatus;
}

export interface IDocumentOutgoingDTO extends IDocumentIncomingDTO {
  id: string;
  createdAt: Date | undefined;
  updatedAt: Date | undefined;
  assignedUser: string | undefined;
}
