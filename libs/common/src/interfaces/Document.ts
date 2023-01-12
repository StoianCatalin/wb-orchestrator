export interface IDocumentIncomingDTO {
  title: string;
  project?: string;
  identifier: string;
  publicationDate: string;
  source: string;
  status: string;
  link?: string;
  isRulesBreaker?: boolean;
  assignedUser?: string;
  deadline?: Date;
  originalFormat?: string;
  numberOfPages?: number;
  textInterpretationPrecision?: number;
  numberOfIdentifiedArticles?: number;
  numberOfIdentifiedTerms?: number;
  attachments?: string[];
}

export interface IDocumentOutgoingDTO extends IDocumentIncomingDTO {
  id: string;
  createdAt: Date | undefined;
  updatedAt: Date | undefined;
  assignedUser: string | undefined;
}
